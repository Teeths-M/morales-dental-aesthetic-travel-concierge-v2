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