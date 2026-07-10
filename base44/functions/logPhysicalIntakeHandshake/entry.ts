/**
 * Stage 10: Clinical Intake Handshake
 * Called by Doctor Portal. Logs the physical intake handshake
 * and transitions the case to SURGICAL_EXECUTION_WINDOW status,
 * simultaneously activating the notification blackout (Stage 11).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../_shared/createHandler.ts';

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json();
    const { case_id, token } = body;

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

    // Idempotency: already in execution window
    if (caseRecord.status === 'SURGICAL_EXECUTION_WINDOW') {
      return Response.json({
        success: true,
        already_active: true,
        message: 'Case is already in SURGICAL_EXECUTION_WINDOW. Intake handshake was previously logged.',
        intake_handshake_logged_at: caseRecord.intake_handshake_logged_at
      });
    }

    const now = new Date().toISOString();
    const updatedTimeline = [
      ...(caseRecord.timeline_log || []),
      {
        timestamp: now,
        action: 'stage_10_intake_handshake',
        details: `Physical intake handshake logged by Dr. ${resolvedEmail}. Patient confirmed physically present at clinic. Case transitioning to SURGICAL_EXECUTION_WINDOW.`,
        performed_by: resolvedEmail,
        non_repudiable: true,
        previous_status: caseRecord.status
      },
      {
        timestamp: now,
        action: 'stage_11_blackout_activated',
        details: 'Notification blackout protocol activated. All automated SMS, email, push, and platform alerts to Patient, Admin, and Doctor roles are suspended until procedure completion.',
        performed_by: 'system',
        non_repudiable: true
      }
    ];

    await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, {
      status: 'SURGICAL_EXECUTION_WINDOW',
      notification_blackout_active: true,
      notification_blackout_started_at: now,
      intake_handshake_logged_at: now,
      intake_handshake_logged_by: resolvedEmail,
      timeline_log: updatedTimeline
    });

    return Response.json({
      success: true,
      new_status: 'SURGICAL_EXECUTION_WINDOW',
      blackout_active: true,
      intake_handshake_logged_at: now,
      logged_by: resolvedEmail,
      message: 'Stage 10 complete. Physical intake handshake logged. Case is now in SURGICAL_EXECUTION_WINDOW. Notification blackout is ACTIVE.'
    });

  } catch (error) {
    console.error('[logPhysicalIntakeHandshake]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'logPhysicalIntakeHandshake', requireAuth: false }));
