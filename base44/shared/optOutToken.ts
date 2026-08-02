// ── Doctor outreach opt-out tokens ──────────────────────────────────────────
// A bearer link mailed to a real doctor's inbox that must let them opt out
// without logging in — this platform has no account for them yet. Same
// fail-closed HMAC discipline as portalToken.ts, kept as its own small module
// rather than extending that file: different payload shape, and
// portalToken.ts is a hardened, security-critical file eighteen other
// functions already depend on unchanged.
//
// FAILS CLOSED: with no PORTAL_TOKEN_SECRET configured, refuses to sign or
// verify rather than falling back to a guessable default.

export class OptOutTokenNotConfigured extends Error {
  constructor() {
    super(
      'PORTAL_TOKEN_SECRET is not set. Doctor opt-out tokens cannot be signed or ' +
      'verified without it.',
    );
  }
}

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function secret(): string {
  const s = Deno.env.get('PORTAL_TOKEN_SECRET');
  if (!s || s === 'change-me-in-production') throw new OptOutTokenNotConfigured();
  return s;
}

async function hmacHex(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface OptOutTokenPayload {
  doctor_email: string;
  nomination_id: string;
  expires_at: number;
}

/** @throws OptOutTokenNotConfigured when no secret is set. */
export async function signOptOutToken(
  doctor_email: string,
  nomination_id: string,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<string> {
  const payload: OptOutTokenPayload = { doctor_email, nomination_id, expires_at: Date.now() + ttlMs };
  const data = JSON.stringify(payload);
  return `${btoa(data)}.${await hmacHex(data)}`;
}

/** Returns null for every failure mode — bad shape, bad signature, expired, or no secret configured. */
export async function verifyOptOutToken(token: unknown): Promise<OptOutTokenPayload | null> {
  if (typeof token !== 'string' || !token.includes('.')) return null;

  const idx = token.lastIndexOf('.');
  const b64 = token.slice(0, idx);
  const sig = token.slice(idx + 1);

  let data: string;
  try { data = atob(b64); } catch { return null; }

  let expected: string;
  try { expected = await hmacHex(data); } catch { return null; }

  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;

  let payload: OptOutTokenPayload;
  try { payload = JSON.parse(data); } catch { return null; }

  if (!payload?.doctor_email || !payload?.nomination_id) return null;
  if (typeof payload.expires_at !== 'number' || Date.now() > payload.expires_at) return null;

  return payload;
}
