/**
 * evidenceLanguageGuard — a hard, code-enforced ban on absolute-claim
 * language in a MedicalDiscovery's plain_language_summary, regardless of
 * evidence_stage or source tier. The extraction prompt in
 * evidenceWatchPipeline.ts already instructs the LLM never to use this
 * language, but this module is the structural backstop: evaluateEvidenceWatch
 * runs containsBannedClaim against every summary before it can advance past
 * evaluated, and a hit forces the record back to needs_more_evidence rather
 * than letting it silently reach queued_for_review.
 *
 * This is deliberately UNCONDITIONAL — never "allowed at tier_1" or "allowed
 * for regulator_cleared_approved". The spec's own example copy stays hedged
 * even at the highest confidence tier ("Regulator-approved device — verify
 * local availability", never "a safe cure"), so there is no tier or stage
 * that should ever unlock this language.
 *
 * stageToPlainLanguage is the other half of the same discipline — a fixed,
 * deterministic mapping from evidence_stage to the exact hedged sentence
 * shown to a patient, never an LLM-authored summary of the stage.
 */

const BANNED_CLAIM_PATTERNS: RegExp[] = [
  /\bcures?\b/i,
  /\bfully restor(e|es|ed|ing)\b/i,
  /\bbreakthrough\b/i,
  /\bguaranteed?\b/i,
  /\bmiracle\b/i,
  /\b100%\s*effective\b/i,
  /\bcompletely safe\b/i,
  /\bproven safe\b/i,
  /\bsafe and effective\b/i,
  /\brisk[- ]free\b/i,
  /\bno side effects\b/i,
];

/** Pure, case-insensitive, never throws. */
export function containsBannedClaim(text: string): boolean {
  const t = text || '';
  return BANNED_CLAIM_PATTERNS.some((re) => re.test(t));
}

/**
 * Fixed, deterministic mapping — matches the spec's own literal examples.
 * Never derived from the LLM's own summary text.
 */
export function stageToPlainLanguage(evidenceStage: string): string {
  switch (evidenceStage) {
    case 'lab_preclinical':
    case 'human_study':
      return 'Early research — not yet a treatment';
    case 'clinical_trial_recruiting':
    case 'trial_completed':
      return 'Clinical trial — availability depends on eligibility';
    case 'regulator_cleared_approved':
    case 'commercially_available':
      return 'Regulator-approved device — verify local availability';
    case 'recall_safety_alert':
      return 'Regulator safety alert — read the full advisory';
    default:
      return 'Under review — stage not yet determined';
  }
}
