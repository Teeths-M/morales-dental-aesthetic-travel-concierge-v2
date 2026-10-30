/**
 * tripCardSetEngine — issuing, replacing and chasing a trip's card set.
 *
 * Everything that writes a card lives here, so there is one place that knows the
 * four rules: issue from the trip pack only, two cards at a time, three live at
 * most, and never a card with no local number on its face.
 *
 * The tokens are stored on each instance. That is what makes a resend a lookup
 * instead of a second mint: if the traveller asks for their pack again, or the
 * workflow retries, the cards that already exist are the cards that go back out.
 * The one thing that replaces them is an itinerary change or an explicit revoke.
 */

import {
  signTripCardToken,
  expiresAtForTripEnd,
  deriveTripEnd,
  languageForCountry,
} from './tripCard.ts';
import { isFeatureEnabled } from './featureFlags.ts';
import { buildCardPdf } from './tripCardPdf.ts';
import {
  TRIP_CARD_SET_FLAG,
  INITIAL_CARD_COUNT,
  MAX_ACTIVE_INSTANCES,
  PRINT_INSTRUCTION,
  shortRefFor,
  readinessDueAt,
  readinessCycleKey,
  isReadinessDue,
  bookingIsConfirmed,
  paymentIsCaptured,
  firstFlightAt,
} from './tripCardSet.ts';

const APP_URL = (Deno.env.get('APP_URL') || 'https://sentinel-dental-care.base44.app').replace(/\/$/, '');

function cardUrlFor(token: string): string {
  return `${APP_URL}/functions/tripCardPage?t=${encodeURIComponent(token)}`;
}

// ── The number on the face ────────────────────────────────────────────────────

export interface LocalNumber {
  number: string;
  label: string | null;
  whatsapp: string | null;
}

/**
 * M-Care's own reachable number in the trip country.
 *
 * Not the emergency services number: a bystander holding a prepaid phone either
 * cannot reach a foreign toll-free or will not trust it if they can, and the card
 * face is exactly the situation where nobody has time to explain that the call is
 * free. So this reads the country's own record, and returns nothing rather than a
 * guess. Nothing means issuance blocks.
 */
export async function resolveLocalNumber(
  base44: any,
  params: { countryName?: string | null },
): Promise<LocalNumber | null> {
  const name = String(params.countryName || '').trim().toLowerCase();
  if (!name) return null;

  const rows = await base44.asServiceRole.entities.EmergencyContacts
    .filter({}, '-created_date', 300)
    .catch(() => []);

  const hit = (Array.isArray(rows) ? rows : []).find(
    (r: any) =>
      String(r.country_name || '').trim().toLowerCase() === name &&
      String(r.mcare_local_number || '').trim(),
  );

  if (!hit) return null;

  return {
    number: String(hit.mcare_local_number).trim(),
    label: hit.mcare_local_number_label ? String(hit.mcare_local_number_label) : null,
    whatsapp: hit.mcare_local_whatsapp_number ? String(hit.mcare_local_whatsapp_number) : null,
  };
}

// ── Instances ─────────────────────────────────────────────────────────────────

export async function loadInstances(base44: any, tripCardId: string, limit = 12): Promise<any[]> {
  const rows = await base44.asServiceRole.entities.TripCardInstance
    .filter({ trip_card_id: tripCardId }, '-issued_at', limit)
    .catch(() => []);
  return Array.isArray(rows) ? rows : [];
}

export async function activeInstances(base44: any, tripCardId: string): Promise<any[]> {
  const rows = await loadInstances(base44, tripCardId, 20);
  return rows.filter((r) => r.status === 'active');
}

async function createInstance(base44: any, params: {
  card: any;
  label: 'card_1' | 'card_2' | 'replacement';
  reason: string;
  replacesInstanceId?: string | null;
  actor: string;
  now: string;
}): Promise<any> {
  const { card } = params;
  const tokenId = crypto.randomUUID();

  const token = await signTripCardToken({
    cardId: tokenId,
    tripId: card.trip_id,
    country: card.country_code,
    lang: card.language,
    expiresAtMs: new Date(card.expires_at).getTime(),
  });

  return base44.asServiceRole.entities.TripCardInstance.create({
    trip_card_id: card.id,
    trip_id: card.trip_id,
    patient_email: card.patient_email || null,
    short_ref: shortRefFor(tokenId),
    token_id: tokenId,
    token,
    card_url: cardUrlFor(token),
    label: params.label,
    status: 'active',
    issued_at: params.now,
    issued_by: params.actor,
    issued_reason: params.reason,
    replaces_instance_id: params.replacesInstanceId || null,
    expires_at: card.expires_at,
    scan_count: 0,
  });
}

async function syncActiveCount(base44: any, card: any): Promise<number> {
  const live = await activeInstances(base44, card.id);
  await base44.asServiceRole.entities.TripEmergencyCard
    .update(card.id, { active_instance_count: live.length })
    .catch(() => {});
  return live.length;
}

// ── Tasks and the care-team message ───────────────────────────────────────────

export async function createTask(base44: any, params: {
  card?: any;
  tripId: string;
  reason: 'missing_local_number' | 'active_instance_cap_exceeded' | 'issuance_blocked';
  detail: string;
  now: string;
}): Promise<any> {
  const open = await base44.asServiceRole.entities.TripCardTask
    .filter({ trip_id: params.tripId, reason: params.reason, status: 'open' }, '-created_date', 5)
    .catch(() => []);

  if (Array.isArray(open) && open.length) return open[0];

  return base44.asServiceRole.entities.TripCardTask.create({
    trip_id: params.tripId,
    trip_card_id: params.card?.id || null,
    patient_email: params.card?.patient_email || null,
    reason: params.reason,
    detail: String(params.detail || '').slice(0, 1200),
    status: 'open',
    created_at: params.now,
  }).catch(() => null);
}

/**
 * A message to the person on call, not a row in a screen nobody opens.
 *
 * At pilot scale the care team is one person who is not sitting in an admin
 * console, so this goes out as an SMS. Email is the fallback if Twilio is not
 * configured or the send fails.
 */
export async function messageCareTeam(base44: any, text: string): Promise<{ sent: boolean; channel: string }> {
  const body = String(text || '').slice(0, 480);

  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_PHONE_NUMBER');
  const to = Deno.env.get('ADMIN_PHONE');

  if (sid && token && from && to) {
    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }),
      });
      if (res.ok) return { sent: true, channel: 'sms' };
    } catch (error) {
      console.error('[tripCardSetEngine] care-team sms failed', error);
    }
  }

  const email = Deno.env.get('ADMIN_EMAIL');
  if (email) {
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: 'M-Care trip card set needs a human',
        body,
      });
      return { sent: true, channel: 'email' };
    } catch (error) {
      console.error('[tripCardSetEngine] care-team email failed', error);
    }
  }

  return { sent: false, channel: 'none' };
}

// ── Issuing the set ───────────────────────────────────────────────────────────

export interface EnsureResult {
  ok: boolean;
  created: boolean;
  card?: any;
  instances?: any[];
  error?: string;
  blocked_reason?: string;
  task?: any;
  module_enabled?: boolean;
}

/**
 * Issue a trip's cards, or hand back the ones it already has.
 *
 * Called by the trip-pack delivery path, which is the only place a card gets into
 * a hand. Gated on a confirmed booking AND captured payment, because those are
 * two different facts: one says the trip is happening, the other says the pack is
 * going out.
 */
export async function ensureCardSet(base44: any, params: {
  caseRow: any;
  countryCode: string;
  countryName?: string | null;
  language?: string | null;
  localNumberOverride?: string | null;
  actor: string;
  now: string;
  reissueReason?: 'itinerary_change' | null;
  enforceGate?: boolean;
}): Promise<EnsureResult> {
  const enabled = await isFeatureEnabled(base44, TRIP_CARD_SET_FLAG, false);
  if (!enabled) {
    return { ok: false, created: false, error: 'module_disabled', blocked_reason: 'module_disabled', module_enabled: false };
  }

  const c = params.caseRow;
  const gate = params.enforceGate !== false;

  if (gate && !bookingIsConfirmed(c)) {
    return { ok: false, created: false, error: 'The booking is not confirmed yet, so there is no pack to put a card in.', blocked_reason: 'booking_not_confirmed' };
  }
  if (gate && !paymentIsCaptured(c)) {
    return { ok: false, created: false, error: 'Payment has not been captured yet, so the pack is not being delivered.', blocked_reason: 'payment_not_captured' };
  }

  const countryCode = String(params.countryCode || '').toUpperCase().slice(0, 2);
  const countryName = params.countryName || c?.procedure_country || null;
  const tripId = String(c?.id || '');
  const language = params.language || languageForCountry(countryCode);

  const override = String(params.localNumberOverride || '').trim();
  const resolved = override
    ? { number: override, label: null, whatsapp: null }
    : await resolveLocalNumber(base44, { countryName });

  if (!resolved?.number) {
    await createTask(base44, {
      tripId,
      reason: 'missing_local_number',
      detail: `No local M-Care number is on file for ${countryName || countryCode}. A card cannot be printed without one — the face is the part that has to work with no scan and no signal. Add the number that actually answers at 3am to this country's emergency contacts, then reissue.`,
      now: params.now,
    });
    await base44.asServiceRole.entities.TripEmergencyCard.updateMany(
      { trip_id: tripId },
      { $set: { issuance_blocked_reason: 'missing_local_number' } },
    ).catch(() => {});
    await messageCareTeam(
      base44,
      'M-Care: a trip card set is blocked because the trip country has no local M-Care number on file. Add it, then reissue.',
    );
    return { ok: false, created: false, error: 'no_local_number', blocked_reason: 'missing_local_number', module_enabled: true };
  }

  // Trip end follows the real trip, and only ever moves forward.
  const derived = deriveTripEnd({
    storedEnd: null,
    procedureDate: c?.procedure_date,
    departureDate: c?.departure_date,
    recoveryDays: c?.recovery_days,
  });
  const tripEndsAt = derived.tripEnd;
  const expiresAt = expiresAtForTripEnd(tripEndsAt);
  const readyAt = readinessDueAt(firstFlightAt(c));

  const existingRows = await base44.asServiceRole.entities.TripEmergencyCard
    .filter({ trip_id: tripId }, '-created_date', 5).catch(() => []);
  const existing = (Array.isArray(existingRows) ? existingRows : [])[0] || null;

  // ── Already issued: this is a resend, not a reissue ───────────────────────
  if (existing && !params.reissueReason) {
    const live = await activeInstances(base44, existing.id);

    if (live.length > 0) {
      await base44.asServiceRole.entities.TripEmergencyCard.update(existing.id, {
        expires_at: expiresAt,
        trip_ends_at: tripEndsAt,
        active_instance_count: live.length,
        issuance_blocked_reason: null,
      }).catch(() => {});
      return {
        ok: true,
        created: false,
        card: { ...existing, expires_at: expiresAt, trip_ends_at: tripEndsAt },
        instances: live,
        module_enabled: true,
      };
    }
  }

  // ── Replace the whole set (itinerary change, or every card revoked) ───────
  if (existing) {
    const live = await activeInstances(base44, existing.id);
    for (const inst of live) {
      await base44.asServiceRole.entities.TripCardInstance.update(inst.id, {
        status: 'revoked',
        revoked_at: params.now,
        revoked_reason: params.reissueReason || 'care_team_reissue',
      }).catch(() => {});
    }

    const version = Number(existing.card_set_version || 1) + 1;

    const card = await base44.asServiceRole.entities.TripEmergencyCard.update(existing.id, {
      card_set_version: version,
      card_set_issued_at: params.now,
      emergency_number: resolved.number,
      emergency_number_label: resolved.label || countryName,
      local_mcare_number: resolved.number,
      local_mcare_number_label: resolved.label || null,
      local_whatsapp_number: resolved.whatsapp || null,
      trip_ends_at: tripEndsAt,
      expires_at: expiresAt,
      trip_end_source: derived.source,
      revoked: false,
      revoked_reason: null,
      issuance_blocked_reason: null,
      readiness_due_at: readyAt,
      readiness_notified_at: null,
      readiness_cycle_key: readinessCycleKey(tripId, readyAt),
      language,
    });

    const instances: any[] = [];
    for (let i = 0; i < INITIAL_CARD_COUNT; i += 1) {
      instances.push(await createInstance(base44, {
        card,
        label: i === 0 ? 'card_1' : 'card_2',
        reason: params.reissueReason || 'care_team_reissue',
        actor: params.actor,
        now: params.now,
      }));
    }

    await syncActiveCount(base44, card);
    return { ok: true, created: true, card, instances, module_enabled: true };
  }

  // ── First issue ───────────────────────────────────────────────────────────
  const card = await base44.asServiceRole.entities.TripEmergencyCard.create({
    trip_id: tripId,
    case_id: c?.id || null,
    patient_id: c?.created_by_id || null,
    patient_email: c?.client_email || null,
    patient_first_name: String(c?.client_name || 'Traveller').trim().split(/\s+/)[0].slice(0, 40) || 'Traveller',
    country_code: countryCode,
    country_name: countryName,
    language,
    emergency_number: resolved.number,
    emergency_number_label: resolved.label || countryName,
    local_mcare_number: resolved.number,
    local_mcare_number_label: resolved.label || null,
    local_whatsapp_number: resolved.whatsapp || null,
    trip_ends_at: tripEndsAt,
    expires_at: expiresAt,
    trip_end_source: derived.source,
    issued_at: params.now,
    issued_by: params.actor,
    revoked: false,
    request_state: 'none',
    destination_state: 'pending',
    card_set_version: 1,
    card_set_issued_at: params.now,
    active_instance_count: INITIAL_CARD_COUNT,
    printed_acknowledged: false,
    readiness_due_at: readyAt,
    readiness_cycle_key: readinessCycleKey(tripId, readyAt),
    scan_count: 0,
  });

  // Concurrent issue: the earliest row wins and this one stands down. Two people
  // pressing Issue must never leave a trip holding two live sets.
  const siblings = await base44.asServiceRole.entities.TripEmergencyCard
    .filter({ trip_id: tripId }, '-created_date', 5).catch(() => []);
  const winner = [...(Array.isArray(siblings) ? siblings : [])]
    .sort((a, b) => String(a.created_date).localeCompare(String(b.created_date)))[0];

  if (winner && winner.id !== card.id) {
    await base44.asServiceRole.entities.TripEmergencyCard.update(card.id, {
      revoked: true,
      revoked_reason: 'duplicate_issue_suppressed',
    }).catch(() => {});
    const live = await activeInstances(base44, winner.id);
    return { ok: true, created: false, card: winner, instances: live, module_enabled: true };
  }

  const instances: any[] = [];
  for (let i = 0; i < INITIAL_CARD_COUNT; i += 1) {
    instances.push(await createInstance(base44, {
      card,
      label: i === 0 ? 'card_1' : 'card_2',
      reason: 'initial',
      actor: params.actor,
      now: params.now,
    }));
  }

  return { ok: true, created: true, card, instances, module_enabled: true };
}

/** Whole-set revocation: trip cancelled, or an explicit revoke of the set. */
export async function revokeSetForTrip(
  base44: any,
  tripId: string,
  reason: 'trip_cancelled' | 'care_team_revoke' | 'itinerary_change',
  now: string,
): Promise<number> {
  const rows = await base44.asServiceRole.entities.TripEmergencyCard
    .filter({ trip_id: tripId }, '-created_date', 5).catch(() => []);
  let killed = 0;

  for (const card of (Array.isArray(rows) ? rows : [])) {
    const live = await activeInstances(base44, card.id);
    for (const inst of live) {
      await base44.asServiceRole.entities.TripCardInstance.update(inst.id, {
        status: 'revoked',
        revoked_at: now,
        revoked_reason: reason,
      }).catch(() => {});
      killed += 1;
    }
    await base44.asServiceRole.entities.TripEmergencyCard.update(card.id, {
      revoked: true,
      revoked_reason: reason,
      active_instance_count: 0,
    }).catch(() => {});
  }

  return killed;
}

// ── Lost and stolen ───────────────────────────────────────────────────────────

export interface ReplaceResult {
  ok: boolean;
  error?: string;
  blocked?: boolean;
  replacement?: any;
  instance?: any;
}

/**
 * Replace exactly one card.
 *
 * The traveller names the card, because there are two and a mis-tap would revoke
 * the one still in their bag. Lost and stolen are then two different events:
 * lost issues a replacement and leaves the original live (a stranger scanning a
 * dropped card is the product working), stolen revokes it.
 *
 * Three live cards, then a human. Otherwise "lost" is an unlimited print button
 * and live tokens accumulate in no one's hand.
 */
export async function reportLostOrStolen(base44: any, params: {
  card: any;
  instance: any;
  action: 'lost' | 'stolen';
  actor: string;
  now: string;
}): Promise<ReplaceResult> {
  const { card, instance, action } = params;

  if (!instance || instance.trip_card_id !== card.id) {
    return { ok: false, error: 'That card does not belong to this trip.' };
  }
  if (instance.status !== 'active') {
    return { ok: false, error: 'That card is already revoked.' };
  }

  const before = await activeInstances(base44, card.id);
  const liveCount = before.length;

  if (action === 'stolen') {
    await base44.asServiceRole.entities.TripCardInstance.update(instance.id, {
      status: 'revoked',
      revoked_at: params.now,
      revoked_reason: 'reported_stolen',
      reported_stolen_at: params.now,
    });
  } else {
    await base44.asServiceRole.entities.TripCardInstance.update(instance.id, {
      reported_lost_at: params.now,
    });
  }

  // Lost grows the pile; stolen shrinks it first.
  const wouldBe = action === 'lost' ? liveCount + 1 : liveCount;

  if (wouldBe > MAX_ACTIVE_INSTANCES) {
    await createTask(base44, {
      card,
      tripId: card.trip_id,
      reason: 'active_instance_cap_exceeded',
      detail: `This trip already has ${MAX_ACTIVE_INSTANCES} live cards and the traveller reported another lost. Issue the next card only after reviewing why so many are out — a live token nobody is holding is a token nobody is watching.`,
      now: params.now,
    });
    await messageCareTeam(
      base44,
      `M-Care: a trip has ${MAX_ACTIVE_INSTANCES} live cards and another was reported lost. Replacement held for review.`,
    );
    await syncActiveCount(base44, card);
    return {
      ok: false,
      blocked: true,
      error: `This trip already has ${MAX_ACTIVE_INSTANCES} live cards, so a care-team member has to review before another is issued. Your other card still works.`,
    };
  }

  const replacement = await createInstance(base44, {
    card,
    label: 'replacement',
    reason: action === 'lost' ? 'lost_replacement' : 'stolen_replacement',
    replacesInstanceId: instance.id,
    actor: params.actor,
    now: params.now,
  });

  await syncActiveCount(base44, card);

  return {
    ok: true,
    instance: replacement,
    replacement: {
      instance_id: replacement.id,
      short_ref: replacement.short_ref,
      card_url: replacement.card_url,
      local_number: card.local_mcare_number || card.emergency_number,
      action,
      replaced_ref: instance.short_ref,
    },
  };
}

// ── Acknowledgement and handover ──────────────────────────────────────────────

export async function acknowledgePrinted(base44: any, params: {
  card: any;
  actor: string;
  now: string;
}): Promise<any> {
  return base44.asServiceRole.entities.TripEmergencyCard.update(params.card.id, {
    printed_acknowledged: true,
    printed_acknowledged_at: params.now,
    printed_acknowledged_by: params.actor,
  });
}

/**
 * A physical handover is an event, not a status.
 *
 * Deliberately separate from printed_acknowledged: the traveller's claim about
 * their own paper stays in the safety layer, and a partner's "I put a card in
 * their hand" is its own record. It is the only partner-side card event with a
 * reason to exist.
 */
export async function recordHandover(base44: any, params: {
  card: any;
  partnerName: string;
  partnerType: string;
  partnerId?: string | null;
  note?: string | null;
  actor: string;
  now: string;
}): Promise<any> {
  const live = await activeInstances(base44, params.card.id);

  const row = await base44.asServiceRole.entities.TripCardHandover.create({
    trip_id: params.card.trip_id,
    trip_card_id: params.card.id,
    patient_email: params.card.patient_email || null,
    partner_name: String(params.partnerName || '').slice(0, 160),
    partner_type: params.partnerType,
    partner_id: params.partnerId || null,
    handed_over_at: params.now,
    recorded_by: params.actor,
    card_refs: live.map((i) => i.short_ref),
    note: params.note ? String(params.note).slice(0, 600) : null,
  });

  for (const inst of live) {
    await base44.asServiceRole.entities.TripCardInstance
      .update(inst.id, { handed_over_at: params.now })
      .catch(() => {});
  }

  return row;
}

// ── The sheet ─────────────────────────────────────────────────────────────────

export async function pdfForCard(base44: any, card: any): Promise<{ base64: string; filename: string } | null> {
  const live = await activeInstances(base44, card.id);
  if (!live.length) return null;

  const number = card.local_mcare_number || card.emergency_number;
  if (!number) return null;

  const base64 = await buildCardPdf({
    cards: live.map((i) => ({ short_ref: i.short_ref, card_url: i.card_url })),
    number,
    numberLabel: card.local_mcare_number_label,
    language: card.language || 'en',
  });

  return { base64, filename: 'm-care-emergency-cards.pdf' };
}

// ── The 72-hour readiness chase ───────────────────────────────────────────────

export interface ReadinessResult {
  trip_id: string;
  emailed: boolean;
  in_app: boolean;
  pushed: boolean;
  care_team: string;
}

/**
 * Chased, not displayed.
 *
 * If the acknowledgement is still unfinished 72 hours before the first flight,
 * this pushes at the traveller and lands in front of whoever is on call. Email is
 * the channel that carries it — it reaches everyone, needs no app and no push
 * credentials — and the PDF is ATTACHED rather than linked, because a traveller
 * who has to log in to get the cards will not print them.
 */
export async function sweepReadiness(base44: any, now: string): Promise<ReadinessResult[]> {
  const rows = await base44.asServiceRole.entities.TripEmergencyCard
    .filter({ printed_acknowledged: false }, 'readiness_due_at', 100)
    .catch(() => []);

  const results: ReadinessResult[] = [];

  for (const card of (Array.isArray(rows) ? rows : [])) {
    if (card.revoked) continue;
    if (!isReadinessDue(card, now)) continue;

    const sheet = await pdfForCard(base44, card);
    let emailed = false;
    let inApp = false;
    let pushed = false;

    if (card.patient_email && sheet) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: card.patient_email,
          subject: 'Print and pack your M-Care emergency card before you fly',
          body: `Your two M-Care emergency cards are attached, ready to print.<br><br>${PRINT_INSTRUCTION}<br><br>Print at 100% size. Black and white is fine. Keep the cards in the two places above, not in your suitcase.<br><br>Once they are packed, confirm it on your trip screen so your care team knows you are carrying them.<br><br>If you have already packed them, ignore this message.`,
          attachments: [{ filename: sheet.filename, content: sheet.base64 }],
          category: 'transactional',
        });
        emailed = true;
      } catch (error) {
        console.error('[sweepReadiness] email failed', card.id, error);
      }

      // In-app, so it is still in front of them when they open the trip.
      try {
        await base44.asServiceRole.entities.WorkflowNotification.create({
          workflow_event_id: `tripcard:${card.id}:${card.readiness_cycle_key || card.readiness_due_at}`,
          recipient_type: 'patient',
          recipient_email: card.patient_email,
          notification_type: 'reminder',
          channel: 'in_app',
          status: 'sent',
          sent_at: now,
          content: 'Print and pack your M-Care emergency cards before you fly.',
          metadata: { trip_id: card.trip_id, trip_card_id: card.id, kind: 'trip_card_readiness' },
        });
        inApp = true;
      } catch (error) {
        console.error('[sweepReadiness] in-app notification failed', card.id, error);
      }

      // Push is a bonus, never the carrier: it only fires if the app is installed
      // and the credentials are configured, and at pilot neither is guaranteed.
      try {
        const users = await base44.asServiceRole.entities.User
          .filter({ email: card.patient_email }, '-created_date', 1).catch(() => []);
        const userId = (Array.isArray(users) ? users : [])[0]?.id;
        if (userId) {
          await base44.asServiceRole.integrations.Core.SendPushNotification({
            user_id: userId,
            title: 'Print your M-Care card',
            content: 'Your emergency cards are ready to print before you fly.',
          });
          pushed = true;
        }
      } catch {
        // No push subscription, no native build, or no credentials. Expected.
      }
    }

    const care = await messageCareTeam(
      base44,
      'M-Care: a traveller has not confirmed their printed emergency card 72 hours before departure. Email and in-app reminder sent. Check their card set before the flight.',
    );

    await base44.asServiceRole.entities.TripEmergencyCard.update(card.id, {
      readiness_notified_at: now,
      readiness_cycle_key: readinessCycleKey(card.trip_id, card.readiness_due_at) || card.readiness_cycle_key,
    }).catch(() => {});

    results.push({
      trip_id: card.trip_id,
      emailed,
      in_app: inApp,
      pushed,
      care_team: care.channel,
    });
  }

  return results;
}