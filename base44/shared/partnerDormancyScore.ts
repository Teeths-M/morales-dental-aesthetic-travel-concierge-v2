/**
 * partnerDormancyScore — pure, no-I/O dormancy-risk scoring for partners
 * (doctors/companions/drivers) who used to take cases but have gone quiet.
 *
 * This is the "churn" analogue for M-Care: not a trained model (this
 * codebase has none anywhere), but the same deterministic weighted/tiered
 * pattern already proven for calculateDoctorTrustScore/calculateCompanionScore/
 * calculateDriverTrustScore. Trust score answers "how good is this partner";
 * this answers a different question — "is this partner about to leave" —
 * so it's a separate score, not a component folded into trust_score.
 *
 * Starting thresholds below are disclosed, not proven-correct — same framing
 * as MedGuard's SAFE/WATCH/ALERT/CRITICAL bands elsewhere in this codebase.
 * Worth live-tuning in one place once real dormancy/reactivation data exists.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export const DORMANCY_GRACE_PERIOD_DAYS = 30;
export const DORMANCY_TIER_THRESHOLDS_DAYS = { active: 30, cooling: 60, at_risk: 90 } as const; // dormant: >= 90

export type DormancyTier = 'active' | 'cooling' | 'at_risk' | 'dormant';

export const DORMANCY_TIER_RANK: Record<DormancyTier, number> = {
  active: 0,
  cooling: 1,
  at_risk: 2,
  dormant: 3,
};

type ReferenceKind = 'case_activity' | 'verification_date' | 'none';

export interface DormancyInput {
  lastCaseActivityAt?: string | null;
  verifiedAt?: string | null;
  now?: Date;
}

export interface DormancyComponents {
  reference: ReferenceKind;
  days_since_reference: number | null;
  grace_period_days: number;
}

export interface DormancyResult {
  tier: DormancyTier;
  // Real days since this partner's last CASE — never fabricated. Null when
  // they've never had one; in that case the tier is driven by days since
  // verification instead (see components.reference).
  days_since_last_activity: number | null;
  components: DormancyComponents;
}

function tierForDays(days: number): DormancyTier {
  if (days < DORMANCY_TIER_THRESHOLDS_DAYS.active) return 'active';
  if (days < DORMANCY_TIER_THRESHOLDS_DAYS.cooling) return 'cooling';
  if (days < DORMANCY_TIER_THRESHOLDS_DAYS.at_risk) return 'at_risk';
  return 'dormant';
}

function daysSince(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((now.getTime() - t) / DAY_MS);
}

export function computeDormancyTier(input: DormancyInput): DormancyResult {
  const now = input.now || new Date();

  const daysSinceCase = daysSince(input.lastCaseActivityAt, now);
  if (daysSinceCase !== null) {
    return {
      tier: tierForDays(daysSinceCase),
      days_since_last_activity: daysSinceCase,
      components: {
        reference: 'case_activity',
        days_since_reference: daysSinceCase,
        grace_period_days: DORMANCY_GRACE_PERIOD_DAYS,
      },
    };
  }

  const daysSinceVerification = daysSince(input.verifiedAt, now);
  if (daysSinceVerification === null) {
    // No case ever, no verification date either — never guess dormancy from
    // silence about a partner we can't even place a clock on.
    return {
      tier: 'active',
      days_since_last_activity: null,
      components: {
        reference: 'none',
        days_since_reference: null,
        grace_period_days: DORMANCY_GRACE_PERIOD_DAYS,
      },
    };
  }

  // A zero-case partner's own clock only starts AFTER the grace period —
  // day 1 of "cooling" is day 1 past grace, not day 1 of verification. This
  // is what makes the grace period a real buffer, not just redundant with
  // the "active" band the thresholds already imply.
  const effectiveDays = Math.max(0, daysSinceVerification - DORMANCY_GRACE_PERIOD_DAYS);
  return {
    tier: tierForDays(effectiveDays),
    days_since_last_activity: null,
    components: {
      reference: 'verification_date',
      days_since_reference: daysSinceVerification,
      grace_period_days: DORMANCY_GRACE_PERIOD_DAYS,
    },
  };
}

/**
 * Turns an already-computed DormancyResult into one honest sentence — real
 * numbers only, never an invented claim, matching trustScoreReasons.ts's
 * own discipline exactly.
 */
export function dormancyReason(result: DormancyResult): string[] {
  const { tier, days_since_last_activity, components } = result;

  if (components.reference === 'none') {
    return ['No verification or case-activity date on record yet — dormancy cannot be assessed'];
  }

  if (components.reference === 'case_activity') {
    return [`Last active case ${days_since_last_activity} day(s) ago`];
  }

  // reference === 'verification_date'
  if (tier === 'active') {
    return [
      `Verified ${components.days_since_reference} day(s) ago, no cases yet — within the ${components.grace_period_days}-day onboarding grace period`,
    ];
  }
  return [`Verified ${components.days_since_reference} day(s) ago and has never had a case`];
}
