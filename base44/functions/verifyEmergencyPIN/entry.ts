import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Simple SHA-256 hash using Web Crypto
async function sha256(text) {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, user_email, pin, new_pin, hint } = await req.json();

    if (!action || !user_email) return Response.json({ error: 'action and user_email required' }, { status: 400 });

    if (action === 'setup') {
      // Create or update the emergency PIN for a user
      if (!new_pin || new_pin.length !== 6 || !/^\d{6}$/.test(new_pin)) {
        return Response.json({ error: 'PIN must be exactly 6 digits' }, { status: 400 });
      }
      const hash = await sha256(new_pin + user_email); // salted with email
      const existing = await base44.asServiceRole.entities.EmergencyPIN.filter({ user_email });
      const now = new Date().toISOString();
      let record;
      if (existing.length > 0) {
        record = await base44.asServiceRole.entities.EmergencyPIN.update(existing[0].id, {
          pin_hash: hash, pin_hint: hint || '', is_active: true,
          failed_attempts: 0, locked_until: null, created_at: now
        });
      } else {
        // Validate user exists
        let userId = null;
        try {
          const users = await base44.asServiceRole.entities.User.filter({ email: user_email });
          userId = users[0]?.id;
        } catch (_) {}
        record = await base44.asServiceRole.entities.EmergencyPIN.create({
          user_id: userId, user_email, pin_hash: hash, pin_hint: hint || '',
          is_active: true, use_count: 0, failed_attempts: 0, created_at: now
        });
      }
      return Response.json({ success: true, message: 'Emergency PIN set successfully' });
    }

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
        // Issue a short-lived session token (simple — in prod use proper JWT)
        const sessionToken = btoa(JSON.stringify({ user_email, expires: Date.now() + 30 * 60 * 1000, type: 'emergency_pin' }));
        return Response.json({ verified: true, session_token: sessionToken, user_email });
      } else {
        const newFailCount = (record.failed_attempts || 0) + 1;
        const lockedUntil = newFailCount >= 5
          ? new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min lockout
          : null;
        await base44.asServiceRole.entities.EmergencyPIN.update(record.id, {
          failed_attempts: newFailCount, locked_until: lockedUntil
        });
        return Response.json({ verified: false, error: 'Incorrect PIN', attempts_remaining: Math.max(0, 5 - newFailCount) });
      }
    }

    if (action === 'get_hint') {
      const records = await base44.asServiceRole.entities.EmergencyPIN.filter({ user_email });
      if (records.length === 0) return Response.json({ has_pin: false });
      return Response.json({ has_pin: true, hint: records[0].pin_hint || null, is_locked: !!(records[0].locked_until && new Date(records[0].locked_until) > new Date()) });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});