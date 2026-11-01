import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { appendAudit } from '../../shared/incidentEngine.ts';
import { closureClosesIncident, isValidClosureReason } from '../../shared/emergencyIncident.ts';
import { standDownMessage, sendRowStandDown, TEMPLATE_STAND_DOWN } from '../../shared/emergencyIncidentNotify.ts';

/**
 * resolveEmergencyIncident — closes or hands over, and never deletes.
 *
 * Two things here are load-bearing:
 *
 *  • 'handover' does NOT close. It changes who owns the incident, and the
 *    incident stays open until that owner closes it. Treating a handover as a
 *    closure is how an open incident silently disappears while someone is still
 *    dealing with it.
 *  • Standing down a responder is an act of care, not tidiness. A driver who
 *    said yes at 3am and is never told it was a false alarm learns to hesitate
 *    next time, so the stand-down is sent to every row that was actually
 *    engaged, and recorded whether it left or not.
 */
Deno.serve(createHandler(async ({ base44, user, body }) => {
  const b = await body<any>();
  const isCareTeam = user?.role === 'admin' || user?.role === 'platform_admin';
  const now = new Date().toISOString();

  const rows = await base44.asServiceRole.entities.Incident
    .filter({ id: String(b?.incident_id || '') }, '-created_date', 1).catch(() => []);
  const incident = rows?.[0];
  if (!incident) return err('Alert not found.', 404);

  const owns = incident.patient_email === user?.email || incident.patient_id === user?.id;
  if (!isCareTeam && !owns) return err('You do not have access to this alert.', 403);
  if (incident.closed_at) return err('This alert is already closed.', 409);

  // ── Handover: ownership moves, the incident stays open ────────────────────
  if (b?.action === 'handover') {
    const to = String(b.handover_to || '').trim();
    if (!to) return err('A handover needs a named person to own it.', 400);

    await base44.asServiceRole.entities.Incident.update(incident.id, {
      handover_to: to,
      escalation_reason: b.notes ? String(b.notes).slice(0, 500) : 'Handed to a coordinator.',
    });

    await appendAudit(base44, {
      incident_id: incident.id,
      patient_email: incident.patient_email,
      subject_type: 'incident',
      subject_id: incident.id,
      from_state: incident.status,
      to_state: incident.status,
      actor: isCareTeam ? `care_team:${user.email}` : `patient:${user.email}`,
      actor_type: isCareTeam ? 'care_team' : 'patient',
      timestamp: now,
      evidence: { handover_to: to, note: b.notes || null },
    });

    return ok({ handed_over_to: to, still_open: true });
  }

  // ── Closure ──────────────────────────────────────────────────────────────
  const reason = String(b?.reason || '');
  if (!isValidClosureReason(reason)) {
    return err('Choose why this alert is being closed.', 400);
  }
  // A responder-only action cannot close an incident: closing is the
  // traveller's or the care team's decision.
  if (!isCareTeam && !owns) return err('You do not have access to this alert.', 403);

  const closes = closureClosesIncident(reason);
  const patch: any = {
    closed_reason: reason,
    closure_notes: b.notes ? String(b.notes).slice(0, 1000) : null,
    resolved_by: user?.email || 'traveller',
  };
  if (closes) {
    patch.status = 'RESOLVED';
    patch.resolved_at = now;
    patch.closed_at = now;
    patch.closed_by = user?.email || 'traveller';
  }

  await base44.asServiceRole.entities.Incident.update(incident.id, patch);

  // An open transport request is stood down, never deleted — a failed or
  // cancelled search for transport stays visible in the history.
  const transports = await base44.asServiceRole.entities.EmergencyTransportRequest
    .filter({ incident_id: incident.id }, '-created_date', 10).catch(() => []);
  for (const t of transports || []) {
    if (['CANCELLED', 'FAILED', 'ARRIVED'].includes(t.state)) continue;
    await base44.asServiceRole.entities.EmergencyTransportRequest.update(t.id, {
      state: 'CANCELLED',
      cancelled_at: now,
      cancel_reason: `Incident closed: ${reason}.`,
      transition_log: [...(t.transition_log || []), {
        from_state: t.state, to_state: 'CANCELLED', at: now,
        actor: user?.email || 'traveller', source: 'server', note: 'Incident closed.',
      }],
    }).catch(() => {});
  }

  // ── Stand down every responder who was actually engaged ──────────────────
  const recipients = await base44.asServiceRole.entities.IncidentNotification
    .filter({ incident_id: incident.id }, '-created_date', 50).catch(() => []);

  const engagedRows = (recipients || []).filter(
    (r: any) => r.recipient_role === 'responder' &&
      ['SENT', 'DELIVERED', 'ACKNOWLEDGED', 'ACCEPTED', 'EN_ROUTE'].includes(r.status),
  );

  const message = standDownMessage(incident, reason);
  const notices: any[] = [];
  for (const r of engagedRows) {
    const result = await sendRowStandDown(base44, r, message).catch(() => ({ ok: false, error: 'Send failed.' }));
    const row = await base44.asServiceRole.entities.IncidentNotification.create({
      incident_id: incident.id,
      patient_email: incident.patient_email,
      channel: r.channel,
      recipient_role: r.recipient_role,
      recipient_name: r.recipient_name,
      recipient_ref: r.recipient_ref,
      recipient_id: r.recipient_id || null,
      authorization: 'care_team',
      status: result.ok ? 'SENT' : 'FAILED',
      queued_at: now,
      sent_at: result.ok ? now : null,
      failed_at: result.ok ? null : now,
      failure_reason: result.ok ? null : result.error,
      is_live_fanout: false,
      template_key: TEMPLATE_STAND_DOWN.key,
      template_version: TEMPLATE_STAND_DOWN.version,
      message_original: message,
      message_language: 'en',
      translation_state: 'approved_template',
      acknowledgement_state: 'not_required',
      status_source: 'server',
      attempt_count: 1,
      last_attempt_at: now,
    }).catch(() => null);
    if (row) notices.push({ id: row.id, status: row.status });
  }

  await appendAudit(base44, {
    incident_id: incident.id,
    patient_email: incident.patient_email,
    subject_type: 'incident',
    subject_id: incident.id,
    from_state: incident.status,
    to_state: closes ? 'RESOLVED' : incident.status,
    actor: isCareTeam ? `care_team:${user.email}` : `patient:${user.email}`,
    actor_type: isCareTeam ? 'care_team' : 'patient',
    timestamp: now,
    evidence: {
      closure_reason: reason,
      notes: b.notes || null,
      stood_down: engagedRows.length,
      stand_down_delivered: notices.filter((n) => n.status === 'SENT').length,
    },
  });

  return ok({
    closed: closes,
    reason,
    stood_down: engagedRows.length,
    stand_down_sent: notices.filter((n) => n.status === 'SENT').length,
    // Nothing was deleted: the incident, every recipient row and the audit
    // trail all remain readable.
    history_preserved: true,
  });
}, { name: 'resolveEmergencyIncident' }));