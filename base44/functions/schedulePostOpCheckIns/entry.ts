/**
 * schedulePostOpCheckIns
 *
 * Called when Handshake 9 (home drop-off) is confirmed — the Golden M moment.
 * Creates 4 PostOpCheckIn records scheduled at Day 3, 7, 14, and 30 post-return.
 * Each record includes a one-time response token so the patient can respond
 * without logging in (same pattern as Guardian tokens).
 *
 * Pure record-creation only — sending happens uniformly for all 4 days via
 * sendDuePostOpCheckIns (a real cron sweep, ../sendDuePostOpCheckIns/entry.ts),
 * once each record's own scheduled_at has actually arrived. This function used
 * to also fire the Day-3 notification inline, right here, at creation time —
 * a real bug, since that meant the "Day 3" email ("You've been home for 3
 * days...") went out on day 0 (the moment the patient walks in the door), not
 * 3 days later, and Days 7/14/30 never sent at all since nothing else ever
 * read their scheduled_at back. See base44/shared/sendPostOpCheckInNotification.ts
 * for the shared sender both this function's old inline block and the new
 * sweep are built from.
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';
import { CHECK_IN_DAYS } from '../../shared/sendPostOpCheckInNotification.ts';

function generateToken(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { case_id } = await body();

  if (!case_id) return err('case_id is required');

  // Load case to get patient details
  const caseRec = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!caseRec) return err('Case not found', 404);

  const patientEmail  = caseRec.client_email || caseRec.user_email || '';
  const patientName   = caseRec.client_name  || '';
  const procedure     = (caseRec.procedures  || []).join(', ') || 'your procedure';
  const doctorEmail   = caseRec.doctor_email || '';
  const now           = new Date();

  const created: number[] = [];

  for (const day of CHECK_IN_DAYS) {
    // Check if already scheduled (idempotent)
    const existing = await base44.asServiceRole.entities.PostOpCheckIn.filter({
      case_id, day,
    }).catch(() => []);
    if (existing.length > 0) continue;

    const scheduledAt = new Date(now.getTime() + day * 24 * 60 * 60 * 1000).toISOString();
    const token       = generateToken();

    await base44.asServiceRole.entities.PostOpCheckIn.create({
      case_id,
      patient_email:  patientEmail,
      patient_name:   patientName,
      procedure,
      doctor_email:   doctorEmail,
      day,
      scheduled_at:   scheduledAt,
      status:         'pending',
      response_token: token,
    });

    created.push(day);
  }

  // Audit log
  await base44.asServiceRole.entities.AuditLog.create({
    event_type:  'post_op_checkins_scheduled',
    actor_email: user?.email || 'system',
    resource_id: case_id,
    details:     { days_scheduled: created, patient_email: patientEmail, procedure },
    timestamp:   now.toISOString(),
    prev_hash:   await computePrevHash(base44),
  }).catch(() => {});

  return ok({ success: true, scheduled_days: created, already_existed: CHECK_IN_DAYS.filter(d => !created.includes(d)) });
}, { name: 'schedulePostOpCheckIns', requireAuth: true }));
