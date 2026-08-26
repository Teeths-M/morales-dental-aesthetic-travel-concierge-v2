/**
 * providerBookingEligibility — the deterministic "can this doctor be booked
 * for a virtual consultation right now" gate. No LLM, no external call —
 * every signal is a plain read of a real Doctor field or a real, already-
 * computed concern-report count. Reuses freshness.ts's real TTL mechanism
 * for the license-recheck staleness check rather than inventing a new one.
 *
 * Matches this repo's own standing invariant ("AI/automated code may raise
 * caution, never clear it"): this function can only ever produce a REASON TO
 * BLOCK. Nothing here ever clears Doctor.booking_suspended — only
 * clearProviderBookingSuspension (admin-only, requires override_reason) can
 * do that.
 */

import { isFresh, TTL_MS } from './freshness.ts';

// Named constants, not magic numbers — deliberately conservative (a real
// concern report is rare; these thresholds should almost never fire on a
// genuinely trustworthy doctor).
export const CRITICAL_CONCERN_THRESHOLD = 1;
export const HIGH_CONCERN_THRESHOLD = 3;
export const HIGH_CONCERN_WINDOW_DAYS = 90;

export type EligibilityResult = {
  eligible: boolean;
  reasons: string[];
};

export function checkProviderBookingEligibility(
  doctor: Record<string, any>,
  recentConcernCount: { high: number; critical: number },
): EligibilityResult {
  const reasons: string[] = [];

  if (!doctor) {
    return { eligible: false, reasons: ['Provider record not found.'] };
  }

  if (doctor.booking_suspended === true) {
    reasons.push(doctor.booking_suspended_reason || 'This provider is temporarily unavailable for booking.');
  }

  if (['failed', 'rejected', 'suspended'].includes(doctor.verification_status)) {
    reasons.push('This provider has not completed verification.');
  }

  // Only meaningful once a doctor has actually completed a license check at
  // some point (license_last_checked_at set) — a doctor who never had one
  // yet is a verification-status problem, already caught above, not a
  // staleness problem.
  if (doctor.license_last_checked_at && !isFresh(doctor.license_last_checked_at, TTL_MS.doctor_license)) {
    reasons.push('This provider\'s license verification needs to be re-confirmed.');
  }

  // An identity-change-shaped inconsistency: the doctor is marked active but
  // the platform's own re-activation flag says the checks no longer clear.
  if (doctor.status === 'active' && doctor.verification_can_be_activated === false) {
    reasons.push('This provider\'s verification status needs review before booking.');
  }

  if (recentConcernCount.critical >= CRITICAL_CONCERN_THRESHOLD) {
    reasons.push('A serious concern about this provider is under review.');
  } else if (recentConcernCount.high >= HIGH_CONCERN_THRESHOLD) {
    reasons.push('Multiple concerns about this provider are under review.');
  }

  return { eligible: reasons.length === 0, reasons };
}
