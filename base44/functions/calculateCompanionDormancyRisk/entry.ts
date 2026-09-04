/**
 * calculateCompanionDormancyRisk
 *
 * The "churn"-analogue for companions — see calculateDoctorDormancyRisk's
 * header for the full design rationale (shared with all three dormancy
 * functions). Scored from the same real assignment-linkage field
 * calculateCompanionScore already uses (CompanionAssignment.companion_user_id).
 *
 * Called by the daily freshness cron (same slot as the trust-score calls)
 * and manually from admin dashboard (pass companion_id to score just one).
 * Only scores companions with status:'active'.
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

async function scoreAndMaybeFlag(base44: any, companion: any) {
  const assignments = await base44.asServiceRole.entities.CompanionAssignment.filter(
    { companion_user_id: companion.id }, '-offered_at', 1
  ).catch(() => []);

  const result = computeDormancyTier({
    lastCaseActivityAt: assignments[0]?.offered_at ?? null,
    verifiedAt: companion.verified_at ?? null,
  });
  const reasons = dormancyReason(result);
  const oldTier: DormancyTier = (companion.dormancy_tier as DormancyTier) || 'active';

  await base44.asServiceRole.entities.Companion.update(companion.id, {
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
      subject_id: companion.id,
      subject_label: companion.full_name || companion.agency_name || companion.email || companion.id,
      change_type: 'status_changed',
      detail: `Companion dormancy tier moved ${oldTier} -> ${result.tier}. ${reasons[0]}`,
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

  const { companion_id } = await body();

  if (!companion_id) {
    const companions = await base44.asServiceRole.entities.Companion.filter({ status: 'active' }).catch(() => []);
    let updated = 0;
    for (const companion of companions as any[]) {
      try {
        await scoreAndMaybeFlag(base44, companion);
        updated++;
      } catch (_) {}
    }
    return ok({ success: true, companions_scored: updated });
  }

  const companion = await base44.asServiceRole.entities.Companion.get(companion_id).catch(() => null);
  if (!companion) return err('Companion not found', 404);
  const result = await scoreAndMaybeFlag(base44, companion);
  return ok({ success: true, companion_id, ...result });
}, { name: 'calculateCompanionDormancyRisk', requireAuth: false }));
