import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { appendAudit } from '../../shared/incidentEngine.ts';
import { isAcknowledgementOverdue } from '../../shared/emergencyIncident.ts';
import { sendEmail } from '../../shared/emergencyIncidentNotify.ts';

/**
 * sweepIncidentAcknowledgements — the job that refuses to let a "sent" alert
 * quietly become nobody's problem.
 *
 * Every pass finds recipient rows whose acknowledgement deadline has passed
 * without a human response, records them as TIMED_OUT, and pages a coordinator
 * with the full list in ONE email. A timeout is written once and never
 * re-escalated on the next pass, so the sweep is idempotent — running it twice
 * cannot page the on-call twice for the same silence.
 */
Deno.serve(createHandler(async ({ base44, req }) => {
  if (!(await cronAuthorized(req, base44))) {
    return err('Not authorised.', 401);
  }

  const now = new Date().toISOString();
  const overdue = await base44.asServiceRole.entities.IncidentNotification
    .filter(
      { acknowledgement_state: 'pending', acknowledgement_deadline_at: { $lte: now } },
      '-created_date',
      100,
    )
    .catch(() => []);

  const timedOut: any[] = [];

  for (const row of overdue || []) {
    if (!isAcknowledgementOverdue(row, now)) continue;

    await base44.asServiceRole.entities.IncidentNotification.update(row.id, {
      status: 'TIMED_OUT',
      timed_out_at: now,
      acknowledgement_state: 'timed_out',
      failure_reason: 'No acknowledgement before the deadline.',
      escalated_to: Deno.env.get('ADMIN_EMAIL') || null,
      status_source: 'server',
    }).catch(() => {});

    await appendAudit(base44, {
      incident_id: row.incident_id,
      patient_email: row.patient_email,
      subject_type: 'notification',
      subject_id: row.id,
      from_state: row.status,
      to_state: 'TIMED_OUT',
      actor: 'sweep_incident_acknowledgements',
      actor_type: 'system',
      channel: row.channel,
      timestamp: now,
      evidence: {
        acknowledgement_deadline_at: row.acknowledgement_deadline_at,
        recipient_role: row.recipient_role,
      },
    });

    const incidents = await base44.asServiceRole.entities.Incident
      .filter({ id: row.incident_id }, '-created_date', 1).catch(() => []);
    const incident = incidents?.[0];
    if (incident && !incident.closed_at && !incident.acknowledgement_timeout_at) {
      await base44.asServiceRole.entities.Incident.update(incident.id, {
        acknowledgement_timeout_at: now,
        acknowledgement_timeout_recorded_at: now,
        escalated_at: now,
        escalation_reason: 'acknowledgement_timeout',
        unresolved_reason: 'acknowledgement_timeout',
      }).catch(() => {});
    }

    timedOut.push({
      incident_ref: incident?.incident_ref || null,
      patient_name: incident?.patient_name || row.patient_email,
      recipient_name: row.recipient_name,
      channel: row.channel,
      deadline: row.acknowledgement_deadline_at,
    });
  }

  // One page per sweep, not one per row.
  if (timedOut.length > 0) {
    const careTeam = Deno.env.get('ADMIN_EMAIL');
    if (careTeam) {
      const body = [
        `${timedOut.length} emergency contact(s) did not acknowledge before their deadline.`,
        '',
        ...timedOut.map(
          (t) =>
            `• ${t.incident_ref || 'incident'} — ${t.patient_name}: ${t.recipient_name || 'recipient'} via ${t.channel}, deadline ${t.deadline}`,
        ),
        '',
        'These travellers were told their security response is NOT confirmed. Call them, then call the assigned team directly.',
      ].join('\n');

      await sendEmail(base44, careTeam, 'ESCALATION — emergency alerts not acknowledged', body).catch(() => {});
    }
  }

  return ok({ swept_at: now, timed_out: timedOut.length, rows: timedOut });
}, { name: 'sweepIncidentAcknowledgements', requireAuth: false, rateLimit: false }));