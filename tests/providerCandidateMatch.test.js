import { describe, it, expect } from 'vitest';
import {
  scoreAgainstKnownProvider,
  isLikelyKnownProvider,
  computeCandidateConfidence,
  DUPLICATE_MATCH_THRESHOLD,
} from '../base44/shared/providerCandidateMatch.ts';

describe('scoreAgainstKnownProvider', () => {
  it('scores an exact name mention in the snippet highly', () => {
    const score = scoreAgainstKnownProvider(
      { title: 'Dr. Maria Lopez — Cancun Dental Implants', snippet: 'Dr. Maria Lopez has 15 years of experience.' },
      { id: '1', partner_type: 'doctor', name: 'Maria Lopez' },
    );
    expect(score).toBeGreaterThanOrEqual(0.9);
  });

  it('scores an unrelated result near zero', () => {
    const score = scoreAgainstKnownProvider(
      { title: 'Best beaches in Cancun', snippet: 'Top 10 beaches for tourists.' },
      { id: '1', partner_type: 'doctor', name: 'Maria Lopez' },
    );
    expect(score).toBeLessThan(0.3);
  });

  it('never throws on empty/missing fields', () => {
    expect(scoreAgainstKnownProvider({ title: '', snippet: '' }, { id: '1', partner_type: 'doctor', name: '' })).toBe(0);
    expect(scoreAgainstKnownProvider({ title: 'x', snippet: 'y' }, { id: '1', partner_type: 'doctor', name: '' })).toBe(0);
  });

  it('adds a small bonus when the provider\'s city appears in the text', () => {
    const withCity = scoreAgainstKnownProvider(
      { title: 'Dr Rivera Dental', snippet: 'Practicing in Tijuana for over a decade.' },
      { id: '1', partner_type: 'doctor', name: 'Rivera', city: 'Tijuana' },
    );
    const withoutCity = scoreAgainstKnownProvider(
      { title: 'Dr Rivera Dental', snippet: 'Practicing for over a decade.' },
      { id: '1', partner_type: 'doctor', name: 'Rivera', city: 'Tijuana' },
    );
    expect(withCity).toBeGreaterThan(withoutCity);
  });
});

describe('isLikelyKnownProvider', () => {
  it('matches when the best score clears the duplicate threshold', () => {
    const result = isLikelyKnownProvider(
      { title: 'Dr. Maria Lopez Dental Clinic', snippet: 'Maria Lopez, DDS, Cancun.' },
      [
        { id: '1', partner_type: 'doctor', name: 'Maria Lopez' },
        { id: '2', partner_type: 'doctor', name: 'John Smith' },
      ],
    );
    expect(result.matched).toBe(true);
    expect(result.provider?.id).toBe('1');
    expect(result.score).toBeGreaterThanOrEqual(DUPLICATE_MATCH_THRESHOLD);
  });

  it('does not match when no known provider clears the threshold — this is a genuinely new lead', () => {
    const result = isLikelyKnownProvider(
      { title: 'New Dental Studio Cancun', snippet: 'A brand new clinic opening this year.' },
      [{ id: '1', partner_type: 'doctor', name: 'Maria Lopez' }],
    );
    expect(result.matched).toBe(false);
    expect(result.provider).toBeUndefined();
  });

  it('returns matched:false, score:0 for an empty known-provider list', () => {
    const result = isLikelyKnownProvider({ title: 'Anything', snippet: 'Anything' }, []);
    expect(result.matched).toBe(false);
    expect(result.score).toBe(0);
  });
});

describe('computeCandidateConfidence', () => {
  it('caps confidence at 40 on search relevance alone — never enough to look verified', () => {
    expect(computeCandidateConfidence(1)).toBeLessThanOrEqual(40);
    expect(computeCandidateConfidence(0.5)).toBeLessThanOrEqual(40);
  });

  it('scales with relevance when there is no registry confidence', () => {
    expect(computeCandidateConfidence(0)).toBe(0);
    expect(computeCandidateConfidence(1)).toBe(40);
    expect(computeCandidateConfidence(0.5)).toBe(20);
  });

  it('lets a real registry confirmation dominate the score', () => {
    const withRegistry = computeCandidateConfidence(0.5, 90);
    const withoutRegistry = computeCandidateConfidence(0.5);
    expect(withRegistry).toBeGreaterThan(withoutRegistry);
    expect(withRegistry).toBeLessThanOrEqual(100);
  });

  it('clamps out-of-range inputs instead of throwing or going negative', () => {
    expect(computeCandidateConfidence(-1)).toBe(0);
    expect(computeCandidateConfidence(2)).toBe(40);
    expect(computeCandidateConfidence(0.5, 150)).toBeLessThanOrEqual(100);
    expect(computeCandidateConfidence(0.5, -10)).toBe(20); // negative registry confidence ignored, falls back to relevance only
  });
});
