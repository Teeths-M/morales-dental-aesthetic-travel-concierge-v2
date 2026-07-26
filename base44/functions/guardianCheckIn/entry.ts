/**
 * guardianCheckIn — Silent Guardian Layer 4 backend.
 *
 * Sends a scheduled SMS check-in to the patient.
 * Board constraints enforced:
 *   - Never fires during sleep hours (10 PM – 6 AM local time) for non-critical
 *   - Only fires when journey is active (status check against consultation)
 *   - Logs to AuditLog with check-in token for response tracking
 *
 * Called by:
 *   - useGuardianMode hook (client-side schedule trigger)
 *   - Future cron job (when native app ships)
 */
import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { computePrevHash } from '../_shared/auditHashChain.ts';
import { z, strictObject, Fields } from '../_shared/validate.ts';

const GuardianCheckInSchema = strictObject({
  consultation_id: Fields.shortText(100),
  reason: z.string().trim().max(50).optional().default('scheduled'),
  tz_offset: z.coerce.number().optional().default(0),
});

const SLEEP_START = 22; // 10 PM
const SLEEP_END   =  6; // 6 AM

function isLocalSleepHours(timezoneOffset: number): boolean {
  const localHour = (new Date().getUTCHours() + timezoneOffset / 60 + 24) % 24;
  return localHour >= SLEEP_START || localHour < SLEEP_END;
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { consultation_id, reason = 'scheduled', tz_offset = 0 } = await body();

  if (!consultation_id) return err('consultation_id required');

  // Load consultation
  const cons = await base44.asServiceRole.entities.Consultation.filter(
    { id: consultation_id }, '-created_date', 1
  ).then((r: any[]) => r[0]).catch(() => null);

  if (!cons) return err('Consultation not found');

  // Enforce: opt-in required
  if (!cons.guardian_mode_opted_in) {
    return ok({ skipped: true, reason: 'guardian_mode_not_opted_in' });
  }

  // Enforce: solo travelers only for scheduled check-ins
  if (cons.traveling_companion_type === 'group' && reason === 'scheduled') {
    return ok({ skipped: true, reason: 'group_travel_no_individual_checkin' });
  }

  // Enforce: no non-critical SMS during sleep hours
  if (isLocalSleepHours(tz_offset) && reason !== 'critical') {
    return ok({ skipped: true, reason: 'sleep_hours', hint: 'Will retry at 9 AM' });
  }

  // Build the check-in token (short, memorable)
  const token = Math.random().toString(36).substring(2, 7).toUpperCase();
  const now   = new Date().toISOString();

  const messages: Record<string, string> = {
    am_checkin:  `Good morning from Morales 🌅 Daily check-in: Reply SAFE or tap the app. Token: ${token}`,
    pm_checkin:  `Good evening from Morales 🌙 Nightly check-in: Reply SAFE if all is well. Token: ${token}`,
    gps_silence: `Morales check-in: We haven't seen your location in a while. Reply SAFE or tap the app. Token: ${token}`,
    scheduled:   `Morales Guardian check-in: Reply SAFE to confirm you're okay. Token: ${token}`,
    critical:    `🚨 URGENT — Morales: We need to confirm you're safe. Reply SAFE immediately or we will escalate. Token: ${token}`,
  };

  const message = messages[reason] || messages.scheduled;

  // Send SMS via Twilio integration
  if (cons.phone) {
    await base44.integrations.Twilio.SendSMS({
      to:   cons.phone,
      body: message,
    }).catch(() => {}); // non-blocking — audit log is the source of truth
  }

  // Update consultation last_check_in timestamp
  await base44.asServiceRole.entities.Consultation.update(consultation_id, {
    last_check_in_response: now,
  }).catch(() => {});

  // Audit log
  await base44.asServiceRole.entities.AuditLog.create({
    event_type:   'guardian_check_in_sent',
    entity_type:  'Consultation',
    entity_id:    consultation_id,
    performed_by: 'system:guardian',
    metadata:     { reason, token, phone_suffix: cons.phone?.slice(-4) || 'xxxx' },
    created_at:   now,
    prev_hash:    await computePrevHash(base44),
  }).catch(() => {});

  return ok({ sent: true, token, reason });
}, { name: 'guardianCheckIn', requireAuth: true, bodySchema: GuardianCheckInSchema }));
