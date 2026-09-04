/**
 * calculateDriverDormancyRisk
 *
 * The "churn"-analogue for drivers/TaxiService — see
 * calculateDoctorDormancyRisk's header for the full design rationale (shared
 * with all three dormancy functions). Scored from the same real case-linkage
 * fields calculateDriverTrustScore already uses: CaseRecord.origin_driver_id
 * and destination_driver_id (NOT assigned_driver_id, a field nothing in this
 * codebase ever writes).
 *
 * Called by the daily freshness cron (same slot as the trust-score calls)
 * and manually from admin dashboard (pass driver_id to score just one).
 * Only scores drivers with status:'active'.
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { flagForReview } from '../../shared/freshness.ts';
import {
  computeDormancyTier,
  dormancyReason,
  DORMANCY_TIER_RANK,
  type DormancyTier,
} from '../../shared/partnerDormancyScore.ts';

const ALERT_TIERS = new Set<DormancyTier>(['at_risk', 'dormant']);

// ISO date strings sort lexicographically = chronologically, so a plain
// string comparison is a safe way to find the most recent of two dates
// without needing to parse either one first.
function mostRecentIso(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a) return b || null;
  if (!b) return a;
  return a > b ? a : b;
}

async function scoreAndMaybeFlag(base44: any, driver: any) {
  const [originCases, destCases] = await Promise.all([
    base44.asServiceRole.entities.CaseRecord.filter({ origin_driver_id: driver.id }, '-created_date', 1).catch(() => []),
    base44.asServiceRole.entities.CaseRecord.filter({ destination_driver_id: driver.id }, '-created_date', 1).catch(() => []),
  ]);
  const lastCaseActivityAt = mostRecentIso(originCases[0]?.created_date, destCases[0]?.created_date);

  const result = computeDormancyTier({
    lastCaseActivityAt,
    verifiedAt: driver.verified_at ?? null,
  });
  const reasons = dormancyReason(result);
  const oldTier: DormancyTier = (driver.dormancy_tier as DormancyTier) || 'active';

  await base44.asServiceRole.entities.TaxiService.update(driver.id, {
    dormancy_tier: result.tier,
    days_since_last_activity: result.days_since_last_activity,
    dormancy_reasons: reasons,
    dormancy_last_calculated: new Date().toISOString(),
  }).catch(() => {});

  const isGenuineAlertTransition =
    ALERT_TIERS.has(result.tier) && DORMANCY_TIER_RANK[result.tier] > DORMANCY_TIER_RANK[oldTier];

  if (isGenuineAlertTransition) {
    await flagForReview(base44, {
      subject_type: 'partner_dormancy',
      subject_id: driver.id,
      subject_label: driver.agency_name || driver.company_name || driver.email || driver.id,
      change_type: 'status_changed',
      detail: `Driver dormancy tier moved ${oldTier} -> ${result.tier}. ${reasons[0]}`,
      detected_via: 'scheduled',
      previous_value: oldTier,
      new_value: result.tier,
      severity: result.tier === 'dormant' ? 'critical' : 'warning',
    });
  }

  return { tier: result.tier, days_since_last_activity: result.days_since_last_activity, reasons };
}

Deno.serve(createHandler(async ({ req, base44, body }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const { driver_id } = await body();

  if (!driver_id) {
    const drivers = await base44.asServiceRole.entities.TaxiService.filter({ status: 'active' }).catch(() => []);
    let updated = 0;
    for (const driver of drivers as any[]) {
      try {
        await scoreAndMaybeFlag(base44, driver);
        updated++;
      } catch (_) {}
    }
    return ok({ success: true, drivers_scored: updated });
  }

  const driver = await base44.asServiceRole.entities.TaxiService.get(driver_id).catch(() => null);
  if (!driver) return err('Driver not found', 404);
  const result = await scoreAndMaybeFlag(base44, driver);
  return ok({ success: true, driver_id, ...result });
}, { name: 'calculateDriverDormancyRisk', requireAuth: false }));
