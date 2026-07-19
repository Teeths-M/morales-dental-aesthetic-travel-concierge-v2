import { describe, it, expect } from 'vitest';
import { isDoctorVerified, VERIFIED_TERMINAL } from '@/lib/doctorVerification';

/**
 * Signing in "as a code doctor": what does it take for a doctor to become
 * visible to a patient, and can any half-verified state slip through?
 *
 * The Doctor entity has 8 verification states. A patient must only ever see a
 * doctor M can honestly call verified — under the M Principle this is the
 * trust claim the whole platform rests on, so every state is pinned here
 * explicitly rather than left to whatever the Set happens to contain.
 */

// Exactly the enum in base44/entities/Doctor.jsonc.
const ALL_STATES = [
  'pending_verification',
  'verifying',
  'verified',
  'failed',
  'manually_approved',
  'pending_manual',
  'rejected',
  'suspended',
];

describe('a doctor reaches patients only when genuinely verified', () => {
  it.each(ALL_STATES)('state "%s" is only accepted if it is a terminal approved state', (state) => {
    const doctor = { license_verified: true, verification_status: state };
    const expected = state === 'verified' || state === 'manually_approved';
    expect(isDoctorVerified(doctor)).toBe(expected);
  });

  it('an unverified licence fails EVERY state, including the approved ones', () => {
    // Both conditions are required. A doctor marked approved whose licence was
    // never actually checked against the issuing board is exactly the case the
    // homepage claim ("licences checked against the issuing medical board")
    // would otherwise be lying about.
    for (const state of ALL_STATES) {
      expect(isDoctorVerified({ license_verified: false, verification_status: state })).toBe(false);
    }
  });

  it('missing, null and malformed doctors are refused, never defaulted through', () => {
    expect(isDoctorVerified(undefined)).toBe(false);
    expect(isDoctorVerified(null)).toBe(false);
    expect(isDoctorVerified({})).toBe(false);
    expect(isDoctorVerified({ license_verified: true })).toBe(false);
    expect(isDoctorVerified({ verification_status: 'verified' })).toBe(false);
    // Truthy-but-not-true must not pass: the check is === true on purpose.
    expect(isDoctorVerified({ license_verified: 'yes', verification_status: 'verified' })).toBe(false);
    expect(isDoctorVerified({ license_verified: 1, verification_status: 'verified' })).toBe(false);
  });

  it('a suspended or rejected doctor can never be shown as verified', () => {
    for (const state of ['suspended', 'rejected', 'failed']) {
      expect(isDoctorVerified({ license_verified: true, verification_status: state })).toBe(false);
    }
  });

  it('the terminal set stays small and human-approved', () => {
    expect([...VERIFIED_TERMINAL].sort()).toEqual(['manually_approved', 'verified']);
  });

  it('"auto_verified" is NOT accepted by the directory gate', () => {
    // Pinned deliberately, because the backend disagrees — see the note in the
    // commit and matchDoctorsForProcedure / requestDoctorQuotes / assignDoctorToCase,
    // which all DO accept it. This test does not endorse either side; it makes
    // the disagreement visible so it cannot widen unnoticed while a decision
    // is pending.
    expect(isDoctorVerified({ license_verified: true, verification_status: 'auto_verified' })).toBe(false);
  });
});
