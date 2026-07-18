// ── Partner portal tokens ───────────────────────────────────────────────────
//
// A portal token is a bearer credential. It grants an unauthenticated visitor
// read access to a patient's case in a partner portal — procedures, dates,
// itinerary. It is the only thing standing between a URL and someone's medical
// record.
//
// ── Why this file exists ────────────────────────────────────────────────────
// Eighteen functions each inlined:
//
//     Deno.env.get('PORTAL_TOKEN_SECRET') || 'change-me-in-production'
//
// This repository is the source of that fallback. Anyone who can read it knows
// the signing key, and with the key you can mint a token for any case id and
// walk into any partner portal. The fallback did not weaken the signature —
// it removed it, while leaving code that looks signed.
//
// So: FAIL CLOSED. With no secret configured we refuse to sign and refuse to
// verify. Partner portals stop working, loudly and diagnosably, instead of
// working insecurely and silently. A broken partner link is a support ticket;
// a forgeable one is a breach.
//
// Same discipline as PIN_RESET_SECRET, and for the same reason: a secret with
// a published default is not a secret.

export class PortalTokenNotConfigured extends Error {
  constructor() {
    super(
      'PORTAL_TOKEN_SECRET is not set. Partner portal tokens cannot be signed or ' +
      'verified without it. Set it in the Base44 environment — there is deliberately ' +
      'no default, because a published default is a forgeable key.',
    );
  }
}

const DEFAULT_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

function secret(): string {
  const s = Deno.env.get('PORTAL_TOKEN_SECRET');
  if (!s || s === 'change-me-in-production') throw new PortalTokenNotConfigured();
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

export interface PortalTokenPayload {
  consultation_id: string;
  partner_id: string;
  portal_type: string;
  expires_at: number;
}

/**
 * Mint a signed portal token.
 * @throws PortalTokenNotConfigured when no secret is set — never returns an
 *         unsigned or default-signed token.
 */
export async function signPortalToken(
  consultation_id: string,
  partner_id: string,
  portal_type: string,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<string> {
  const payload: PortalTokenPayload = {
    consultation_id, partner_id, portal_type,
    expires_at: Date.now() + ttlMs,
  };
  const data = JSON.stringify(payload);
  return `${btoa(data)}.${await hmacHex(data)}`;
}

/**
 * Verify a portal token.
 *
 * Returns null for every failure mode — bad shape, bad signature, expired, or
 * no secret configured. Callers must treat null as "no access" and must not
 * distinguish the reasons to the visitor: telling someone whether a signature
 * was wrong or merely expired is an oracle.
 */
export async function verifyPortalToken(token: unknown): Promise<PortalTokenPayload | null> {
  if (typeof token !== 'string' || !token.includes('.')) return null;

  const idx = token.lastIndexOf('.');
  const b64 = token.slice(0, idx);
  const sig = token.slice(idx + 1);

  let data: string;
  try {
    data = atob(b64);
  } catch { return null; }

  let expected: string;
  try {
    expected = await hmacHex(data);
  } catch {
    // No secret configured. Refuse rather than accept — an unverifiable token
    // is not a valid one.
    return null;
  }

  // Constant-time-ish compare: length first, then a full-width accumulation so
  // the loop does not exit early on the first differing character.
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;

  let payload: PortalTokenPayload;
  try {
    payload = JSON.parse(data);
  } catch { return null; }

  if (!payload?.consultation_id || !payload?.portal_type) return null;
  if (typeof payload.expires_at !== 'number' || Date.now() > payload.expires_at) return null;

  return payload;
}
