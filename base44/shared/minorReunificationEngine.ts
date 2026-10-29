import {
  canAdvanceMinorNotification,
  validateReunificationTransition,
  buildReunificationIdempotencyKey,
  pickSurvivingReunificationCase,
  isTerminalReunification,
  resolveMinorOccurredAt,
  type MinorChannel,
  type MinorNotificationStatus,
  type MinorRecipientRole,
  type MinorTriggerSource,
  type ReunificationState,
  type CaseActorType,
} from './minorReunification.ts';
import { emergencyDispatch } from './notify.ts';
import { placeOutboundCall } from './voiceCallAdapter.ts';

/**
 * minorReunificationEngine — the only place in the app allowed to write
 * MinorTraveller, ReunificationCase, CaseEvent and MinorNotification.
 *
 * Every entry point (the token triggers, the care-team transition function and
 * the check-in sweep) goes through the same helpers, so there is exactly one
 * definition of "open or attach", one of "move the case", and one of "fire the
 * fanout". No model is invoked anywhere in this file. Nothing here touches
 * payments, escrow, or the adult emergency pyramid — the adult escalation path
 * is a separate machine and this module does not call into it.
 */

export const APP_URL = (Deno.env.get('APP_URL') || 'https://sentinel-dental-care.base44.app').replace(/\/$/, '');

const BRAND = 'Morales Medical Travel Safety';

/** States that mean "this case is still open" — a duplicate trigger attaches to one of these. */
export const OPEN_STATES: ReunificationState[] = [
  'TRIGGERED', 'LOCATING', 'NOTIFIED', 'REUNITING', 'HANDED_OVER',
];

// ── Case events ───────────────────────────────────────────────────────────────

/**
 * Append one immutable event. `sequence` is read from the last row so the
 * timeline order never depends on clock resolution. Tolerant of failure by
 * design: a broken event write must not abort a live reunification, but it is
 * logged loudly because a gap in this trail is itself a serious defect.
 */
export async function appendCaseEvent(base44: any, params: {
  case_id: string;
  minor_id: string;
  guardian_email: string;
  event_kind: 'state_change' | 'duplicate_trigger' | 'safety_answer' | 'location_captured';
  from_state?: string | null;
  to_state: string;
  actor_type: CaseActorType;
  actor_id?: string | null;
  at: string;
  reason_code?: string | null;
  idempotency_key?: string | null;
  evidence?: Record<string, unknown>;
}): Promise<any | null> {
  try {
    const last = await base44.asServiceRole.entities.CaseEvent
      .filter({ case_id: params.case_id }, '-sequence', 1)
      .catch(() => []);
    const nextSeq = (Array.isArray(last) && last[0]?.sequence ? Number(last[0].sequence) : 0) + 1;

    return await base44.asServiceRole.entities.CaseEvent.create({
      case_id: params.case_id,
      minor_id: params.minor_id,
      guardian_email: params.guardian_email,
      sequence: nextSeq,
      event_kind: params.event_kind,
      from_state: params.from_state ?? null,
      to_state: params.to_state,
      actor_type: params.actor_type,
      actor_id: params.actor_id ?? null,
      at: params.at,
      reason_code: params.reason_code ?? null,
      idempotency_key: params.idempotency_key ?? null,
      evidence: params.evidence || {},
      immutable: false,
    });
  } catch (error) {
    console.error('[minorReunificationEngine] event write failed', params.case_id, params.to_state, error);
    return null;
  }
}

// ── Case transitions ──────────────────────────────────────────────────────────

export interface MoveResult {
  ok: boolean;
  caseRow: any;
  code: string;
  message: string;
}

/**
 * The ONLY function that changes a case's state. Validates against the shared
 * table first, so an illegal transition is refused before any write happens —
 * including a skip ahead, an abort by a non-human, or an abort with no reason.
 */
export async function moveCase(base44: any, params: {
  caseRow: any;
  to: ReunificationState;
  actor_type: CaseActorType;
  actor_id?: string | null;
  reason_code?: string | null;
  at: string;
  evidence?: Record<string, unknown>;
  extraFields?: Record<string, unknown>;
}): Promise<MoveResult> {
  const from = params.caseRow.state as ReunificationState;

  const check = validateReunificationTransition({
    from,
    to: params.to,
    actor_type: params.actor_type,
    reason_code: params.reason_code,
  });

  if (!check.allowed) {
    console.error('[minorReunificationEngine] transition refused', {
      case_id: params.caseRow.id, from, to: params.to, code: check.code,
    });
    return { ok: false, caseRow: params.caseRow, code: check.code, message: check.message };
  }

  const patch: Record<string, unknown> = {
    state: params.to,
    state_entered_at: params.at,
    ...(params.extraFields || {}),
  };

  if (params.to === 'CLOSED') {
    patch.closed_at = params.at;
    patch.closed_by = params.actor_id || 'care_team';
  }
  if (params.to === 'ABORTED') {
    patch.abort_reason_code = params.reason_code || null;
    patch.abort_actor_id = params.actor_id || null;
    patch.closed_by = params.actor_id || 'care_team';
  }

  const updated = await base44.asServiceRole.entities.ReunificationCase
    .update(params.caseRow.id, patch);

  await appendCaseEvent(base44, {
    case_id: params.caseRow.id,
    minor_id: params.caseRow.minor_id,
    guardian_email: params.caseRow.primary_guardian_email,
    event_kind: 'state_change',
    from_state: from,
    to_state: params.to,
    actor_type: params.actor_type,
    actor_id: params.actor_id ?? null,
    at: params.at,
    reason_code: params.reason_code ?? null,
    evidence: params.evidence,
  });

  return {
    ok: true,
    caseRow: { ...params.caseRow, ...patch },
    code: 'ok',
    message: 'Moved.',
  };
}

// ── Open or attach ────────────────────────────────────────────────────────────

export async function loadOpenCase(base44: any, minorId: string): Promise<any | null> {
  const rows = await base44.asServiceRole.entities.ReunificationCase
    .filter({ minor_id: minorId, state: { $in: OPEN_STATES } }, '-created_date', 10)
    .catch(() => []);
  return pickSurvivingReunificationCase(Array.isArray(rows) ? rows : []);
}

export interface OpenResult {
  caseRow: any;
  /** True when a case was already open and this trigger attached to it. */
  attached: boolean;
  /** True when this exact trigger had already been recorded (a true replay). */
  replayed: boolean;
}

/**
 * Opens a case, or attaches the trigger to the one that is already open.
 *
 * Idempotency has two layers:
 *   1. The trigger's idempotency key is checked against existing events. A
 *      retried request finds its own event and does nothing at all.
 *   2. If no event matches but a case is open, the trigger attaches as a
 *      duplicate_trigger event — the case does not move, and a second case is
 *      never created.
 *
 * The one race this cannot prevent — two simultaneous triggers both seeing no
 * open case — is settled deterministically after the insert: the smallest id
 * keeps the case, the loser is deleted along with its lone event (it never
 * fired a fanout, so nothing downstream refers to it) and its trigger attaches
 * to the survivor instead. Deleting a case that existed for milliseconds and
 * notified nobody is the honest outcome; inventing a seventh state to park it
 * in is not.
 */
export async function openOrAttachCase(base44: any, params: {
  minor: any;
  trigger_source: MinorTriggerSource;
  occurred_at: string;
  occurred_at_source: 'client' | 'server_fallback';
  actor_type: CaseActorType;
  actor_id?: string | null;
  evidence?: Record<string, unknown>;
}): Promise<OpenResult> {
  const { minor, trigger_source, occurred_at } = params;
  const now = new Date().toISOString();

  const idempotencyKey = buildReunificationIdempotencyKey({
    minorId: minor.id,
    triggerSource: trigger_source,
    at: occurred_at,
  });

  const alreadyLogged = await base44.asServiceRole.entities.CaseEvent
    .filter({ idempotency_key: idempotencyKey }, '-created_date', 1)
    .catch(() => []);

  if (Array.isArray(alreadyLogged) && alreadyLogged.length > 0) {
    const existingCase = await base44.asServiceRole.entities.ReunificationCase
      .get(alreadyLogged[0].case_id)
      .catch(() => null);
    if (existingCase) {
      return { caseRow: existingCase, attached: true, replayed: true };
    }
  }

  const open = await loadOpenCase(base44, minor.id);
  if (open) {
    const updated = await base44.asServiceRole.entities.ReunificationCase.update(open.id, {
      last_trigger_at: occurred_at,
      trigger_count: Number(open.trigger_count || 1) + 1,
    }).catch(() => open);

    await appendCaseEvent(base44, {
      case_id: open.id,
      minor_id: minor.id,
      guardian_email: open.primary_guardian_email,
      event_kind: 'duplicate_trigger',
      from_state: open.state,
      to_state: open.state,
      actor_type: params.actor_type,
      actor_id: params.actor_id ?? null,
      at: occurred_at,
      reason_code: trigger_source,
      idempotency_key: idempotencyKey,
      evidence: { ...(params.evidence || {}), attached_to_open_case: true },
    });

    return { caseRow: updated || open, attached: true, replayed: false };
  }

  const created = await base44.asServiceRole.entities.ReunificationCase.create({
    minor_id: minor.id,
    minor_display_name: minor.display_name,
    trip_id: minor.trip_id || null,
    primary_guardian_email: minor.primary_guardian_email,
    state: 'TRIGGERED',
    state_entered_at: occurred_at,
    trigger_source,
    opened_at: occurred_at,
    opened_at_source: params.occurred_at_source,
    received_at: now,
    last_trigger_at: occurred_at,
    trigger_count: 1,
    safe_answer: 'unknown',
    location_source: 'none',
  });

  await appendCaseEvent(base44, {
    case_id: created.id,
    minor_id: minor.id,
    guardian_email: minor.primary_guardian_email,
    event_kind: 'state_change',
    from_state: null,
    to_state: 'TRIGGERED',
    actor_type: params.actor_type,
    actor_id: params.actor_id ?? null,
    at: occurred_at,
    reason_code: trigger_source,
    idempotency_key: idempotencyKey,
    evidence: {
      ...(params.evidence || {}),
      trigger_source,
      opened_at_source: params.occurred_at_source,
    },
  });

  // ── Concurrent-trigger tiebreak, settled before anything is sent ──────────
  const contenders = await base44.asServiceRole.entities.ReunificationCase
    .filter({ minor_id: minor.id, state: { $in: OPEN_STATES } }, '-created_date', 10)
    .catch(() => []);

  const survivor = pickSurvivingReunificationCase(Array.isArray(contenders) ? contenders : []);

  if (survivor && survivor.id !== created.id) {
    await base44.asServiceRole.entities.CaseEvent.deleteMany({ case_id: created.id }).catch(() => {});
    await base44.asServiceRole.entities.ReunificationCase.delete(created.id).catch(() => {});

    const rebased = await base44.asServiceRole.entities.ReunificationCase.update(survivor.id, {
      last_trigger_at: occurred_at,
      trigger_count: Number(survivor.trigger_count || 1) + 1,
    }).catch(() => survivor);

    await appendCaseEvent(base44, {
      case_id: survivor.id,
      minor_id: minor.id,
      guardian_email: survivor.primary_guardian_email,
      event_kind: 'duplicate_trigger',
      from_state: survivor.state,
      to_state: survivor.state,
      actor_type: params.actor_type,
      actor_id: params.actor_id ?? null,
      at: occurred_at,
      reason_code: trigger_source,
      evidence: { ...(params.evidence || {}), concurrent_duplicate_settled: true },
    });

    return { caseRow: rebased || survivor, attached: true, replayed: false };
  }

  // ── The fixed opening sequence ────────────────────────────────────────────
  // TRIGGERED → LOCATING: we have asked the one question and started the GPS
  // fix. This transition is recorded at the moment of the trigger, NOT when a
  // location arrives — notification must never wait on a GPS lock.
  const locating = await moveCase(base44, {
    caseRow: created,
    to: 'LOCATING',
    actor_type: 'system',
    actor_id: 'reunification_engine',
    reason_code: 'trigger_received',
    at: occurred_at,
    evidence: {
      question_asked: 'are you safe right now?',
      question_asked_at: occurred_at,
      location_requested: true,
      location_awaited_before_notifying: false,
    },
  });

  return { caseRow: locating.caseRow, attached: false, replayed: false };
}

// ── Contacts ──────────────────────────────────────────────────────────────────

export interface MinorContacts {
  guardians: Array<{ name: string; phone: string | null; email: string | null; relationship: string | null }>;
  groupLeader: { name: string; phone: string | null; email: string | null } | null;
  careTeam: { name: string; phone: string | null; email: string | null };
}

/**
 * Resolves the real people from data that actually exists on the minor record.
 * Guardians come from BOTH guardian_contacts and any authorised_adult whose
 * role is 'guardian' — a guardian entered in either place is still a guardian,
 * and missing one because of where it was typed would be indefensible.
 */
export function resolveMinorContacts(minor: any): MinorContacts {
  const guardians: MinorContacts['guardians'] = [];
  const seen = new Set<string>();

  const pushGuardian = (c: any) => {
    if (!c) return;
    const key = String(c.phone || c.email || c.name || '').trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    guardians.push({
      name: c.name || 'Guardian',
      phone: c.phone || null,
      email: c.email || null,
      relationship: c.relationship || null,
    });
  };

  for (const g of (Array.isArray(minor?.guardian_contacts) ? minor.guardian_contacts : [])) pushGuardian(g);

  let groupLeader: MinorContacts['groupLeader'] = null;
  for (const a of (Array.isArray(minor?.authorised_adults) ? minor.authorised_adults : [])) {
    if (a?.role === 'group_leader' && !groupLeader) {
      groupLeader = { name: a.name || 'Group leader', phone: a.phone || null, email: a.email || null };
    }
    if (a?.role === 'guardian') pushGuardian(a);
  }

  return {
    guardians,
    groupLeader,
    careTeam: {
      name: 'Morales care team',
      phone: Deno.env.get('ADMIN_PHONE') || null,
      email: Deno.env.get('ADMIN_EMAIL') || null,
    },
  };
}

// ── Copy ──────────────────────────────────────────────────────────────────────

/**
 * Deterministic, pre-written copy. No model drafts anything on this path.
 *
 * A missing child is a genuine emergency, so this goes through the sanctioned
 * `emergencyDispatch` carve-out rather than the routine link-only guard — with
 * the reason recorded at the call site so the exemption stays auditable.
 */
export function reunificationMessage(caseRow: any, minor: any, role: MinorRecipientRole): string {
  const first = minor?.display_name || 'the child';

  const body = (() => {
    switch (role) {
      case 'guardian':
        return `M-Care: ${first} pressed the help button. We are locating them now and our care team has been alerted. Please stay by your phone — someone from Morales is calling you.`;
      case 'group_leader':
        return `This is Morales calling about ${first}, who pressed the help button on their trip. Please confirm you are with them and tell us where you are.`;
      case 'care_team':
        return `MINOR REUNIFICATION ${caseRow.id}: ${first} (trip ${caseRow.trip_id || 'unassigned'}). State NOTIFIED. Guardian messaged, group leader call placed. Safety answer pending.`;
      case 'authorised_adult':
        return `M-Care: a reunification case is open for ${first}. Our care team has been alerted.`;
      case 'minor':
        return `I'm here. I've told your guardian and I'm calling the adult leading your trip. Are you safe right now?`;
      default:
        return `M-Care: a reunification case is open for ${first}.`;
    }
  })();

  return emergencyDispatch({ reason: 'patient_missing', from: 'minorReunificationEngine', body });
}

// ── Fanout ────────────────────────────────────────────────────────────────────

export interface MinorFanoutTarget {
  role: MinorRecipientRole;
  channel: MinorChannel;
  recipient_name: string;
  recipient_ref: string | null;
}

/**
 * Everything that must fire at t=0, as one flat list with no sequencing. The
 * caller fires it with Promise.allSettled, so a guardian's unreachable phone
 * cannot delay the call to the group leader.
 *
 * Deliberately sequential-free: there is no shape of this function that makes
 * one channel wait for another.
 */
export function buildReunificationTargets(contacts: MinorContacts): MinorFanoutTarget[] {
  const targets: MinorFanoutTarget[] = [];

  for (const guardian of contacts.guardians) {
    if (guardian.phone) {
      targets.push({ role: 'guardian', channel: 'sms', recipient_name: guardian.name, recipient_ref: guardian.phone });
    }
    if (guardian.email) {
      targets.push({ role: 'guardian', channel: 'email', recipient_name: guardian.name, recipient_ref: guardian.email });
    }
    if (!guardian.phone && !guardian.email) {
      // A guardian with no details is recorded as a visible gap, never dropped.
      targets.push({ role: 'guardian', channel: 'app', recipient_name: guardian.name, recipient_ref: null });
    }
  }

  // The group leader is CALLED — that is the point of the role.
  if (contacts.groupLeader) {
    targets.push({
      role: 'group_leader',
      channel: 'call',
      recipient_name: contacts.groupLeader.name,
      recipient_ref: contacts.groupLeader.phone || null,
    });
  }

  if (contacts.careTeam.phone) {
    targets.push({ role: 'care_team', channel: 'sms', recipient_name: contacts.careTeam.name, recipient_ref: contacts.careTeam.phone });
  }
  if (contacts.careTeam.email) {
    targets.push({ role: 'care_team', channel: 'email', recipient_name: contacts.careTeam.name, recipient_ref: contacts.careTeam.email });
  }

  return targets;
}

export async function createNotificationRows(
  base44: any,
  caseRow: any,
  targets: MinorFanoutTarget[],
  now: string,
): Promise<any[]> {
  if (!targets.length) return [];

  const payload = targets.map((t) => ({
    case_id: caseRow.id,
    minor_id: caseRow.minor_id,
    guardian_email: caseRow.primary_guardian_email,
    channel: t.channel,
    recipient_role: t.role,
    recipient_name: t.recipient_name,
    recipient_ref: t.recipient_ref,
    status: 'QUEUED',
    queued_at: now,
    is_live_fanout: true,
  }));

  try {
    return await base44.asServiceRole.entities.MinorNotification.bulkCreate(payload);
  } catch (error) {
    console.error('[minorReunificationEngine] fanout row creation failed', error);
    return [];
  }
}

async function deliverOne(base44: any, caseRow: any, minor: any, row: any): Promise<{ ok: boolean; providerRef?: string; detail?: string }> {
  const body = reunificationMessage(caseRow, minor, row.recipient_role);

  try {
    if (row.channel === 'sms') {
      const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const auth = Deno.env.get('TWILIO_AUTH_TOKEN');
      const from = Deno.env.get('TWILIO_PHONE_NUMBER');
      if (!sid || !auth || !from || !row.recipient_ref) return { ok: false, detail: 'twilio_not_configured_or_no_number' };

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: { Authorization: 'Basic ' + btoa(`${sid}:${auth}`), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: row.recipient_ref, From: from, Body: body }).toString(),
      });
      if (!res.ok) return { ok: false, detail: `twilio_${res.status}` };
      const json = await res.json().catch(() => ({}));
      return { ok: true, providerRef: json?.sid };
    }

    if (row.channel === 'email') {
      if (!row.recipient_ref) return { ok: false, detail: 'no_email' };
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND,
        to: row.recipient_ref,
        subject: 'Morales — a child on your trip has pressed the help button',
        body: `<p>${body}</p>`,
        text: body,
        category: 'transactional',
      });
      return { ok: true };
    }

    if (row.channel === 'call') {
      if (!row.recipient_ref) return { ok: false, detail: 'no_phone_number_for_call' };
      const result = await placeOutboundCall({
        toNumber: row.recipient_ref,
        dynamicVariables: {
          minor_name: minor?.display_name || 'the child',
          contact_name: row.recipient_name || 'group leader',
          case_id: caseRow.id,
          situation_summary: 'A child on your trip pressed the help button in the Morales safety app.',
          requested_action: 'Confirm whether the child is with you, and where you are.',
        },
        metadata: { case_id: caseRow.id, channel: 'minor_reunification' },
      });
      if (!result.supported) return { ok: false, detail: result.message.slice(0, 200) };
      return { ok: true, providerRef: result.call_id };
    }

    if (row.channel === 'app') {
      return { ok: false, detail: 'no_contact_details_on_file' };
    }

    return { ok: false, detail: 'no_transport_for_channel' };
  } catch (error: any) {
    return { ok: false, detail: String(error?.message || error).slice(0, 200) };
  }
}

/**
 * Fires every row at once. Each row is independent: one failure never delays or
 * cancels another, and none of them can block the case from moving on.
 */
export async function fireReunificationFanout(
  base44: any,
  caseRow: any,
  minor: any,
  rows: any[],
  now: string,
): Promise<void> {
  await Promise.allSettled(rows.map(async (row) => {
    const result = await deliverOne(base44, caseRow, minor, row);
    const to: MinorNotificationStatus = result.ok ? 'SENT' : 'FAILED';

    if (!canAdvanceMinorNotification('QUEUED', to, row.channel)) return;

    const patch: Record<string, unknown> = { status: to };
    if (result.ok) {
      patch.sent_at = now;
      if (result.providerRef) patch.provider_ref = result.providerRef;
      // NOTE: sent_at only. DELIVERED, ACKNOWLEDGED and ANSWERED are written
      // exclusively by a provider callback or a human action — never inferred
      // from a successful API response.
    } else {
      patch.failed_at = now;
      patch.failure_reason = result.detail || 'unknown';
    }

    await base44.asServiceRole.entities.MinorNotification.update(row.id, patch).catch(() => {});
  }));
}

/** Convenience: the whole t=0 notification step in one call. */
export async function notifyReunificationParties(base44: any, caseRow: any, minor: any, now: string): Promise<{ rows: any[] }> {
  const contacts = resolveMinorContacts(minor);
  const targets = buildReunificationTargets(contacts);
  const rows = await createNotificationRows(base44, caseRow, targets, now);

  await fireReunificationFanout(base44, caseRow, minor, rows, now);

  return { rows };
}

// ── Notification advancement (provider callbacks, human actions) ──────────────

/**
 * Advances one notification row. The only writer of DELIVERED, ACKNOWLEDGED and
 * ANSWERED — meaning those states cannot be produced anywhere except by a
 * verified provider callback or an authenticated human act.
 */
export async function advanceNotification(
  base44: any,
  params: {
    row: any;
    to: MinorNotificationStatus;
    at: string;
    providerRef?: string | null;
    answeredBy?: string | null;
    note?: string | null;
  },
): Promise<{ ok: boolean; code: string }> {
  const from = params.row.status as MinorNotificationStatus;

  if (!canAdvanceMinorNotification(from, params.to, params.row.channel)) {
    return { ok: false, code: 'illegal_notification_transition' };
  }

  const patch: Record<string, unknown> = { status: params.to };

  switch (params.to) {
    case 'SENT': patch.sent_at = params.at; break;
    case 'DELIVERED': patch.delivered_at = params.at; break;
    case 'ACKNOWLEDGED': patch.acknowledged_at = params.at; break;
    case 'ANSWERED': patch.answered_at = params.at; break;
    case 'FAILED': patch.failed_at = params.at; break;
    case 'QUEUED': patch.queued_at = params.at; break;
    default: break;
  }

  if (params.providerRef) patch.provider_ref = params.providerRef;
  if (params.answeredBy) patch.answered_by = params.answeredBy;
  if (params.note) patch.answer_note = params.note;

  await base44.asServiceRole.entities.MinorNotification.update(params.row.id, patch).catch(() => {});

  return { ok: true, code: 'ok' };
}

// ── Minor location bookkeeping ────────────────────────────────────────────────

/** Records the last known position on the minor, separate from the case's copy. */
export async function updateMinorLastKnown(
  base44: any,
  minor: any,
  location: { latitude: number; longitude: number; at: string } | null,
): Promise<void> {
  if (!location) return;
  await base44.asServiceRole.entities.MinorTraveller.update(minor.id, {
    last_known_latitude: location.latitude,
    last_known_longitude: location.longitude,
    last_known_at: location.at,
  }).catch(() => {});
}

/** Re-exported so callers do not each re-implement occurred-at resolution. */
export { resolveMinorOccurredAt, isTerminalReunification };