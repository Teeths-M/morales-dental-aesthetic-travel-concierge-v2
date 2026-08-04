import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHmac } from 'node:crypto';

// ── TwiML helper — Twilio expects an XML response on inbound SMS ──
function twiml(msg) {
  const inner = msg ? `<Message>${msg}</Message>` : '';
  return new Response(`<?xml version="1.0"?><Response>${inner}</Response>`, {
    headers: { 'Content-Type': 'text/xml' },
  });
}

// ── Phone normalisation + suffix match (handles +1, spaces, dashes) ──
function normalizePhone(p) {
  return (p || '').replace(/[^\d]/g, '');
}
function phonesMatch(a, b) {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  const sa = na.slice(-10);
  const sb = nb.slice(-10);
  return sa.length >= 7 && sa === sb;
}

// ── Twilio signature validation (form-encoded webhooks only) ──
function validateTwilioSignature(url, params, signature, authToken) {
  const sortedKeys = Object.keys(params).sort();
  const str = url + sortedKeys.map((k) => k + params[k]).join('');
  const expected = createHmac('sha1', authToken).update(str).digest('base64');
  return expected === signature;
}

const COMMAND_RE = /^(CHECKIN|DRIVER|PATIENT|SOS|SECURITY)\s+(\S+)/i;
const ROLE_MAP = { CHECKIN: 'checkin', DRIVER: 'driver', PATIENT: 'patient', SOS: 'sos', SECURITY: 'security' };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ── Parse inbound webhook (Twilio form-encoded, or JSON for testing) ──
    const contentType = req.headers.get('content-type') || '';
    const isForm = contentType.includes('application/x-www-form-urlencoded');
    const params = {};
    if (isForm) {
      const text = await req.text();
      new URLSearchParams(text).forEach((v, k) => { params[k] = v; });
    } else {
      try {
        const json = await req.json();
        Object.assign(params, json);
      } catch (_) { /* empty body */ }
    }

    const Body = params.Body || params.body || '';
    const From = params.From || params.from || '';
    const MessageSid = params.MessageSid || params.SmsSid || params.messageSid || '';

    // ── Signature validation: reject forged form-encoded webhooks ──
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    if (authToken && isForm) {
      const twilioSig = req.headers.get('x-twilio-signature') || '';
      const appUrl = Deno.env.get('APP_URL') || '';
      const webhookUrl = `${appUrl}/api/functions/twilioSmsHandshakeWebhook`;
      if (twilioSig && appUrl && !validateTwilioSignature(webhookUrl, params, twilioSig, authToken)) {
        console.error('[handshake] rejected: invalid Twilio signature');
        return twiml('');
      }
    }

    // ── Idempotency: a MessageSid we have already processed is ignored ──
    if (MessageSid) {
      const dupes = await base44.asServiceRole.entities.OfflineHandshake.filter({ message_sid: MessageSid });
      if (dupes && dupes.length > 0) {
        return twiml(''); // silently acknowledge — no double action
      }
    }

    const logAttempt = async (extra) => {
      try {
        await base44.asServiceRole.entities.OfflineHandshake.create({
          channel: 'sms',
          message_sid: MessageSid || undefined,
          from_phone: From,
          raw_message: Body,
          shortcode_command: (Body || '').toUpperCase(),
          received_at: new Date().toISOString(),
          ...extra,
        });
      } catch (e) {
        console.error('[handshake] log failed:', e.message);
      }
    };

    if (!Body) {
      await logAttempt({ parsed_action: 'empty', handshake_role: 'unknown', status: 'rejected', executed: false, execution_result: 'empty_body' });
      return twiml('Invalid command. Format: DRIVER <id>, PATIENT <id>, CHECKIN <id>, SOS <id>');
    }

    const m = Body.trim().match(COMMAND_RE);
    if (!m) {
      await logAttempt({ parsed_action: 'unknown', handshake_role: 'unknown', status: 'rejected', executed: false, execution_result: 'unrecognized_command' });
      return twiml('Unrecognized command. Format: DRIVER <id>, PATIENT <id>, CHECKIN <id>, SOS <id>');
    }

    const role = ROLE_MAP[m[1].toUpperCase()];
    const checkpointId = m[2];
    const now = new Date().toISOString();

    // ── Locate a pending checkpoint handshake ──
    const byCheckpoint = await base44.asServiceRole.entities.OfflineHandshake.filter({ checkpoint_id: checkpointId });
    const pending = (byCheckpoint || []).find((h) => h.status === 'pending') || null;

    // ── SOS: alert team even without a pre-created handshake ──
    if (role === 'sos') {
      const caseId = pending?.case_id || checkpointId;
      const cases = await base44.asServiceRole.entities.CaseRecord.filter({ id: caseId }).catch(() => []);
      const c = cases[0];
      const adminEmail = Deno.env.get('ADMIN_EMAIL');
      // Only alert if the sender is plausibly tied to the case (or no phone on file)
      if (c && adminEmail && (!c.client_phone || phonesMatch(c.client_phone, From))) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: adminEmail,
            subject: `🚨 SOS via SMS — ${c.client_name || 'patient'} (case ${c.id})`,
            body: `<h2 style="color:#b91c1c">SOS received via SMS</h2><p>Patient: ${c.client_name || '—'}</p><p>Case: ${c.id}</p><p>From: ${From}</p><p>Time: ${now}</p><p style="color:#b91c1c"><strong>IMMEDIATE ACTION REQUIRED</strong></p>`,
          });
        } catch (_) { /* email best-effort */ }
      }
      if (pending) {
        await base44.asServiceRole.entities.OfflineHandshake.update(pending.id, {
          status: 'completed', executed: true, executed_at: now, completed_at: now,
          from_phone: From, message_sid: MessageSid || undefined,
          parsed_action: 'sos', handshake_role: 'sos', execution_result: 'sos_dispatched', received_at: now,
        });
      } else {
        await logAttempt({ case_id: c?.id, parsed_action: 'sos', handshake_role: 'sos', checkpoint_id: checkpointId, status: 'completed', executed: true, executed_at: now, completed_at: now, execution_result: 'sos_dispatched' });
      }
      return twiml('SOS received. Emergency team alerted. Stay where you are.');
    }

    // ── Non-SOS commands must match a pending checkpoint ──
    if (!pending) {
      await logAttempt({ parsed_action: role, handshake_role: role, checkpoint_id: checkpointId, status: 'rejected', executed: false, execution_result: 'checkpoint_not_found' });
      return twiml('Checkpoint not found or already completed. Please contact your coordinator.');
    }

    // Expiry
    if (pending.expires_at && new Date(pending.expires_at).getTime() < Date.now()) {
      await base44.asServiceRole.entities.OfflineHandshake.update(pending.id, {
        status: 'expired', from_phone: From, message_sid: MessageSid || undefined,
        execution_result: 'checkpoint_expired', received_at: now,
      });
      return twiml('This checkpoint has expired. Please contact your coordinator.');
    }

    // Role match (a checkin checkpoint accepts any role)
    if (pending.handshake_role && pending.handshake_role !== role && pending.handshake_role !== 'checkin') {
      await logAttempt({ case_id: pending.case_id, parsed_action: role, handshake_role: role, checkpoint_id: checkpointId, status: 'rejected', executed: false, execution_result: `role_mismatch_expected_${pending.handshake_role}` });
      return twiml('This checkpoint does not match your role. Please contact your coordinator.');
    }

    // Expected phone
    if (pending.expected_phone && !phonesMatch(pending.expected_phone, From)) {
      await logAttempt({ case_id: pending.case_id, parsed_action: role, handshake_role: role, checkpoint_id: checkpointId, status: 'rejected', executed: false, execution_result: 'phone_mismatch' });
      return twiml('This number is not authorised for this checkpoint. Please contact your coordinator.');
    }

    // ── Complete the handshake ──
    await base44.asServiceRole.entities.OfflineHandshake.update(pending.id, {
      status: 'completed', executed: true, executed_at: now, completed_at: now,
      from_phone: From, message_sid: MessageSid || undefined,
      parsed_action: role, execution_result: `${role}_handshake_confirmed`, received_at: now,
    });

    // ── Append a timeline entry to the case (non-breaking checkpoint update) ──
    if (pending.case_id) {
      try {
        const cases = await base44.asServiceRole.entities.CaseRecord.filter({ id: pending.case_id });
        const c = cases[0];
        if (c) {
          const entry = { timestamp: now, event: `${role.toUpperCase()} handshake confirmed via SMS`, checkpoint_id: checkpointId, from_phone: From, source: 'sms_handshake' };
          const timeline = Array.isArray(c.timeline_log) ? [...c.timeline_log, entry] : [entry];
          await base44.asServiceRole.entities.CaseRecord.update(c.id, { timeline_log: timeline });
        }
      } catch (e) {
        console.error('[handshake] timeline update failed:', e.message);
      }
    }

    const friendly = {
      driver: 'Driver checkpoint confirmed. Thank you.',
      patient: 'Patient checkpoint confirmed. You are marked safe.',
      checkin: 'Check-in recorded. You are marked safe. Thank you.',
    };
    return twiml(friendly[role] || 'Checkpoint confirmed. Thank you.');
  } catch (error) {
    console.error('[handshake] error:', error.message);
    return twiml('System error. Please call your coordinator directly.');
  }
});