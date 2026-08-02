// ── Recovery Wellness Guidance deterministic engine ────────────────────────────
// The ONLY thing allowed to decide whether a recovery-guidance draft is eligible
// to be generated. Pure, explicit rules — no LLM, no network, no randomness.
// Same inputs always produce the same decision, and it can be replayed/audited.
// The AI is never asked to weigh in on eligibility; it only drafts wellness text
// for a decision this engine has already reached.
//
// FAIL CLOSED: unknown procedure type or no active recovery timeline escalate to
// 'insufficient_information' — never a guess at a draft.
//
// Scope note (Phase 1 — Recovery Wellness Guidance): this engine reasons about
// procedure type + recovery day only. It deliberately does NOT reason about
// medications/allergies/interactions — that responsibility stays with the
// reviewing pharmacist/physician's own attestation (see RecoveryGuidanceApproval).
// Naming a specific supplement/product/dose is out of scope for this engine.

export const RECOVERY_GUIDANCE_ENGINE_VERSION = 'recoveryGuidance-deterministic-1.0';

export type RecoveryGuidanceDecision = {
  guidance_status: 'draft_ready' | 'insufficient_information';
  flags: string[];
  factors: Record<string, string>;
  engine_version: string;
  fail_closed_reason?: string;
};

export type RecoveryGuidanceProfileInput = {
  procedure_type?: string;
  recovery_day?: number | null;
  injection_flagged?: boolean;
};

const RECOVERY_DAY_BANDS: { max: number; label: string }[] = [
  { max: 3, label: 'immediate_post_op_0_3' },
  { max: 7, label: 'first_week_4_7' },
  { max: 14, label: 'second_week_8_14' },
  { max: 30, label: 'first_month_15_30' },
  { max: Infinity, label: 'beyond_30' },
];

function recoveryDayBand(day: number): string {
  return (RECOVERY_DAY_BANDS.find((b) => day <= b.max) || RECOVERY_DAY_BANDS[RECOVERY_DAY_BANDS.length - 1]).label;
}

export function computeRecoveryGuidance(profile: RecoveryGuidanceProfileInput): RecoveryGuidanceDecision {
  // ── Hard fail-closed conditions → immediate 'insufficient_information' ──────
  if (profile.injection_flagged) {
    return {
      guidance_status: 'insufficient_information',
      flags: ['Input flagged for manual review'],
      factors: {},
      engine_version: RECOVERY_GUIDANCE_ENGINE_VERSION,
      fail_closed_reason: 'injection_detected',
    };
  }

  const procedure = String(profile.procedure_type || '').trim();
  if (!procedure || procedure.toLowerCase().includes('not specified')) {
    return {
      guidance_status: 'insufficient_information',
      flags: ['Procedure type not specified'],
      factors: {},
      engine_version: RECOVERY_GUIDANCE_ENGINE_VERSION,
      fail_closed_reason: 'unknown_procedure',
    };
  }

  if (profile.recovery_day === null || profile.recovery_day === undefined || !Number.isFinite(profile.recovery_day) || profile.recovery_day < 0) {
    return {
      guidance_status: 'insufficient_information',
      flags: ['No active recovery timeline for this case'],
      factors: {},
      engine_version: RECOVERY_GUIDANCE_ENGINE_VERSION,
      fail_closed_reason: 'no_active_recovery_session',
    };
  }

  const factors: Record<string, string> = {
    procedure_type: procedure,
    recovery_day_band: recoveryDayBand(profile.recovery_day),
  };

  return {
    guidance_status: 'draft_ready',
    flags: [],
    factors,
    engine_version: RECOVERY_GUIDANCE_ENGINE_VERSION,
  };
}
