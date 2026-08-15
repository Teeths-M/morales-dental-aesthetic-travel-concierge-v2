import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { resolveCountry, fetchWeather, buildAlert, resolveCaseWeatherContext } from '../../shared/weatherEngine.ts';
import { logJourneyEvent } from '../../shared/logJourneyEvent.ts';

/**
 * checkJourneyWeather — M-Care Weather Guardian.
 *
 * Run daily (cron). Checks real destination weather for every actively-
 * traveling case and posts a proactive JourneyEvent — a daily briefing on
 * ordinary days, and (since severity maps directly to JourneyEvent priority)
 * the same check doubles as a real-time severe-weather alert on a bad one:
 * warning/critical severity gets `high`/`critical` priority, which already
 * fires a real push notification with zero extra code (see logJourneyEvent.ts).
 *
 * Reuses the real engine in shared/weatherEngine.ts — the same fetch/scoring/
 * advice logic checkWeatherAlerts already uses for the on-demand dashboard
 * banner — rather than a second implementation.
 *
 * "Still at destination" window — a disclosed approximation, not exact
 * tracking: CaseRecord has no return_date field, so this can't know for
 * certain when a patient has gone home. A case is scanned once its
 * departure_date has passed, through procedure_date + 7 days (matching the
 * existing Day-7 recovery check-in) when a procedure_date is set, or
 * departure_date + 14 days as an outer ceiling otherwise — a reasonable
 * medical-tourism trip length, not a precise measurement.
 */

const ACTIVE_STATUSES = ['Deposit-Paid', 'Travel-Coordination', 'Ready-For-Travel', 'Procedure-In-Progress'];
const DAY_MS = 86_400_000;
const POST_PROCEDURE_WINDOW_DAYS = 7;
const POST_DEPARTURE_CEILING_DAYS = 14;

type Severity = 'clear' | 'advisory' | 'warning' | 'critical';
const PRIORITY_BY_SEVERITY: Record<Severity, 'low' | 'medium' | 'high' | 'critical'> = {
  clear: 'low', advisory: 'medium', warning: 'high', critical: 'critical',
};

function isStillLikelyTraveling(c: any, todayMs: number): boolean {
  if (!c.departure_date) return false;
  const depMs = new Date(c.departure_date).getTime();
  if (depMs > todayMs) return false; // hasn't left yet — covered by sendTravelCountdownReminders, not this job

  if (c.procedure_date) {
    const cutoffMs = new Date(c.procedure_date).getTime() + POST_PROCEDURE_WINDOW_DAYS * DAY_MS;
    return todayMs <= cutoffMs;
  }
  const ceilingMs = depMs + POST_DEPARTURE_CEILING_DAYS * DAY_MS;
  return todayMs <= ceilingMs;
}

async function alreadyCheckedToday(base44: any, caseId: string): Promise<boolean> {
  try {
    const recent = await base44.asServiceRole.entities.JourneyEvent.filter(
      { case_id: caseId, event_type: 'weather_advisory' }, '-created_date', 1
    );
    const last = recent?.[0];
    if (!last?.created_date) return false;
    const lastDay = new Date(last.created_date).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    return lastDay === today;
  } catch (_) {
    return false; // fail open on the dedup check — a rare duplicate is far better than silently never briefing
  }
}

function buildMessage(alert: any): string {
  const line = `${alert.current.weather}, ${alert.current.temp_c}°C in ${alert.country}.`;
  const advice = (alert.action_plan?.patient || []).slice(0, 2).join(' ');
  if (alert.severity === 'critical') {
    // action_plan.patient[0] already opens in M-Care's own first-person voice
    // for critical severity ("⚠ Severe weather alert. M is monitoring...") —
    // reused verbatim rather than rewritten.
    return `${advice} ${line}`.trim();
  }
  if (alert.severity === 'warning') {
    return `Weather heads-up for ${alert.country} — ${line} ${advice}`.trim();
  }
  return `Checking the weather in ${alert.country} — ${line} ${advice}`.trim();
}

Deno.serve(createHandler(async ({ req, base44 }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const todayMs = Date.now();
  const allCases = await base44.asServiceRole.entities.CaseRecord.filter(
    { status: ACTIVE_STATUSES[0] }, '-departure_date', 50
  ).catch(() => []);
  const moreCases = await Promise.allSettled(
    ACTIVE_STATUSES.slice(1).map((s) =>
      base44.asServiceRole.entities.CaseRecord.filter({ status: s }, '-departure_date', 50).catch(() => [])
    )
  );
  const cases = [
    ...allCases,
    ...moreCases.flatMap((r) => (r.status === 'fulfilled' ? (r.value as any[]) : [])),
  ].filter((c: any) => isStillLikelyTraveling(c, todayMs) && c.client_email);

  const results: { case_id: string; severity?: string; skipped?: string }[] = [];

  for (const c of cases) {
    try {
      if (await alreadyCheckedToday(base44, c.id)) {
        results.push({ case_id: c.id, skipped: 'already_checked_today' });
        continue;
      }

      const ctx = resolveCaseWeatherContext(c);
      if (!ctx.country) {
        results.push({ case_id: c.id, skipped: 'no_country' });
        continue;
      }

      const coords = await resolveCountry(ctx.country);
      if (!coords) {
        results.push({ case_id: c.id, skipped: 'unresolvable_country' });
        continue;
      }

      const weather = await fetchWeather(coords.lat, coords.lng);
      const alert = buildAlert(weather, coords.name, ctx.procedureType, ctx.recoveryDay);
      const severity = alert.severity as Severity;

      await logJourneyEvent(base44, {
        case_id: c.id,
        client_email: c.client_email,
        event_type: 'weather_advisory',
        source: 'checkJourneyWeather',
        message_text: buildMessage(alert),
        priority: PRIORITY_BY_SEVERITY[severity],
        action_taken: `Checked destination weather (${coords.name}) — severity ${severity}`,
        tool_result: { severity, country: coords.name, current: alert.current, forecast_7d: alert.forecast_7d },
        escalation_occurred: severity === 'critical',
      });

      results.push({ case_id: c.id, severity });
    } catch (error) {
      console.error('[checkJourneyWeather]', c.id, error);
      results.push({ case_id: c.id, skipped: 'error' });
    }
  }

  return ok({ success: true, scanned: cases.length, results });

}, { name: 'checkJourneyWeather', requireAuth: false }));
