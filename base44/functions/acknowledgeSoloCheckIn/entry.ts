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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_id, response_method = 'app', location_lat, location_lng } = await req.json();

    if (!case_id) {
      return Response.json({ error: 'case_id required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Find the latest pending check-in for this case
    const checkIns = await base44.asServiceRole.entities.SoloCheckIn.filter(
      { case_id, status: 'pending' },
      '-scheduled_time',
      1
    );

    if (checkIns.length === 0) {
      return Response.json({ error: 'No pending check-in found' }, { status: 404 });
    }

    const checkIn = checkIns[0];

    // Update check-in as acknowledged
    await base44.asServiceRole.entities.SoloCheckIn.update(checkIn.id, {
      responded_time: now,
      response_method,
      location_lat: location_lat || null,
      location_lng: location_lng || null,
      status: 'acknowledged',
      acknowledged_at: now,
    });

    // Log to AuditLog — real prev_hash to maintain tamper-evident chain
    const prevHash = await getLastAuditHash(base44);
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'handshake_completed',
      actor_id: user.id,
      actor_role: user.role,
      actor_name: user.full_name,
      resource_type: 'SoloCheckIn',
      resource_id: checkIn.id,
      resource_name: `Solo check-in round ${checkIn.check_in_round}`,
      case_id: case_id,
      details: {
        action: 'solo_checkin_acknowledged',
        response_method,
        location: location_lat && location_lng ? { lat: location_lat, lng: location_lng } : null,
      },
      sensitive: false,
      timestamp: now,
      prev_hash: prevHash,
    });

    return Response.json({ success: true, check_in_id: checkIn.id });
  } catch (error) {
    console.error('[acknowledgeSoloCheckIn]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});