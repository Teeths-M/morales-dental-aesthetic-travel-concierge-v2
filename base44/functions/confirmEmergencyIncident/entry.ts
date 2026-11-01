import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { appendAudit, loadPolicy } from '../../shared/incidentEngine.ts';
import {
  acknowledgementDeadline,
  acknowledgementDeadlineSeconds,
  buildIncidentIdempotencyKey,
  evaluateLocationIntegrity,
  evaluateResponseReadiness,
  shortIncidentRef,
} from '../../shared/emergencyIncident.ts';
import { buildRecipientDrafts, createAndSendRows } from '../../shared/emergencyIncidentNotify.ts';

const ALLOWED_TYPES = ['security', 'medical', 'transport', 'natural_disaster', 'lost', 'other'];

/**
 * confirmEmergencyIncident — the ONLY path that turns "I need help" into an alert.
 *
 * `confirmed` must be literally true. A transcript, a spoken sentence, or a
 * model's reading of one can never satisfy it: understanding someone is not the
 * same as calling for help, and only the second one may move a person.
 *
 * It never claims a response. response_capability starts at whatever the
 * readiness gate says, which is 'unavailable' for any destination without a
 * two-person-approved, on-duty, verified team.
 */
Deno.serve(createHandler(async ({ base44, user, body }) => {
  const b = await body<any>();

  if (b?.confirmed !== true) {
    return err('An explicit confirmation is required. Saying you need help does not send an alert until you confirm it.', 400);
  }

  const method = ['in_app_explicit', 'pin_session', 'care_team'].includes(b.confirmation_method)
    ? b.confirmation_method
    : 'in_app_explicit';

  const isAdmin = user?.role === 'admin' || user?.role === 'platform_admin';
  if (method === 'care_team' && !isAdmin) {
    return err("Only the care team can confirm an alert on someone else's behalf.", 403);
  }

  const patientEmail = isAdmin && b.patient_email ? String(b.patient_email) : user.email;
  const patientId = isAdmin && b.patient_id ? String(b.patient_id) : user.id;
  const type = ALLOWED_TYPES.includes(b.type) ? b.type : 'security';
  const now = new Date().toISOString();

  // ── Idempotency: a replay is the same incident, never a second alert ──────
  const idempotencyKey = b.client_ref
    ? `${patientId}:${type}:${String(b.client_ref).slice(0, 120)}`
    : buildIncidentIdempotencyKey({ patientId, type, at: now });

  const existing = await base44.asServiceRole.entities.Incident
    .filter({ idempotency_key: idempotencyKey }, '-created_date', 3)
    .catch(() => []);
  if (Array.isArray(existing) && existing[0]) {
    return ok({ reused: true, incident: existing[0], recipients: [], message: 'This alert was already opened. Nothing was sent twice.' });
  }

  // ── Case context ─────────────────────────────────────────────────────────
  let caseRec: any = null;
  if (b.case_id) {
    const cases = await base44.asServiceRole.entities.CaseRecord
      .filter({ id: String(b.case_id) }, '-created_date', 1)
      .catch(() => []);
    caseRec = cases?.[0] || null;
  }

  const countryCode = b.country_code
    ? String(b.country_code).toUpperCase().slice(0, 2)
    : caseRec?.procedure_country_code
    ? String(caseRec.procedure_country_code).toUpperCase().slice(0, 2)
    : null;
  const areaLabel = b.location_label || caseRec?.procedure_city || countryCode || null;

  // ── Location integrity: a missing fix never blocks the alert ─────────────
  const raw = b.location || {};
  const lat = typeof raw.latitude === 'number' && raw.latitude >= -90 && raw.latitude <= 90 ? raw.latitude : null;
  const lng = typeof raw.longitude === 'number' && raw.longitude >= -180 && raw.longitude <= 180 ? raw.longitude : null;
  const source = ['gps', 'network', 'manual'].includes(raw.source) && lat !== null && lng !== null ? raw.source : 'none';
  const capturedAt = source === 'none' ? null : raw.captured_at || now;
  const accuracy = typeof raw.accuracy_m === 'number' && raw.accuracy_m >= 0 ? Math.min(raw.accuracy_m, 100000) : null;
  const location = evaluateLocationIntegrity({ source, captured_at: capturedAt, accuracy_m: accuracy }, now);

  // ── Policy + readiness ───────────────────────────────────────────────────
  const policy = await loadPolicy(base44, countryCode);
  const ackSeconds = acknowledgementDeadlineSeconds(policy);
  const ackDeadlineAt = acknowledgementDeadline(now, ackSeconds);

  const profiles = await base44.asServiceRole.entities.SecurityReadinessProfile
    .filter({ country_code: countryCode || '', is_current: true }, '-created_date', 5)
    .catch(() => []);
  const profile = (profiles || []).find((p: any) => p.status === 'approved') || (profiles || [])[0] || null;

  const destination = { area_label: areaLabel, country_code: countryCode };
  const structural = evaluateResponseReadiness({ profile, destination, now, acknowledged: true });
  const verdict = evaluateResponseReadiness({ profile, destination, now, acknowledged: false });
  const incidentRef = shortIncidentRef(idempotencyKey);

  // ── The one authoritative incident ───────────────────────────────────────
  const incident = await base44.asServiceRole.entities.Incident.create({
    patient_id: patientId,
    patient_email: patientEmail,
    patient_name: b.patient_name || caseRec?.client_name || user.full_name || null,
    trip_id: b.trip_id || null,
    case_id: b.case_id || null,
    type,
    trigger_source: method === 'care_team' ? 'admin' : 'patient_sos',
    client_ref: b.client_ref || null,
    idempotency_key: idempotencyKey,
    dedupe_key: idempotencyKey,
    status: 'OPEN',
    confirmation_state: 'confirmed',
    confirmed_at: now,
    confirmation_method: method,
    country_code: countryCode,
    incident_ref: incidentRef,
    latitude: lat,
    longitude: lng,
    location_label: areaLabel,
    location_source: location.source,
    location_captured_at: capturedAt,
    location_accuracy_m: accuracy,
    location_freshness: location.freshness,
    location_freshness_evaluated_at: now,
    response_capability: verdict.capability,
    response_blockers: verdict.blockers,
    readiness_profile_id: verdict.profile_id,
    readiness_evaluated_at: now,
    acknowledgement_deadline_at: ackDeadlineAt,
    policy_snapshot: {
      country_code: countryCode,
      emergency_number: policy?.emergency_number || caseRec?.emergency_number || null,
      acknowledgement_deadline_seconds: ackSeconds,
      version: policy?.version || 0,
    },
    policy_missing: !policy,
    triggered_at: now,
    triggered_at_source: 'client',
    received_at: now,
    history_preserved: true,
    schema_version: 2,
  });

  await appendAudit(base44, {
    incident_id: incident.id,
    patient_email: patientEmail,
    subject_type: 'incident',
    subject_id: incident.id,
    from_state: null,
    to_state: 'OPEN',
    actor: method === 'care_team' ? `care_team:${user.email}` : `patient:${patientEmail}`,
    actor_type: method === 'care_team' ? 'care_team' : 'patient',
    timestamp: now,
    evidence: {
      confirmation_method: method,
      type,
      location_source: location.source,
      location_freshness: location.freshness,
      response_capability: verdict.capability,
      response_blockers: verdict.blockers,
      readiness_profile_id: verdict.profile_id,
      acknowledgement_deadline_at: ackDeadlineAt,
    },
  });

  // ── Recipients: one row each, one send each, real outcomes ───────────────
  const drafts = buildRecipientDrafts({
    incident: { ...incident, response_blockers: verdict.blockers },
    profile,
    careTeamEmail: Deno.env.get('ADMIN_EMAIL') || null,
    guardianEmail: caseRec?.emergency_contact && String(caseRec.emergency_contact).includes('@')
      ? String(caseRec.emergency_contact)
      : null,
    guardianName: caseRec?.emergency_contact_name || null,
    structuralConfirmed: structural.capability === 'confirmed',
    firstBlocker: verdict.blockers[0] || null,
    locationLabel: `${areaLabel || 'Area unknown'} — ${location.label}`,
  });

  const recipients = await createAndSendRows(base44, incident, drafts, now, ackDeadlineAt);

  const careTeamReached = recipients.some(
    (r: any) => r.recipient_role === 'care_team' && ['SENT', 'DELIVERED'].includes(r.status),
  );

  await base44.asServiceRole.entities.Incident.update(incident.id, {
    status: careTeamReached ? 'DISPATCHING' : 'OPEN',
    escalated_at: careTeamReached ? now : null,
    escalation_reason: careTeamReached ? 'care_team_paged' : null,
  }).catch(() => {});

  return ok({
    reused: false,
    incident: { ...incident, status: careTeamReached ? 'DISPATCHING' : 'OPEN' },
    readiness: {
      capability: verdict.capability,
      blockers: verdict.blockers,
      team_name: verdict.team_name,
      operational_hours: verdict.operational_hours,
      response_time_assumption_minutes: verdict.response_time_assumption_minutes,
    },
    location,
    recipients,
    ack_deadline_at: ackDeadlineAt,
    message: verdict.capability === 'confirmed'
      ? 'Alert sent. A security team has acknowledged.'
      : 'Alert sent. Security response is NOT confirmed — call local emergency services if you are in immediate danger.',
  });
}, { name: 'confirmEmergencyIncident' }));