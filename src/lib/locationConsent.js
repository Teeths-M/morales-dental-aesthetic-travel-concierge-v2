/**
 * locationConsent — the gate on continuous location sharing.
 *
 * Why this exists: the live beacon used to run for anyone whose journey looked
 * "solo" (Dashboard derived `isSolo` from requires_companion). Trip shape is
 * not consent. Continuous GPS on a medical patient is the most sensitive data
 * on the platform, so it now requires an explicit, affirmative, revocable
 * opt-in — the same discipline as DataProcessingConsent, and recorded the same
 * auditable way (flag + timestamp + version on the CaseRecord).
 *
 * Local mirror: consent is also cached in localStorage so the beacon can gate
 * itself instantly on mount and while offline, without waiting on a round trip.
 * The server record is the source of truth; the mirror is a fast path.
 *
 * Revocation is immediate and local-first for the same reason — a patient
 * turning tracking off must not depend on connectivity to be obeyed.
 */

/** Bump when the wording or scope of what we collect materially changes. */
export const LOCATION_CONSENT_VERSION = '1.0';

const key = (caseId) => `morales_loc_consent_${caseId}`;

/**
 * Has this journey been granted location sharing?
 * @param {string} caseId
 * @param {object} [caseRecord] server record, when already loaded
 * @returns {boolean}
 */
export function hasLocationConsent(caseId, caseRecord = null) {
  if (!caseId) return false;
  // An explicit server-side revocation always wins, even over a stale local yes.
  if (caseRecord?.location_tracking_revoked_at) return false;
  if (caseRecord?.location_tracking_consent === true) return true;
  try {
    const raw = localStorage.getItem(key(caseId));
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.granted === true && !parsed?.revokedAt;
  } catch {
    return false;
  }
}

/** Record consent locally (instant) — caller persists to the CaseRecord too. */
export function grantLocationConsentLocally(caseId) {
  if (!caseId) return;
  try {
    localStorage.setItem(key(caseId), JSON.stringify({
      granted: true,
      version: LOCATION_CONSENT_VERSION,
      grantedAt: new Date().toISOString(),
      revokedAt: null,
    }));
  } catch { /* private mode — server record still governs */ }
}

/** Revoke locally (instant, works offline) — caller persists to the CaseRecord too. */
export function revokeLocationConsentLocally(caseId) {
  if (!caseId) return;
  try {
    localStorage.setItem(key(caseId), JSON.stringify({
      granted: false,
      version: LOCATION_CONSENT_VERSION,
      revokedAt: new Date().toISOString(),
    }));
  } catch { /* nothing to do */ }
}

/**
 * Plain-language summary of exactly what sharing means, for the consent screen.
 * Grandmother Test: no jargon, no hedging, and it names who can see it.
 */
export const LOCATION_CONSENT_POINTS = [
  'Your coordinator and your emergency contact can see where you are while your journey is active.',
  'It updates as you move, and only while the Morales app is open on your phone.',
  'It switches itself off when your journey is complete.',
  'You can turn it off yourself at any time, and it stops immediately.',
];
