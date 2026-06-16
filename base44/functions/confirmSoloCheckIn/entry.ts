import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('');

    // Look up token record for this check-in
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

    // Load the SoloCheckIn record
    const checkIns = await base44.asServiceRole.entities.SoloCheckIn.filter({ id: check_in_id }, null, 1);
    if (checkIns.length === 0) {
      return Response.json({ error: 'Check-in not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    const checkIn = checkIns[0];

    // If already acknowledged, return success silently
    if (checkIn.status === 'acknowledged') {
      await base44.asServiceRole.entities.CheckInToken.update(tokenRecord.id, { used_at: now.toISOString() });
      return Response.json({ code: 'ALREADY_ACKNOWLEDGED', message: 'You have already confirmed you are safe.' }, { status: 200 });
    }

    // Mark the check-in as acknowledged
    await base44.asServiceRole.entities.SoloCheckIn.update(check_in_id, {
      status: 'acknowledged',
      responded_time: now.toISOString(),
      acknowledged_at: now.toISOString(),
      response_method: 'email',
    });

    // Mark the token as used (one-time)
    await base44.asServiceRole.entities.CheckInToken.update(tokenRecord.id, {
      used_at: now.toISOString(),
    });

    // Audit log
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
        method: 'email',
        check_in_id,
        user_email: checkIn.user_email,
        response_time: now.toISOString(),
      },
      sensitive: false,
      timestamp: now.toISOString(),
      prev_hash: 'CHECKIN_EMAIL_RESPONSE',
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