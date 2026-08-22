/**
 * sendDuePostOpCheckIns — the real, previously-missing sender for the
 * Day 3/7/14/30 PostOpCheckIn milestone surveys.
 *
 * schedulePostOpCheckIns (Handshake 9 / home drop-off) already creates all 4
 * records with a correct scheduled_at, but nothing ever read that field back
 * to decide when to actually send — the old code fired a Day-3-only
 * notification inline, synchronously, at record-creation time (so it went
 * out on day 0, not day 3), and Days 7/14/30 never sent at all. This is a
 * daily cron sweep: find every PostOpCheckIn whose scheduled_at has actually
 * arrived and hasn't been notified yet, and send it via the one shared sender
 * (../../shared/sendPostOpCheckInNotification.ts) both this function and
 * schedulePostOpCheckIns's own record-creation step are built from.
 *
 * Schedule: runs daily via .github/workflows/safety-cron.yml's 09:00 UTC
 * tier — day-granularity is sufficient, matching this project's own
 * established precedent for identically-shaped date-milestone checks
 * (sendTravelCountdownReminders, autoCompletePatientJourney, checkJourneyWeather).
 *
 * Idempotent per record via notification_sent_at (set by the shared sender
 * itself before it can ever be double-sent) — a repeated or overlapping run
 * can never notify the same check-in twice. Each record is processed inside
 * its own try/catch so one bad record can't abort the rest of the batch,
 * the same isolation fix already applied this session to
 * escalateSoloCheckIn/checkPartnerSLABreaches.
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';
import { sendPostOpCheckInNotification } from '../../shared/sendPostOpCheckInNotification.ts';

Deno.serve(createHandler(async ({ req, base44 }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const nowIso = new Date().toISOString();

  // This SDK's entity filter has no $lt/$lte operator (confirmed by grep
  // across base44/functions) — fetch the pending set, then compare dates
  // in memory, matching checkMissedRecoveryCheckins's own established pattern.
  const pending = await base44.asServiceRole.entities.PostOpCheckIn.filter({
    status: 'pending',
  }).catch(() => []);

  const due = (pending as any[]).filter(rec =>
    !rec.notification_sent_at && rec.scheduled_at && rec.scheduled_at <= nowIso
  );

  const sent: string[] = [];
  const failed: string[] = [];

  for (const rec of due) {
    try {
      await sendPostOpCheckInNotification(base44, {
        record_id: rec.id,
        case_id: rec.case_id,
        patient_email: rec.patient_email,
        patient_name: rec.patient_name || '',
        procedure: rec.procedure || 'your procedure',
        day: rec.day,
        response_token: rec.response_token,
        source: 'sendDuePostOpCheckIns',
      });
      sent.push(rec.id);
    } catch (e) {
      // One bad record must never abort the rest of the day's batch.
      failed.push(rec.id);
      console.error('[sendDuePostOpCheckIns] failed to send', rec.id, e);
    }
  }

  await base44.asServiceRole.entities.AuditLog.create({
    event_type:  'post_op_checkin_notifications_sent',
    actor_email: 'system',
    resource_id: 'batch',
    details:     { checked: pending.length, due: due.length, sent: sent.length, failed: failed.length },
    timestamp:   nowIso,
    prev_hash:   await computePrevHash(base44),
  }).catch(() => {});

  return ok({ success: true, checked: pending.length, due: due.length, sent: sent.length, failed: failed.length });
}, { name: 'sendDuePostOpCheckIns', requireAuth: false }));
