/**
 * phoneLock — the app's side of M-Care's Face ID / fingerprint lock (server: base44/shared/passkeys.ts).
 *
 * Setting the lock up makes a passkey on this phone. Unlocking, and a "confirm with Face ID" before an action that
 * switches help off or shares a private file, ask the phone to sign a one-time challenge from the server; the server
 * checks it. callWithFaceCheck() wraps a protected call: it tries the call, and only if the server answers that a
 * fresh check is needed (the traveler has the lock on) does it ask for Face ID and send the call again.
 *
 * Offline, an unlock can't reach the server, so the phone itself asks for Face ID and the screen opens if the phone
 * confirms the owner. That only opens the screen: every protected action still needs the server's check.
 */
import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import { base44 } from '@/api/base44Client';

export const PHONE_LOCK_CHANGED_EVENT = 'mcare-phone-lock-changed';

const origin = () => window.location.origin;

async function managePasskeys(payload) {
  const res = await base44.functions.invoke('managePasskeys', payload);
  return res?.data;
}

const announce = () => {
  try { window.dispatchEvent(new Event(PHONE_LOCK_CHANGED_EVENT)); } catch { /* not in a browser */ }
};

/** True when this phone and browser can make and use a Face ID / fingerprint passkey. */
export async function phoneLockSupported() {
  try {
    return browserSupportsWebAuthn() && await platformAuthenticatorIsAvailable();
  } catch {
    return false;
  }
}

/** A plain name for this phone, shown in Settings. */
export function thisDeviceLabel(userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '') {
  const ua = String(userAgent);
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) return 'Android phone';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows computer';
  return 'This device';
}

export const getPhoneLockStatus = () => managePasskeys({ action: 'status', origin: origin() });

/** True when the server says this call needs a fresh Face ID / fingerprint check first. */
export function isFaceCheckRequired(error) {
  return error?.response?.status === 428 && error?.response?.data?.code === 'face_check_required';
}

/** A fresh check for one action: { challenge_id, response }, or null when the traveler has no lock. */
export async function faceCheck(action) {
  const begin = await managePasskeys({ action: 'auth_begin', origin: origin(), purpose: 'step_up', step_up_action: action });
  if (!begin?.enrolled) return null;
  const response = await startAuthentication({ optionsJSON: begin.options });
  return { challenge_id: begin.challenge_id, response };
}

/** Runs call(stepUp); asks for Face ID and runs it once more only if the server says a check is needed. */
export async function callWithFaceCheck(action, call) {
  try {
    return await call(undefined);
  } catch (error) {
    if (!isFaceCheckRequired(error)) throw error;
    const stepUp = await faceCheck(action);
    return call(stepUp || undefined);
  }
}

/** Sets the lock up on this phone (or adds this phone when the lock is already on, after a check). */
export async function turnOnPhoneLock() {
  const begin = await callWithFaceCheck('add_device', async (step_up) => managePasskeys({
    action: 'register_begin', origin: origin(), ...(step_up ? { step_up } : {}),
  }));
  const response = await startRegistration({ optionsJSON: begin.options });
  const done = await managePasskeys({
    action: 'register_finish', challenge_id: begin.challenge_id, response, device_label: thisDeviceLabel(),
  });
  announce();
  return done;
}

/** Removes one phone from the lock (needs a check). Removing the last one turns the lock off. */
export async function removePhoneFromLock(passkeyId) {
  const done = await callWithFaceCheck('remove_device', async (step_up) => managePasskeys({
    action: 'remove', passkey_id: passkeyId, ...(step_up ? { step_up } : {}),
  }));
  announce();
  return done;
}

const randomChallenge = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/** Whether the phone confirmed the owner (the "user verified" flag in the signed data). */
export function userVerifiedFlag(authenticatorDataB64Url) {
  try {
    const b64 = String(authenticatorDataB64Url).replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    // Bytes 0-31 are the site's hash, byte 32 the flags; bit 2 (0x04) is "user verified".
    return bin.length > 32 && (bin.charCodeAt(32) & 0x04) === 0x04;
  } catch {
    return false;
  }
}

/** Unlocks the screen. Online the server checks it; offline the phone's own Face ID check opens the screen. */
export async function unlockPhoneLock({ credentialIds = [] } = {}) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const response = await startAuthentication({
      optionsJSON: {
        challenge: randomChallenge(),
        rpId: window.location.hostname,
        allowCredentials: credentialIds.map((id) => ({ id, type: 'public-key' })),
        userVerification: 'required',
        timeout: 60000,
      },
    });
    return { unlocked: userVerifiedFlag(response?.response?.authenticatorData), offline: true };
  }
  const begin = await managePasskeys({ action: 'auth_begin', origin: origin(), purpose: 'unlock' });
  if (!begin?.enrolled) return { unlocked: true, enrolled: false };
  const response = await startAuthentication({ optionsJSON: begin.options });
  const done = await managePasskeys({ action: 'unlock_finish', challenge_id: begin.challenge_id, response });
  return { unlocked: !!done?.unlocked, enrolled: true };
}

/** A sentence for the screen when a check or a protected call didn't go through. */
export function phoneLockErrorMessage(error, fallback = "That didn't go through. Try again.") {
  const name = error?.name || '';
  if (name === 'NotAllowedError' || name === 'AbortError') {
    return 'The Face ID or fingerprint check was cancelled, so nothing was changed.';
  }
  if (name === 'InvalidStateError') return 'This phone is already on your Face ID lock.';
  const serverMessage = error?.response?.data?.error;
  if (typeof serverMessage === 'string' && serverMessage) return serverMessage;
  return fallback;
}
