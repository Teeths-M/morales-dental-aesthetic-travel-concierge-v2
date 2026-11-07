import { describe, it, expect, vi, beforeEach } from 'vitest';

// phoneLock.js and deviceDataCleanup.js import the app's backend client, which reads window as soon as it loads.
const invoke = vi.fn();
vi.mock('@/api/base44Client', () => ({ base44: { functions: { invoke: (...a) => invoke(...a) }, auth: { logout: vi.fn() } } }));
const startAuthentication = vi.fn();
vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: () => true,
  platformAuthenticatorIsAvailable: async () => true,
  startAuthentication: (...a) => startAuthentication(...a),
  startRegistration: vi.fn(),
}));

import {
  STEP_UP_ACTIONS, allowedOrigins, challengeProblem, cleanDeviceLabel, counterAcceptable, fromBase64Url,
  isStepUpAction, normalizeOrigin, rpFor, toBase64Url, LIVE_ORIGIN,
} from '../base44/shared/passkeyRules.ts';
import { LOCK_AFTER_MS, isLockExemptPath, lockedOnReturn, lockedOnStart } from '@/lib/appLock';
import { callWithFaceCheck, isFaceCheckRequired, phoneLockErrorMessage, thisDeviceLabel, userVerifiedFlag } from '@/lib/phoneLock';
import { privateKeysIn } from '@/lib/deviceDataCleanup';

describe('passkeyRules: where the lock works', () => {
  it('accepts https addresses, and plain http only on this computer', () => {
    expect(normalizeOrigin('https://sentinel-dental-care.base44.app/dashboard?x=1')).toBe('https://sentinel-dental-care.base44.app');
    expect(normalizeOrigin('http://localhost:5173/')).toBe('http://localhost:5173');
    expect(normalizeOrigin('http://evil.example')).toBeNull();
    expect(normalizeOrigin('javascript:alert(1)')).toBeNull();
    expect(normalizeOrigin('')).toBeNull();
  });

  it('uses PASSKEY_ORIGINS when set, otherwise APP_URL plus the live address', () => {
    expect(allowedOrigins({ PASSKEY_ORIGINS: 'https://a.example, https://b.example' })).toEqual(['https://a.example', 'https://b.example']);
    expect(allowedOrigins({ APP_URL: 'https://app.example/' })).toEqual(['https://app.example', LIVE_ORIGIN]);
    // A missing or broken APP_URL can't switch the lock off on the live site.
    expect(allowedOrigins({ APP_URL: 'not a url' })).toEqual([LIVE_ORIGIN]);
  });

  it('only gives a relying party for an allowed address', () => {
    const allowed = [LIVE_ORIGIN];
    expect(rpFor('https://sentinel-dental-care.base44.app', allowed)).toEqual({ origin: LIVE_ORIGIN, rpID: 'sentinel-dental-care.base44.app' });
    expect(rpFor('https://attacker.base44.app', allowed)).toBeNull();
    expect(rpFor(undefined, allowed)).toBeNull();
  });
});

describe('passkeyRules: one challenge, one use, one action', () => {
  const now = new Date('2026-11-07T10:00:00Z');
  const row = { user_email: 'Ana@Example.com', purpose: 'step_up', action: 'share_document', expires_at: '2026-11-07T10:02:00Z' };
  const want = { user_email: 'ana@example.com', purpose: 'step_up', action: 'share_document' };

  it('accepts a fresh, unused challenge for the same traveler and action', () => {
    expect(challengeProblem(row, want, now)).toBeNull();
  });
  it('refuses a missing, used, expired or other traveler\'s challenge', () => {
    expect(challengeProblem(null, want, now)).toBe('not_found');
    expect(challengeProblem({ ...row, used_at: '2026-11-07T09:59:00Z' }, want, now)).toBe('used');
    expect(challengeProblem({ ...row, expires_at: '2026-11-07T09:59:59Z' }, want, now)).toBe('expired');
    expect(challengeProblem({ ...row, user_email: 'thief@example.com' }, want, now)).toBe('wrong_user');
  });
  it('refuses a check made for a different action or purpose', () => {
    expect(challengeProblem(row, { ...want, action: 'pause_safety_checkins' }, now)).toBe('wrong_action');
    expect(challengeProblem(row, { user_email: want.user_email, purpose: 'unlock' }, now)).toBe('wrong_purpose');
  });
  it('refuses a signature counter that went backwards, but allows phones that always report 0', () => {
    expect(counterAcceptable(0, 0)).toBe(true);
    expect(counterAcceptable(5, 6)).toBe(true);
    expect(counterAcceptable(5, 5)).toBe(false);
    expect(counterAcceptable(5, 2)).toBe(false);
  });
});

describe('passkeyRules: the protected actions', () => {
  it('covers switching help off, emergency contacts, sharing and the lock itself', () => {
    for (const a of ['pause_safety_checkins', 'close_emergency_alert', 'change_emergency_contacts', 'share_document',
      'change_phone', 'add_device', 'remove_device']) expect(isStepUpAction(a)).toBe(true);
  });
  it('never asks before withdrawing location-sharing consent, which must stay one tap', () => {
    expect(STEP_UP_ACTIONS.some((a) => a.includes('location'))).toBe(false);
  });
  it('round-trips base64url and keeps device names short and plain', () => {
    const bytes = new Uint8Array([0, 1, 250, 255, 62, 63]);
    expect(Array.from(fromBase64Url(toBase64Url(bytes)))).toEqual(Array.from(bytes));
    expect(toBase64Url(bytes)).not.toMatch(/[+/=]/);
    expect(cleanDeviceLabel('<script>iPhone</script>')).toBe('scriptiPhonescript');
    expect(cleanDeviceLabel('')).toBe('This phone');
    expect(cleanDeviceLabel('x'.repeat(100))).toHaveLength(40);
  });
});

describe('appLock: when the screen locks', () => {
  const now = 1_800_000_000_000;
  it('never locks a traveler without the lock', () => {
    expect(lockedOnStart({ enrolled: false, lastSeen: null, lockedFlag: true, now })).toBe(false);
    expect(lockedOnReturn({ enrolled: false, hiddenAt: now - LOCK_AFTER_MS * 10, now })).toBe(false);
  });
  it('opens unlocked within 5 minutes, locked after, and locked after a sign-in', () => {
    expect(lockedOnStart({ enrolled: true, lastSeen: now - 60_000, lockedFlag: false, now })).toBe(false);
    expect(lockedOnStart({ enrolled: true, lastSeen: now - LOCK_AFTER_MS, lockedFlag: false, now })).toBe(true);
    expect(lockedOnStart({ enrolled: true, lastSeen: null, lockedFlag: false, now })).toBe(true);
  });
  it('stays locked through a reload, and locks if the clock was turned back', () => {
    expect(lockedOnStart({ enrolled: true, lastSeen: now - 1000, lockedFlag: true, now })).toBe(true);
    expect(lockedOnStart({ enrolled: true, lastSeen: now + 60_000, lockedFlag: false, now })).toBe(true);
  });
  it('locks on return after 5 minutes away, not before', () => {
    expect(lockedOnReturn({ enrolled: true, hiddenAt: now - 4 * 60_000, now })).toBe(false);
    expect(lockedOnReturn({ enrolled: true, hiddenAt: now - 5 * 60_000, now })).toBe(true);
    expect(lockedOnReturn({ enrolled: true, hiddenAt: null, now })).toBe(false);
  });
  it('never covers the emergency pages or links opened by someone else', () => {
    for (const p of ['/emergency', '/emergency-response/abc', '/emergency-manifest', '/emergency-access', '/offline',
      '/check-in/123', '/respond/tok', '/guardian/tok', '/vault/share/tok', '/share-location/tok']) {
      expect(isLockExemptPath(p)).toBe(true);
    }
    for (const p of ['/dashboard', '/dashboard/settings', '/m-care/live', '/passport-vault', '/']) {
      expect(isLockExemptPath(p)).toBe(false);
    }
  });
});

describe('phoneLock: the Face ID step before a protected call', () => {
  beforeEach(() => { invoke.mockReset(); startAuthentication.mockReset(); });
  const needsCheck = Object.assign(new Error('428'), { response: { status: 428, data: { code: 'face_check_required' } } });

  it('runs the call once, with no check, for a traveler without the lock', async () => {
    const call = vi.fn().mockResolvedValue({ data: { ok: true } });
    await expect(callWithFaceCheck('share_document', call)).resolves.toEqual({ data: { ok: true } });
    expect(call).toHaveBeenCalledTimes(1);
    expect(call).toHaveBeenCalledWith(undefined);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('asks for Face ID for that action and sends the call again when the server needs it', async () => {
    globalThis.window = { location: { origin: 'https://sentinel-dental-care.base44.app' } };
    invoke.mockResolvedValueOnce({ data: { enrolled: true, challenge_id: 'c1', options: { challenge: 'x' } } });
    startAuthentication.mockResolvedValueOnce({ id: 'cred', response: {} });
    const call = vi.fn().mockRejectedValueOnce(needsCheck).mockResolvedValueOnce({ data: { ok: true } });
    await callWithFaceCheck('share_document', call);
    expect(invoke).toHaveBeenCalledWith('managePasskeys', expect.objectContaining({
      action: 'auth_begin', purpose: 'step_up', step_up_action: 'share_document',
    }));
    expect(call).toHaveBeenLastCalledWith({ challenge_id: 'c1', response: { id: 'cred', response: {} } });
  });

  it('passes any other error straight through', async () => {
    const boom = Object.assign(new Error('500'), { response: { status: 500, data: {} } });
    await expect(callWithFaceCheck('change_phone', vi.fn().mockRejectedValue(boom))).rejects.toBe(boom);
    expect(isFaceCheckRequired(boom)).toBe(false);
    expect(isFaceCheckRequired(needsCheck)).toBe(true);
  });

  it('says plainly when the check was cancelled', () => {
    expect(phoneLockErrorMessage(Object.assign(new Error('x'), { name: 'NotAllowedError' })))
      .toBe('The Face ID or fingerprint check was cancelled, so nothing was changed.');
    expect(phoneLockErrorMessage({ response: { data: { error: 'Server says no.' } } })).toBe('Server says no.');
    expect(phoneLockErrorMessage(new Error('x'), 'Fallback.')).toBe('Fallback.');
  });

  it('reads the "owner confirmed" flag from the signed data', () => {
    const data = (flags) => {
      const bytes = new Uint8Array(37); bytes[32] = flags;
      return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };
    expect(userVerifiedFlag(data(0x05))).toBe(true);
    expect(userVerifiedFlag(data(0x01))).toBe(false);
    expect(userVerifiedFlag('not base64!!')).toBe(false);
  });

  it('names the phone plainly', () => {
    expect(thisDeviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe('iPhone');
    expect(thisDeviceLabel('Mozilla/5.0 (Linux; Android 15; Pixel 9)')).toBe('Android phone');
  });
});

describe('deviceDataCleanup: what signing out removes', () => {
  it('removes private data and keeps anything still waiting to send', () => {
    const keys = [
      'morales_last_known_user', 'vault_encrypted_PT1', 'vault_pin_hash_ana@example.com', 'morales_vault_meta_ana@example.com',
      'morales_emergency_pin_hash', 'morales_emergency_contacts_ana@example.com', 'checklist_case1', 'mcare_lock_last_seen',
      'morales_sos_offline_queue', 'morales_offline_handshake_queue', 'morales_incident_queue_v1', 'morales_safety_sms_number',
      'morales_pending_safe_checkins', 'appLanguage', 'morales_age_gate', 'mcare_lock_enrolled_ana@example.com',
    ];
    const removed = privateKeysIn(keys);
    expect(removed).toEqual([
      'morales_last_known_user', 'vault_encrypted_PT1', 'vault_pin_hash_ana@example.com', 'morales_vault_meta_ana@example.com',
      'morales_emergency_pin_hash', 'morales_emergency_contacts_ana@example.com', 'checklist_case1', 'mcare_lock_last_seen',
    ]);
  });
});
