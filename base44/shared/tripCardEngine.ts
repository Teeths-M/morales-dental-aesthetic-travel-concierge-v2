/**
 * tripCardEngine — the only place the trip card's request is written.
 *
 * It sits on top of the existing dispatch machine rather than beside it: the
 * fanout, the ranking, the 90-second sequential offers, the audit chain and the
 * delivery statuses are all incidentEngine's, unchanged. What this file adds is
 * the four things a printed card needs and an app-triggered incident does not:
 *
 *   • one request per trip, joined by everyone who taps afterwards
 *   • two reported addresses kept apart until a human picks one
 *   • an arrival deadline measured from acceptance, and breached by a sweep
 *   • a false-alarm closure that is only possible after real contact
 */

import {
  buildFanoutTargets,
} from './incidentDispatch.ts';
import {
  loadPolicy,
  resolveContacts,
  createNotificationRows,
  fireFanout,
  advanceDispatch,
  loadOffers,
  moveIncident,
  appendAudit,
} from './incidentEngine.ts';
import {
  haversineMeters,
  ARRIVAL_RADIUS_METERS,
  signTripCardToken,
  verifyTripCardToken,
  deriveTripEnd,
  expiresAtForTripEnd,
  arrivalDeadlineAt,
  arrivalBufferSeconds,
  isArrivalDeadlineMissed,
  closureContactValid,
  isValidFalseAlarmReason,
  DRIVER_RECALL_FEE_USD,
  validCoordinate,
} from './tripCard.ts';
import { checkRateLimit } from './rateLimit.ts';

const CREATE_WINDOW_SECONDS = 10 * 60;
const CREATE_MAX = 8;
const SCAN_LOG_WINDOW_SECONDS = 10 * 60;
const SCAN_LOG_MAX = 25;
const SCAN_RETENTION_MS = 24 * 60 * 60 * 1000;

function refFor(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return `MC-${out}`;
}

// ── Loading and validating ────────────────────────────────────────────────────

export interface LoadedCard {
  card: any | null;
  /** The specific printed card that was scanned. Revoked per card, not per trip. */
  instance: any | null;
  error: 'invalid' | 'expired' | 'revoked' | 'not_configured' | null;
}

/**
 * The token proves the card was issued by us and names the trip. The ROW is
 * what decides whether it still works: revoked, and the LIVE `expires_at`
 * recomputed from the real trip end. That is what lets a trip that moved
 * extend a card that was already printed and stuck to a passport.
 */
export async function loadCardByToken(base44: any, token: string): Promise<LoadedCard> {
  let payload;
  try {
    payload = await verifyTripCardToken(token);
  } catch {
    return { card: null, instance: null, error: 'not_configured' };
  }
  if (!payload) return { card: null, instance: null, error: 'invalid' };

  // The INSTANCE is the authority on whether this particular printed card still
  // works. Revoking one card in a traveller's hand must not touch the other, so
  // the token names an instance and the instance says live or dead.
  const instRows = await base44.asServiceRole.entities.TripCardInstance
    .filter({ token_id: payload.card_id }, '-issued_at', 1)
    .catch(() => []);
  const instance = (Array.isArray(instRows) ? instRows : [])[0] || null;

  if (instance) {
    const card = await base44.asServiceRole.entities.TripEmergencyCard
      .get(instance.trip_card_id)
      .catch(() => null);

    if (!card) return { card: null, instance, error: 'invalid' };
    if (card.revoked) return { card, instance, error: 'revoked' };
    if (instance.status !== 'active') return { card, instance, error: 'revoked' };

    const refreshed = await refreshExpiry(base44, card);
    if (new Date(refreshed.expires_at).getTime() <= Date.now()) {
      return { card: refreshed, instance, error: 'expired' };
    }

    return { card: refreshed, instance, error: null };
  }

  // Rows issued before the set model carry a single token on the trip record.
  const rows = await base44.asServiceRole.entities.TripEmergencyCard
    .filter({ trip_id: payload.trip_id }, '-created_date', 5)
    .catch(() => []);

  const card = (rows as any[]).find(
    (r) => r.trip_id === payload.trip_id && (!r.token_id || r.token_id === payload.card_id || r.id === payload.card_id),
  ) || (rows as any[])[0];

  if (!card) return { card: null, instance: null, error: 'invalid' };
  if (card.revoked) return { card, instance: null, error: 'revoked' };

  const refreshed = await refreshExpiry(base44, card);
  if (new Date(refreshed.expires_at).getTime() <= Date.now()) {
    return { card: refreshed, instance: null, error: 'expired' };
  }

  return { card: refreshed, instance: null, error: null };
}

/**
 * Expiry follows the ACTUAL trip end. Only ever forward: a cleared date field
 * must never be the reason a card died while the traveller was still abroad.
 */
export async function refreshExpiry(base44: any, card: any): Promise<any> {
  let caseRow: any = null;
  if (card.case_id) {
    caseRow = await base44.asServiceRole.entities.CaseRecord.get(card.case_id).catch(() => null);
  }

  const derived = deriveTripEnd({
    storedEnd: card.trip_ends_at,
    procedureDate: caseRow?.procedure_date,
    departureDate: caseRow?.departure_date,
    recoveryDays: caseRow?.recovery_days,
  });

  const expires = expiresAtForTripEnd(derived.tripEnd);
  if (derived.tripEnd === card.trip_ends_at && expires === card.expires_at) {
    await syncInstanceExpiry(base44, card.id, expires);
    return card;
  }

  const movedForward = new Date(derived.tripEnd).getTime() > new Date(card.trip_ends_at || 0).getTime();

  const updated = await base44.asServiceRole.entities.TripEmergencyCard.update(card.id, {
    trip_ends_at: derived.tripEnd,
    expires_at: expires,
    trip_end_source: movedForward ? 'extended' : derived.source,
  }).catch(() => null);

  if (movedForward && card.open_incident_id) {
    await appendAudit(base44, {
      incident_id: card.open_incident_id,
      patient_email: card.patient_email,
      subject_type: 'incident',
      subject_id: card.open_incident_id,
      from_state: null,
      to_state: 'CARD_EXTENDED',
      actor: 'trip_card_engine',
      actor_type: 'engine',
      timestamp: new Date().toISOString(),
      evidence: { previous_trip_end: card.trip_ends_at, trip_end: derived.tripEnd, expires_at: expires },
    });
  }

  const live = updated || { ...card, trip_ends_at: derived.tripEnd, expires_at: expires };
  await syncInstanceExpiry(base44, card.id, expires);
  return live;
}

/**
 * The cards in a wallet follow the trip too. A delayed flight extends the trip,
 * and every printed card has to extend with it — otherwise a card that was valid
 * at the airport is dead by the time the flight actually lands.
 */
async function syncInstanceExpiry(base44: any, tripCardId: string, expires: string): Promise<void> {
  const rows = await base44.asServiceRole.entities.TripCardInstance
    .filter({ trip_card_id: tripCardId }, '-issued_at', 20)
    .catch(() => []);
  for (const inst of (Array.isArray(rows) ? rows : [])) {
    if (inst.expires_at === expires) continue;
    await base44.asServiceRole.entities.TripCardInstance
      .update(inst.id, { expires_at: expires })
      .catch(() => {});
  }
}

export async function issueCardRow(base44: any, params: {
  tripId: string;
  caseId?: string | null;
  patientId?: string | null;
  patientEmail?: string | null;
  firstName: string;
  countryCode: string;
  countryName?: string | null;
  language: string;
  emergencyNumber: string;
  emergencyNumberLabel?: string | null;
  tripEndsAt: string;
  actor: string;
}): Promise<any> {
  const expiresAt = expiresAtForTripEnd(params.tripEndsAt);
  const tokenId = crypto.randomUUID();

  const card = await base44.asServiceRole.entities.TripEmergencyCard.create({
    trip_id: params.tripId,
    case_id: params.caseId || null,
    patient_id: params.patientId || null,
    patient_email: params.patientEmail || null,
    patient_first_name: params.firstName,
    country_code: String(params.countryCode || '').toUpperCase(),
    country_name: params.countryName || null,
    language: params.language,
    emergency_number: params.emergencyNumber,
    emergency_number_label: params.emergencyNumberLabel || null,
    trip_ends_at: params.tripEndsAt,
    trip_end_source: 'manual',
    expires_at: expiresAt,
    token_id: tokenId,
    issued_at: new Date().toISOString(),
    issued_by: params.actor,
    revoked: false,
    request_state: 'none',
    destination_state: 'pending',
    scan_count: 0,
  });

  const token = await signTripCardToken({
    cardId: tokenId,
    tripId: params.tripId,
    country: params.countryCode,
    lang: params.language,
    expiresAtMs: new Date(expiresAt).getTime(),
  });

  return { card, token };
}

// ── Scan logging, and the throttle that must never block help ────────────────

/**
 * Boardy's hole: rate-limiting a token that already has an open request would
 * throttle the help itself. So there are two separate limits — one for writing
 * scan rows and starting a NEW request, and none at all for joining one that
 * already exists. A fifth person tapping reaches the same live request.
 */
export async function logScan(
  base44: any,
  card: any,
  kind: string,
  outcome: string,
  incidentId?: string | null,
  instance?: any | null,
): Promise<boolean> {
  // Per-instance throttle, which is the whole reason instances exist: one card
  // being hammered must not spend another card's allowance.
  const key = instance?.token_id || card.token_id || card.id;

  const allowed = await checkRateLimit(
    base44,
    `tripcard:scan:${key}`,
    SCAN_LOG_WINDOW_SECONDS,
    SCAN_LOG_MAX,
  );
  if (!allowed) return false;

  const now = new Date();
  await base44.asServiceRole.entities.TripEmergencyScan.create({
    card_id: card.id,
    trip_id: card.trip_id,
    token_id: key,
    incident_id: incidentId || card.open_incident_id || null,
    kind,
    outcome: String(outcome || '').slice(0, 200),
    at: now.toISOString(),
    purge_after: new Date(now.getTime() + SCAN_RETENTION_MS).toISOString(),
  }).catch(() => {});

  if (instance?.id) {
    await base44.asServiceRole.entities.TripCardInstance.update(instance.id, {
      scan_count: Number(instance.scan_count || 0) + 1,
      last_scan_at: now.toISOString(),
    }).catch(() => {});
  }

  await base44.asServiceRole.entities.TripEmergencyCard.update(card.id, {
    scan_count: Number(card.scan_count || 0) + 1,
    last_scan_at: now.toISOString(),
  }).catch(() => {});

  return true;
}

// ── Opening or joining the trip's single request ─────────────────────────────

const TYPE_FOR_CARD = 'medical';

export interface OpenResult {
  outcome: 'opened' | 'joined' | 'throttled' | 'rejoin_closed';
  card: any;
  incident: any | null;
}

function triggerCopy(incident: any, extra: string): string {
  return `EMERGENCY (trip card): ${incident.type} incident${incident.location_label ? ` near ${incident.location_label}` : ''}. ${extra}`;
}

/**
 * Pages a human without claiming a state the incident is not in. pageCareTeam
 * records an escalation to UNRESOLVED, which is right when dispatch failed and
 * wrong when the case is still live and merely needs a decision from us. Same
 * delivery machinery, honest audit row.
 */
export async function pageHumans(base44: any, incident: any, policy: any, message: string, reason: string, now: string): Promise<number> {
  const contacts = await resolveContacts(base44, incident, policy);
  const targets: any[] = [];

  if (contacts.careTeam?.phone) targets.push({ role: 'care_team', channel: 'sms', recipient_name: contacts.careTeam.name, phone: contacts.careTeam.phone });
  if (contacts.careTeam?.email) targets.push({ role: 'care_team', channel: 'email', recipient_name: contacts.careTeam.name, email: contacts.careTeam.email });

  for (const extra of (Array.isArray(policy?.escalation_contacts) ? policy.escalation_contacts : [])) {
    if (extra?.phone) targets.push({ role: 'care_team', channel: 'sms', recipient_name: extra.name || 'Escalation contact', phone: extra.phone });
    if (extra?.email) targets.push({ role: 'care_team', channel: 'email', recipient_name: extra.name || 'Escalation contact', email: extra.email });
  }

  if (!targets.length) {
    await appendAudit(base44, {
      incident_id: incident.id,
      patient_email: incident.patient_email,
      subject_type: 'incident',
      subject_id: incident.id,
      from_state: incident.status,
      to_state: incident.status,
      actor: 'trip_card_engine',
      actor_type: 'engine',
      timestamp: now,
      evidence: { paged: 0, reason, note: 'No care-team contact configured', message },
    });
    return 0;
  }

  const rows = await createNotificationRows(base44, incident, targets as any, now);
  await fireFanout(base44, incident, (rows as any[]).map((r) => ({ ...r, message_override: message })), now);

  await appendAudit(base44, {
    incident_id: incident.id,
    patient_email: incident.patient_email,
    subject_type: 'incident',
    subject_id: incident.id,
    from_state: incident.status,
    to_state: incident.status,
    actor: 'trip_card_engine',
    actor_type: 'engine',
    timestamp: now,
    evidence: { paged: rows.length, reason, message },
  });

  return rows.length;
}

/**
 * Opens the trip's request, or joins the one already open.
 *
 * Idempotent by construction: the card row is the latch. Two simultaneous taps
 * can both create an incident, and the deterministic tiebreak (smallest id)
 * decides which one survives — the loser suppresses itself and dispatches
 * nobody, exactly as the rest of the engine already does.
 */
export async function openOrJoinRequest(
  base44: any,
  card: any,
  now: string,
  instance?: any | null,
): Promise<OpenResult> {
  // The latch is per TRIP, not per printed card. A traveller issued a second
  // card must never end up with two live requests.
  const sameTrip = await base44.asServiceRole.entities.TripEmergencyCard
    .filter({ trip_id: card.trip_id }, '-created_date', 10)
    .catch(() => []);
  const tripOpen = (sameTrip as any[]).find((r) => r.request_state === 'open' && r.open_incident_id);
  if (tripOpen && tripOpen.id !== card.id) {
    const existing = await base44.asServiceRole.entities.Incident.get(tripOpen.open_incident_id).catch(() => null);
    if (existing && existing.status !== 'RESOLVED') {
      await logScan(base44, card, 'join', 'joined the trip\'s open request', existing.id, instance);
      return { outcome: 'joined', card: { ...card, ...tripOpen }, incident: existing };
    }
  }

  if (card.open_incident_id && card.request_state === 'open') {
    const existing = await base44.asServiceRole.entities.Incident.get(card.open_incident_id).catch(() => null);
    if (existing && existing.status !== 'RESOLVED') {
      // A join is never throttled. This is the help that already exists.
      await logScan(base44, card, 'join', 'joined the open request', existing.id, instance);
      return { outcome: 'joined', card, incident: existing };
    }
    return { outcome: 'rejoin_closed', card, incident: existing };
  }

  if (card.request_state === 'closed_false_alarm' || card.request_state === 'resolved') {
    return { outcome: 'rejoin_closed', card, incident: null };
  }

  // Only the CREATION of a new request is throttled.
  const allowed = await checkRateLimit(
    base44,
    `tripcard:create:${instance?.token_id || card.token_id || card.id}`,
    CREATE_WINDOW_SECONDS,
    CREATE_MAX,
  );
  if (!allowed) {
    await logScan(base44, card, 'blocked_throttle', 'too many new-request attempts', null, instance);
    return { outcome: 'throttled', card, incident: null };
  }

  const policy = await loadPolicy(base44, card.country_code);

  let caseRow: any = null;
  if (card.case_id) {
    caseRow = await base44.asServiceRole.entities.CaseRecord.get(card.case_id).catch(() => null);
  }

  // The trip's last CONFIRMED position — kept strictly apart from anything a
  // stranger reports. Hotel first, clinic second: both are places the trip
  // actually vouched for.
  let travellerLat: number | null = null;
  let travellerLng: number | null = null;
  let travellerLabel: string | null = null;
  const hotel = validCoordinate(caseRow?.hotel_coords?.lat, caseRow?.hotel_coords?.lng);
  const clinic = validCoordinate(caseRow?.clinic_coords?.lat, caseRow?.clinic_coords?.lng);
  if (hotel) {
    travellerLat = hotel.lat; travellerLng = hotel.lng;
    travellerLabel = caseRow?.hotel_name ? `Hotel ${caseRow.hotel_name}` : 'Hotel on file';
  } else if (clinic) {
    travellerLat = clinic.lat; travellerLng = clinic.lng;
    travellerLabel = caseRow?.clinic_selected ? `${caseRow.clinic_selected} clinic` : 'Clinic on file';
  }

  const incident = await base44.asServiceRole.entities.Incident.create({
    patient_id: card.patient_id || null,
    patient_email: card.patient_email || `trip-${card.trip_id}@mcare.invalid`,
    patient_name: card.patient_first_name || null,
    trip_id: card.trip_id,
    case_id: card.case_id || null,
    type: TYPE_FOR_CARD,
    trigger_source: 'system',
    client_ref: `tripcard:${card.id}`,
    dedupe_key: `tripcard:${card.trip_id}:${TYPE_FOR_CARD}`,
    status: 'OPEN',
    country_code: card.country_code,
    latitude: travellerLat,
    longitude: travellerLng,
    location_label: travellerLabel,
    clinical_risk_flags: [],
    policy_snapshot: policy
      ? {
        country_code: policy.country_code,
        emergency_number: policy.emergency_number || null,
        emergency_number_label: policy.emergency_number_label || null,
        requires_emergency_call: !!policy.requires_emergency_call,
        notify_roles: policy.notify_roles || null,
        offer_timeout_seconds: policy.offer_timeout_seconds || 90,
        max_offers: policy.max_offers || 5,
        version: policy.version || 1,
      }
      : null,
    policy_missing: !policy,
    triggered_at: now,
    triggered_at_source: 'server_fallback',
    received_at: now,
  });

  await appendAudit(base44, {
    incident_id: incident.id,
    patient_email: incident.patient_email,
    subject_type: 'incident',
    subject_id: incident.id,
    from_state: null,
    to_state: 'OPEN',
    actor: 'bystander:trip_card',
    actor_type: 'system',
    timestamp: now,
    evidence: {
      trigger_source: 'trip_card',
      card_id: card.id,
      trip_id: card.trip_id,
      country_code: card.country_code,
      country_language: card.language,
      policy_found: !!policy,
      traveller_location_source: travellerLabel ? 'last_confirmed' : 'none',
      dispatch_gated_on_destination: true,
    },
  });

  // Claim the latch. The tiebreak below decides which claim survives.
  const claimed = await base44.asServiceRole.entities.TripEmergencyCard.update(card.id, {
    request_state: 'open',
    open_incident_id: incident.id,
    request_ref: card.request_ref || refFor(),
    request_opened_at: now,
    opened_by: 'bystander',
    traveller_latitude: travellerLat,
    traveller_longitude: travellerLng,
    traveller_location_label: travellerLabel,
    traveller_location_at: travellerLat != null ? now : null,
    traveller_location_source: travellerLabel ? 'last_confirmed' : 'none',
    destination_state: 'pending',
  }).catch(() => null);

  const live = claimed || card;

  // Deterministic tiebreak: if another tap claimed first, the smallest incident
  // id keeps the request and this one suppresses itself.
  const siblings = await base44.asServiceRole.entities.Incident
    .filter({ dedupe_key: `tripcard:${card.trip_id}:${TYPE_FOR_CARD}` }, '-created_date', 10)
    .catch(() => []);

  const winner = [...(siblings as any[])].sort((a, b) => String(a.id).localeCompare(String(b.id)))[0];
  if (winner && winner.id !== incident.id) {
    await moveIncident(base44, {
      incident,
      to: 'DUPLICATE_SUPPRESSED',
      actor: 'dispatch_engine',
      actor_type: 'engine',
      now,
      evidence: { duplicate_of: winner.id, reason: 'concurrent_trip_card_tap' },
      extraFields: { duplicate_of: winner.id },
    });
    const rebound = await base44.asServiceRole.entities.TripEmergencyCard.update(card.id, {
      open_incident_id: winner.id,
    }).catch(() => live);

    return { outcome: 'joined', card: rebound || live, incident: winner };
  }

  await logScan(base44, live, 'tap', 'request opened', incident.id, instance);

  // Fanout fires at once and never gates dispatch.
  const contacts = await resolveContacts(base44, incident, policy);
  const targets = buildFanoutTargets({ policy, contacts });
  const rows = await createNotificationRows(base44, incident, targets, now);
  await fireFanout(base44, incident, (rows as any[]).map((r) => ({
    ...r,
    message_override: triggerCopy(incident, 'A bystander scanned the traveller\'s M-Care trip card.'),
  })), now);

  // Dispatch waits for a human to say WHICH address the driver is sent to.
  await pageHumans(
    base44,
    incident,
    policy,
    triggerCopy(incident, 'Destination confirmation needed before a driver is offered. Two addresses may be on file.'),
    'destination_confirmation_required',
    now,
  );

  return { outcome: 'opened', card: live, incident };
}

// ── The two addresses, and who the driver is sent to ─────────────────────────

export function destinationCandidates(card: any): any[] {
  const out: any[] = [];
  if (card.bystander_location_source === 'gps' && validCoordinate(card.bystander_latitude, card.bystander_longitude)) {
    out.push({
      basis: 'bystander_location',
      lat: Number(card.bystander_latitude),
      lng: Number(card.bystander_longitude),
      label: 'Reported by the bystander (GPS)',
      reported_by: 'bystander',
      reported_at: card.bystander_location_at || null,
    });
  }
  if (card.bystander_location_source === 'address' && card.bystander_address) {
    out.push({
      basis: 'bystander_location',
      lat: null,
      lng: null,
      label: `Reported by the bystander: ${card.bystander_address}`,
      reported_by: 'bystander',
      reported_at: card.bystander_location_at || null,
    });
  }
  if (validCoordinate(card.traveller_latitude, card.traveller_longitude)) {
    out.push({
      basis: 'traveller_location',
      lat: Number(card.traveller_latitude),
      lng: Number(card.traveller_longitude),
      label: `Last confirmed trip location${card.traveller_location_label ? `: ${card.traveller_location_label}` : ''}`,
      reported_by: 'traveller_record',
      reported_at: card.traveller_location_at || null,
    });
  }
  return out;
}

/**
 * The care team picks ONE destination, and the driver is then told about BOTH
 * reported places, each labelled with who reported it and when. The choice is
 * recorded; neither address is ever silently merged or overwritten.
 */
export async function confirmDestinationAndDispatch(base44: any, params: {
  card: any;
  basis: string;
  lat?: number | null;
  lng?: number | null;
  label: string;
  actor: string;
  now: string;
}): Promise<{ ok: boolean; error?: string; offer?: any | null; unresolved?: boolean }> {
  const card = params.card;
  if (!card.open_incident_id || card.request_state !== 'open') {
    return { ok: false, error: 'This trip has no open request.' };
  }
  if (card.destination_state === 'confirmed') {
    return { ok: false, error: 'The destination has already been confirmed for this request.' };
  }

  const incident = await base44.asServiceRole.entities.Incident.get(card.open_incident_id).catch(() => null);
  if (!incident || incident.status === 'RESOLVED' || incident.status === 'DUPLICATE_SUPPRESSED') {
    return { ok: false, error: 'This request is no longer live.' };
  }

  const coord = validCoordinate(params.lat, params.lng);
  const candidates = destinationCandidates(card);
  const chosen = candidates.find((c) => c.basis === params.basis && (
    coord ? Number(c.lat) === coord.lat && Number(c.lng) === coord.lng : true
  ));

  await base44.asServiceRole.entities.TripEmergencyCard.update(card.id, {
    destination_state: 'confirmed',
    destination_latitude: coord ? coord.lat : null,
    destination_longitude: coord ? coord.lng : null,
    destination_label: String(params.label || chosen?.label || '').slice(0, 400),
    destination_basis: params.basis,
    destination_confirmed_at: params.now,
    destination_confirmed_by: params.actor,
    traveller_latitude: card.traveller_latitude ?? (chosen?.basis === 'traveller_location' ? coord?.lat : null),
    traveller_longitude: card.traveller_longitude ?? (chosen?.basis === 'traveller_location' ? coord?.lng : null),
  }).catch(() => {});

  await appendAudit(base44, {
    incident_id: incident.id,
    patient_email: incident.patient_email,
    subject_type: 'incident',
    subject_id: incident.id,
    from_state: incident.status,
    to_state: incident.status,
    actor: params.actor,
    actor_type: 'care_team',
    timestamp: params.now,
    evidence: {
      action: 'destination_confirmed',
      basis: params.basis,
      label: params.label,
      candidates: candidates.map((c) => ({ basis: c.basis, label: c.label, reported_by: c.reported_by, reported_at: c.reported_at })),
    },
  });

  const policy = await loadPolicy(base44, incident.country_code);
  if (!policy) {
    return { ok: false, error: 'No dispatch policy is configured for this country.' };
  }

  const result = await advanceDispatch(base44, {
    incident,
    policy,
    now: params.now,
    reason: 'trip_card_destination_confirmed',
  });

  if (result.offer) {
    await base44.asServiceRole.entities.DispatchOffer.update(result.offer.id, {
      driver_brief: {
        destination: params.label,
        destination_basis: params.basis,
        addresses: candidates.map((c) => ({
          label: c.label,
          reported_by: c.reported_by,
          reported_at: c.reported_at,
          lat: c.lat,
          lng: c.lng,
        })),
        note: 'Two addresses were reported. The care team confirmed the destination above; both are shown so the driver can reconcile them in person.',
      },
    }).catch(() => {});
  }

  return { ok: true, offer: result.offer || null, unresolved: !!result.unresolved };
}

// ── Arrival: a GPS fact, not a tap ───────────────────────────────────────────

export async function recordGpsArrival(base44: any, params: {
  offer: any;
  incident: any;
  card: any | null;
  lat: number;
  lng: number;
  now: string;
}): Promise<{ ok: boolean; error?: string; distance_m?: number; arrived_at?: string }> {
  const { offer, incident, card, lat, lng, now } = params;

  const destination = card
    ? validCoordinate(card.destination_latitude, card.destination_longitude)
    : validCoordinate(incident.latitude, incident.longitude);

  if (!destination) {
    return { ok: false, error: 'No confirmed destination to validate against.' };
  }

  const distance = Math.round(haversineMeters({ lat, lng }, destination));

  if (distance > ARRIVAL_RADIUS_METERS) {
    await base44.asServiceRole.entities.DispatchOffer.update(offer.id, {
      gps_checkin_at: now,
      gps_checkin_lat: lat,
      gps_checkin_lng: lng,
      gps_checkin_distance_m: distance,
      gps_validated: false,
      arrival_validation: 'rejected_out_of_range',
    }).catch(() => {});

    await appendAudit(base44, {
      incident_id: incident.id,
      patient_email: incident.patient_email,
      subject_type: 'offer',
      subject_id: offer.id,
      from_state: offer.status,
      to_state: offer.status,
      actor: `responder:${offer.responder_id}`,
      actor_type: 'responder',
      timestamp: now,
      evidence: { action: 'arrival_rejected', distance_m: distance, radius_m: ARRIVAL_RADIUS_METERS },
    });

    return { ok: false, error: 'You are not at the destination yet.', distance_m: distance };
  }

  await base44.asServiceRole.entities.DispatchOffer.update(offer.id, {
    gps_checkin_at: now,
    gps_checkin_lat: lat,
    gps_checkin_lng: lng,
    gps_checkin_distance_m: distance,
    gps_validated: true,
    arrival_validation: 'gps_validated',
    arrived_at: now,
  }).catch(() => {});

  await appendAudit(base44, {
    incident_id: incident.id,
    patient_email: incident.patient_email,
    subject_type: 'offer',
    subject_id: offer.id,
    from_state: offer.status,
    to_state: 'ARRIVED',
    actor: `responder:${offer.responder_id}`,
    actor_type: 'responder',
    timestamp: now,
    evidence: { action: 'gps_arrival_validated', distance_m: distance, radius_m: ARRIVAL_RADIUS_METERS, lat, lng },
  });

  await moveIncident(base44, {
    incident,
    to: 'ARRIVED',
    actor: `responder:${offer.responder_id}`,
    actor_type: 'responder',
    now,
    evidence: { offer_id: offer.id, distance_m: distance },
  });

  return { ok: true, distance_m: distance, arrived_at: now };
}

// ── The arrival deadline sweep ───────────────────────────────────────────────

/**
 * Waits are only honest if something watches them. A driver who accepts and
 * then does not arrive is the gap between accepted-at and arrived-at, and it is
 * the gap a stranger stares at. So: breach at the deadline, page a human,
 * reopen to the next driver — and keep the accepting driver tracked.
 */
export async function breachArrivalDeadlines(base44: any, now: string): Promise<any[]> {
  const accepted = await base44.asServiceRole.entities.DispatchOffer
    .filter({ status: 'ACCEPTED' }, '-accepted_at', 100)
    .catch(() => []);

  const breaches: any[] = [];

  for (const offer of accepted as any[]) {
    if (!isArrivalDeadlineMissed(offer, now)) continue;

    const incident = await base44.asServiceRole.entities.Incident.get(offer.incident_id).catch(() => null);
    if (!incident || incident.status === 'RESOLVED' || incident.status === 'DUPLICATE_SUPPRESSED') continue;

    await base44.asServiceRole.entities.DispatchOffer.update(offer.id, {
      arrival_deadline_missed_at: now,
      superseded: true,
      superseded_at: now,
      superseded_reason: 'arrival_deadline_missed',
    }).catch(() => {});

    await appendAudit(base44, {
      incident_id: incident.id,
      patient_email: incident.patient_email,
      subject_type: 'offer',
      subject_id: offer.id,
      from_state: 'ACCEPTED',
      to_state: 'ACCEPTED',
      actor: 'dispatch_engine',
      actor_type: 'engine',
      timestamp: now,
      evidence: {
        action: 'arrival_deadline_missed',
        responder_name: offer.display_name,
        accepted_at: offer.accepted_at,
        accepted_eta_seconds: offer.accepted_eta_seconds ?? null,
        arrival_buffer_seconds: offer.arrival_buffer_seconds ?? null,
        arrival_deadline_at: offer.arrival_deadline_at,
        tracked_not_erased: true,
      },
    });

    const policy = await loadPolicy(base44, incident.country_code);

    await pageHumans(
      base44,
      incident,
      policy,
      triggerCopy(incident, `${offer.display_name || 'A driver'} accepted at ${offer.accepted_at} and has not arrived. Deadline passed. Reopening to the next driver.`),
      'arrival_deadline_missed',
      now,
    );

    await base44.asServiceRole.entities.DispatchOffer.update(offer.id, {
      arrival_deadline_page_sent_at: now,
    }).catch(() => {});

    let advanced: any = { offer: null, unresolved: false };
    if (policy) {
      advanced = await advanceDispatch(base44, {
        incident,
        policy,
        now,
        reason: 'arrival_deadline_missed',
      });
    }

    breaches.push({
      offer_id: offer.id,
      incident_id: incident.id,
      responder: offer.display_name,
      next_offer: advanced.offer ? advanced.offer.responder_id : null,
      unresolved: !!advanced.unresolved,
    });
  }

  return breaches;
}

export async function purgeExpiredScans(base44: any, now: string): Promise<number> {
  const rows = await base44.asServiceRole.entities.TripEmergencyScan
    .filter({}, 'at', 200)
    .catch(() => []);

  const expired = (rows as any[]).filter((r) => r.purge_after && new Date(r.purge_after).getTime() <= new Date(now).getTime());
  if (!expired.length) return 0;

  await Promise.allSettled(expired.map((r) => base44.asServiceRole.entities.TripEmergencyScan.delete(r.id)));
  return expired.length;
}

// ── False-alarm closure ──────────────────────────────────────────────────────

export interface ClosureResult {
  ok: boolean;
  error?: string;
  withdrawn_offer_id?: string | null;
  fee_recorded_usd?: number;
}

/**
 * Closing as a false alarm is the only way out of a live request, so it is
 * guarded by the one thing that makes it a decision rather than a guess: a
 * human spoke to the traveller or the guardian, and said when and how.
 *
 * If the driver has already arrived, this refuses. Confirming in person beats a
 * phone call, and he is already there.
 */
export async function closeAsFalseAlarm(base44: any, params: {
  card: any;
  contactParty: string;
  contactMethod: string;
  contactAt: string;
  reasonCode: string;
  notes?: string | null;
  actor: string;
  now: string;
}): Promise<ClosureResult> {
  const { card } = params;

  if (!card.open_incident_id || card.request_state !== 'open') {
    return { ok: false, error: 'This trip has no open request to close.' };
  }
  if (!isValidFalseAlarmReason(params.reasonCode)) {
    return { ok: false, error: 'Choose a valid reason code.' };
  }

  const contact = closureContactValid({
    contactParty: params.contactParty,
    contactMethod: params.contactMethod,
    contactAt: params.contactAt,
    now: params.now,
  });
  if (!contact.valid) return { ok: false, error: contact.reason };

  const incident = await base44.asServiceRole.entities.Incident.get(card.open_incident_id).catch(() => null);
  if (!incident) return { ok: false, error: 'The request could not be found.' };

  const offers = await loadOffers(base44, incident.id);

  const arrived = offers.find((o: any) => o.arrived_at && !o.superseded);
  if (arrived) {
    return {
      ok: false,
      error: `${arrived.display_name || 'The driver'} has already arrived. Record what they found in person instead of closing by phone.`,
    };
  }

  // Recall anyone actually standing by or en route. A stand-down that pays
  // nothing teaches the pool that a 3am yes is a coin flip.
  const recalled = offers.filter((o: any) => o.status === 'OFFERED' || (o.status === 'ACCEPTED' && !o.arrived_at));

  for (const offer of recalled) {
    const patch: Record<string, unknown> = {
      withdrawal_reason: 'false_alarm_stand_down',
      assignment_fee_amount: DRIVER_RECALL_FEE_USD,
      assignment_fee_status: 'recorded',
      assignment_fee_recorded_at: params.now,
    };
    if (offer.status === 'OFFERED') {
      patch.status = 'WITHDRAWN';
      patch.withdrawn_at = params.now;
      patch.responded_at = params.now;
      patch.responded_at_source = 'server_fallback';
    }
    await base44.asServiceRole.entities.DispatchOffer.update(offer.id, patch).catch(() => {});

    await appendAudit(base44, {
      incident_id: incident.id,
      patient_email: incident.patient_email,
      subject_type: 'offer',
      subject_id: offer.id,
      from_state: offer.status,
      to_state: offer.status === 'OFFERED' ? 'WITHDRAWN' : offer.status,
      actor: params.actor,
      actor_type: 'care_team',
      timestamp: params.now,
      evidence: {
        action: 'recalled_on_false_alarm',
        responder_name: offer.display_name,
        assignment_fee_usd: DRIVER_RECALL_FEE_USD,
        fee_status: 'recorded',
        note: 'Fee recorded for payout. No funds are moved by this action.',
      },
    });
  }

  await moveIncident(base44, {
    incident,
    to: 'RESOLVED',
    actor: params.actor,
    actor_type: 'care_team',
    now: params.now,
    evidence: {
      closure: 'false_alarm',
      reason_code: params.reasonCode,
      contacted: params.contactParty,
      contact_method: params.contactMethod,
      contact_at: params.contactAt,
      offers_recalled: recalled.length,
      driver_fee_recorded_usd: recalled.length * DRIVER_RECALL_FEE_USD,
      near_miss_preserved: true,
    },
  });

  await base44.asServiceRole.entities.TripEmergencyCard.update(card.id, {
    request_state: 'closed_false_alarm',
    closure_reason_code: params.reasonCode,
    closure_contact_party: params.contactParty,
    closure_contact_method: String(params.contactMethod).slice(0, 120),
    closure_contact_at: params.contactAt,
    closure_notes: params.notes ? String(params.notes).slice(0, 2000) : null,
    near_miss: true,
    closed_at: params.now,
    closed_by: params.actor,
  }).catch(() => {});

  return {
    ok: true,
    withdrawn_offer_id: recalled.find((o: any) => o.status === 'OFFERED')?.id || null,
    fee_recorded_usd: recalled.length * DRIVER_RECALL_FEE_USD,
  };
}

// ── What the bystander's screen says ─────────────────────────────────────────

export interface CardStatus {
  key: 'waiting' | 'assigned' | 'arrived' | 'unresolved' | 'closed';
  terminal: boolean;
  refresh: boolean;
}

const TEN_MINUTES_MS = 10 * 60 * 1000;

/**
 * Ten minutes is the bound on the stranger's patience, not on ours: after that
 * the page stops waiting and simply says M-Care has the request, with the
 * number. Silence is not allowed to look like progress.
 */
export async function computeStatus(base44: any, card: any, now: string): Promise<CardStatus> {
  const openedAt = card.request_opened_at ? new Date(card.request_opened_at).getTime() : NaN;
  const elapsed = Number.isFinite(openedAt) ? new Date(now).getTime() - openedAt : 0;
  const pastWait = elapsed > TEN_MINUTES_MS;

  if (card.request_state === 'closed_false_alarm' || card.request_state === 'resolved') {
    return { key: 'closed', terminal: true, refresh: false };
  }

  if (!card.open_incident_id) {
    return { key: 'waiting', terminal: pastWait, refresh: !pastWait };
  }

  const incident = await base44.asServiceRole.entities.Incident.get(card.open_incident_id).catch(() => null);
  if (!incident) return { key: 'waiting', terminal: pastWait, refresh: !pastWait };
  if (incident.status === 'RESOLVED' || incident.status === 'DUPLICATE_SUPPRESSED') {
    return { key: 'closed', terminal: true, refresh: false };
  }

  const offers = await loadOffers(base44, incident.id);
  const arrived = offers.find((o: any) => o.arrived_at && !o.superseded);
  if (arrived) return { key: 'arrived', terminal: pastWait, refresh: !pastWait };

  const accepted = offers.find((o: any) => o.status === 'ACCEPTED' && !o.superseded && !o.arrived_at);
  if (accepted) return { key: 'assigned', terminal: pastWait, refresh: !pastWait };

  if (incident.status === 'UNRESOLVED') return { key: 'unresolved', terminal: true, refresh: false };

  return { key: 'waiting', terminal: pastWait, refresh: !pastWait };
}