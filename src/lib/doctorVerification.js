/**
 * doctorVerification — the single answer to "may a patient see this doctor?"
 *
 * Lives in lib/, not in the badge component, for one reason: this is a safety
 * gate, and a safety gate must be testable and importable without dragging in
 * React. It previously sat inside DoctorVerifiedBadge.jsx, which meant the
 * only way to assert its behaviour was to import a component — impossible in
 * this repo's `node` test environment, so the platform's central trust claim
 * had no direct test at all.
 *
 * The badge re-exports these, so every existing import keeps working and the
 * directory listing and the badge still cannot disagree with each other.
 */

/**
 * Terminal states that indicate a completed, human-approved verification.
 *
 * 'auto_verified' is excluded. NOTE: the backend disagrees —
 * matchDoctorsForProcedure, requestDoctorQuotes and assignDoctorToCase all
 * accept it, so an auto-activated doctor can be matched to a patient in the
 * intake flow while remaining invisible in the public directory. That split is
 * pinned by tests/doctorVerification.test.js and is a policy decision pending,
 * not something to "fix" by quietly widening this Set.
 */
export const VERIFIED_TERMINAL = new Set(['verified', 'manually_approved']);

/**
 * True only for a doctor M can honestly present as verified.
 *
 * Both conditions are required, and `license_verified` is compared with ===
 * true on purpose: a truthy-but-not-true value (a string 'yes', a 1 from some
 * import path) must not be enough to tell a patient their surgeon's licence
 * was checked against the issuing medical board.
 */
export function isDoctorVerified(doctor) {
  return doctor?.license_verified === true && VERIFIED_TERMINAL.has(doctor?.verification_status);
}
