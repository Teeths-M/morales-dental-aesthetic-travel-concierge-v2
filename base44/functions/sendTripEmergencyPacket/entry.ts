import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import {
  deliverPacket,
  isTripAssistanceEnabled,
} from '../../shared/tripAssistanceEngine.ts';

/**
 * sendTripEmergencyPacket — one action, to one recipient, in the body.
 *
 * The recipient decides the shape: a driver and a clinic get the message body,
 * because neither is opening a link with someone on the floor. The care team
 * gets the internal view. A PDF exists for a hospital handover or on request.
 * Police are refused before anything is written — that packet becomes what a
 * care-team human reads down the line, address first.
 *
 * Every call writes a delivery row naming the exact packet version, channel and
 * outcome. A failure comes back with fallback_required, and the answer is a
 * phone call, never the same message again.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });

    if (!(await isTripAssistanceEnabled(base44))) {
      return Response.json({ enabled: false, error: 'Trip assistance is not switched on.' });
    }

    const body = await req.json().catch(() => ({}));
    if (!body?.packet_id) return Response.json({ error: 'Which packet?' }, { status: 400 });

    const packet = await base44.asServiceRole.entities.TripEmergencyPacket
      .get(String(body.packet_id))
      .catch(() => null);
    if (!packet) return Response.json({ error: 'That packet does not exist.' }, { status: 404 });

    const isAdmin = ['admin', 'platform_admin'].includes(String(user.role || ''));
    const isOwner = String(packet.patient_email || '') === String(user.email || '').toLowerCase();
    if (!isAdmin && !isOwner) {
      return Response.json({ error: 'That packet is not yours to send.' }, { status: 403 });
    }

    // A traveller may send their own packet to a responder. Only the care team
    // may log an internal or handover copy — an internal record is not the
    // traveller's to write.
    const recipient = String(body?.recipient_type || '');
    if (!isAdmin && !['driver', 'clinic'].includes(recipient)) {
      return Response.json({ error: 'That recipient is for the care team.' }, { status: 403 });
    }

    const result = await deliverPacket(base44, {
      user,
      packet_id: String(body.packet_id),
      recipient_type: recipient,
      channel: body?.channel,
    });

    return Response.json(result);
  } catch (error: any) {
    const message = error?.message || 'An internal error occurred.';
    console.error('[sendTripEmergencyPacket]', message);
    const status = /police/.test(message) ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
});