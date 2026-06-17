import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getLastAuditHash(base44) {
  try {
    const logs = await base44.asServiceRole.entities.AuditLog.list('-timestamp', 1);
    return logs[0] ? await sha256(JSON.stringify(logs[0])) : 'GENESIS';
  } catch (_) { return 'GENESIS'; }
}

// Public endpoint — no user auth required. Validates one-time token from email link.
// Called when user clicks "I'M SAFE" button in their check-in email.
// POST body: { check_in_id, token }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { check_in_id, token } = await req.json();

    if (!check_in_id || !token) {
      return Response.json({ error: 'Missing check_in_id or token', code: 'MISSING_PARAMS' }, { status: 400 });
    }

    // Hash the incoming raw token to compare against stored hash
    const tokenHash = await sha256(token);

    // Look up token record — filter by check_in_id (entity field) AND token_hash
    const tokenRecords = await base44.asServiceRole.entities.CheckInToken.filter(
      { check_in_id, token_hash: tokenHash },
      '-created_at',
      1
    );

    if (tokenRecords.length === 0) {
      return Response.json({ error: 'Invalid token', code: 'INVALID_TOKEN' }, { status: 401 });
    }

    const tokenRecord = tokenRecords[0];
    const now = new Date();

    // Check if already used
    if (tokenRecord.used_at) {
      return Response.json({ code: 'ALREADY_USED', message: 'You have already confirmed you are safe.' }, { status: 200 });
    }

    // Check if expired
    if (new Date(tokenRecord.expires_at) < now) {
      return Response.json({ error: 'Token expired', code: 'EXPIRED' }, { status: 401 });
    }

    // BUG-R6-02 FIX: The URL sent by scheduleSoloCheckIns uses checkIn.id (entity primary key)
    // as the check_in_id path param. filter({ trip_id: check_in_id }) was looking for a record
    // where trip_id === checkIn.id, but trip_id is set to case_id at creation — not the entity id.
    // So the filter always returned [] and the only rescue was a 500-record list scan.
    // On large production systems with >500 check-ins, that rescue silently fails and patients
    // are unable to confirm they're safe via email link.
    //
    // Correct fix: use the SDK .get() call which resolves by entity primary key directly.
    // check_in_id in the URL IS the entity's primary key (checkIn.id set at creation).
    let checkIn = null;
    try {
      checkIn = await base44.asServiceRole.entities.SoloCheckIn.get(check_in_id);
    } catch (_) { checkIn = null; }

    if (!checkIn) {
      return Response.json({ error: 'Check-in not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    // If already acknowledged, just burn the token and return success
    if (checkIn.status === 'acknowledged' || checkIn.status === 'resolved') {
      await base44.asServiceRole.entities.CheckInToken.update(tokenRecord.id, { used_at: now.toISOString() });
      return Response.json({ code: 'ALREADY_ACKNOWLEDGED', message: 'You have already confirmed you are safe.' }, { status: 200 });
    }

    // BUG-01 FIX: Must update using checkIn.id (the loaded entity's real ID),
    // NOT check_in_id from the request body (which equals the case_id / trip_id,
    // NOT the SoloCheckIn entity's primary key).
    await base44.asServiceRole.entities.SoloCheckIn.update(checkIn.id, {
      status: 'acknowledged',
      responded_time: now.toISOString(),
      acknowledged_at: now.toISOString(),
      response_method: 'app',
    });

    // Mark the token as used (one-time)
    await base44.asServiceRole.entities.CheckInToken.update(tokenRecord.id, {
      used_at: now.toISOString(),
    });

    // Audit log — with real hash chain, not a hardcoded literal
    const prevHash = await getLastAuditHash(base44);
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'handshake_completed',
      actor_id: checkIn.user_id || 'email_token',
      actor_role: 'user',
      actor_name: checkIn.user_name || checkIn.user_email,
      actor_email: checkIn.user_email,
      resource_type: 'SoloCheckIn',
      resource_id: check_in_id,
      resource_name: `Round ${checkIn.check_in_round}`,
      case_id: checkIn.case_id,
      details: {
        action: 'CHECK_IN_RESPONDED',
        method: 'email_link',
        check_in_id,
        user_email: checkIn.user_email,
        response_time: now.toISOString(),
      },
      sensitive: false,
      timestamp: now.toISOString(),
      prev_hash: prevHash,
    });

    return Response.json({
      code: 'SUCCESS',
      message: '✅ You have been marked as safe. Thank you!',
      check_in_id,
      responded_at: now.toISOString(),
      method: 'email',
    });
  } catch (error) {
    console.error('[confirmSoloCheckIn]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});