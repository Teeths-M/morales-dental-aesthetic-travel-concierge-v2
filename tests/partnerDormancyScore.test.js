import { describe, it, expect } from 'vitest';
import {
  computeDormancyTier,
  dormancyReason,
  DORMANCY_TIER_RANK,
} from '../base44/shared/partnerDormancyScore.ts';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-06-01T00:00:00.000Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * DAY).toISOString();

describe('computeDormancyTier', () => {
  it('stays active for a brand-new partner with no case yet, verified 5 days ago', () => {
    const result = computeDormancyTier({ lastCaseActivityAt: null, verifiedAt: daysAgo(5), now: NOW });
    expect(result.tier).toBe('active');
    expect(result.days_since_last_activity).toBeNull();
    expect(result.components.reference).toBe('verification_date');
  });

  it('stays active for a zero-case partner still within the 30-day grace period (verified 40 days ago -> effective 10 days)', () => {
    const result = computeDormancyTier({ lastCaseActivityAt: null, verifiedAt: daysAgo(40), now: NOW });
    expect(result.tier).toBe('active');
  });

  it('moves a zero-case partner to at_risk once the grace-adjusted clock crosses 60 days (verified 100 days ago -> effective 70)', () => {
    const result = computeDormancyTier({ lastCaseActivityAt: null, verifiedAt: daysAgo(100), now: NOW });
    expect(result.tier).toBe('at_risk');
  });

  it('moves a zero-case partner to dormant once the grace-adjusted clock crosses 90 days (verified 200 days ago -> effective 170)', () => {
    const result = computeDormancyTier({ lastCaseActivityAt: null, verifiedAt: daysAgo(200), now: NOW });
    expect(result.tier).toBe('dormant');
  });

  it('never guesses dormancy from a partner with neither a case nor a verification date', () => {
    const result = computeDormancyTier({ lastCaseActivityAt: null, verifiedAt: null, now: NOW });
    expect(result.tier).toBe('active');
    expect(result.days_since_last_activity).toBeNull();
    expect(result.components.reference).toBe('none');
  });

  it('drives the tier directly off a real case when one exists, ignoring verified_at entirely', () => {
    const result = computeDormancyTier({ lastCaseActivityAt: daysAgo(45), verifiedAt: daysAgo(400), now: NOW });
    expect(result.tier).toBe('cooling');
    expect(result.days_since_last_activity).toBe(45);
    expect(result.components.reference).toBe('case_activity');
  });

  it('is active for a very recent real case', () => {
    expect(computeDormancyTier({ lastCaseActivityAt: daysAgo(2), verifiedAt: null, now: NOW }).tier).toBe('active');
  });

  it('is dormant for a real case 100+ days old', () => {
    expect(computeDormancyTier({ lastCaseActivityAt: daysAgo(120), verifiedAt: null, now: NOW }).tier).toBe('dormant');
  });
});

describe('dormancyReason', () => {
  it('never contains undefined/NaN for any real input combination', () => {
    const cases = [
      { lastCaseActivityAt: null, verifiedAt: null, now: NOW },
      { lastCaseActivityAt: null, verifiedAt: daysAgo(5), now: NOW },
      { lastCaseActivityAt: null, verifiedAt: daysAgo(150), now: NOW },
      { lastCaseActivityAt: daysAgo(10), verifiedAt: daysAgo(400), now: NOW },
    ];
    for (const input of cases) {
      const text = dormancyReason(computeDormancyTier(input)).join(' ');
      expect(text).not.toMatch(/undefined|NaN/);
    }
  });

  it('honestly flags a zero-case partner as within the onboarding grace period', () => {
    const reasons = dormancyReason(computeDormancyTier({ lastCaseActivityAt: null, verifiedAt: daysAgo(10), now: NOW }));
    expect(reasons.join(' ')).toMatch(/grace period/);
  });

  it('states a real case-days-since figure plainly', () => {
    const reasons = dormancyReason(computeDormancyTier({ lastCaseActivityAt: daysAgo(45), verifiedAt: null, now: NOW }));
    expect(reasons).toEqual(['Last active case 45 day(s) ago']);
  });
});

describe('DORMANCY_TIER_RANK', () => {
  it('ranks tiers in increasing severity order, for one-shot alert-transition gating', () => {
    expect(DORMANCY_TIER_RANK.active).toBeLessThan(DORMANCY_TIER_RANK.cooling);
    expect(DORMANCY_TIER_RANK.cooling).toBeLessThan(DORMANCY_TIER_RANK.at_risk);
    expect(DORMANCY_TIER_RANK.at_risk).toBeLessThan(DORMANCY_TIER_RANK.dormant);
  });
});
