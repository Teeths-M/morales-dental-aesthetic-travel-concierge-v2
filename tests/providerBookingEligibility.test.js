import { describe, it, expect } from 'vitest';
import {
  checkProviderBookingEligibility,
  CRITICAL_CONCERN_THRESHOLD,
  HIGH_CONCERN_THRESHOLD,
} from '../base44/shared/providerBookingEligibility.ts';

const CLEAN_DOCTOR = {
  status: 'active',
  license_verified: true,
  verification_status: 'verified',
  verification_can_be_activated: true,
  booking_suspended: false,
  license_last_checked_at: new Date().toISOString(),
};

describe('checkProviderBookingEligibility', () => {
  it('is eligible for a fully clean, verified doctor with no concerns', () => {
    const result = checkProviderBookingEligibility(CLEAN_DOCTOR, { high: 0, critical: 0 });
    expect(result.eligible).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('returns ineligible with a real reason when the doctor is missing', () => {
    const result = checkProviderBookingEligibility(null, { high: 0, critical: 0 });
    expect(result.eligible).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('blocks when booking_suspended is true', () => {
    const result = checkProviderBookingEligibility(
      { ...CLEAN_DOCTOR, booking_suspended: true, booking_suspended_reason: 'A serious concern is under review.' },
      { high: 0, critical: 0 },
    );
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain('A serious concern is under review.');
  });

  it('blocks on a failed/rejected/suspended verification_status', () => {
    for (const status of ['failed', 'rejected', 'suspended']) {
      const result = checkProviderBookingEligibility({ ...CLEAN_DOCTOR, verification_status: status }, { high: 0, critical: 0 });
      expect(result.eligible).toBe(false);
    }
  });

  it('blocks on a stale license recheck, but only if one was ever performed', () => {
    const stale = checkProviderBookingEligibility(
      { ...CLEAN_DOCTOR, license_last_checked_at: '2020-01-01T00:00:00.000Z' },
      { high: 0, critical: 0 },
    );
    expect(stale.eligible).toBe(false);

    // Never-checked is a verification_status problem (caught elsewhere), not a
    // staleness problem — this function must not also flag it as stale.
    const neverChecked = checkProviderBookingEligibility(
      { ...CLEAN_DOCTOR, license_last_checked_at: undefined },
      { high: 0, critical: 0 },
    );
    expect(neverChecked.eligible).toBe(true);
  });

  it('blocks on an identity-change-shaped inconsistency', () => {
    const result = checkProviderBookingEligibility(
      { ...CLEAN_DOCTOR, verification_can_be_activated: false },
      { high: 0, critical: 0 },
    );
    expect(result.eligible).toBe(false);
  });

  it('blocks at the critical concern threshold', () => {
    const result = checkProviderBookingEligibility(CLEAN_DOCTOR, { high: 0, critical: CRITICAL_CONCERN_THRESHOLD });
    expect(result.eligible).toBe(false);
  });

  it('blocks at the high concern threshold', () => {
    const result = checkProviderBookingEligibility(CLEAN_DOCTOR, { high: HIGH_CONCERN_THRESHOLD, critical: 0 });
    expect(result.eligible).toBe(false);
  });

  it('does NOT block below either concern threshold', () => {
    const result = checkProviderBookingEligibility(CLEAN_DOCTOR, { high: HIGH_CONCERN_THRESHOLD - 1, critical: 0 });
    expect(result.eligible).toBe(true);
  });
});
