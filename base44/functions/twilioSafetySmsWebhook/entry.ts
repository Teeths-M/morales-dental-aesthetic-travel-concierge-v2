/**
 * twilioSafetySmsWebhook — Inbound SMS handler for Morales safety system
 *
 * Accepts Twilio POST webhook payloads (From, Body, MessageSid).
 * Parses: SAFE, SAFE <checkpoint>, CHECKIN <checkpoint>, SOS, HELP
 *
 * Returns TwiML-compatible XML response.
 * No user login required — validated by MessageSid idempotency + phone lookup.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function twimlReply(message) {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`,
    { status: 200, headers: { 'Content-Type': 'application/xml' } }
  );
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Parse Twilio form-encoded body
    const text = await req.text();
    const params = new URLSearchParams(text);
    const from = params.get('From') || '';
    const body = (params.get('Body') || '').trim().toUpperCase();
    const messageSid = params.get('MessageSid') || '';

    if (!from || !body) {
      return twimlReply('Invalid request.');
    }

    const now = new Date().toISOString();

    // ── Idempotency: ignore duplicate MessageSid ─────────────────────────────
    if (messageSid) {
      try {
        const existing = await base44.asServiceRole.entities.NotificationLog.filter(
          { provider_message_id: messageSid }, '-created_at', 1
        );
        if (existing?.length > 0) {
          return twimlReply('Already processed. Thank you.');
        }
      } catch (_) {}
    }

    // Log every inbound SMS
    const logEntry = async (status, notes, caseId) => {
      try {
        await base44.asServiceRole.entities.NotificationLog.create({
          channel: 'sms',
          case_id: caseId || '',
          recipient_type: 'traveler',
          recipient_phone: from,
          message_type: 'inbound_sms',
          provider_message_id: messageSid,
          status,
          escalation_level: 0,
          notes: `From: ${from} | Body: ${body} | ${notes}`,
          created_at: now,
        });
      } catch (_) {}
    };

    // ── Find active check-in by phone number ────────────────────────────────
    // Search pending + escalated check-ins for this phone
    const [pending, esc2h, esc3h] = await Promise.all([
      base44.asServiceRole.entities.SoloCheckIn.filter({ user_phone: from, status: 'pending' }, '-scheduled_time', 5),
      base44.asServiceRole.entities.SoloCheckIn.filter({ user_phone: from, status: 'escalated_2h' }, '-scheduled_time', 5),
      base44.asServiceRole.entities.SoloCheckIn.filter({ user_phone: from, status: 'escalated_3h' }, '-scheduled_time', 5),
    ]);

    const allCheckIns = [...pending, ...esc2h, ...esc3h]
      .sort((a, b) => new Date(b.scheduled_time) - new Date(a.scheduled_time));
    const checkIn = allCheckIns[0] || null;

    // ── MORALES SOS packet (wilderness offline SOS) ──────────────────────────
    // Format: MORALES SOS MSOS_XXXX LAT:<lat> LNG:<lng> ACC:<m> CASE:<ref> ACT:<type> TS:<unix>
    const rawBody = params.get('Body') || '';
    const isWildernessSOS = rawBody.trimStart().toUpperCase().startsWith('MORALES SOS');

    if (isWildernessSOS) {
      // Parse fields from payload
      const latMatch = rawBody.match(/LAT:([-\d.]+)/i);
      const lngMatch = rawBody.match(/LNG:([-\d.]+)/i);
      const accMatch = rawBody.match(/ACC:([\d.]+)/i);
      const caseMatch = rawBody.match(/CASE:([A-Z0-9]+)/i);
      const actMatch = rawBody.match(/ACT:([A-Z0-9_]+)/i);
      const tsMatch  = rawBody.match(/TS:(\d+)/i);
      const packetIdMatch = rawBody.match(/(MSOS_[A-F0-9]+)/i);

      const latitude  = latMatch  ? parseFloat(latMatch[1])  : null;
      const longitude = lngMatch  ? parseFloat(lngMatch[1])  : null;
      const accuracy  = accMatch  ? parseFloat(accMatch[1])  : null;
      const caseRef   = caseMatch ? caseMatch[1]             : '';
      const actType   = actMatch  ? actMatch[1].toLowerCase(): 'wilderness_injury';
      const packetId  = packetIdMatch ? packetIdMatch[1]     : '';

      // Validate coordinate ranges
      const validCoords = latitude != null && longitude != null &&
        Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;

      await logEntry('received_sos', `MORALES SOS packet: ${packetId} | coords valid: ${validCoords}`, '');

      // Create SOSEvent
      const sosEventData = {
        patient_email: from, // phone as fallback — admin will link
        patient_phone: from,
        trigger_type: 'wilderness_injury',
        status: 'triggered',
        escalation_level: 5,
        is_silent: false,
        triggered_at: now,
        notifications_sent: ['inbound_sms'],
        location_label: validCoords
          ? `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
          : 'GPS unknown — offline SMS SOS',
      };
      if (validCoords) { sosEventData.latitude = latitude; sosEventData.longitude = longitude; }

      let sosEvent = null;
      try { sosEvent = await base44.asServiceRole.entities.SOSEvent.create(sosEventData); } catch (_) {}

      // Create LocationBreadcrumb if valid GPS
      if (validCoords) {
        try {
          await base44.asServiceRole.entities.LocationBreadcrumb.create({
            patient_email: from,
            latitude, longitude,
            accuracy_meters: accuracy,
            source: 'checkin_handshake',
            provider: 'browser_gps',
            location_precision: accuracy && accuracy < 100 ? 'precise' : 'approximate',
            logged_at: now,
            is_saved: true,
            place_label: `Wilderness SOS — ${actType}`,
          });
        } catch (_) {}
      }

      // Notify admin
      const adminEmail = Deno.env.get('ADMIN_EMAIL') || '';
      if (adminEmail) {
        try {
          const mapsLink = validCoords
            ? `<a href="https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}">📍 Open in Google Maps</a>`
            : 'No GPS coordinates available';
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'Morales — Wilderness SOS',
            to: adminEmail,
            subject: `🆘 WILDERNESS SOS received via SMS from ${from}`,
            body: `<div style="font-family:sans-serif">
              <div style="background:#dc2626;color:white;padding:16px;border-radius:8px 8px 0 0">
                <h1 style="margin:0">🏔️ WILDERNESS SOS — Canopy Collapse Protocol</h1>
              </div>
              <div style="border:1px solid #fca5a5;border-top:none;padding:16px;border-radius:0 0 8px 8px">
                <p><strong>Phone:</strong> ${from}</p>
                <p><strong>Packet ID:</strong> ${packetId || 'N/A'}</p>
                <p><strong>Activity:</strong> ${actType}</p>
                <p><strong>Coordinates:</strong> ${validCoords ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` : 'Not available'}</p>
                <p><strong>Accuracy:</strong> ${accuracy ? `±${Math.round(accuracy)}m` : '—'}</p>
                <p>${mapsLink}</p>
                <p><strong>Time:</strong> ${now}</p>
                <hr/>
                <p style="color:#dc2626;font-weight:bold">SEARCH & RESCUE REQUIRED — check /admin/wilderness-rescue</p>
              </div>
            </div>`,
          });
        } catch (_) {}
      }

      return twimlReply('Morales SOS received. Rescue escalation started. Stay where you are if safe. Help is being dispatched.');
    }

    // Parse command
    const isSafe = body.startsWith('SAFE') || body.startsWith('CHECKIN');
    const isSOS = body === 'SOS' || body === 'HELP' || body.startsWith('SOS ') || body.startsWith('HELP ');

    // ── SOS / HELP ────────────────────────────────────────────────────────────
    if (isSOS) {
      const caseId = checkIn?.case_id || '';
      await logEntry('received_sos', 'SOS received via SMS', caseId);

      // Create SOSEvent immediately
      try {
        if (caseId) {
          const patientEmail = checkIn?.user_email || from;
          const patientName = checkIn?.user_name || from;
          await base44.asServiceRole.entities.SOSEvent.create({
            case_id: caseId,
            patient_email: patientEmail,
            patient_name: patientName,
            patient_phone: from,
            trigger_type: 'silent_sos',
            status: 'triggered',
            escalation_level: 5,
            triggered_at: now,
            is_silent: false,
          });
        }
      } catch (_) {}

      // Notify admin
      const adminEmail = Deno.env.get('ADMIN_EMAIL') || '';
      if (adminEmail) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'Morales Safety — SOS',
            to: adminEmail,
            subject: `🆘 SOS received via SMS from ${from}`,
            body: `<p><strong>SOS / HELP received via inbound SMS.</strong></p><p>Phone: ${from}</p><p>Case ID: ${caseId || 'Unknown'}</p><p>Time: ${now}</p><p>Immediate human intervention required.</p>`,
          });
        } catch (_) {}
      }

      if (checkIn) {
        await base44.asServiceRole.entities.SoloCheckIn.update(checkIn.id, {
          security_dispatched_at: now,
          escalation_level: 'security_dispatched',
          status: 'escalated_5h',
        }).catch(() => {});
      }

      return twimlReply('SOS received. Morales emergency team has been alerted. Stay where you are. Help is being dispatched.');
    }

    // ── SAFE / CHECKIN ────────────────────────────────────────────────────────
    if (isSafe) {
      if (!checkIn) {
        await logEntry('safe_no_checkin_found', 'No active check-in found for phone', '');
        return twimlReply('Thank you for confirming. We could not find an active check-in for your number. Please log in to your Morales dashboard if needed.');
      }

      // Already acknowledged?
      if (checkIn.status === 'acknowledged' || checkIn.status === 'resolved') {
        await logEntry('safe_already_acked', 'Already acknowledged', checkIn.case_id);
        return twimlReply('You are already marked safe. Thank you!');
      }

      const wasEscalated = ['escalated_2h', 'escalated_3h', 'escalated_5h'].includes(checkIn.status);

      await base44.asServiceRole.entities.SoloCheckIn.update(checkIn.id, {
        status: 'acknowledged',
        acknowledged_at: now,
        responded_time: now,
        response_method: 'sms',
      });

      await logEntry('safe_acknowledged', `Check-in ${checkIn.id} acknowledged via SMS`, checkIn.case_id);

      // Audit log
      try {
        const logs = await base44.asServiceRole.entities.AuditLog.list('-timestamp', 1);
        const prevHash = logs[0] ? await sha256(JSON.stringify(logs[0])) : 'GENESIS';
        await base44.asServiceRole.entities.AuditLog.create({
          event_type: 'handshake_completed',
          actor_id: from,
          actor_role: 'traveler',
          actor_name: checkIn.user_name || from,
          resource_type: 'SoloCheckIn',
          resource_id: checkIn.id,
          case_id: checkIn.case_id,
          details: { action: 'sms_safe_acknowledgement', from, message_sid: messageSid, was_escalated: wasEscalated },
          sensitive: false,
          timestamp: now,
          prev_hash: prevHash,
        });
      } catch (_) {}

      // If escalation was already started, notify guardian/admin that traveler is safe
      if (wasEscalated) {
        const adminEmail = Deno.env.get('ADMIN_EMAIL') || '';
        if (adminEmail) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              from_name: 'Morales Safety',
              to: adminEmail,
              subject: `✅ ${checkIn.user_name || 'Traveler'} confirmed safe via SMS`,
              body: `<p>${checkIn.user_name || checkIn.user_email} replied SAFE via SMS. Check-in acknowledged. Escalation resolved for case ${checkIn.case_id}.</p><p>Phone: ${from} | Time: ${now}</p>`,
            });
          } catch (_) {}
        }
      }

      return twimlReply(`Thank you, ${checkIn.user_name || 'traveler'}! You are marked safe. Your next check-in is in 12 hours.`);
    }

    // ── Unrecognized command ─────────────────────────────────────────────────
    await logEntry('unrecognized_command', `Body: ${body}`, checkIn?.case_id || '');
    return twimlReply('Morales Safety: Reply SAFE to confirm you are okay, or SOS for emergency help.');

  } catch (err) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Error processing request. Please contact Morales support.</Message></Response>`,
      { status: 200, headers: { 'Content-Type': 'application/xml' } }
    );
  }
});