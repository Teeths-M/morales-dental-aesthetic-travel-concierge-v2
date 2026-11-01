import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { appendAudit } from '../../shared/incidentEngine.ts';
import {
  canAdvanceRecipient,
  evaluateResponseReadiness,
} from '../../shared/emergencyIncident.ts';

const ACTION_TO_STATUS: Record<string, string> = {
  sent: 'SENT',
  delivered: 'DELIVERED',
  acknowledge: 'ACKNOWLEDGED',
  accept: 'ACCEPTED',
  en_route: 'EN_ROUTE',
  arrive: 'ARRIVED',
  fail: 'FAILED',
  escalate: 'ESCALATED',
};

const INCIDENT_STATUS_FOR: Record<string, string> = {
  ACCEPTED: 'ASSIGNED',
  EN_ROUTE: 'EN_ROUTE',
  ARRIVED: 'ARRIVED',
};

/**
 * updateIncidentRecipientState — advances ONE recipient row, and re-derives what
 * the traveller is told.
 *
 * Authorization is either an authenticated care-team/admin session, or the
 * row's own unguessable ack_token. The token is the credential for exactly this
 * row and nothing else, which is what lets a driver acknowledge from an SMS link
 * without an account — and why it is never reused across incidents.
 *
 * The transition itself is validated against the table in
 * shared/emergencyIncident.ts, so a row cannot jump from SENT to ARRIVED. Only a
 * real acknowledgement (or beyond) can raise the incident's response_capability,
 * which is what makes 'confirmed' mean a person, not a carrier.
 */
Deno.serve(createHandler(async ({ base44, user, body, req }) => {
  const b = await body<any>();
  const action = String(b?.action || '');
  const to = ACTION_TO_STATUS[action];
  if (!to) return err('Unknown action.', 400);

  const isCareTeam = user?.role === 'admin' || user?.role === 'platform_admin';

  let row: any = null;
  if (b.recipient_id && isCareTeam) {
    const rows = await base44.asServiceRole.entities.IncidentNotification
      .filter({ id: String(b.recipient_id) }, '-created_date', 1).catch(() => []);
    row = rows?.[0] || null;
  } else if (b.ack_token) {
    const rows = await base44.asServiceRole.entities.IncidentNotification
      .filter({ ack_token: String(b.ack_token) }, '-created_date', 1).catch(() => []);
    row = rows?.[0] || null;
  }

  if (!row) return err('This link is not valid for any alert.', 404);

  const now = new Date().toISOString();

  // A resolved incident can no longer be advanced by a responder link — the
  // stand-down has already been sent.
  const incidents = await base44.asServiceRole.entities.Incident
    .filter({ id: row.incident_id }, '-created_date', 1).catch(() => []);
  const incident = incidents?.[0];
  if (!incident) return err('The incident for this alert no longer exists.', 404);
  if (incident.closed_at || incident.status === 'RESOLVED') {
    return err('This alert has been closed. No further response is required.', 409);
  }
  if (!isCareTeam && row.acknowledgement_state === 'escalated') {
    return err('This alert has been handed to a coordinator.', 409);
  }

  if (!canAdvanceRecipient(row.status, to)) {
    return err(`An alert cannot go from ${row.status} to ${to}.`, 409);
  }

  const patch: any = { status: to, status_source: 'human' };
  if (to === 'SENT') patch.sent_at = now;
  if (to === 'DELIVERED') patch.delivered_at = now;
  if (to === 'ACKNOWLEDGED') {
    patch.acknowledged_at = now;
    patch.acknowledgement_state = 'acknowledged';
  }
  if (to === 'ACCEPTED') patch.accepted_at = now;
  if (to === 'EN_ROUTE') patch.en_route_at = now;
  if (to === 'ARRIVED') patch.arrived_at = now;
  if (to === 'FAILED') {
    patch.failed_at = now;
    patch.failure_reason = b.reason || 'Reported failed.';
  }
  if (to === 'ESCALATED') {
    patch.escalated_at = now;
    // Only the care team may name who an escalation goes to. Someone holding a
    // responder link always escalates to the duty coordinator.
    patch.escalated_to = (isCareTeam && b.escalated_to) || Deno.env.get('ADMIN_EMAIL') || null;
    patch.acknowledgement_state = 'escalated';
    patch.escalation_note = b.reason || null;
  }
  if (b.eta_seconds && to === 'ACCEPTED') {
    patch.accepted_eta_seconds = Number(b.eta_seconds) || null;
  }

  await base44.asServiceRole.entities.IncidentNotification.update(row.id, patch);

  await appendAudit(base44, {
    incident_id: row.incident_id,
    patient_email: row.patient_email,
    subject_type: 'notification',
    subject_id: row.id,
    from_state: row.status,
    to_state: to,
    actor: isCareTeam ? `care_team:${user.email}` : `responder:${row.recipient_role}`,
    actor_type: isCareTeam ? 'care_team' : 'responder',
    channel: row.channel,
    timestamp: now,
    evidence: { recipient_role: row.recipient_role, note: b.reason || null },
  });

  // ── Re-derive capability from what people actually did ───────────────────
  const allRows = await base44.asServiceRole.entities.IncidentNotification
    .filter({ incident_id: row.incident_id }, '-created_date', 50).catch(() => []);

  const engaged = (allRows || []).some(
    (r: any) => r.recipient_role === 'responder' &&
      ['ACKNOWLEDGED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED'].includes(r.status),
  );

  let profile: any = null;
  if (incident.readiness_profile_id) {
    const ps = await base44.asServiceRole.entities.SecurityReadinessProfile
      .filter({ id: incident.readiness_profile_id }, '-created_date', 1).catch(() => []);
    profile = ps?.[0] || null;
  }

  const verdict = evaluateResponseReadiness({
    profile,
    destination: {
      area_label: incident.location_label,
      country_code: incident.country_code,
    },
    now,
    acknowledged: engaged,
  });

  const incidentPatch: any = {
    response_capability: verdict.capability,
    response_blockers: verdict.blockers,
    readiness_evaluated_at: now,
  };
  const mapped = INCIDENT_STATUS_FOR[to];
  if (mapped && !['RESOLVED', 'UNRESOLVED'].includes(incident.status)) {
    incidentPatch.status = mapped;
  }
  await base44.asServiceRole.entities.Incident.update(incident.id, incidentPatch).catch(() => {});

  return ok({
    recipient: { ...row, ...patch },
    response_capability: verdict.capability,
    response_blockers: verdict.blockers,
  });
}, { name: 'updateIncidentRecipientState', requireAuth: false }));