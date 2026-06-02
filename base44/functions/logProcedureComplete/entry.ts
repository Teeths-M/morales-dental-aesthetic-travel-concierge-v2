/**
 * Stage 11 End: Procedure Complete / Move to 7-Day Recovery
 * Called by Doctor Portal. Lifts the notification blackout and
 * transitions the case to RECOVERY_PHASE_7_DAY.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json();
    const { case_id, token, outcome_notes } = body;

    // Resolve identity: session user OR token-authenticated doctor
    let resolvedEmail = user?.email || null;
    let caseRecord = null;

    if (token) {
      const records = await base44.asServiceRole.entities.CaseRecord.filter({ doctor_portal_token: token });
      caseRecord = records?.[0] || null;
      if (!caseRecord) {
        return Response.json({ error: 'Invalid or expired portal token' }, { status: 403 });
      }
      if (!resolvedEmail) resolvedEmail = caseRecord.doctor_email || 'doctor-via-token';
    } else if (user && (user.role === 'admin' || user.role === 'platform_admin')) {
      if (!case_id) return Response.json({ error: 'case_id is required' }, { status: 400 });
      caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
      if (!caseRecord) return Response.json({ error: 'CaseRecord not found' }, { status: 404 });
    } else {
      return Response.json({ error: 'Unauthorized — provide a valid portal token or admin session' }, { status: 401 });
    }

    if (caseRecord.status !== 'SURGICAL_EXECUTION_WINDOW') {
      return Response.json({
        error: `Case is not in SURGICAL_EXECUTION_WINDOW (current: ${caseRecord.status}). Cannot log procedure complete from this state.`
      }, { status: 409 });
    }

    const now = new Date().toISOString();
    const updatedTimeline = [
      ...(caseRecord.timeline_log || []),
      {
        timestamp: now,
        action: 'stage_11_procedure_complete',
        details: `Procedure marked complete by Dr. ${resolvedEmail}. Case transitioning to RECOVERY_PHASE_7_DAY (7-Day Recovery Window). Notification blackout LIFTED.${outcome_notes ? ` Notes: ${outcome_notes}` : ''}`,
        performed_by: resolvedEmail,
        non_repudiable: true,
        outcome_notes: outcome_notes || null
      },
      {
        timestamp: now,
        action: 'stage_11_blackout_lifted',
        details: 'Notification blackout lifted. Automated notifications to Patient, Admin, and Doctor roles will resume. Suppressed notifications in audit log are available for review.',
        performed_by: 'system',
        non_repudiable: true
      }
    ];

    await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, {
      status: 'RECOVERY_PHASE_7_DAY',
      notification_blackout_active: false,
      notification_blackout_lifted_at: now,
      procedure_complete_logged_at: now,
      timeline_log: updatedTimeline
    });

    // Count how many notifications were suppressed during blackout
    const suppressedLogs = await base44.asServiceRole.entities.NotificationLog.filter({
      case_id: caseRecord.id,
      suppression_reason: 'SURGICAL_EXECUTION_WINDOW_BLACKOUT',
      replay_status: 'pending'
    });

    return Response.json({
      success: true,
      new_status: 'RECOVERY_PHASE_7_DAY',
      blackout_active: false,
      blackout_lifted_at: now,
      procedure_complete_logged_at: now,
      suppressed_notifications_pending: suppressedLogs?.length || 0,
      message: `Stage 11 complete. Procedure logged by ${resolvedEmail}. Case moved to 7-Day Recovery. Notification blackout LIFTED. ${suppressedLogs?.length || 0} suppressed notifications are in audit log.`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});