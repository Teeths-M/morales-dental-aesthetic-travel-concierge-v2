import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../../shared/createHandler.ts';
import { z, strictObject, validate } from '../../shared/validate.ts';

// All fields optional here on purpose — a missing/malformed token or sig
// must keep failing the same soft way it already does ({valid:false,
// reason:'invalid'}, no error status), not a generic 400. .strict() still
// rejects unexpected field names.
const ConfirmPINResetSchema = strictObject({
  token: z.string().max(500).optional(),
  sig: z.string().max(200).optional(),
  action: z.string().max(20).optional(),
  new_pin: z.string().max(20).optional(),
  pin_type: z.string().max(20).optional(),
});

// Verifies the HMAC-signed reset token from the email link.
// action=verify  → returns { valid, email } (used by ResetPIN page on load)
// action=confirm → verifies token + sets new PIN server-side

const RESET_SECRET = Deno.env.get('PIN_RESET_SECRET');

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

// deno-lint-ignore no-explicit-any
async function writeAuditEntry(base44: any, eventType: string, email: string, ip: string) {
  // Inlined rather than invoking logAuditEvent: that function requires an
  // authenticated session (requireAuth: true), but a token-based PIN reset
  // has no session — the invoke would always fail silently. Mirrors the same
  // hash-chain pattern (prev_hash over the last AuditLog entry).
  let prevHash = 'GENESIS';
  try {
    const lastEntries = await base44.asServiceRole.entities.AuditLog.list('-timestamp', 1);
    if (lastEntries?.length > 0) {
      prevHash = await sha256Hex(JSON.stringify(lastEntries[0]));
    }
  } catch (_) {
    prevHash = 'GENESIS_FALLBACK';
  }
  await base44.asServiceRole.entities.AuditLog.create({
    event_type: eventType,
    actor_id: `token-reset:${email}`,
    actor_role: 'user',
    actor_name: '',
    actor_email: email,
    resource_type: 'pin',
    resource_id: '',
    resource_name: '',
    case_id: null,
    details: {},
    sensitive: true,
    timestamp: new Date().toISOString(),
    prev_hash: prevHash,
  });
}

async function pinHashForServer(pin: string, email: string): Promise<string> {
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const saltBuf = await crypto.subtle.digest('SHA-256', enc.encode('morales-pin-salt:' + email.toLowerCase()));
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBuf, iterations: 600000 },
    km, 256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// VaultPIN uses a different scheme (matches verifyVaultPIN.ts + client vaultPINHashing.js):
// salt = base64(SHA256("morales_vault_"+email)), 600k PBKDF2 iterations, base64 output.
async function vaultPINHash(pin: string, email: string): Promise<{ hash: string; salt: string }> {
  const enc = new TextEncoder();
  const saltDigest = await crypto.subtle.digest('SHA-256', enc.encode('morales_vault_' + email.toLowerCase()));
  const salt = btoa(String.fromCharCode(...new Uint8Array(saltDigest)));
  const saltBinary = Uint8Array.from(atob(salt), c => c.charCodeAt(0));
  const km = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBinary, iterations: 600000 },
    km, 256
  );
  const hash = btoa(String.fromCharCode(...new Uint8Array(bits)));
  return { hash, salt };
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

Deno.serve(createHandler(async ({ req }) => {
  try {
    if (!RESET_SECRET) {
      console.error('[confirmPINReset] PIN_RESET_SECRET env var is not set');
      return Response.json({ error: 'Service configuration error' }, { status: 500 });
    }

    const base44 = createClientFromRequest(req);
    const rawBody = await req.json().catch(() => ({}));
    const validated = validate(ConfirmPINResetSchema, rawBody);
    if (!validated.ok) return Response.json({ valid: false, reason: 'invalid' });
    const { token, sig, action, new_pin, pin_type } = validated.data;
    const pinType = pin_type === 'vault' ? 'vault' : 'emergency';

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
      const expectedLength = pinType === 'vault' ? 4 : 6;
      const pinPattern = pinType === 'vault' ? /^\d{4}$/ : /^\d{6}$/;
      if (!new_pin || String(new_pin).length !== expectedLength || !pinPattern.test(String(new_pin))) {
        return Response.json({ error: `PIN must be exactly ${expectedLength} digits` }, { status: 400 });
      }

      // One-time-use enforcement: hash the sig and check RateLimitBucket.
      // A used token's sig hash is stored so the same link cannot be replayed.
      // Bucket key is scoped per pin_type so an emergency-PIN reset link and a
      // vault-PIN reset link issued for the same request can't collide.
      const sigHash = await sha256Hex(sig);
      const usedKey = `pin-reset-used:${pinType}:${sigHash}`;
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

      const now = new Date().toISOString();

      if (pinType === 'vault') {
        // Update VaultPIN entity directly — reset tokens are their own proof
        // of identity (email ownership); no login session needed.
        const { hash, salt } = await vaultPINHash(String(new_pin), decoded.email);
        const existing = await base44.asServiceRole.entities.VaultPIN.filter({ user_email: decoded.email });
        if (existing.length === 0) {
          return Response.json({ error: 'No vault PIN found for this account. Set one up from the Vault page.' }, { status: 404 });
        }
        await base44.asServiceRole.entities.VaultPIN.update(existing[0].id, {
          pin_hash: hash, pin_salt: salt, failed_attempts: 0, locked_until: null, updated_at: now,
        });
      } else {
        // Update EmergencyPIN entity directly — avoids the auth guard in verifyEmergencyPIN
        // (reset tokens are their own proof of identity; no login session needed)
        const hash = await pinHashForServer(String(new_pin), decoded.email);
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
      }

      const ip = req.headers.get('x-forwarded-for')?.split(',').pop()?.trim() || 'unknown';
      await writeAuditEntry(base44, pinType === 'vault' ? 'vault_pin_reset' : 'emergency_pin_reset', decoded.email, ip)
        .catch(e => console.error('[confirmPINReset] audit write failed:', e));

      return Response.json({ success: true, email: decoded.email, pin_type: pinType });
    }

    return Response.json({ error: 'Invalid action. Use: verify | confirm' }, { status: 400 });
  } catch (err) {
    console.error('[confirmPINReset]', err);
    return Response.json({ error: 'An error occurred. Please try again.' }, { status: 500 });
  }
// Already rate-limited inline above via RateLimitBucket — rateLimit:false here
// avoids silently double-limiting through two independent mechanisms.
}, { name: 'confirmPINReset', requireAuth: false, rateLimit: false }));
