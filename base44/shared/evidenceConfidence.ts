/**
 * evidenceConfidence — the ONE place a MedicalDiscovery's patient-facing
 * `confidence` value is decided. Fully deterministic, no LLM, no network —
 * a tier_1 source (PubMed/ClinicalTrials.gov/openFDA, or an authoritative
 * .gov page Tavily happened to surface) can reach 'verified' for an
 * established-stage claim (a real regulator action, a completed trial) or
 * 'promising_but_early' for an earlier-stage one. A tier_2-only source
 * (established reporting used to discover/explain a story) caps at
 * 'under_review' — per the spec's own rule, Tier 2 is "used only to
 * discover and explain a source, never as sole evidence." A tier_3-only
 * source (social/user-generated) is always 'unverified' and, per
 * evaluateEvidenceWatch, never reaches patient-visible status at all.
 */

import type { SourceTier } from './evidenceSourceTier.ts';
import { bestTier } from './evidenceSourceTier.ts';

export type EvidenceStage =
  | 'lab_preclinical'
  | 'human_study'
  | 'clinical_trial_recruiting'
  | 'trial_completed'
  | 'regulator_cleared_approved'
  | 'commercially_available'
  | 'recall_safety_alert';

export type ConfidenceTier = 'verified' | 'promising_but_early' | 'under_review' | 'unverified';

// A tier_1 source at one of these stages describes a real, already-happened
// regulatory/clinical fact (an approval, a completed trial, a recall) —
// eligible for 'verified'. Earlier stages (still in research) stay
// 'promising_but_early' even with a tier_1 source, since the underlying
// treatment itself isn't established yet.
const ESTABLISHED_STAGES: EvidenceStage[] = [
  'regulator_cleared_approved',
  'commercially_available',
  'recall_safety_alert',
  'trial_completed',
];

export function computeConfidenceTier(sourceTiers: SourceTier[], evidenceStage: EvidenceStage): ConfidenceTier {
  if (!Array.isArray(sourceTiers) || sourceTiers.length === 0) return 'unverified';

  const top = bestTier(sourceTiers);

  if (top === 'tier_1') {
    return ESTABLISHED_STAGES.includes(evidenceStage) ? 'verified' : 'promising_but_early';
  }
  if (top === 'tier_2') {
    return 'under_review';
  }
  return 'unverified';
}
