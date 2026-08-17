import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { logJourneyEvent } from '../../shared/logJourneyEvent.ts';

// mcareAutonomousDoctorReroute — the second autonomous "heartbeat" of M-Care.
//
// Triggered by an entity automation the instant a WorkflowEvent's doctor_status
// transitions to 'unavailable' (the doctor declined / can't take the case).
// M-Care does NOT wait for a coordinator to notice the decline and reassign
// manually — it reassigns itself and speaks first.
//
// This reuses the existing reroute LOGIC (autoReassignDoctorOnDecline, which
// already calls pickBestDoctor + generates a new portal link) rather than
// duplicating it, and layers on the two things that function is missing:
//   1. A proactive JourneyEvent chat bubble (+ push) so the PATIENT hears
//      "I caught that — I've already reassigned you" before they ever wonder.
//   2. A permanent CrisisReroute audit record for the ledger.
//
// All as service-role — automations run without a user session. Guarded by
// cronAuthorized so only the platform's automation runner (or an admin) can
// fire it, never arbitrary HTTP.

Deno.serve(createHandler(async ({ req, base44, body }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const payload = await body().catch(() => ({} as any));
  const entityId: string = payload?.event?.entity_id || '';
  if (!entityId) return err('Missing entity_id', 400);

  // Re-read the real WorkflowEvent — never trust the payload body.
  let workflow: any = null;
  try { workflow = await base44.asServiceRole.entities.WorkflowEvent.get(entityId); } catch (_) { workflow = null; }
  if (!workflow) return ok({ skipped: 'workflow_not_found' });

  // Only act on the TRANSITION into unavailable. If old_data shows it was
  // already unavailable, this update is not the transition — skip (dedup).
  const oldStatus: string = payload?.old_data?.doctor_status || '';
  const newStatus: string = workflow.doctor_status || '';
  if (oldStatus === newStatus) return ok({ skipped: 'no_status_change' });
  if (newStatus !== 'unavailable') return ok({ skipped: `status_not_decline:${newStatus}` });

  // Resolve patient identity for JourneyEvent RLS + the audit record.
  const clientEmail: string = workflow.patient_email || '';
  const clientName: string = workflow.patient_name || 'there';
  if (!clientEmail) return ok({ skipped: 'no_patient_email' });

  // Resolve the linked Consultation (for the preferred/declined doctor id)
  // and the real CaseRecord id (JourneyEvent.case_id must match the active
  // CaseRecord the frontend's useJourneyEvents hook polls).
  let consultation: any = null;
  if (workflow.consultation_id) {
    try { consultation = await base44.asServiceRole.entities.Consultation.get(workflow.consultation_id); } catch (_) { consultation = null; }
  }
  const declinedDoctorId: string = consultation?.preferred_doctor_id || '';
  const declinedDoctorName: string = consultation?.preferred_doctor_name || 'your assigned doctor';

  let caseId: string = '';
  try {
    const cases = await base44.asServiceRole.entities.CaseRecord.filter({ client_email: clientEmail }, '-created_date', 1);
    caseId = cases?.[0]?.id || workflow.consultation_id || '';
  } catch (_) { caseId = workflow.consultation_id || ''; }

  const now = new Date().toISOString();

  // ── Reuse the existing reroute logic ─────────────────────────────────────
  // autoReassignDoctorOnDecline finds the next best doctor, updates the
  // WorkflowEvent, generates a fresh portal link, and emails the admin. We
  // invoke it as service-role and read the result to know whether a backup
  // was actually found (it returns needs_admin_intervention when none).
  let backup: { id: string; name: string } | null = null;
  let rerouteFailed = false;
  try {
    const res = await base44.asServiceRole.functions.invoke('autoReassignDoctorOnDecline', {
      workflow_id: workflow.id,
      declined_doctor_id: declinedDoctorId,
    });
    const data: any = res?.data ?? res ?? {};
    if (data && data.new_doctor_id) {
      backup = { id: String(data.new_doctor_id), name: String(data.new_doctor_name || 'a verified specialist') };
    }
  } catch (_) { rerouteFailed = true; }

  // ── Build the proactive patient message (deterministic, honest) ─────────
  let patientMessage: string;
  if (backup) {
    patientMessage = `I caught that ${declinedDoctorName} couldn't take your case. I've already reassigned you to ${backup.name} — they're being contacted now. You don't need to do anything; I'll tell you the moment they confirm.`;
  } else {
    // Loud, honest failure — no silent broken promise. Alert the care team.
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || '';
    if (adminEmail) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'Morales Safety — Autonomous Doctor Reroute',
          to: adminEmail,
          subject: `No backup doctor available — ${clientName}'s case needs manual assignment`,
          body: `<div style="font-family:sans-serif;max-width:560px;padding:24px;border:2px solid #dc2626;border-radius:12px;">
<p style="margin:0 0 8px;color:#b91c1c;font-weight:700;">🚨 M-Care auto-reroute could not find a backup doctor</p>
<table style="width:100%;border-collapse:collapse;">
<tr><td style="padding:4px 0;color:#6b7280;">Patient</td><td>${clientName}</td></tr>
<tr><td style="padding:4px 0;color:#6b7280;">Email</td><td>${clientEmail}</td></tr>
<tr><td style="padding:4px 0;color:#6b7280;">Workflow</td><td>${workflow.id}</td></tr>
<tr><td style="padding:4px 0;color:#6b7280;">Declined doctor</td><td>${declinedDoctorName}</td></tr>
</table>
<p style="margin-top:12px;color:#374151;">The patient has been told a coordinator is taking over. Please assign a specialist manually.</p>
</div>`,
        });
      } catch (_) { /* best-effort */ }
    }
    patientMessage = `I caught that ${declinedDoctorName} couldn't take your case. I'm escalating to your care team right now to find the right specialist manually — sit tight, I'm on it until someone is confirmed for you.`;
  }

  // ── Proactive M-Care chat bubble (+ push notification, high priority) ─────
  await logJourneyEvent(base44, {
    case_id: caseId,
    client_email: clientEmail,
    event_type: 'doctor_backup_dispatched',
    source: 'mcareAutonomousDoctorReroute',
    message_text: patientMessage,
    priority: 'high',
    action_taken: backup
      ? `Auto-reassigned workflow ${workflow.id} to doctor ${backup.id} via autoReassignDoctorOnDecline.`
      : (rerouteFailed ? `Reroute invocation failed; alerted care team.` : `No backup doctor available; alerted care team.`),
    tool_result: { workflow_id: workflow.id, declined_doctor_id: declinedDoctorId, backup_assigned: !!backup, reroute_failed: rerouteFailed },
    user_action_required: !backup,
    escalation_occurred: !backup,
  });

  // ── Permanent CrisisReroute audit record ─────────────────────────────────
  try {
    await base44.asServiceRole.entities.CrisisReroute.create({
      case_id: caseId,
      client_email: clientEmail,
      client_name: clientName,
      original_booking_id: workflow.id,
      original_provider_id: declinedDoctorId,
      original_provider_name: declinedDoctorName,
      original_provider_type: 'doctor',
      crisis_type: 'PROVIDER_CANCELLED',
      detected_at: now,
      detected_by: 'CRON',
      source_message: `Autonomous detection: WorkflowEvent ${workflow.id} doctor_status → unavailable`,
      selected_backup_id: backup?.id || '',
      selected_backup_name: backup?.name || '',
      selected_backup_type: backup ? 'doctor' : '',
      patient_message: patientMessage,
      all_stakeholders_notified: !!backup,
      stakeholders_notified: backup ? ['doctor', 'admin'] : ['admin'],
      timeline_preserved: !!backup,
      status: backup ? 'resolved' : 'human_escalated',
      human_escalated: !backup,
      human_escalated_reason: !backup ? (rerouteFailed ? 'Reroute invocation failed' : 'No available backup doctor') : '',
      audit_log: [
        { timestamp: now, action: 'detected', actor: 'mcareAutonomousDoctorReroute', notes: `doctor_status → unavailable` },
        { timestamp: now, action: backup ? 'rerouted' : 'escalated', actor: 'mcareAutonomousDoctorReroute', notes: backup ? `backup: ${backup.id}` : 'no backup; admin alerted' },
      ],
    });
  } catch (_) { /* audit is best-effort */ }

  return ok({
    acted: true,
    workflow_id: workflow.id,
    backup_assigned: !!backup,
    backup_doctor_id: backup?.id || null,
    patient_notified: true,
  });
}, { name: 'mcareAutonomousDoctorReroute', requireAuth: false }));