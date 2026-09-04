/**
 * calculateDoctorDormancyRisk
 *
 * The "churn"-analogue for doctors: not a trained model (see
 * base44/shared/partnerDormancyScore.ts for why), but the same deterministic
 * weighted/tiered pattern already proven for calculateDoctorTrustScore. Trust
 * score answers "how good is this doctor"; this answers a different
 * question — "is this doctor going quiet, at risk of leaving the platform" —
 * scored from the same real case-linkage field calculateDoctorTrustScore
 * already uses (CaseRecord.doctor_selected, not doctor_email).
 *
 * Called:
 *   - By the daily freshness cron (freshness-cron.yml), same slot as the
 *     trust-score calls (operational cadence, not life-safety).
 *   - Manually from admin dashboard (pass doctor_id to score just one).
 *
 * A doctor with zero cases ever is never immediately flagged — the clock
 * starts from verified_at with a 30-day onboarding grace period first. On a
 * genuine tier transition into at_risk/dormant, flags a human via
 * flagForReview — never an automated outreach to the doctor. A human decides
 * whether/how to reach out (mirrors activatePartner's own stated reasoning
 * for the mirror-image decision, applied here to a partner potentially
 * leaving instead of being activated).
 *
 * Only scores doctors with status:'active' — dormancy is only a meaningful
 * question for a doctor still in rotation; a pending/suspended doctor isn't
 * "dormant," they're already out of the loop for a different reason.
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

async function scoreAndMaybeFlag(base44: any, doctor: any) {
  const cases = await base44.asServiceRole.entities.CaseRecord.filter(
    { doctor_selected: doctor.id }, '-created_date', 1
  ).catch(() => []);

  const result = computeDormancyTier({
    lastCaseActivityAt: cases[0]?.created_date ?? null,
    verifiedAt: doctor.verified_at ?? null,
  });
  const reasons = dormancyReason(result);
  const oldTier: DormancyTier = (doctor.dormancy_tier as DormancyTier) || 'active';

  await base44.asServiceRole.entities.Doctor.update(doctor.id, {
    dormancy_tier: result.tier,
    days_since_last_activity: result.days_since_last_activity,
    dormancy_reasons: reasons,
    dormancy_last_calculated: new Date().toISOString(),
  }).catch(() => {});

  // Fires only on a genuine transition into (or a further escalation within)
  // at_risk/dormant — a flat tier→same-tier daily recompute never re-fires.
  const isGenuineAlertTransition =
    ALERT_TIERS.has(result.tier) && DORMANCY_TIER_RANK[result.tier] > DORMANCY_TIER_RANK[oldTier];

  if (isGenuineAlertTransition) {
    await flagForReview(base44, {
      subject_type: 'partner_dormancy',
      subject_id: doctor.id,
      subject_label: doctor.full_name || doctor.email || doctor.id,
      change_type: 'status_changed',
      detail: `Doctor dormancy tier moved ${oldTier} -> ${result.tier}. ${reasons[0]}`,
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

  const { doctor_id } = await body();

  if (!doctor_id) {
    const doctors = await base44.asServiceRole.entities.Doctor.filter({ status: 'active' }).catch(() => []);
    let updated = 0;
    for (const doctor of doctors as any[]) {
      try {
        await scoreAndMaybeFlag(base44, doctor);
        updated++;
      } catch (_) {}
    }
    return ok({ success: true, doctors_scored: updated });
  }

  const doctor = await base44.asServiceRole.entities.Doctor.get(doctor_id).catch(() => null);
  if (!doctor) return err('Doctor not found', 404);
  const result = await scoreAndMaybeFlag(base44, doctor);
  return ok({ success: true, doctor_id, ...result });
}, { name: 'calculateDoctorDormancyRisk', requireAuth: false }));
