/**
 * calculateDriverTrustScore
 *
 * Driver/transport-company trust score (0-100) — the TaxiService equivalent
 * of calculateDoctorTrustScore/calculateCompanionScore. Previously a real,
 * identified gap ("Driver trust scoring remains explicitly unbuilt" — see
 * CLAUDE.md's Demo Pages section) since TaxiService was the only partner
 * type with no scoring pass. Called:
 *   - By the daily freshness cron (freshness-cron.yml)
 *   - Manually from admin dashboard (pass driver_id to score just one)
 *
 * A driver is assigned per-case via CaseRecord.origin_driver_id /
 * destination_driver_id (assignChauffeurServices) — NOT `assigned_driver_id`,
 * a field nothing in this codebase ever writes (the live bug already found
 * in getTaxiDriverCases). Both fields are queried here.
 *
 * Score (0-100):
 *   On-Time Record    40 pts — % of this driver's pickup legs that were NOT
 *                               flagged as a no-show by escalateMissedDriverHandshake
 *                               (TravelRequest.noshow_flagged_steps, cross-referenced
 *                               against the specific steps this driver's leg covers:
 *                               origin = steps 1/9, destination = steps 3/5/7)
 *   Safety Record      30 pts — 30 - (sos_events * 10), floor 0
 *   Patient Rating     30 pts — avg RecoverySession.feedback_rating (case-linked) x 6
 *                               (one overall trip rating, not split by partner —
 *                               same honest proxy caveat as the doctor/companion scorers)
 *
 * Stored on TaxiService as trust_score/trust_components/trust_reasons.
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { driverTrustReasons } from '../../shared/trustScoreReasons.ts';

const DRIVER_STEPS_BY_LEG: Record<'origin' | 'destination', number[]> = {
  origin: [1, 9],
  destination: [3, 5, 7],
};

Deno.serve(createHandler(async ({ req, base44, body }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const { driver_id } = await body();

  async function scoreDriver(driverId: string) {
    const [originCases, destCases] = await Promise.all([
      base44.asServiceRole.entities.CaseRecord.filter({ origin_driver_id: driverId }, '-created_date', 100).catch(() => []),
      base44.asServiceRole.entities.CaseRecord.filter({ destination_driver_id: driverId }, '-created_date', 100).catch(() => []),
    ]);
    const legs: Array<{ caseRecord: any; leg: 'origin' | 'destination' }> = [
      ...originCases.map((c: any) => ({ caseRecord: c, leg: 'origin' as const })),
      ...destCases.map((c: any) => ({ caseRecord: c, leg: 'destination' as const })),
    ];

    if (!legs.length) {
      return { score: 70, components: { note: 'No trips yet — baseline score' }, case_count: 0 };
    }

    const caseIds = legs.map(l => l.caseRecord.id);

    // 1. On-time record — cross-reference each case's linked TravelRequest for a
    // no-show flag on THIS driver's own leg. A missing/unreachable TravelRequest
    // is treated as no data, not a penalty — never guess a no-show from silence.
    let onTimeCount = 0;
    try {
      const trips = await base44.asServiceRole.entities.TravelRequest.filter(
        { case_id: { $in: caseIds } }
      ).catch(() => []);
      const tripByCaseId = new Map((trips as any[]).map((t: any) => [t.case_id, t]));
      for (const { caseRecord, leg } of legs) {
        const trip = tripByCaseId.get(caseRecord.id);
        const flagged: number[] = trip?.noshow_flagged_steps || [];
        const legSteps = DRIVER_STEPS_BY_LEG[leg];
        const wasNoShow = legSteps.some(step => flagged.includes(step));
        if (!wasNoShow) onTimeCount++;
      }
    } catch (_) {
      onTimeCount = legs.length;
    }
    const onTimePct = Math.round((onTimeCount / legs.length) * 100);
    const onTimeScore = Math.round((onTimePct / 100) * 40);

    // 2. Safety record — SOS events linked to this driver's cases
    let sosCount = 0;
    try {
      const sosEvents = await base44.asServiceRole.entities.SOSEvent.filter({});
      sosCount = (sosEvents as any[]).filter((e: any) => caseIds.includes(e.case_id)).length;
    } catch (_) {}
    const safetyScore = Math.max(0, 30 - sosCount * 10);

    // 3. Patient rating — from RecoverySession.feedback_rating, joined by case_id.
    let feedbackAvg = 4.2; // default only when literally no rated sessions exist yet
    let feedbackCount = 0;
    try {
      const sessions = await base44.asServiceRole.entities.RecoverySession.filter(
        { case_id: { $in: caseIds } }
      );
      const rated = (sessions as any[]).filter((s: any) => typeof s.feedback_rating === 'number');
      if (rated.length > 0) {
        feedbackAvg = rated.reduce((s: number, r: any) => s + r.feedback_rating, 0) / rated.length;
        feedbackCount = rated.length;
      }
    } catch (_) {}
    const ratingScore = Math.round(Math.min(5, feedbackAvg) * 6);

    const total = Math.round(onTimeScore + safetyScore + ratingScore);

    return {
      score: Math.min(100, Math.max(0, total)),
      components: {
        on_time_pts: onTimeScore,
        safety_record_pts: safetyScore,
        patient_rating_pts: ratingScore,
        on_time_pct: onTimePct,
        sos_events: sosCount,
        feedback_avg: Math.round(feedbackAvg * 10) / 10,
        feedback_count: feedbackCount,
      },
      case_count: legs.length,
    };
  }

  // No specific driver_id → score everyone, matching calculateDoctorTrustScore's
  // "score all" default for a bodyless cron POST.
  if (!driver_id) {
    const drivers = await base44.asServiceRole.entities.TaxiService.filter({}).catch(() => []);
    const updated: string[] = [];
    for (const driver of drivers as any[]) {
      try {
        const result = await scoreDriver(driver.id);
        await base44.asServiceRole.entities.TaxiService.update(driver.id, {
          trust_score: result.score,
          trust_components: result.components,
          trust_reasons: driverTrustReasons(result.components, result.case_count),
          trust_case_count: result.case_count,
          trust_last_calculated: new Date().toISOString(),
        });
        updated.push(driver.id);
      } catch (_) {}
    }
    return ok({ success: true, drivers_updated: updated.length });
  }

  const result = await scoreDriver(driver_id);
  await base44.asServiceRole.entities.TaxiService.update(driver_id, {
    trust_score: result.score,
    trust_components: result.components,
    trust_reasons: driverTrustReasons(result.components, result.case_count),
    trust_case_count: result.case_count,
    trust_last_calculated: new Date().toISOString(),
  }).catch(() => {});

  return ok({ success: true, driver_id, ...result });
}, { name: 'calculateDriverTrustScore', requireAuth: false }));
