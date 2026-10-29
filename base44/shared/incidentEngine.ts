import {
  canTransitionIncident,
  canAdvanceNotification,
  rankResponders,
  nextOfferAction,
  offerExpiresAt,
  countLiveOffers,
  DEFAULT_OFFER_TIMEOUT_SECONDS,
  DEFAULT_MAX_OFFERS,
  verificationTierScore,
  type RankableResponder,
  type IncidentStatus,
  type NotificationStatus,
  type FanoutTarget,
} from './incidentDispatch.ts';

/**
 * incidentEngine — the only place in the app allowed to write Incident,
 * IncidentNotification, DispatchOffer and IncidentAuditEvent.
 *
 * Every entry point (openIncident, respondToDispatchOffer, sweepDispatchOffers)
 * goes through the same three helpers, so there is exactly one definition of
 * "fire the fanout", one definition of "advance the dispatch", and one
 * definition of "move the incident". No model is invoked anywhere in this
 * file, and nothing here calls a payments, escrow or account-status API.
 */

export const APP_URL = (Deno.env.get('APP_URL') || 'https://sentinel-dental-care.base44.app').replace(/\/$/, '');

const BRAND = 'M-Care Medical Travel Safety';

// ── Audit ─────────────────────────────────────────────────────────────────────

/**
 * Append one immutable audit row. Deliberately tolerant: an audit write
 * failure must never abort a live dispatch, but it is logged loudly because a
 * missing audit trail on an emergency is itself an incident.
 */
export async function appendAudit(base44: any, params: {
  incident_id: string;
  patient_email: string;
  subject_type: 'incident' | 'notification' | 'offer';
  subject_id: string;
  from_state?: string | null;
  to_state: string;
  actor: string;
  actor_type: 'engine' | 'responder' | 'care_team' | 'patient' | 'admin' | 'provider_callback' | 'system';
  channel?: string | null;
  timestamp: string;
  evidence?: Record<string, unknown>;
}): Promise<void> {
  try {
    const existing = await base44.asServiceRole.entities.IncidentAuditEvent
      .filter({ incident_id: params.incident_id }, '-sequence', 1)
      .catch(() => []);
    const nextSeq = (Array.isArray(existing) && existing[0]?.sequence ? Number(existing[0].sequence) : 0) + 1;

    await base44.asServiceRole.entities.IncidentAuditEvent.create({
      incident_id: params.incident_id,
      patient_email: params.patient_email,
      sequence: nextSeq,
      subject_type: params.subject_type,
      subject_id: params.subject_id,
      from_state: params.from_state ?? null,
      to_state: params.to_state,
      actor: params.actor,
      actor_type: params.actor_type,
      channel: params.channel ?? null,
      timestamp: params.timestamp,
      evidence: params.evidence || {},
      immutable: false,
    });
  } catch (error) {
    console.error('[incidentEngine] audit write failed', params.incident_id, params.to_state, error);
  }
}

// ── Incident transitions ──────────────────────────────────────────────────────

export async function moveIncident(base44: any, params: {
  incident: any;
  to: IncidentStatus;
  actor: string;
  actor_type: 'engine' | 'responder' | 'care_team' | 'patient' | 'admin' | 'system';
  channel?: string | null;
  now: string;
  evidence?: Record<string, unknown>;
  extraFields?: Record<string, unknown>;
}): Promise<any> {
  const from = params.incident.status as IncidentStatus;

  if (!canTransitionIncident(from, params.to)) {
    console.error('[incidentEngine] illegal incident transition refused', {
      incident_id: params.incident.id, from, to: params.to,
    });
    return params.incident;
  }

  const patch: Record<string, unknown> = { status: params.to, ...(params.extraFields || {}) };
  if (params.to === 'RESOLVED') { patch.resolved_at = params.now; patch.resolved_by = params.actor; }

  const updated = await base44.asServiceRole.entities.Incident.update(params.incident.id, patch);

  await appendAudit(base44, {
    incident_id: params.incident.id,
    patient_email: params.incident.patient_email,
    subject_type: 'incident',
    subject_id: params.incident.id,
    from_state: from,
    to_state: params.to,
    actor: params.actor,
    actor_type: params.actor_type,
    channel: params.channel ?? null,
    timestamp: params.now,
    evidence: params.evidence,
  });

  return { ...params.incident, ...patch };
}

// ── Policy & contacts ─────────────────────────────────────────────────────────

export async function loadPolicy(base44: any, countryCode?: string | null): Promise<any | null> {
  if (!countryCode) return null;
  const rows = await base44.asServiceRole.entities.EmergencyDispatchPolicy
    .filter({ country_code: String(countryCode).toUpperCase(), is_active: true })
    .catch(() => []);
  return (rows as any[])[0] || null;
}

/**
 * Resolves the real people to notify from data that actually exists. A party
 * with no contact details is still returned so buildFanoutTargets can record
 * an 'app' row — an unreachable guardian must be visible, not absent.
 */
export async function resolveContacts(base44: any, incident: any, policy: any): Promise<any> {
  const contacts: any = {
    patient: {
      name: incident.patient_name,
      phone: incident.patient_phone || null,
      email: incident.patient_email,
    },
    guardian: null,
    doctor: null,
    companion: null,
    careTeam: policy?.care_team_contact
      ? {
        name: policy.care_team_contact.name || 'M-Care care team',
        phone: policy.care_team_contact.phone || Deno.env.get('ADMIN_PHONE') || null,
        email: policy.care_team_contact.email || Deno.env.get('ADMIN_EMAIL') || null,
      }
      : {
        name: 'M-Care care team',
        phone: Deno.env.get('ADMIN_PHONE') || null,
        email: Deno.env.get('ADMIN_EMAIL') || null,
      },
  };

  if (incident.case_id) {
    const caseRow = await base44.asServiceRole.entities.CaseRecord.get(incident.case_id).catch(() => null);
    if (caseRow) {
      if (caseRow.emergency_contact_number || caseRow.emergency_contact_email) {
        contacts.guardian = {
          name: caseRow.emergency_contact || 'Emergency contact',
          phone: caseRow.emergency_contact_number || null,
          email: caseRow.emergency_contact_email || null,
        };
      }
      if (caseRow.doctor_email) {
        contacts.doctor = {
          name: caseRow.doctor_selected || 'Treating doctor',
          phone: null,
          email: caseRow.doctor_email,
        };
      }
    }

    const companions = await base44.asServiceRole.entities.CompanionAssignment
      .filter({ case_id: incident.case_id })
      .catch(() => []);
    const assignment = (companions as any[])[0];
    if (assignment?.companion_id) {
      const companion = await base44.asServiceRole.entities.Companion.get(assignment.companion_id).catch(() => null);
      if (companion) {
        contacts.companion = {
          name: companion.full_name || companion.name || 'Companion',
          phone: companion.phone || null,
          email: companion.email || null,
        };
      }
    }
  }

  return contacts;
}

// ── Fanout ────────────────────────────────────────────────────────────────────

/** Deterministic, pre-written copy. No model drafts anything on this path. */
export function fanoutMessage(incident: any, role: string): string {
  const where = incident.location_label ? ` near ${incident.location_label}` : '';
  switch (role) {
    case 'patient':
      return `Your emergency alert is live${where}. I'm alerting your care team and looking for the nearest responder now. Stay where you are if it is safe to do so.`;
    case 'guardian':
      return `An emergency alert has been raised for someone in your care${where}. The M-Care care team has been notified and a responder is being contacted.`;
    case 'doctor':
      return `An emergency alert has been raised for a patient in your care${where}. The M-Care care team has been notified.`;
    case 'companion':
      return `An emergency alert has been raised for a traveller you are accompanying${where}. The M-Care care team has been notified.`;
    case 'care_team':
      return `EMERGENCY: ${incident.type} incident${where}. Fanout sent, dispatch starting.`;
    case 'emergency_services':
      return `Emergency alert for a traveller${where}. Their care team has been notified.`;
    default:
      return `An emergency alert has been raised${where}.`;
  }
}

export function offerMessage(incident: any, offer: any): string {
  const where = incident.location_label ? ` near ${incident.location_label}` : '';
  return `MORALES DISPATCH: ${incident.type} emergency${where}. Accept: ${APP_URL}/dispatch-offer/${offer.offer_token} — offer expires in ${Math.round((new Date(offer.expires_at).getTime() - new Date(offer.offered_at).getTime()) / 1000)}s.`;
}

export async function createNotificationRows(base44: any, incident: any, targets: FanoutTarget[], now: string): Promise<any[]> {
  if (!targets.length) return [];
  const payload = targets.map((t) => ({
    incident_id: incident.id,
    patient_email: incident.patient_email,
    channel: t.channel,
    recipient_role: t.role,
    recipient_name: t.recipient_name || null,
    recipient_ref: t.phone || t.email || null,
    status: 'QUEUED',
    queued_at: now,
    is_live_fanout: true,
  }));

  try {
    return await base44.asServiceRole.entities.IncidentNotification.bulkCreate(payload);
  } catch (error) {
    console.error('[incidentEngine] fanout row creation failed', error);
    return [];
  }
}

async function deliverOne(base44: any, incident: any, row: any): Promise<{ ok: boolean; providerRef?: string; detail?: string }> {
  const body = fanoutMessage(incident, row.recipient_role);

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
        subject: `Emergency alert — ${BRAND}`,
        body: `<p>${body}</p>`,
        text: body,
        category: 'transactional',
      });
      return { ok: true };
    }

    if (row.channel === 'push') {
      await base44.asServiceRole.functions.invoke('sendPushNotification', {
        user_email: incident.patient_email,
        title: 'M-Care emergency',
        body,
        url: `${APP_URL}/emergency`,
        urgent: true,
        internal_secret: Deno.env.get('CRON_SECRET'),
      });
      return { ok: true };
    }

    if (row.channel === 'emergency_number') {
      // Dialling is deliberately NOT automated here. Placing a live call to
      // emergency services from a server, with no human on the line, is not
      // something this build does — see the final report. The row stays
      // QUEUED and is surfaced to the care team as a required human action.
      return { ok: false, detail: 'human_dial_required' };
    }

    // 'app' / 'call' — no transport available; recorded for visibility.
    return { ok: false, detail: 'no_transport_for_channel' };
  } catch (error: any) {
    return { ok: false, detail: String(error?.message || error).slice(0, 200) };
  }
}

/**
 * Fires the whole fanout at once. Every row is independent: one failure never
 * delays or cancels another, and the caller never awaits this before starting
 * dispatch.
 */
export async function fireFanout(base44: any, incident: any, rows: any[], now: string): Promise<void> {
  await Promise.allSettled(rows.map(async (row) => {
    const result = await deliverOne(base44, incident, row);
    const to: NotificationStatus = result.ok ? 'SENT' : 'FAILED';

    if (!canAdvanceNotification('QUEUED', to)) return;

    const patch: Record<string, unknown> = { status: to };
    if (result.ok) {
      patch.sent_at = now;
      if (result.providerRef) patch.provider_ref = result.providerRef;
      // NOTE: sent_at only. DELIVERED is set exclusively by a provider
      // callback or a human acknowledgement — never inferred from a 200.
    } else {
      patch.failed_at = now;
      patch.failure_reason = result.detail || 'unknown';
    }

    await base44.asServiceRole.entities.IncidentNotification.update(row.id, patch).catch(() => {});

    await appendAudit(base44, {
      incident_id: incident.id,
      patient_email: incident.patient_email,
      subject_type: 'notification',
      subject_id: row.id,
      from_state: 'QUEUED',
      to_state: to,
      actor: 'dispatch_engine',
      actor_type: 'engine',
      channel: row.channel,
      timestamp: now,
      evidence: { recipient_role: row.recipient_role, detail: result.detail || null, provider_ref: result.providerRef || null },
    });
  }));
}

// ── Ranking ───────────────────────────────────────────────────────────────────

async function loadResponderEntity(base44: any, entry: any): Promise<any | null> {
  const id = entry?.responder_id;
  if (!id) return null;
  const entityMap: Record<string, string> = {
    security_agency: 'SecurityAgency',
    taxi_service: 'TaxiService',
    companion: 'Companion',
    medical: 'Doctor',
  };
  const entityName = entityMap[entry.responder_type];
  if (!entityName) return null;
  return await base44.asServiceRole.entities[entityName].get(id).catch(() => null);
}

/**
 * Loads and ranks the pool. Verification status is read LIVE from the partner
 * record — being listed in a policy can never rescue a suspended or denied
 * responder, and an ETA is only used when the partner actually publishes one.
 */
export async function loadRankedPool(base44: any, policy: any): Promise<RankableResponder[]> {
  const entries = Array.isArray(policy?.responder_pool) ? policy.responder_pool : [];
  if (!entries.length) return [];

  const loaded = await Promise.all(entries.map((entry: any) => loadResponderEntity(base44, entry)));

  // Third ranking key, computed from our own accepted offers rather than a
  // field anyone can set.
  const acceptedOffers = await base44.asServiceRole.entities.DispatchOffer
    .filter({ status: 'ACCEPTED' }, '-accepted_at', 200)
    .catch(() => []);
  const lastAccepted: Record<string, string> = {};
  for (const offer of acceptedOffers as any[]) {
    if (offer.responder_id && offer.accepted_at && !lastAccepted[offer.responder_id]) {
      lastAccepted[offer.responder_id] = offer.accepted_at;
    }
  }

  const ranked = entries.map((entry: any, index: number) => {
    const entity = loaded[index];
    if (!entity) return null;

    const name = entity.agency_name || entity.company_name || entity.full_name || entity.name || 'Responder';
    const phone = entity.phone || entity.mobile || null;
    const email = entity.email || null;

    // A responder we cannot reach cannot help.
    if (!phone && !email) return null;

    const declaredMinutes = Number(entity.response_time_minutes);
    const hasEta = Number.isFinite(declaredMinutes) && declaredMinutes > 0;

    return {
      responder_id: entity.id,
      responder_type: entry.responder_type,
      display_name: name,
      verification_tier: verificationTierScore(entity.verification_status),
      eta_seconds: hasEta ? Math.round(declaredMinutes * 60) : null,
      eta_source: hasEta ? 'declared' : 'unknown',
      last_accepted_at: lastAccepted[entity.id] || null,
      phone,
      email,
    } as RankableResponder;
  }).filter(Boolean) as RankableResponder[];

  return rankResponders(ranked);
}

// ── Sequential dispatch ───────────────────────────────────────────────────────

export async function loadOffers(base44: any, incidentId: string): Promise<any[]> {
  const offers = await base44.asServiceRole.entities.DispatchOffer
    .filter({ incident_id: incidentId }, 'attempt_number', 50)
    .catch(() => []);
  return Array.isArray(offers) ? offers : [];
}

/**
 * The only function that creates a DispatchOffer. Because it can return at
 * most one responder, and it refuses to run while a live offer exists, the
 * "one offer at a time, never a broadcast" rule is structural.
 */
export async function advanceDispatch(base44: any, params: {
  incident: any;
  policy: any;
  now: string;
  reason: string;
}): Promise<{ incident: any; offer: any | null; unresolved: boolean }> {
  const { incident, policy, now, reason } = params;

  const offers = await loadOffers(base44, incident.id);

  // Hard invariant: never a second live offer.
  if (countLiveOffers(offers) > 0) {
    console.error('[incidentEngine] refusing to create an offer while one is live', incident.id);
    return { incident, offer: null, unresolved: false };
  }

  const ranked = await loadRankedPool(base44, policy);
  const attemptedIds = offers.map((o: any) => o.responder_id).filter(Boolean);
  const maxOffers = Number(policy?.max_offers) || DEFAULT_MAX_OFFERS;

  const decision = nextOfferAction({
    ranked,
    attemptedIds,
    attemptsMade: offers.length,
    maxOffers,
  });

  if (!decision.allowed) {
    const unresolvedReason = ranked.length === 0
      ? 'no_eligible_responders'
      : decision.reason;

    const updated = await moveIncident(base44, {
      incident,
      to: 'UNRESOLVED',
      actor: 'dispatch_engine',
      actor_type: 'engine',
      now,
      evidence: { reason: unresolvedReason, attempts: offers.length, pool_size: ranked.length, trigger: reason },
      extraFields: { unresolved_reason: unresolvedReason },
    });

    await pageCareTeam(base44, updated, policy, unresolvedReason, now);
    return { incident: updated, offer: null, unresolved: true };
  }

  const responder = decision.responder;
  const timeout = Number(policy?.offer_timeout_seconds) || DEFAULT_OFFER_TIMEOUT_SECONDS;

  const offer = await base44.asServiceRole.entities.DispatchOffer.create({
    incident_id: incident.id,
    patient_email: incident.patient_email,
    offer_token: crypto.randomUUID(),
    responder_id: responder.responder_id,
    responder_type: responder.responder_type,
    display_name: responder.display_name,
    responder_phone: responder.phone || null,
    responder_email: responder.email || null,
    rank_position: ranked.findIndex((r) => r.responder_id === responder.responder_id) + 1,
    attempt_number: offers.length + 1,
    verification_tier: responder.verification_tier,
    eta_seconds: responder.eta_seconds,
    eta_source: responder.eta_source,
    last_accepted_at: responder.last_accepted_at,
    status: 'OFFERED',
    offered_at: now,
    expires_at: offerExpiresAt(now, timeout),
  });

  const moved = await moveIncident(base44, {
    incident,
    to: 'DISPATCHING',
    actor: 'dispatch_engine',
    actor_type: 'engine',
    now,
    evidence: {
      trigger: reason,
      responder_id: responder.responder_id,
      rank_position: offer.rank_position,
      verification_tier: responder.verification_tier,
      eta_seconds: responder.eta_seconds,
      eta_source: responder.eta_source,
      timeout_seconds: timeout,
      offer_token_issued: true,
    },
  });

  await appendAudit(base44, {
    incident_id: incident.id,
    patient_email: incident.patient_email,
    subject_type: 'offer',
    subject_id: offer.id,
    from_state: 'QUEUED',
    to_state: 'OFFERED',
    actor: 'dispatch_engine',
    actor_type: 'engine',
    channel: 'sms',
    timestamp: now,
    evidence: { attempt_number: offer.attempt_number, responder_id: responder.responder_id, expires_at: offer.expires_at },
  });

  // The offer itself is one message to one responder — sequential dispatch.
  await deliverOffer(base44, incident, offer, responder);

  return { incident: moved, offer, unresolved: false };
}

async function deliverOffer(base44: any, incident: any, offer: any, responder: RankableResponder): Promise<void> {
  const body = offerMessage(incident, offer);

  const row = await base44.asServiceRole.entities.IncidentNotification.create({
    incident_id: incident.id,
    patient_email: incident.patient_email,
    channel: 'sms',
    recipient_role: 'responder',
    recipient_name: responder.display_name,
    recipient_ref: responder.phone || responder.email || null,
    status: 'QUEUED',
    queued_at: offer.offered_at,
    is_live_fanout: false,
  }).catch(() => null);

  if (!row) return;

  const result = responder.phone
    ? await deliverOne(base44, incident, { ...row, channel: 'sms', recipient_ref: responder.phone })
    : await deliverOne(base44, incident, { ...row, channel: 'email', recipient_ref: responder.email });

  const to: NotificationStatus = result.ok ? 'SENT' : 'FAILED';
  const patch: Record<string, unknown> = { status: to };
  if (result.ok) { patch.sent_at = offer.offered_at; if (result.providerRef) patch.provider_ref = result.providerRef; }
  else { patch.failed_at = offer.offered_at; patch.failure_reason = result.detail || 'unknown'; }

  await base44.asServiceRole.entities.IncidentNotification.update(row.id, patch).catch(() => {});

  // A responder we could not even reach should not burn a 90-second window.
  if (!result.ok) {
    await base44.asServiceRole.entities.DispatchOffer
      .update(offer.id, { status: 'WITHDRAWN', responded_at: offer.offered_at })
      .catch(() => {});
  }
}

/** Pages the human care team when dispatch cannot resolve. Never cancels the fanout. */
export async function pageCareTeam(base44: any, incident: any, policy: any, reason: string, now: string): Promise<void> {
  const contacts = await resolveContacts(base44, incident, policy);
  const targets: FanoutTarget[] = [];

  if (contacts.careTeam?.phone) targets.push({ role: 'care_team', channel: 'sms', recipient_name: contacts.careTeam.name, phone: contacts.careTeam.phone });
  if (contacts.careTeam?.email) targets.push({ role: 'care_team', channel: 'email', recipient_name: contacts.careTeam.name, email: contacts.careTeam.email });

  for (const extra of (Array.isArray(policy?.escalation_contacts) ? policy.escalation_contacts : [])) {
    if (extra?.phone) targets.push({ role: 'care_team', channel: 'sms', recipient_name: extra.name || 'Escalation contact', phone: extra.phone });
    if (extra?.email) targets.push({ role: 'care_team', channel: 'email', recipient_name: extra.name || 'Escalation contact', email: extra.email });
  }

  const rows = await createNotificationRows(base44, incident, targets, now);
  await fireFanout(base44, incident, rows, now);

  await appendAudit(base44, {
    incident_id: incident.id,
    patient_email: incident.patient_email,
    subject_type: 'incident',
    subject_id: incident.id,
    from_state: incident.status,
    to_state: 'UNRESOLVED',
    actor: 'dispatch_engine',
    actor_type: 'engine',
    timestamp: now,
    evidence: { escalated_to_human: true, reason, paged: targets.length, fanout_kept_live: true },
  });
}

/** Tells the patient and the standing fanout that a responder is actually moving. */
export async function notifyResponderMoving(base44: any, params: {
  incident: any;
  offer: any;
  policy: any;
  now: string;
}): Promise<void> {
  const contacts = await resolveContacts(base44, params.incident, params.policy);
  const targets: FanoutTarget[] = [];

  const name = params.offer.display_name || 'A responder';
  const eta = params.offer.eta_seconds ? ` About ${Math.round(params.offer.eta_seconds / 60)} minutes away.` : '';

  if (contacts.patient?.phone) targets.push({ role: 'patient', channel: 'sms', recipient_name: contacts.patient.name, phone: contacts.patient.phone });
  if (contacts.patient?.email) targets.push({ role: 'patient', channel: 'email', recipient_name: contacts.patient.name, email: contacts.patient.email });

  for (const role of ['guardian', 'doctor', 'companion'] as const) {
    const c = contacts[role];
    if (!c) continue;
    if (c.phone) targets.push({ role, channel: 'sms', recipient_name: c.name, phone: c.phone });
    if (c.email) targets.push({ role, channel: 'email', recipient_name: c.name, email: c.email });
  }

  const rows = await createNotificationRows(base44, params.incident, targets, params.now);

  await Promise.allSettled(rows.map(async (row) => {
    const result = await deliverOne(base44, params.incident, {
      ...row,
      recipient_role: row.recipient_role,
    });
    const to: NotificationStatus = result.ok ? 'SENT' : 'FAILED';
    const patch: Record<string, unknown> = { status: to };
    if (result.ok) patch.sent_at = params.now; else { patch.failed_at = params.now; patch.failure_reason = result.detail || 'unknown'; }
    await base44.asServiceRole.entities.IncidentNotification.update(row.id, patch).catch(() => {});
  }));

  await appendAudit(base44, {
    incident_id: params.incident.id,
    patient_email: params.incident.patient_email,
    subject_type: 'incident',
    subject_id: params.incident.id,
    from_state: 'DISPATCHING',
    to_state: 'ASSIGNED',
    actor: 'dispatch_engine',
    actor_type: 'engine',
    timestamp: params.now,
    evidence: { responder_id: params.offer.responder_id, responder_name: name, eta_note: eta.trim() || null, notified: rows.length },
  });
}