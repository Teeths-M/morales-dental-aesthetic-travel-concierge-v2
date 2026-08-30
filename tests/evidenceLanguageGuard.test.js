import { describe, it, expect } from 'vitest';
import { containsBannedClaim, stageToPlainLanguage } from '../base44/shared/evidenceLanguageGuard.ts';

describe('containsBannedClaim', () => {
  it('catches every listed banned phrase', () => {
    expect(containsBannedClaim('This is a cure for the condition.')).toBe(true);
    expect(containsBannedClaim('Patients are fully restored after treatment.')).toBe(true);
    expect(containsBannedClaim('A breakthrough in medical science.')).toBe(true);
    expect(containsBannedClaim('Guaranteed results for every patient.')).toBe(true);
    expect(containsBannedClaim('A miracle treatment.')).toBe(true);
    expect(containsBannedClaim('The device is 100% effective.')).toBe(true);
    expect(containsBannedClaim('This procedure is completely safe.')).toBe(true);
    expect(containsBannedClaim('This has been proven safe.')).toBe(true);
    expect(containsBannedClaim('The treatment is safe and effective.')).toBe(true);
    expect(containsBannedClaim('A risk-free procedure.')).toBe(true);
    expect(containsBannedClaim('There are no side effects.')).toBe(true);
  });

  it('catches a natural sentence using the banned language, not just an isolated phrase', () => {
    expect(containsBannedClaim('Doctors say this device offers a breakthrough cure with no side effects for patients worldwide.')).toBe(true);
  });

  it('does not false-positive on ordinary hedged, factual language', () => {
    expect(containsBannedClaim('Early research suggests this may help some patients, but more study is needed.')).toBe(false);
    expect(containsBannedClaim('The device has been cleared by the regulator — verify local availability.')).toBe(false);
    expect(containsBannedClaim('A clinical trial is currently recruiting participants.')).toBe(false);
  });

  it('handles empty or missing input without throwing', () => {
    expect(containsBannedClaim('')).toBe(false);
    expect(containsBannedClaim(undefined)).toBe(false);
  });
});

describe('stageToPlainLanguage', () => {
  it("matches the spec's literal example sentences for every real stage", () => {
    expect(stageToPlainLanguage('lab_preclinical')).toBe('Early research — not yet a treatment');
    expect(stageToPlainLanguage('human_study')).toBe('Early research — not yet a treatment');
    expect(stageToPlainLanguage('clinical_trial_recruiting')).toBe('Clinical trial — availability depends on eligibility');
    expect(stageToPlainLanguage('trial_completed')).toBe('Clinical trial — availability depends on eligibility');
    expect(stageToPlainLanguage('regulator_cleared_approved')).toBe('Regulator-approved device — verify local availability');
    expect(stageToPlainLanguage('commercially_available')).toBe('Regulator-approved device — verify local availability');
    expect(stageToPlainLanguage('recall_safety_alert')).toBe('Regulator safety alert — read the full advisory');
  });

  it('returns an honest fallback for an unrecognized/missing stage', () => {
    expect(stageToPlainLanguage('something_else')).toBe('Under review — stage not yet determined');
    expect(stageToPlainLanguage(undefined)).toBe('Under review — stage not yet determined');
  });
});
