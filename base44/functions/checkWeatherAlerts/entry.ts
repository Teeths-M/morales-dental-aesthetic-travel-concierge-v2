import { createHandler, ok, err } from '../../shared/createHandler.ts';
import {
  SEV_RANK, resolveCountry, fetchWeather, buildAlert, mockAlert, resolveCaseWeatherContext,
} from '../../shared/weatherEngine.ts';

// ── checkWeatherAlerts ─────────────────────────────────────────────────────────
// CR 25 — Weather-to-Health Alert
// Checks real-time weather for a patient's destination and returns a 4-party
// action plan (patient, companion, clinic, driver) based on severity.
//
// The real fetch/scoring/advice logic lives in shared/weatherEngine.ts, so
// this on-demand function and the scheduled checkJourneyWeather share one
// implementation.
//
// Weather data: Open-Meteo (free, no API key required)
//
// Actions:
//   scan      — check weather for one case by case_id
//   scan_all  — check all active cases (admin only, returns summary)
//   demo      — returns mock alert for testing/demos

// ── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { action, case_id, country, procedure_type, recovery_day } = await body<{
    action: string;
    case_id?: string;
    country?: string;
    procedure_type?: string;
    recovery_day?: number;
  }>();

  if (!action) return err('action is required (scan | scan_all | demo)');

  // ── DEMO ────────────────────────────────────────────────────────────────────
  if (action === 'demo') {
    return ok({ success: true, alert: mockAlert(country || 'Mexico') });
  }

  // ── SCAN ONE CASE ────────────────────────────────────────────────────────────
  if (action === 'scan') {
    if (!case_id && !country) return err('case_id or country is required');

    let targetCountry = country || '';
    let targetProcedure = procedure_type || 'General';
    let targetRecoveryDay = recovery_day ?? 0;

    if (case_id) {
      const rec = await base44.asServiceRole.entities.CaseRecord.get(case_id);
      if (!rec) return err('Case not found', 404);
      const ctx = resolveCaseWeatherContext(rec);
      targetCountry = ctx.country || targetCountry;
      targetProcedure = ctx.country ? ctx.procedureType : targetProcedure;
      targetRecoveryDay = ctx.country ? ctx.recoveryDay : targetRecoveryDay;
    }

    if (!targetCountry) return err('No country found for this case');

    const coords = await resolveCountry(targetCountry);
    if (!coords) return err(`Could not locate country: ${targetCountry}`, 422);

    const weather = await fetchWeather(coords.lat, coords.lng);
    const alert = buildAlert(weather, coords.name, targetProcedure, targetRecoveryDay);

    return ok({ success: true, alert, case_id: case_id || null });
  }

  // ── SCAN ALL ACTIVE CASES (admin) ────────────────────────────────────────────
  if (action === 'scan_all') {
    const ADMIN_ROLES = ['admin', 'platform_admin', 'coordinator'];
    if (!user || !ADMIN_ROLES.includes(user.role)) return err('Forbidden', 403);

    const activeCases = await base44.asServiceRole.entities.CaseRecord.filter(
      {}, '-created_date', 50
    );

    const withCountry = activeCases.filter(
      (c: any) => c.procedure_country && c.status !== 'Completed'
    );

    const results = await Promise.allSettled(
      withCountry.map(async (c: any) => {
        const ctx = resolveCaseWeatherContext(c);
        const coords = await resolveCountry(ctx.country);
        if (!coords) return { case_id: c.id, country: ctx.country, error: 'unresolvable' };
        const weather = await fetchWeather(coords.lat, coords.lng);
        const alert = buildAlert(weather, coords.name, ctx.procedureType, ctx.recoveryDay);
        return { case_id: c.id, client_name: c.client_name || c.client_email, ...alert };
      })
    );

    const alerts = results
      .filter(r => r.status === 'fulfilled')
      .map((r: any) => r.value)
      .sort((a: any, b: any) => (SEV_RANK[b.severity] || 0) - (SEV_RANK[a.severity] || 0));

    const summary = {
      total_scanned: withCountry.length,
      critical: alerts.filter((a: any) => a.severity === 'critical').length,
      warning:  alerts.filter((a: any) => a.severity === 'warning').length,
      advisory: alerts.filter((a: any) => a.severity === 'advisory').length,
      clear:    alerts.filter((a: any) => a.severity === 'clear').length,
    };

    return ok({ success: true, summary, alerts });
  }

  return err('Invalid action. Use: scan | scan_all | demo');

}, { name: 'checkWeatherAlerts', requireAuth: false }));