/**
 * passkeyRules — the plain rules behind M-Care's Face ID / fingerprint lock (passkeys.ts does the work).
 *
 * Nothing here touches the network, the database or Deno, so the tests can check every rule directly.
 */

/** The actions the server asks for a fresh Face ID / fingerprint check before, once a traveler has a lock.
 *  Each one switches help off, changes who is told in an emergency, or lets a file leave the account.
 *  Withdrawing location-sharing consent is deliberately not here: it must stay as easy as giving it. */
export const STEP_UP_ACTIONS = [
  'add_device',                  // another phone or a new passkey
  'remove_device',               // removing a passkey, and with the last one, the lock
  'share_document',              // a share link to a passport or other vault file
  'change_emergency_contacts',   // who M-Care tells in an emergency
  'pause_safety_checkins',       // Private Mode
  'close_emergency_alert',       // standing an emergency alert down
  'change_phone',                // the account's contact phone number
] as const;
export type StepUpAction = typeof STEP_UP_ACTIONS[number];

export const isStepUpAction = (v: unknown): v is StepUpAction =>
  typeof v === 'string' && (STEP_UP_ACTIONS as readonly string[]).includes(v);

export const CHALLENGE_TTL_MS = 3 * 60 * 1000;

/** Where M-Care runs today. Used when neither PASSKEY_ORIGINS nor APP_URL says otherwise. */
export const LIVE_ORIGIN = 'https://sentinel-dental-care.base44.app';

/** "https://host[:port]" for an https address (or http on this computer, for local testing); null otherwise. */
export function normalizeOrigin(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  let url: URL;
  try { url = new URL(value.trim()); } catch { return null; }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return null;
  return `${url.protocol}//${url.host}`;
}

/** The web addresses a passkey may be made or used on. PASSKEY_ORIGINS (comma-separated) wins when set;
 *  otherwise APP_URL plus the live address, so a wrong or missing APP_URL can't switch the lock off. */
export function allowedOrigins(env: { PASSKEY_ORIGINS?: string | null; APP_URL?: string | null }): string[] {
  const configured = String(env.PASSKEY_ORIGINS || '').split(',').map(normalizeOrigin).filter(Boolean) as string[];
  const list = configured.length ? configured : [normalizeOrigin(env.APP_URL), LIVE_ORIGIN];
  return [...new Set(list.filter(Boolean) as string[])];
}

/** The origin and relying-party id for a request from `origin`, or null when the lock doesn't work there. */
export function rpFor(origin: unknown, allowed: string[]): { origin: string; rpID: string } | null {
  const o = normalizeOrigin(origin);
  if (!o || !allowed.includes(o)) return null;
  return { origin: o, rpID: new URL(o).hostname };
}

export type ChallengeProblem = 'not_found' | 'wrong_user' | 'wrong_purpose' | 'wrong_action' | 'used' | 'expired';

/** Why a stored challenge can't be used for this check, or null when it can. */
export function challengeProblem(
  row: any,
  want: { user_email: string; purpose: 'register' | 'unlock' | 'step_up'; action?: string | null },
  now: Date = new Date(),
): ChallengeProblem | null {
  if (!row) return 'not_found';
  if (String(row.user_email || '').toLowerCase() !== String(want.user_email || '').toLowerCase()) return 'wrong_user';
  if (row.purpose !== want.purpose) return 'wrong_purpose';
  if (want.purpose === 'step_up' && row.action !== want.action) return 'wrong_action';
  if (row.used_at) return 'used';
  const expires = Date.parse(row.expires_at || '');
  if (!Number.isFinite(expires) || expires <= now.getTime()) return 'expired';
  return null;
}

/** A counter that went backwards means the passkey was copied: refuse. Phones that always report 0 are fine. */
export function counterAcceptable(stored: unknown, next: unknown): boolean {
  const s = Number(stored) || 0;
  const n = Number(next) || 0;
  if (s === 0 && n === 0) return true;
  return n > s;
}

export function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(value: string): Uint8Array {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** A short, safe device name for Settings. */
export function cleanDeviceLabel(value: unknown): string {
  const s = String(value ?? '').replace(/[^\p{L}\p{N} '’()._-]/gu, '').trim().slice(0, 40);
  return s || 'This phone';
}
