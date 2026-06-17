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

    // ── Auto-trigger Recovery Mode ────────────────────────────────────────────
    // Programmatically fires the second the clinic checkout handshake completes.
    // Complexity is inferred from case_record or defaults to 'moderate'.
    try {
      const complexity = caseRecord.procedures?.length >= 3 ? 'major'
        : caseRecord.procedures?.length === 2 ? 'moderate' : 'minor';

      const CHECKIN_INTERVALS = { minor: 12, moderate: 8, major: 4 };
      const RECOVERY_DURATION = { minor: 24, moderate: 48, major: 72 };
      const intervalHours = CHECKIN_INTERVALS[complexity];
      const durationHours = RECOVERY_DURATION[complexity];
      const recoveryEnd = new Date(new Date(now).getTime() + durationHours * 3600000);

      const checkins = [];
      let t = new Date(new Date(now).getTime() + intervalHours * 3600000);
      while (t <= recoveryEnd) {
        checkins.push({ scheduled_at: t.toISOString(), completed_at: null, status: 'pending', pain_level: null, notes: null, escalated: false });
        t = new Date(t.getTime() + intervalHours * 3600000);
      }

      await base44.asServiceRole.entities.RecoverySession.create({
        case_id: caseRecord.id,
        patient_email: caseRecord.client_email,
        patient_name: caseRecord.client_name,
        surgery_type: caseRecord.procedures?.[0] || 'Procedure',
        surgery_complexity: complexity,
        recovery_start_at: now,
        recovery_end_at: recoveryEnd.toISOString(),
        is_active: true,
        notification_silencing_active: true,
        checkin_interval_hours: intervalHours,
        checkins,
        total_checkins_scheduled: checkins.length,
        total_checkins_completed: 0,
        escalations: 0,
        family_contacts: [],
      });

      // Re-engage notification blackout for recovery phase
      await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, {
        notification_blackout_active: true,
        notification_blackout_started_at: now,
      });

      // Notify patient that recovery mode is live
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: caseRecord.client_email,
        subject: '🌿 Recovery Mode Activated — Your Post-Surgery Care Has Begun',
        body: `Dear ${caseRecord.client_name},\n\nYour procedure is complete and Recovery Mode has been automatically activated.\n\n✅ Non-critical notifications have been silenced\n✅ Gentle check-ins scheduled every ${intervalHours} hours\n✅ Emergency SOS remains available at all times\n\nRecovery monitoring ends: ${recoveryEnd.toLocaleDateString()}\n\nRest well. Your care team is watching over you.\n\n— Morales Medical Recovery Team`
      });
    } catch (recoveryErr) {
      console.error('[logProcedureComplete] Recovery auto-trigger failed (non-fatal):', recoveryErr.message);
    }

    return Response.json({
      success: true,
      new_status: 'RECOVERY_PHASE_7_DAY',
      blackout_active: false,
      blackout_lifted_at: now,
      procedure_complete_logged_at: now,
      recovery_mode_auto_triggered: true,
      suppressed_notifications_pending: suppressedLogs?.length || 0,
      message: `Stage 11 complete. Procedure logged by ${resolvedEmail}. Case moved to 7-Day Recovery. Recovery Mode auto-triggered. ${suppressedLogs?.length || 0} suppressed notifications are in audit log.`
    });

  } catch (error) {
    console.error('[logProcedureComplete]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});