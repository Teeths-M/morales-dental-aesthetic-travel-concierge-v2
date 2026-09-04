/**
 * verifyRetellSignature — Retell AI webhook signature verification, same
 * shape and reason as verifyStripeSignature.ts: the receiver must read the
 * RAW, unparsed request body (the HMAC is computed over the exact bytes
 * sent), so the caller must stay outside createHandler (which parses JSON)
 * and call this before ever touching the body as JSON.
 *
 * Format (from Retell's public docs, not verified against a live webhook —
 * no account exists yet to test with; re-confirm before this is trusted
 * live): the `X-Retell-Signature` header is `v={unix_ms_timestamp},d={hex}`,
 * where the hex digest is an HMAC-SHA256 over the raw body concatenated
 * with the timestamp, keyed with the account's own API key (the same value
 * as RETELL_API_KEY — Retell does not issue a separate webhook secret).
 * Uses Web Crypto (crypto.subtle) directly — Deno-native, no npm import
 * needed, unlike Stripe's SDK-based verify helper.
 */

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000; // Retell's own documented ~5-minute window.

export interface VerifyRetellSignatureResult {
  event: any | null;
  /** Non-null means verification failed — return this Response directly. */
  errorResponse: Response | null;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyRetellSignature(req: Request): Promise<VerifyRetellSignatureResult> {
  const apiKey = Deno.env.get('RETELL_API_KEY');
  if (!apiKey) {
    return { event: null, errorResponse: Response.json({ error: 'RETELL_API_KEY not configured.' }, { status: 503 }) };
  }

  const header = req.headers.get('x-retell-signature');
  if (!header) {
    return { event: null, errorResponse: Response.json({ error: 'Missing x-retell-signature header' }, { status: 400 }) };
  }

  const match = /^v=(\d+),d=([0-9a-f]+)$/.exec(header.trim());
  if (!match) {
    return { event: null, errorResponse: Response.json({ error: 'Malformed x-retell-signature header' }, { status: 400 }) };
  }
  const [, timestampStr, digest] = match;

  const skew = Math.abs(Date.now() - Number(timestampStr));
  if (!Number.isFinite(skew) || skew > MAX_CLOCK_SKEW_MS) {
    return { event: null, errorResponse: Response.json({ error: 'Webhook timestamp outside the allowed window' }, { status: 400 }) };
  }

  const rawBody = await req.text();
  const expectedDigest = await hmacSha256Hex(apiKey, rawBody + timestampStr);
  if (expectedDigest !== digest) {
    console.error('[verifyRetellSignature] Signature mismatch');
    return { event: null, errorResponse: Response.json({ error: 'Invalid webhook signature' }, { status: 400 }) };
  }

  try {
    return { event: JSON.parse(rawBody), errorResponse: null };
  } catch {
    return { event: null, errorResponse: Response.json({ error: 'Malformed webhook body' }, { status: 400 }) };
  }
}
