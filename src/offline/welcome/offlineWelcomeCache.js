/**
 * offlineWelcomeCache.js
 * Offline-first storage for pre-built welcome payloads.
 *
 * Mirrors the SOS queue and handshake queue patterns — localStorage only,
 * persists across page refreshes, works at zero connectivity.
 *
 * The welcome payload is written by:
 *   1. useFlightTracking hook (frontend, when it sees in_progress / landed)
 *   2. cacheWelcomePayload Deno function (server-side, called by poller)
 *
 * WelcomeScreen reads from this cache first; falls back to network only
 * when the cached payload is absent or stale (>6 hours).
 */

const STORAGE_KEY_PREFIX = 'morales_welcome_';
const MAX_AGE_MS         = 6 * 60 * 60 * 1000;  // 6 hours — enough for any flight

/** Persist a welcome payload for a trip */
export function saveWelcomePayload(tripId, payload) {
  if (!tripId) return;
  try {
    const entry = { ...payload, _saved_at: new Date().toISOString() };
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${tripId}`, JSON.stringify(entry));
  } catch (_) {}
}

/**
 * Retrieve a welcome payload — returns null if absent or older than MAX_AGE_MS.
 * @returns {object|null}
 */
export function getWelcomePayload(tripId) {
  if (!tripId) return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${tripId}`);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (payload._saved_at) {
      const ageMs = Date.now() - new Date(payload._saved_at).getTime();
      if (ageMs > MAX_AGE_MS) { clearWelcomePayload(tripId); return null; }
    }
    return payload;
  } catch (_) {
    return null;
  }
}

/** Remove the cached payload for a trip (call after successful display + sync) */
export function clearWelcomePayload(tripId) {
  if (!tripId) return;
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${tripId}`);
  } catch (_) {}
}

/** Check whether a cached (non-stale) payload exists */
export function hasWelcomePayload(tripId) {
  return getWelcomePayload(tripId) !== null;
}
