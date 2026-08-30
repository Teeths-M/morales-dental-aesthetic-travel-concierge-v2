import { describe, it, expect } from 'vitest';
import { computeConfidenceTier } from '../base44/shared/evidenceConfidence.ts';

describe('computeConfidenceTier', () => {
  it('reaches verified for a tier_1 source at an established stage', () => {
    expect(computeConfidenceTier(['tier_1'], 'regulator_cleared_approved')).toBe('verified');
    expect(computeConfidenceTier(['tier_1'], 'commercially_available')).toBe('verified');
    expect(computeConfidenceTier(['tier_1'], 'recall_safety_alert')).toBe('verified');
    expect(computeConfidenceTier(['tier_1'], 'trial_completed')).toBe('verified');
  });

  it('stays promising_but_early for a tier_1 source at an earlier stage', () => {
    expect(computeConfidenceTier(['tier_1'], 'lab_preclinical')).toBe('promising_but_early');
    expect(computeConfidenceTier(['tier_1'], 'human_study')).toBe('promising_but_early');
    expect(computeConfidenceTier(['tier_1'], 'clinical_trial_recruiting')).toBe('promising_but_early');
  });

  it('caps a tier_2-only source at under_review regardless of stage', () => {
    expect(computeConfidenceTier(['tier_2'], 'regulator_cleared_approved')).toBe('under_review');
    expect(computeConfidenceTier(['tier_2'], 'lab_preclinical')).toBe('under_review');
  });

  it('never lets a tier_3-only source reach above unverified, regardless of stage', () => {
    const allStages = [
      'lab_preclinical', 'human_study', 'clinical_trial_recruiting', 'trial_completed',
      'regulator_cleared_approved', 'commercially_available', 'recall_safety_alert',
    ];
    for (const stage of allStages) {
      expect(computeConfidenceTier(['tier_3'], stage)).toBe('unverified');
    }
  });

  it('uses the best (most trustworthy) tier when multiple sources are present', () => {
    expect(computeConfidenceTier(['tier_3', 'tier_1'], 'regulator_cleared_approved')).toBe('verified');
    expect(computeConfidenceTier(['tier_3', 'tier_2'], 'lab_preclinical')).toBe('under_review');
  });

  it('returns unverified for an empty or missing source list', () => {
    expect(computeConfidenceTier([], 'regulator_cleared_approved')).toBe('unverified');
    expect(computeConfidenceTier(undefined, 'regulator_cleared_approved')).toBe('unverified');
  });
});
