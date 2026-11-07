/**
 * appLock — when M-Care's screen locks (Portia's choice: after 5 minutes away). Pure, so tests/appLock.test.js
 * checks every rule directly; useAppLock does the remembering.
 *
 * Locks: when the traveler comes back after 5 minutes or more away, when the app opens fresh more than 5 minutes
 * after it was last on screen, and after any sign-in (signing out forgets when it was last seen). A lock survives a
 * reload until it is unlocked. Never locks the emergency pages, or a traveler who hasn't turned the lock on.
 */
export const LOCK_AFTER_MS = 5 * 60 * 1000;

export const LAST_SEEN_KEY = 'mcare_lock_last_seen';
export const LOCKED_KEY = 'mcare_lock_locked';
export const enrolledKey = (email) => `mcare_lock_enrolled_${String(email || '').toLowerCase()}`;

/** Pages that never lock: emergency help, and links opened by someone other than the account owner. */
export const LOCK_EXEMPT_PATHS = [
  '/emergency', '/emergency-response', '/emergency-manifest', '/emergency-access',
  '/offline', '/offline-guide', '/offline-vault-guide',
  '/respond', '/guardian', '/guardian-access', '/check-in', '/vault/share', '/share-location',
  '/dispatch-offer', '/survey', '/feedback', '/luggage', '/login',
];

export function isLockExemptPath(pathname) {
  const p = String(pathname || '');
  return LOCK_EXEMPT_PATHS.some((x) => p === x || p.startsWith(`${x}/`));
}

/** Should the app open locked? */
export function lockedOnStart({ enrolled, lastSeen, lockedFlag, now }) {
  if (!enrolled) return false;
  if (lockedFlag) return true;
  const seen = Number(lastSeen);
  if (!Number.isFinite(seen) || seen <= 0) return true;
  return now - seen >= LOCK_AFTER_MS || now < seen;
}

/** Should the app lock as the traveler comes back to it? */
export function lockedOnReturn({ enrolled, hiddenAt, now }) {
  if (!enrolled) return false;
  const hidden = Number(hiddenAt);
  if (!Number.isFinite(hidden) || hidden <= 0) return false;
  return now - hidden >= LOCK_AFTER_MS || now < hidden;
}
