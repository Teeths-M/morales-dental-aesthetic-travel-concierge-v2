import { computePrevHash } from './auditHashChain.ts';

// ── sendGuardianCheckIn ────────────────────────────────────────────────────
// The one real implementation of Silent Guardian's check-in send, extracted
// verbatim (behavior-preserving) from what used to be inline in
// guardianCheckIn/entry.ts, so the client-facing endpoint and the new
// cron-driven sweep (runGuardianCheckInSweep) share exactly one
// implementation rather than risking two that quietly drift apart.
//
// Same Board constraints as before extraction:
//   - Never fires during sleep hours (10 PM - 6 AM local) for non-critical
//   - Only fires when guardian_mode_opted_in is true
//   - Scheduled (am/pm) check-ins are solo-only, matching useGuardianMode.js
//   - Logs to AuditLog with a check-in token for response tracking

const SLEEP_START = 22; // 10 PM
const SLEEP_END   =  6; // 6 AM

function isLocalSleepHours(timezoneOffsetMinutes: number): boolean {
  const localHour = (new Date().getUTCHours() + timezoneOffsetMinutes / 60 + 24) % 24;
  return localHour >= SLEEP_START || localHour < SLEEP_END;
}

export async function sendGuardianCheckIn(
  base44: any,
  consultation_id: string,
  reason: string = 'scheduled',
  tz_offset: number = 0,
): Promise<Record<string, unknown>> {
  const cons = await base44.asServiceRole.entities.Consultation.filter(
    { id: consultation_id }, '-created_date', 1
  ).then((r: any[]) => r[0]).catch(() => null);

  if (!cons) return { error: 'Consultation not found' };

  if (!cons.guardian_mode_opted_in) {
    return { skipped: true, reason: 'guardian_mode_not_opted_in' };
  }

  if (cons.traveling_companion_type === 'group' && (reason === 'scheduled' || reason === 'am_checkin' || reason === 'pm_checkin')) {
    return { skipped: true, reason: 'group_travel_no_individual_checkin' };
  }

  if (isLocalSleepHours(tz_offset) && reason !== 'critical') {
    return { skipped: true, reason: 'sleep_hours', hint: 'Will retry at 9 AM' };
  }

  const token = Math.random().toString(36).substring(2, 7).toUpperCase();
  const now   = new Date().toISOString();

  const messages: Record<string, string> = {
    am_checkin:  `Good morning from Morales \u{1F305} Daily check-in: Reply SAFE or tap the app. Token: ${token}`,
    pm_checkin:  `Good evening from Morales \u{1F319} Nightly check-in: Reply SAFE if all is well. Token: ${token}`,
    gps_silence: `Morales check-in: We haven't seen your location in a while. Reply SAFE or tap the app. Token: ${token}`,
    scheduled:   `Morales Guardian check-in: Reply SAFE to confirm you're okay. Token: ${token}`,
    critical:    `\u{1F6A8} URGENT — Morales: We need to confirm you're safe. Reply SAFE immediately or we will escalate. Token: ${token}`,
  };

  const message = messages[reason] || messages.scheduled;

  if (cons.phone) {
    await base44.integrations.Twilio.SendSMS({
      to:   cons.phone,
      body: message,
    }).catch(() => {});
  }

  await base44.asServiceRole.entities.Consultation.update(consultation_id, {
    last_check_in_response: now,
  }).catch(() => {});

  await base44.asServiceRole.entities.AuditLog.create({
    event_type:   'guardian_check_in_sent',
    entity_type:  'Consultation',
    entity_id:    consultation_id,
    performed_by: 'system:guardian',
    metadata:     { reason, token, phone_suffix: cons.phone?.slice(-4) || 'xxxx' },
    created_at:   now,
    prev_hash:    await computePrevHash(base44),
  }).catch(() => {});

  return { sent: true, token, reason };
}
