/**
 * themePreference — where the Auto / Light / Dark choice is remembered.
 *
 * The authenticated profile is the source of truth: the choice rides in the
 * existing `mcare_prefs` bundle on the User record (mcarePreferences.js), so it
 * follows the traveller to another device through an API the app already owns —
 * no new entity, no new endpoint.
 *
 * Local storage exists only so the very first paint on a cold start already has
 * the right answer instead of flashing the wrong one, and so an offline launch
 * still honours the choice. It is scoped per account id: a shared phone handed
 * to a different traveller must not inherit the previous person's preference.
 *
 * Both reads are defensive — private-mode storage can throw, and a corrupt
 * value must never take the app down over a colour scheme.
 */
import { isValidTimeZone, normalizeThemeMode } from '@/lib/mobileTheme';

const modeKey = (accountId) => `msafe_theme_mode::${accountId || 'guest'}`;

export function readStoredThemeMode(accountId) {
  try {
    return normalizeThemeMode(localStorage.getItem(modeKey(accountId)));
  } catch (_) {
    return null;
  }
}

export function writeStoredThemeMode(accountId, mode) {
  try {
    localStorage.setItem(modeKey(accountId), mode);
  } catch (_) {
    /* storage unavailable — the profile write still carries the choice */
  }
}

/**
 * A traveller's explicitly chosen zone, if one was ever set. Returns null for
 * anything invalid so the caller falls through to the device zone rather than
 * trusting a malformed string.
 */
export function readTravelerTimeZone(user) {
  const zone = user?.mcare_prefs?.themeTimezone;
  return isValidTimeZone(zone) ? zone : null;
}