/**
 * mcarePreferences — persists the user's M-Care Voice & Privacy preferences
 * (Talk Mode, Private Mode, response language) on the built-in User entity
 * via base44.auth.updateMe, so they survive across sessions and devices.
 *
 * The platform owns the auth backend; we only read/write a single extra
 * field (`mcare_prefs`) on the current user. Nothing here touches the
 * built-in User fields (id, email, full_name, role).
 *
 * Pure helpers + thin async accessors — no React.
 */

import { base44 } from '@/api/base44Client';

export const DEFAULT_MCARE_PREFS = {
  talkMode: false,
  privateMode: false,
  responseLanguage: null,
};

/**
 * Merges whatever is stored on the user (which may be partial or missing)
 * with the defaults so callers always get a complete prefs object.
 */
export function normalizePrefs(stored) {
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_MCARE_PREFS };
  return {
    ...DEFAULT_MCARE_PREFS,
    talkMode: !!stored.talkMode,
    privateMode: !!stored.privateMode,
    responseLanguage: stored.responseLanguage || null,
  };
}

/**
 * Reads the current user's prefs from the auth context's user object
 * (already loaded by AuthProvider) — no extra network call.
 */
export function prefsFromUser(user) {
  return normalizePrefs(user?.mcare_prefs);
}

/**
 * Persists a patch by merging with the existing prefs and writing the whole
 * object back via updateMe. Returns the merged prefs on success.
 * Best-effort: a failure (offline, session expired) rejects so the caller
 * can keep the local UI state in sync honestly.
 */
export async function saveMcarePrefs(currentPrefs, patch) {
  const merged = { ...normalizePrefs(currentPrefs), ...patch };
  await base44.auth.updateMe({ mcare_prefs: merged });
  return merged;
}