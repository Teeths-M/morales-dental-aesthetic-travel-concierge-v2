/**
 * runGuardianCheckInSweep — makes Silent Guardian's AM/PM check-in real.
 *
 * Real finding, not assumed: neither guardianCheckIn nor guardianEscalation
 * had ANY caller anywhere in this app, client or server. Dashboard.jsx's
 * Guardian Mode banner shows "Check-in due" / "GPS silent too long" and an
 * "I'm Safe" button, but that button only calls acknowledgeCheckIn() — a
 * pure client-side state reset. useGuardianMode.js's own triggerCheckIn()
 * (the function that would actually send the SMS) is defined but never
 * invoked by anything. So today, opting into Guardian Mode changes what a
 * banner says and nothing else — no SMS is ever sent, on schedule or
 * otherwise, whether or not the patient's tab is open.
 *
 * This sweep closes the AM/PM scheduled half of that gap: every active,
 * opted-in traveler gets a real 9am/9pm local-time check-in SMS, sent via
 * the exact same shared/sendGuardianCheckIn.ts logic the client endpoint
 * uses (extracted, not duplicated).
 *
 * Deliberately NOT included here: GPS-silence detection / 3-strike
 * escalation (guardianEscalation). That would duplicate a system that
 * already exists and already runs on this same cron file's 15-min tier —
 * scheduleSoloCheckIns + escalateSoloCheckIn's 2h/3h/5h/9h cascade already
 * covers "this traveler has gone silent," for every active traveler, not
 * just Guardian-mode-opted-in ones. Building Guardian's own separate
 * GPS-silence monitor would be a second, redundant ladder watching the same
 * thing. Whether Guardian's escalation half should be retired in favor of
 * the SoloCheckIn ladder, or reconciled with it, is a real product decision
 * — flagged, not decided here.
 *
 * Timezone: Consultation has no stored timezone field. Reuses the weather
 * engine's already-live Open-Meteo integration (timezone=auto) to get a
 * real utc_offset_seconds for the destination country — an honest
 * approximation (assumes the traveler keeps local time at their
 * destination), not invented geo-infrastructure. Unresolvable countries are
 * skipped, not guessed at.
 *
 * Schedule: */15 * * * * (.github/workflows/safety-cron.yml, life-safety
 * tier) — a 15-minute tick is coarse relative to a specific 9am/9pm minute,
 * so the trigger window is "local hour === 9 (or 21)," deduped per local
 * calendar day via guardian_last_am_checkin_date / guardian_last_pm_checkin_date
 * on Consultation — whichever tick lands first in that hour sends it once.
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { resolveCountry, fetchWeather, createWeatherCache } from '../../shared/weatherEngine.ts';
import { sendGuardianCheckIn } from '../../shared/sendGuardianCheckIn.ts';
import { logJourneyEvent } from '../../shared/logJourneyEvent.ts';

const ACTIVE_STATUSES = ['Deposit-Paid', 'Travel-Coordination', 'Ready-For-Travel', 'Procedure-In-Progress'];
const AM_CHECK_HOUR = 9;
const PM_CHECK_HOUR = 21; // 9 PM, matches useGuardianMode.js's PM_CHECK_HOUR

function localDateString(offsetSeconds: number): string {
  return new Date(Date.now() + offsetSeconds * 1000).toISOString().slice(0, 10);
}

function localHour(offsetSeconds: number): number {
  const h = new Date().getUTCHours() + offsetSeconds / 3600;
  return Math.floor(((h % 24) + 24) % 24);
}

Deno.serve(createHandler(async ({ req, base44 }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  // Active CaseRecords -> their consultation_ids, reusing the exact
  // ACTIVE_STATUSES set and multi-query pattern sendTravelCountdownReminders
  // already established (CaseRecord.filter doesn't support $in).
  const caseLists = await Promise.allSettled(
    ACTIVE_STATUSES.map(s => base44.asServiceRole.entities.CaseRecord.filter({ status: s }, '-departure_date', 100).catch(() => []))
  );
  const activeCases = caseLists.flatMap(r => r.status === 'fulfilled' ? (r.value as any[]) : []);
  const caseByConsultationId = new Map<string, any>();
  for (const c of activeCases) {
    if (c.consultation_id) caseByConsultationId.set(c.consultation_id, c);
  }

  const optedIn = await base44.asServiceRole.entities.Consultation.filter(
    { guardian_mode_opted_in: true }, '-updated_date', 200
  ).catch(() => []);

  const eligible = (optedIn as any[]).filter(c => caseByConsultationId.has(c.id));

  const getWeather = createWeatherCache();
  const results: Record<string, unknown>[] = [];

  for (const cons of eligible) {
    if (!cons.procedure_country) continue; // no destination on file yet — nothing to approximate a timezone from

    const coords = await resolveCountry(cons.procedure_country).catch(() => null);
    if (!coords) continue; // unresolvable — skip rather than guess

    let offsetSeconds = 0;
    try {
      const weather = await getWeather(coords.lat, coords.lng);
      offsetSeconds = Number(weather?.utc_offset_seconds) || 0;
    } catch {
      // Weather fetch failed (e.g. a transient Open-Meteo error) — fall back
      // to UTC rather than skip the traveler entirely for the whole tick.
    }

    const hour = localHour(offsetSeconds);
    const todayLocal = localDateString(offsetSeconds);
    const isSolo = cons.traveling_companion_type !== 'group' && cons.traveling_companion_type !== 'partner_family';

    let reason: string | null = null;
    let dedupField: string | null = null;

    if (hour === AM_CHECK_HOUR && cons.guardian_last_am_checkin_date !== todayLocal) {
      reason = 'am_checkin';
      dedupField = 'guardian_last_am_checkin_date';
    } else if (isSolo && hour === PM_CHECK_HOUR && cons.guardian_last_pm_checkin_date !== todayLocal) {
      reason = 'pm_checkin';
      dedupField = 'guardian_last_pm_checkin_date';
    }

    if (!reason || !dedupField) continue;

    const sendResult = await sendGuardianCheckIn(base44, cons.id, reason, offsetSeconds / 60);

    // Dedup regardless of skip reason (e.g. sleep-hours) so a single
    // unresolvable edge case can't retrigger every tick for the rest of the
    // day — same "mark it handled even on a soft skip" discipline this
    // codebase already uses elsewhere (e.g. sendTravelCountdownReminders's
    // flagField).
    await base44.asServiceRole.entities.Consultation.update(cons.id, {
      [dedupField]: todayLocal,
    }).catch(() => {});

    const caseRecord = caseByConsultationId.get(cons.id);
    if (sendResult.sent && caseRecord?.id) {
      const message = reason === 'am_checkin'
        ? "Good morning — just checking in on you. Reply SAFE to your text, or tap here to let me know you're okay."
        : "Checking in before you turn in for the night — reply SAFE to your text, or tap here to let me know you're okay.";
      await logJourneyEvent(base44, {
        case_id: caseRecord.id,
        client_email: cons.email || caseRecord.client_email,
        event_type: 'guardian_checkin_sent',
        source: 'runGuardianCheckInSweep',
        message_text: message,
        priority: 'low',
        action_taken: `Sent ${reason} Guardian check-in SMS`,
        tool_result: { reason, local_hour: hour },
      });
    }

    results.push({ consultation_id: cons.id, reason, result: sendResult });
  }

  return ok({ success: true, checked: eligible.length, checkins_sent: results.length, results });
}, { name: 'runGuardianCheckInSweep', requireAuth: false }));
