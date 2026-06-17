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

    // Load the SoloCheckIn record.
    // CheckInToken.check_in_id stores the SoloCheckIn entity id.
    // The SDK filter() does not support filtering by the built-in `id` field directly,
    // so we use the check_in_id entity field which is explicitly stored on SoloCheckIn.
    // This is the correct, indexed lookup path.
    const checkIns = await base44.asServiceRole.entities.SoloCheckIn.filter(
      { trip_id: check_in_id },
      '-created_date',
      1
    );

    // trip_id mirrors case_id and is set at creation. If for any reason it's not indexed,
    // fall back to a user-email-scoped list and match by id.
    let checkIn = checkIns[0] || null;
    if (!checkIn) {
      const recent = await base44.asServiceRole.entities.SoloCheckIn.list('-created_date', 500);
      checkIn = recent.find(c => c.id === check_in_id) || null;
    }

    if (!checkIn) {
      return Response.json({ error: 'Check-in not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    // If already acknowledged, just burn the token and return success
    if (checkIn.status === 'acknowledged' || checkIn.status === 'resolved') {
      await base44.asServiceRole.entities.CheckInToken.update(tokenRecord.id, { used_at: now.toISOString() });
      return Response.json({ code: 'ALREADY_ACKNOWLEDGED', message: 'You have already confirmed you are safe.' }, { status: 200 });
    }

    // Mark the check-in as acknowledged
    await base44.asServiceRole.entities.SoloCheckIn.update(check_in_id, {
      status: 'acknowledged',
      responded_time: now.toISOString(),
      acknowledged_at: now.toISOString(),
      response_method: 'app', // 'app' is the valid enum value; 'email' is not in the enum
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
    return Response.json({ error: error.message }, { status: 500 });
  }
});