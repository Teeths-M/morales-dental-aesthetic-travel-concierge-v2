/**
 * Notification Blackout Guard
 * Shared utility function invoked by notification functions (SMS, email, push)
 * BEFORE firing any alert. If blackout is active for the given case_id,
 * the notification payload is logged to NotificationLog and suppressed.
 *
 * Usage from other backend functions:
 *   const res = await base44.functions.invoke('checkNotificationBlackout', {
 *     case_id, notification_type, recipient_role, recipient_identifier,
 *     event_trigger, payload
 *   });
 *   if (res.data?.suppressed) return; // skip sending
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../../shared/createHandler.ts';

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const {
      case_id,
      notification_type,
      recipient_role,
      recipient_identifier,
      event_trigger,
      payload
    } = body;

    if (!case_id) {
      return Response.json({ suppressed: false, reason: 'no_case_id' });
    }

    let caseRecord;
    try {
      caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id);
    } catch {
      return Response.json({ suppressed: false, reason: 'case_not_found' });
    }

    // Only suppress for patient, admin, doctor roles during blackout
    const suppressedRoles = ['patient', 'admin', 'doctor'];
    const isBlackoutActive = caseRecord?.notification_blackout_active === true;
    const isAffectedRole = suppressedRoles.includes((recipient_role || '').toLowerCase());

    if (!isBlackoutActive || !isAffectedRole) {
      return Response.json({ suppressed: false });
    }

    // Log the suppressed notification to immutable audit trail
    await base44.asServiceRole.entities.NotificationLog.create({
      case_id,
      notification_type: notification_type || 'unknown',
      recipient_role,
      recipient_identifier: recipient_identifier || '',
      event_trigger: event_trigger || 'unknown',
      suppressed_payload: payload || {},
      suppression_reason: 'SURGICAL_EXECUTION_WINDOW_BLACKOUT',
      blackout_case_status: caseRecord.status,
      logged_at: new Date().toISOString(),
      replay_status: 'pending'
    });

    return Response.json({
      suppressed: true,
      reason: 'SURGICAL_EXECUTION_WINDOW_BLACKOUT',
      case_status: caseRecord.status,
      message: `Notification suppressed and logged to audit trail. Case ${case_id} is in SURGICAL_EXECUTION_WINDOW blackout.`
    });

  } catch (error) {
    // Never crash notification flows — if guard fails, allow notification through
    return Response.json({ suppressed: false, error: 'An internal error occurred.' });
  }
}, { name: 'checkNotificationBlackout', requireAuth: false }));
