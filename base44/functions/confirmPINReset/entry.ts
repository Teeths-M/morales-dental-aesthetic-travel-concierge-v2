import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Verifies the HMAC-signed reset token from the email link.
// action=verify  → returns { valid, email } (used by ResetPIN page on load)
// action=confirm → verifies token + sets new PIN server-side

const RESET_SECRET = Deno.env.get('PIN_RESET_SECRET') || 'morales-pin-reset-hmac-v1-2026';

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

async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function pinHashForServer(pin: string, email: string): Promise<string> {
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const saltBuf = await crypto.subtle.digest('SHA-256', enc.encode('morales-pin-salt:' + email.toLowerCase()));
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBuf, iterations: 200000 },
    km, 256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function decodeToken(token: string): { email: string; expiresAt: number } | null {
  try {
    const padded = token.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(padded);
    const [email, expiresAtStr] = decoded.split('|');
    const expiresAt = parseInt(expiresAtStr, 10);
    if (!email || isNaN(expiresAt)) return null;
    return { email, expiresAt };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, sig, action, new_pin } = await req.json().catch(() => ({}));

    if (!token || !sig) {
      return Response.json({ valid: false, reason: 'invalid' });
    }

    const decoded = decodeToken(token);
    if (!decoded) return Response.json({ valid: false, reason: 'invalid' });

    if (Date.now() > decoded.expiresAt) {
      return Response.json({ valid: false, reason: 'expired' });
    }

    const expectedSig = await signToken(`${decoded.email}|${decoded.expiresAt}`);
    if (expectedSig !== sig) {
      return Response.json({ valid: false, reason: 'invalid' });
    }

    // Token is valid
    if (action === 'verify') {
      return Response.json({ valid: true, email: decoded.email });
    }

    if (action === 'confirm') {
      if (!new_pin || String(new_pin).length !== 6 || !/^\d{6}$/.test(String(new_pin))) {
        return Response.json({ error: 'PIN must be exactly 6 digits' }, { status: 400 });
      }

      // One-time-use enforcement: hash the sig and check RateLimitBucket.
      // A used token's sig hash is stored so the same link cannot be replayed.
      const sigHash = await sha256Hex(sig);
      const usedKey = `pin-reset-used:${sigHash}`;
      const alreadyUsed = await base44.asServiceRole.entities.RateLimitBucket.filter({ bucket_key: usedKey });
      if (alreadyUsed.length > 0) {
        return Response.json({ valid: false, reason: 'already_used' });
      }
      await base44.asServiceRole.entities.RateLimitBucket.create({
        bucket_key: usedKey,
        window_start: new Date().toISOString(),
        count: 1,
        updated_at: new Date().toISOString(),
      });

      // Update EmergencyPIN entity directly — avoids the auth guard in verifyEmergencyPIN
      // (reset tokens are their own proof of identity; no login session needed)
      const hash = await pinHashForServer(String(new_pin), decoded.email);
      const now = new Date().toISOString();
      const existing = await base44.asServiceRole.entities.EmergencyPIN.filter({ user_email: decoded.email });
      if (existing.length > 0) {
        await base44.asServiceRole.entities.EmergencyPIN.update(existing[0].id, {
          pin_hash: hash, failed_attempts: 0, locked_until: null, created_at: now, is_active: true,
        });
      } else {
        await base44.asServiceRole.entities.EmergencyPIN.create({
          user_email: decoded.email, pin_hash: hash, is_active: true,
          use_count: 0, failed_attempts: 0, created_at: now,
        });
      }

      return Response.json({ success: true, email: decoded.email });
    }

    return Response.json({ error: 'Invalid action. Use: verify | confirm' }, { status: 400 });
  } catch (err) {
    console.error('[confirmPINReset]', err);
    return Response.json({ error: 'An error occurred. Please try again.' }, { status: 500 });
  }
});
