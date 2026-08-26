/**
 * providerTrustStatus — single source of truth for "who counts as verified."
 *
 * VERIFIED_STATUSES was previously declared inline inside
 * matchDoctorsForProcedure/entry.ts's buildDoctorRoster() — extracted here so
 * there is exactly one definition, not two that can silently drift apart.
 * matchDoctorsForProcedure now imports it from here.
 *
 * mapDoctorTrustStatus() is the new, coarser, PAGE-LEVEL vocabulary for the
 * Provider Trust Profile ("Verified / Pending verification / Not available"),
 * computed fresh server-side from the same real Doctor fields the rest of
 * this app already trusts (license_verified, verification_status, status,
 * booking_suspended, verification_can_be_activated).
 *
 * Relationship to src/components/mcare-agent/ProviderStatusBadge.jsx's
 * separate 3-tier CHAT vocabulary (discovered / verified / approved), which
 * is driven by an M-Care-emitted {{providerstatus:...}} token and is left
 * completely untouched by this feature: same underlying facts, two display
 * granularities.
 *   Trust Profile 'verified'             == chat badge 'approved'
 *     (both require the full activateVerifiedDoctor-gated pipeline to have
 *     actually completed)
 *   Trust Profile 'pending_verification' spans chat badge 'discovered' AND
 *     'verified' (the chat badge's own finer-grained mid-pipeline tier) —
 *     Trust Profile is the coarser, page-level summary a patient reads once,
 *     not the conversational narration vocabulary M-Care uses turn by turn.
 *   Trust Profile 'not_available'        has no chat-badge equivalent — the
 *     chat vocabulary never names a doctor who failed/was rejected/is
 *     suspended, since M-Care should not be recommending one in the first
 *     place; the Trust Profile page can still honestly describe one a
 *     patient navigates to directly.
 * This is documentation of a relationship, not a code dependency —
 * ProviderStatusBadge.jsx imports nothing from this file.
 */

export const VERIFIED_STATUSES = new Set(['verified', 'auto_verified', 'manually_approved']);

export type TrustDisplayStatus = 'verified' | 'pending_verification' | 'not_available';

const NOT_AVAILABLE_VERIFICATION_STATUSES = new Set(['rejected', 'failed', 'suspended']);

export function mapDoctorTrustStatus(doctor: Record<string, any>): TrustDisplayStatus {
  if (!doctor) return 'not_available';

  if (doctor.booking_suspended === true) return 'not_available';
  if (NOT_AVAILABLE_VERIFICATION_STATUSES.has(doctor.verification_status)) return 'not_available';

  const fullyVerified =
    doctor.status === 'active' &&
    doctor.license_verified === true &&
    VERIFIED_STATUSES.has(doctor.verification_status);
  if (fullyVerified) return 'verified';

  return 'pending_verification';
}
