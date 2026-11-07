/**
 * deviceDataCleanup — what signing out removes from this phone, so a phone that is signed out holds nothing private.
 *
 * Removed: the cached account details, offline passport copies and the vault's document list, the offline vault PIN
 * and Emergency PIN checks (each can be guessed at without a limit once copied off a phone), the emergency
 * contacts list, checklists, trip and procedure details, intake drafts, and when the app was last on screen (so the
 * next sign-in starts locked if the account has the Face ID lock).
 *
 * Kept on purpose: anything queued to send (an SOS, a handshake or check-in waiting for a signal must still go out),
 * the safety text number, language and consent choices, and the age check. Matched by prefix, so per-account keys
 * (".._<email>") are covered.
 *
 * Only a sign-out the person chose calls this. The automatic sign-outs (2 hours idle, a deleted account) keep the
 * existing behaviour, so a traveler who comes back online after a long flight still has their offline copies.
 */
import { base44 } from '@/api/base44Client';
import { LAST_SEEN_KEY, LOCKED_KEY } from '@/lib/appLock';

export const PRIVATE_KEY_PREFIXES = [
  'morales_last_known_user', 'morales_user_email', 'morales_emergency_user', 'morales_emergency_active_case',
  'morales_vault_', 'vault_encrypted_', 'vault_pin_hash_', 'vault_pin_salt_', 'vault_salt_', 'vault_key_',
  'morales_emergency_pin_hash', 'morales_emergency_manifest', 'morales_pin_attempts_',
  'morales_emergency_contacts_', 'checklist_', 'milestones_',
  'morales_trips_', 'morales_briefing_', 'morales_prepcoach_', 'morales_profile_photo', 'morales_protection_type',
  'morales_procedure_', 'morales_loc_cache_', 'morales_trail_', 'morales_loc_consent_',
  'morales_admin_cases_cache_', 'morales_draft_', 'morales_intake_', 'morales_travel_intake_guest_draft',
  'morales_guest_booking_draft', 'morales_consultation_cart', 'morales_journey_events_seen_',
  LAST_SEEN_KEY, LOCKED_KEY,
];

/** The keys in `keys` that signing out removes. Pure, so the tests can check it. */
export function privateKeysIn(keys) {
  return (keys || []).filter((k) => typeof k === 'string' && PRIVATE_KEY_PREFIXES.some((p) => k.startsWith(p)));
}

/** Removes the private keys from localStorage and sessionStorage. Never throws. */
export function clearPrivateDeviceData() {
  for (const store of [globalThis.localStorage, globalThis.sessionStorage]) {
    if (!store) continue;
    try {
      const keys = [];
      for (let i = 0; i < store.length; i++) keys.push(store.key(i));
      for (const k of privateKeysIn(keys)) store.removeItem(k);
    } catch { /* storage unavailable */ }
  }
}

/** The sign-out button: clears this phone's private data, then signs out. */
export function signOutAndClear(redirectUrl) {
  clearPrivateDeviceData();
  return redirectUrl === undefined ? base44.auth.logout() : base44.auth.logout(redirectUrl);
}
