import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../_shared/createHandler.ts';

// Generates a stateless HMAC-SHA256 reset token and emails it to the user.
// No new entity needed — token is self-contained with email + expiry.
// Token expires in 15 minutes.

// No fallback. This previously read
//   Deno.env.get('PIN_RESET_SECRET') || 'morales-pin-reset-hmac-v1-2026'
// which is an HMAC key committed to a public repo: anyone could forge a valid
// reset token for ANY email and take over that account's Emergency PIN, and
// with it the emergency vault and SOS console. The literal is now burned —
// never reuse it. If the env var is unset we refuse to mint tokens rather than
// sign with a known key. (confirmPINReset already fails closed the same way,
// which also meant that with the var unset, every emailed link 500'd and the
// user was told their valid link was invalid.)
const RESET_SECRET = Deno.env.get('PIN_RESET_SECRET');
const RESET_WINDOW_MS = 15 * 60 * 1000;
// Reset requests are unauthenticated by design (you ask precisely because you
// are locked out), so they need their own limiter: without one this is an
// email bomb and an account-existence oracle.
const RESET_MAX_PER_WINDOW = 3;
const RESET_LIMIT_WINDOW_S = 3600;

async function signToken(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(RESET_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_email, pin_type } = await req.json().catch(() => ({}));
    const pinType = pin_type === 'vault' ? 'vault' : 'emergency';

    if (!user_email || !String(user_email).includes('@')) {
      return Response.json({ error: 'Valid email required' }, { status: 400 });
    }

    // Fail closed rather than sign with a guessable key.
    if (!RESET_SECRET) {
      console.error('[requestPINReset] PIN_RESET_SECRET is not configured — refusing to mint a reset token.');
      return Response.json({ error: 'Password reset is temporarily unavailable. Please contact support.' }, { status: 503 });
    }

    const email = String(user_email).toLowerCase().trim();

    // Rate limit per email, then per IP — 3/hour each.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    for (const key of [`pin-reset-req:email:${email}`, `pin-reset-req:ip:${ip}`]) {
      const now = new Date();
      const windowStart = new Date(now.getTime() - RESET_LIMIT_WINDOW_S * 1000);
      const buckets = await base44.asServiceRole.entities.RateLimitBucket
        .filter({ bucket_key: key }).catch(() => []);
      const bucket = buckets[0];
      if (!bucket) {
        await base44.asServiceRole.entities.RateLimitBucket.create({
          bucket_key: key, window_start: now.toISOString(), count: 1, updated_at: now.toISOString(),
        }).catch(() => {});
      } else if (new Date(bucket.window_start) < windowStart) {
        await base44.asServiceRole.entities.RateLimitBucket.update(bucket.id, {
          window_start: now.toISOString(), count: 1, updated_at: now.toISOString(),
        }).catch(() => {});
      } else if (bucket.count >= RESET_MAX_PER_WINDOW) {
        // Same generic reply as the success path — never reveal whether the
        // address exists or has been rate-limited.
        return Response.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
      } else {
        await base44.asServiceRole.entities.RateLimitBucket.update(bucket.id, {
          count: bucket.count + 1, updated_at: now.toISOString(),
        }).catch(() => {});
      }
    }
    const expiresAt = Date.now() + RESET_WINDOW_MS;
    const payload = `${email}|${expiresAt}`;
    const sig = await signToken(payload);
    const token = btoa(payload).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || 'https://app.morales.health';
    const resetUrl = `${origin}/reset-pin?t=${token}&s=${sig}${pinType === 'vault' ? '&type=vault' : ''}`;
    const label = pinType === 'vault' ? 'Vault PIN' : 'Emergency PIN';

    await base44.integrations.Core.SendEmail({
      to: email,
      subject: `Reset your Morales ${label}`,
      body: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#0C1A1D">Reset your ${label}</h2>
          <p>We received a request to reset your ${label} for Morales Medical Travel Concierge.</p>
          <p>
            <a href="${resetUrl}"
               style="display:inline-block;background:#1d4ed8;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:bold;margin:16px 0">
              Reset My PIN
            </a>
          </p>
          <p>This link expires in <strong>15 minutes</strong> and can only be used once.</p>
          <p>If you didn't request this, ignore this email — your PIN remains safe.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
          <p style="font-size:12px;color:#666">If the button doesn't work, paste this link into your browser:<br/>${resetUrl}</p>
          <p style="font-size:12px;color:#999">— The Morales Safe-T Team</p>
        </div>
      `,
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error('[requestPINReset]', err);
    return Response.json({ error: 'Failed to send reset email. Please try again.' }, { status: 500 });
  }
}, { name: 'requestPINReset', requireAuth: false }));
