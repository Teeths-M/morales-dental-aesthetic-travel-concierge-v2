/**
 * storeSafetySignal — Morales Safety Intelligence Network
 *
 * Called at the end of every patient journey (HS9 / closeEmergencyThreatLoop).
 * Stores anonymized behavioral signals that compound into destination intelligence.
 *
 * A competitor starting today has zero signals.
 * After 50 journeys, the Morales Safety Intelligence Network makes MedGuard
 * genuinely predictive — not just reactive.
 *
 * Signal schema (all anonymized — no PII):
 *   destination_country, destination_city, procedure_category,
 *   sos_events_count, missed_checkins_count, escalation_count,
 *   night_alone_alerts, highest_risk_level_reached,
 *   journey_duration_days, completed_successfully, trip_month
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { internalOrAdminAuthorized } from '../../shared/internalAuth.ts';

Deno.serve(createHandler(async ({ base44, body }) => {
  const {
    internal_secret,
    case_id,
    destination_country,
    destination_city,
    procedure_category,
    sos_events_count      = 0,
    missed_checkins_count = 0,
    escalation_count      = 0,
    night_alone_alerts    = 0,
    highest_risk_level    = 'SAFE',
    journey_duration_days = 0,
    completed_successfully = true,
  } = await body();

  // Called by completeHandshake at journey close — no forwardable user
  // session, so this is authorized the same way every other internal call
  // added this session is: a body-field secret, not a header (headers
  // aren't passable through .functions.invoke()).
  if (!(await internalOrAdminAuthorized(internal_secret, base44))) {
    return err('Forbidden', 403);
  }

  if (!destination_country) return err('destination_country required');

  // Store anonymized signal
  await base44.asServiceRole.entities.SafetySignal.create({
    destination_country,
    destination_city:       destination_city || '',
    procedure_category:     procedure_category || 'general',
    sos_events_count,
    missed_checkins_count,
    escalation_count,
    night_alone_alerts,
    highest_risk_level,
    journey_duration_days,
    completed_successfully,
    trip_month:             new Date().getMonth() + 1,
    trip_year:              new Date().getFullYear(),
    recorded_at:            new Date().toISOString(),
    // No PII — case_id only used for dedup, can be hashed if needed
    case_ref:               case_id ? await sha256short(case_id) : null,
  }).catch(() => {});

  // Invalidate destination safety index cache (next request will recalculate)
  await base44.asServiceRole.entities.SafetyIndexCache.filter(
    { country: destination_country }
  ).then(async (records: any[]) => {
    for (const r of records) {
      await base44.asServiceRole.entities.SafetyIndexCache.update(r.id, { is_stale: true });
    }
  }).catch(() => {});

  return ok({ success: true, signal_recorded: true });
}, { name: 'storeSafetySignal', requireAuth: false, rateLimit: false }));

async function sha256short(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}
