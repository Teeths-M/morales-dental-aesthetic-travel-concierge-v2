import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../_shared/createHandler.ts';
import { z, strictObject, Fields, validate } from '../_shared/validate.ts';

// Single flexible schema rather than a per-action discriminated union — the
// existing top-level check requires action+user_email for EVERY action
// (including validate_session/revoke_session, which don't actually use
// user_email — a pre-existing quirk, preserved as-is here), and every other
// field is already validated ad-hoc per action branch further down.
const VerifyEmergencyPINSchema = strictObject({
  action: z.enum(['setup', 'verify', 'validate_session', 'revoke_session', 'get_hint', 'get_manifest']),
  user_email: Fields.shortText(254),
  pin: z.string().max(20).optional(),
  new_pin: z.string().max(20).optional(),
  hint: z.string().max(200).optional(),
  pin_session_token: z.string().max(200).optional(),
});

// Sliding-window rate limiter using RateLimitBucket entity
async function checkRateLimit(base44, key, windowSeconds, maxRequests) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);
  const buckets = await base44.asServiceRole.entities.RateLimitBucket.filter({ bucket_key: key });
  const bucket = buckets[0];
  if (!bucket) {
    await base44.asServiceRole.entities.RateLimitBucket.create({ bucket_key: key, window_start: now.toISOString(), count: 1, updated_at: now.toISOString() });
    return true;
  }
  if (new Date(bucket.window_start) < windowStart) {
    await base44.asServiceRole.entities.RateLimitBucket.update(bucket.id, { window_start: now.toISOString(), count: 1, updated_at: now.toISOString() });
    return true;
  }
  if (bucket.count >= maxRequests) return false;
  await base44.asServiceRole.entities.RateLimitBucket.update(bucket.id, { count: bucket.count + 1, updated_at: now.toISOString() });
  return true;
}

async function sha256(text) {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// SEC-04: PBKDF2 PIN hashing — 600k iterations (OWASP 2023), matching
// verifyVaultPIN and the client. This was 200k while the client, the docs and
// the security copy all stated 600k; the Emergency PIN is the credential
// guarding the emergency vault, so it gets the documented strength.
// Salt is derived from email so it's consistent per-user without storing it separately.
// NOTE: must stay identical to confirmPINReset's emergency-PIN hash.
async function pbkdf2Hash(pin, email) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  // Use SHA-256 of email as salt — deterministic, non-secret, avoids extra DB field
  const saltBuf = await crypto.subtle.digest('SHA-256', enc.encode('morales-pin-salt:' + email.toLowerCase()));
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBuf, iterations: 600000 },
    keyMaterial, 256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generates a cryptographically random hex token
function generateRawToken() {
  const rawBytes = new Uint8Array(32);
  crypto.getRandomValues(rawBytes);
  return Array.from(rawBytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Validates a pin_session_token sent by the client. Returns { valid, session } or { valid: false, error }.
async function validatePinSession(base44, token) {
  if (!token) return { valid: false, error: 'pin_session_token required' };
  const tokenHash = await sha256(token);
  const sessions = await base44.asServiceRole.entities.PinSession.filter({ token_hash: tokenHash, is_revoked: false });
  if (!sessions.length) return { valid: false, error: 'Invalid or expired session token' };
  const session = sessions[0];
  if (new Date(session.expires_at) < new Date()) {
    return { valid: false, error: 'Session token has expired' };
  }
  // Update last_used_at + use_count
  await base44.asServiceRole.entities.PinSession.update(session.id, {
    last_used_at: new Date().toISOString(),
    use_count: (session.use_count || 0) + 1,
  });
  return { valid: true, session };
}

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const rawBody = await req.json().catch(() => ({}));
    const validated = validate(VerifyEmergencyPINSchema, rawBody);
    if (!validated.ok) return Response.json({ error: validated.message }, { status: 400 });
    const { action, user_email, pin, new_pin, hint, pin_session_token } = validated.data;

    // RATE LIMIT: 10 requests per 15 minutes per email (covers setup, verify, validate_session)
    // verify action has its own 5-attempt DB lockout; this is a coarser outer guard
    const rateLimitKey = `${user_email}:verifyEmergencyPIN`;
    const allowed = await checkRateLimit(base44, rateLimitKey, 900, 10);
    if (!allowed) {
      return Response.json({ error: 'Too many attempts. Please wait 15 minutes before trying again.' }, { status: 429 });
    }

    // ── SETUP: Register or update a PIN ──
    // Both first-time setup AND overwrite require authentication. The
    // emergency (unauthenticated) flow is only for VERIFYING an existing PIN
    // from a public terminal — not for creating one. Allowing unauthenticated
    // first-time setup let an attacker pre-create a PIN for a victim who
    // hadn't configured one, then use 'verify' to obtain a session token and
    // drain their emergency vault documents.
    if (action === 'setup') {
      if (!new_pin || new_pin.length !== 6 || !/^\d{6}$/.test(new_pin)) {
        return Response.json({ error: 'PIN must be exactly 6 digits' }, { status: 400 });
      }
      const hash = await pbkdf2Hash(new_pin, user_email);
      const existing = await base44.asServiceRole.entities.EmergencyPIN.filter({ user_email });
      const now = new Date().toISOString();

      if (existing.length > 0) {
        // Existing PIN: require auth session OR current PIN to overwrite.
        const authedUser = await base44.auth.me().catch(() => null);
        const hasAuth = authedUser && authedUser.email.toLowerCase() === String(user_email).toLowerCase();
        if (!hasAuth) {
          if (!pin) {
            return Response.json({ error: 'current_pin_required', message: 'Enter your current PIN to set a new one.' }, { status: 400 });
          }
          if (existing[0].locked_until && new Date(existing[0].locked_until) > new Date()) {
            return Response.json({ error: 'Too many failed attempts. Try again later.', locked_until: existing[0].locked_until }, { status: 429 });
          }
          const currentHash = await pbkdf2Hash(pin, user_email);
          if (currentHash !== existing[0].pin_hash) {
            const newFailCount = (existing[0].failed_attempts || 0) + 1;
            const lockedUntil = newFailCount >= 5 ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null;
            await base44.asServiceRole.entities.EmergencyPIN.update(existing[0].id, { failed_attempts: newFailCount, locked_until: lockedUntil });
            return Response.json({ error: 'Incorrect current PIN', attempts_remaining: Math.max(0, 5 - newFailCount) }, { status: 403 });
          }
        }
        await base44.asServiceRole.entities.EmergencyPIN.update(existing[0].id, {
          pin_hash: hash, pin_hint: hint || '', is_active: true,
          failed_attempts: 0, locked_until: null, created_at: now
        });
      } else {
        // No existing PIN — first-time setup requires an authenticated
        // session for the target email. See the SETUP comment above for the
        // takeover scenario this prevents.
        const authedUser = await base44.auth.me().catch(() => null);
        if (!authedUser || authedUser.email.toLowerCase() !== String(user_email).toLowerCase()) {
          return Response.json({
            error: 'Authentication required to set up an Emergency PIN for the first time. Please log in and try again.'
          }, { status: 401 });
        }
        await base44.asServiceRole.entities.EmergencyPIN.create({
          user_id: authedUser.id, user_email, pin_hash: hash, pin_hint: hint || '',
          is_active: true, use_count: 0, failed_attempts: 0, created_at: now
        });
      }
      return Response.json({ success: true, message: 'Emergency PIN set successfully' });
    }

    // ── VERIFY: Authenticate with PIN → issue a server-side PinSession ──
    if (action === 'verify') {
      if (!pin) return Response.json({ error: 'pin required' }, { status: 400 });

      // Rate limit: max 5 attempts per user per 30 minutes
      const normalizedEmail = String(user_email).toLowerCase();
      const rateLimitKey = `pin_verify_${normalizedEmail}_${Math.floor(Date.now() / (30 * 60 * 1000))}`;
      const buckets = await base44.asServiceRole.entities.RateLimitBucket.filter(
        { bucket_key: rateLimitKey }, '-created_date', 1
      ).catch(() => []);

      const bucket = buckets?.[0];
      if (bucket && bucket.count >= 5) {
        return Response.json({
          error: 'Too many PIN attempts. Please wait 30 minutes before trying again.',
          locked: true
        }, { status: 429 });
      }

      // Increment counter
      await base44.asServiceRole.entities.RateLimitBucket.create({
        bucket_key: rateLimitKey,
        count: (bucket?.count || 0) + 1,
        window_start: new Date().toISOString(),
      }).catch(() => {});

      const records = await base44.asServiceRole.entities.EmergencyPIN.filter({ user_email, is_active: true });
      if (records.length === 0) return Response.json({ verified: false, error: 'No PIN registered for this account' }, { status: 404 });

      const record = records[0];

      // Lockout check
      if (record.locked_until && new Date(record.locked_until) > new Date()) {
        return Response.json({ verified: false, error: 'Too many failed attempts. Try again later.', locked_until: record.locked_until }, { status: 429 });
      }

      const hash = await pbkdf2Hash(pin, user_email);
      const isMatch = hash === record.pin_hash;

      if (isMatch) {
        await base44.asServiceRole.entities.EmergencyPIN.update(record.id, {
          last_used_at: new Date().toISOString(),
          use_count: (record.use_count || 0) + 1,
          failed_attempts: 0,
          locked_until: null
        });

        // Issue a server-side PinSession (30 min expiry)
        const rawToken = generateRawToken();
        const tokenHash = await sha256(rawToken);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString();

        // Revoke any existing active sessions for this user first
        const existingSessions = await base44.asServiceRole.entities.PinSession.filter({ user_email, is_revoked: false });
        for (const s of existingSessions) {
          await base44.asServiceRole.entities.PinSession.update(s.id, { is_revoked: true, revoked_at: now.toISOString() });
        }

        await base44.asServiceRole.entities.PinSession.create({
          user_email,
          user_id: record.user_id || null,
          token_hash: tokenHash,
          created_at: now.toISOString(),
          expires_at: expiresAt,
          is_revoked: false,
          use_count: 0
        });

        // ── Silent alarm: fire-and-forget when accessed from an unauthenticated device ──
        // (Stage 3 of the Non-Medical Security Breach scenario — foreign terminal detection)
        ;(async () => {
          try {
            const authedUser = await base44.auth.me().catch(() => null);
            if (!authedUser) {
              const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
                || req.headers.get('x-real-ip') || 'unknown';
              const adminEmail = Deno.env.get('ADMIN_EMAIL') || '';
              if (adminEmail) {
                await base44.asServiceRole.integrations.Core.SendEmail({
                  from_name: 'Morales — SILENT ALARM',
                  to: adminEmail,
                  subject: `🔕 SILENT ALARM — Emergency Terminal: ${normalizedEmail}`,
                  body: `<div style="font-family:sans-serif;max-width:600px;padding:24px;border:2px solid #dc2626;border-radius:12px;">
<h2 style="color:#dc2626;margin:0 0 16px;">🔕 SILENT ALARM — Emergency Terminal Access</h2>
<p><strong>${normalizedEmail}</strong> has verified their Emergency PIN from an unauthenticated device (public terminal / new device).</p>
<table style="width:100%;margin-top:12px;border-collapse:collapse;">
  <tr><td style="color:#6b7280;padding:4px 0;width:140px;">IP Address</td><td>${clientIp}</td></tr>
  <tr><td style="color:#6b7280;padding:4px 0;">Time</td><td>${new Date().toUTCString()}</td></tr>
  <tr><td style="color:#6b7280;padding:4px 0;">Account</td><td>${normalizedEmail}</td></tr>
  <tr><td style="color:#6b7280;padding:4px 0;">Status</td><td><strong style="color:#dc2626;">Case flagged: In-Transit Compromised</strong></td></tr>
</table>
<p style="margin-top:16px;color:#374151;">This is a precautionary alert. The traveler may be stranded or in an emergency. Check their Solo Check-In status and Guardian links immediately.</p>
</div>`,
                }).catch(() => {});
              }
              // Flag case as compromised (best-effort)
              await base44.asServiceRole.entities.CaseRecord.filter({ client_email: normalizedEmail }, '-created_date', 1)
                .then((cases: any[]) => {
                  if (cases?.[0]?.id) {
                    return base44.asServiceRole.entities.CaseRecord.update(cases[0].id, {
                      is_compromised: true,
                      emergency_terminal_accessed_at: new Date().toISOString(),
                      emergency_terminal_ip: clientIp,
                    });
                  }
                }).catch(() => {});
            }
          } catch (_) {}
        })();

        return Response.json({ verified: true, pin_session_token: rawToken, expires_at: expiresAt, user_email });
      } else {
        const newFailCount = (record.failed_attempts || 0) + 1;
        const lockedUntil = newFailCount >= 5
          ? new Date(Date.now() + 30 * 60 * 1000).toISOString()
          : null;
        await base44.asServiceRole.entities.EmergencyPIN.update(record.id, {
          failed_attempts: newFailCount, locked_until: lockedUntil
        });

        // Log failed PIN attempt to audit trail
        await base44.functions.invoke('logAuditEvent', {
          event_type: 'emergency_pin_failed',
          performed_by: normalizedEmail,
          target_email: normalizedEmail,
          timestamp: new Date().toISOString(),
          ip_address: req.headers.get('x-forwarded-for')?.split(',').pop()?.trim() || 'unknown',
        }).catch(() => {});

        return Response.json({ verified: false, error: 'Incorrect PIN', attempts_remaining: Math.max(0, 5 - newFailCount) });
      }
    }

    // ── VALIDATE_SESSION: Check if a client-held PinSessionToken is still valid ──
    if (action === 'validate_session') {
      const result = await validatePinSession(base44, pin_session_token);
      if (!result.valid) return Response.json({ valid: false, error: result.error }, { status: 401 });
      return Response.json({ valid: true, user_email: result.session.user_email, expires_at: result.session.expires_at });
    }

    // ── REVOKE_SESSION: Explicit logout ──
    if (action === 'revoke_session') {
      if (!pin_session_token) return Response.json({ error: 'pin_session_token required' }, { status: 400 });
      const tokenHash = await sha256(pin_session_token);
      const sessions = await base44.asServiceRole.entities.PinSession.filter({ token_hash: tokenHash });
      for (const s of sessions) {
        await base44.asServiceRole.entities.PinSession.update(s.id, { is_revoked: true, revoked_at: new Date().toISOString() });
      }
      return Response.json({ success: true });
    }

    if (action === 'get_hint') {
      const records = await base44.asServiceRole.entities.EmergencyPIN.filter({ user_email });
      if (records.length === 0) return Response.json({ has_pin: false });
      return Response.json({ has_pin: true, hint: records[0].pin_hint || null, is_locked: !!(records[0].locked_until && new Date(records[0].locked_until) > new Date()) });
    }

    // ── GET_MANIFEST: fetch the medical/emergency-contact data an already-verified
    // pin_session_token is allowed to see. Split from 'verify' on purpose — the
    // manifest page must never receive PHI as a side effect of PIN validation, only
    // after re-proving the session token is still live. Was previously fetched
    // client-side via base44.asServiceRole, which throws in the browser (no
    // serviceToken) — the caller silently swallowed that and rendered hardcoded
    // "Unknown" placeholders to a first responder as if they were real data.
    if (action === 'get_manifest') {
      const result = await validatePinSession(base44, pin_session_token);
      if (!result.valid) return Response.json({ error: result.error }, { status: 401 });

      const cases = await base44.asServiceRole.entities.CaseRecord.filter(
        { client_email: result.session.user_email }, '-created_date', 1
      );
      if (!cases.length) return Response.json({ found: false });

      const c = cases[0];
      return Response.json({
        found: true,
        manifest: {
          full_name: c.client_name || result.session.user_email,
          blood_type: c.blood_type || 'Unknown',
          allergies: c.allergies || 'None recorded',
          medications: c.medications || 'None recorded',
          medical_conditions: c.medical_conditions || 'None recorded',
          emergency_contacts: c.emergency_contact
            ? [{ name: c.emergency_contact, relationship: 'Emergency Contact', phone: c.emergency_contact_phone || 'Not provided' }]
            : [],
          passport_last4: c.passport_vault_token ? 'On file' : 'Not on file',
          procedure: c.procedures?.join(', ') || 'Not specified',
          doctor_name: c.doctor_selected || 'Not assigned',
          doctor_phone: c.doctor_email || 'Not available',
          case_id: c.id,
          patient_phone: c.client_phone || 'Not on file',
          client_email: c.client_email || result.session.user_email,
          client_country: c.client_country || 'Not on file',
          preferred_language: c.preferred_language || 'English',
          insurance_info: c.insurance_info || 'Not on file',
        },
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    // SEC-10: Never expose internal error details; SEC-04: PIN hash migration note:
    // SHA-256(pin+email) is vulnerable to GPU brute-force on DB breach.
    // Migrate to PBKDF2 (SubtleCrypto, ≥200k iterations) or server-side bcrypt when available.
    console.error('[verifyEmergencyPIN]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
// Already rate-limited inline above via RateLimitBucket — rateLimit:false here
// avoids silently double-limiting through two independent mechanisms.
}, { name: 'verifyEmergencyPIN', requireAuth: false, rateLimit: false }));
