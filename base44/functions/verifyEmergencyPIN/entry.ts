import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function sha256(text) {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, user_email, pin, new_pin, hint, pin_session_token } = await req.json();

    if (!action || !user_email) return Response.json({ error: 'action and user_email required' }, { status: 400 });

    // ── SETUP: Register or update a PIN ──
    if (action === 'setup') {
      if (!new_pin || new_pin.length !== 6 || !/^\d{6}$/.test(new_pin)) {
        return Response.json({ error: 'PIN must be exactly 6 digits' }, { status: 400 });
      }
      const hash = await sha256(new_pin + user_email);
      const existing = await base44.asServiceRole.entities.EmergencyPIN.filter({ user_email });
      const now = new Date().toISOString();
      if (existing.length > 0) {
        await base44.asServiceRole.entities.EmergencyPIN.update(existing[0].id, {
          pin_hash: hash, pin_hint: hint || '', is_active: true,
          failed_attempts: 0, locked_until: null, created_at: now
        });
      } else {
        let userId = null;
        try {
          const users = await base44.asServiceRole.entities.User.filter({ email: user_email });
          userId = users[0]?.id;
        } catch (_) {}
        await base44.asServiceRole.entities.EmergencyPIN.create({
          user_id: userId, user_email, pin_hash: hash, pin_hint: hint || '',
          is_active: true, use_count: 0, failed_attempts: 0, created_at: now
        });
      }
      return Response.json({ success: true, message: 'Emergency PIN set successfully' });
    }

    // ── VERIFY: Authenticate with PIN → issue a server-side PinSession ──
    if (action === 'verify') {
      if (!pin) return Response.json({ error: 'pin required' }, { status: 400 });
      const records = await base44.asServiceRole.entities.EmergencyPIN.filter({ user_email, is_active: true });
      if (records.length === 0) return Response.json({ verified: false, error: 'No PIN registered for this account' }, { status: 404 });

      const record = records[0];

      // Lockout check
      if (record.locked_until && new Date(record.locked_until) > new Date()) {
        return Response.json({ verified: false, error: 'Too many failed attempts. Try again later.', locked_until: record.locked_until }, { status: 429 });
      }

      const hash = await sha256(pin + user_email);
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

        return Response.json({ verified: true, pin_session_token: rawToken, expires_at: expiresAt, user_email });
      } else {
        const newFailCount = (record.failed_attempts || 0) + 1;
        const lockedUntil = newFailCount >= 5
          ? new Date(Date.now() + 30 * 60 * 1000).toISOString()
          : null;
        await base44.asServiceRole.entities.EmergencyPIN.update(record.id, {
          failed_attempts: newFailCount, locked_until: lockedUntil
        });
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

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    // SEC-10: Never expose internal error details; SEC-04: PIN hash migration note:
    // SHA-256(pin+email) is vulnerable to GPU brute-force on DB breach.
    // Migrate to PBKDF2 (SubtleCrypto, ≥200k iterations) or server-side bcrypt when available.
    console.error('[verifyEmergencyPIN]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});