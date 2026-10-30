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
  // "Hey M-Care" background wake phrase — opt-in only, off by default.
  // Enabled/disabled by voice/typed command (voiceCommands.js's
  // WAKE_PHRASE_ON/OFF_PHRASES), not a settings-page toggle, matching this
  // preference family's own "controlled by speaking, zero menus" design.
  wakePhraseEnabled: false,
  // The one-time "Hey M-Care" offer under the greeting (wakePhraseOffer.js):
  // true once the traveler has answered either way, so it is never asked twice.
  wakePhraseOfferAnswered: false,
  // The dashboard's WhatsApp/Telegram card. Two independent reasons to hide it:
  // closed with the X, or marked as already connected. Both are real answers and
  // both persist, so the card doesn't nag on the next device.
  channelsCardHidden: false,
  channelsConnected: false,
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
    wakePhraseEnabled: !!stored.wakePhraseEnabled,
    wakePhraseOfferAnswered: !!stored.wakePhraseOfferAnswered,
    channelsCardHidden: !!stored.channelsCardHidden,
    channelsConnected: !!stored.channelsConnected,
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
  // Start from the LATEST SAVED copy, not the caller's. Prefs are stored as one
  // bundle and each surface (the orb, the dashboard card) keeps its own local
  // copy, so merging onto a stale one silently undoes whatever another surface
  // saved in between — dismissing the dashboard card could switch the wake
  // phrase back off. A failed read falls back to the caller's copy; the write
  // below would fail too in that case, and the hook keeps local state honest.
  let latest = currentPrefs;
  try {
    const me = await base44.auth.me();
    if (me && typeof me === 'object') latest = me.mcare_prefs || {};
  } catch {
    latest = currentPrefs;
  }
  const merged = { ...normalizePrefs(latest), ...patch };
  await base44.auth.updateMe({ mcare_prefs: merged });
  return merged;
}