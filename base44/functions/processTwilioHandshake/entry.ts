import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── processTwilioHandshake — Twilio SMS Webhook ───────────────────────────────
// STUB: This is a mock implementation ready for live Twilio credentials.
//
// TO ACTIVATE WITH LIVE TWILIO:
//   1. Set env vars in your Base44 project settings:
//        TWILIO_ACCOUNT_SID   = ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
//        TWILIO_AUTH_TOKEN    = your_auth_token
//        TWILIO_PHONE_NUMBER  = +1XXXXXXXXXX
//        TWILIO_WEBHOOK_SECRET = (optional — for request signature validation)
//   2. In Twilio Console → Phone Numbers → your number → Messaging Webhook:
//        URL: https://api.base44.app/functions/processTwilioHandshake
//        Method: HTTP POST
//   3. Uncomment the Twilio signature validation block below.
//
// SMS Format expected from drivers / patients:
//   "HANDSHAKE HS_XXXXXXXXXX"
//   (the checkpoint_id returned when the handshake was created)
//
// On match: calls confirmHandshake action=sms_confirm internally,
// returns TwiML with a human-readable acknowledgement SMS.

// ── Twilio request-signature validation (uncomment for production) ─────────
// async function validateTwilioSignature(req, rawBody) {
//   const secret = Deno.env.get('TWILIO_WEBHOOK_SECRET');
//   if (!secret) return true; // no secret configured — skip in dev
//   const signature = req.headers.get('X-Twilio-Signature') || '';
//   const url = req.url;
//   const encoder = new TextEncoder();
//   const key = await crypto.subtle.importKey(
//     'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
//   );
//   const expectedRaw = await crypto.subtle.sign('HMAC', key, encoder.encode(url + rawBody));
//   const expected = btoa(String.fromCharCode(...new Uint8Array(expectedRaw)));
//   return signature === expected;
// }

function twiml(message: string): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  );
}

Deno.serve(async (req) => {
  try {
    // Twilio sends application/x-www-form-urlencoded POST
    const rawBody = await req.text();
    const params = new URLSearchParams(rawBody);

    const fromPhone = params.get('From') || '';
    const body = (params.get('Body') || '').trim().toUpperCase();
    const messageSid = params.get('MessageSid') || '';

    // ── MOCK: log incoming SMS, no signature validation in stub ──────────────
    // In production: await validateTwilioSignature(req, rawBody);
    console.log(`[processTwilioHandshake] MOCK inbound SMS from ${fromPhone}: "${body}"`);

    // Parse "HANDSHAKE <checkpoint_id>"
    const match = body.match(/^HANDSHAKE\s+([A-Z0-9_]+)$/);
    if (!match) {
      // Not a handshake command — ignore silently or handle other shortcodes
      return twiml('Command not recognised. Send HANDSHAKE <ID> to confirm a pickup checkpoint.');
    }

    const checkpointId = match[1];

    // Call confirmHandshake internally (same Deno process — no HTTP round-trip needed).
    // We create a minimal base44 client using a service-role pattern.
    const base44 = createClientFromRequest(req);

    const records = await base44.asServiceRole.entities.OfflineHandshake.filter({
      checkpoint_id: checkpointId,
    });

    if (!records.length) {
      return twiml(`Handshake ${checkpointId} not found. Please check the ID and try again.`);
    }

    const h = records[0];

    if (h.status !== 'pending') {
      const statusMsg = h.status === 'completed' ? 'already confirmed' : h.status;
      return twiml(`Handshake ${checkpointId} is ${statusMsg}.`);
    }

    // Idempotency: duplicate Twilio delivery guard
    if (messageSid) {
      const dup = await base44.asServiceRole.entities.OfflineHandshake.filter({ message_sid: messageSid });
      if (dup.length) {
        return twiml(`Handshake ${checkpointId} was already confirmed. No action needed.`);
      }
    }

    const now = new Date().toISOString();
    await base44.asServiceRole.entities.OfflineHandshake.update(h.id, {
      status: 'completed',
      method: 'sms',
      confirmed_by: fromPhone,
      from_phone: fromPhone,
      message_sid: messageSid,
      completed_at: now,
      executed: true,
      executed_at: now,
    });

    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'handshake_sms_confirmed',
      resource_type: 'offline_handshake',
      resource_id: h.id,
      case_id: h.case_id || '',
      actor_id: 'twilio_webhook',
      actor_role: 'system',
      actor_name: `SMS from ${fromPhone}`,
      details: { checkpoint_id: checkpointId, from_phone: fromPhone, message_sid: messageSid },
      sensitive: false,
      timestamp: now,
    });

    const typeLabel = (h.handshake_type || 'checkpoint').replace(/_/g, ' ');
    return twiml(`✓ ${typeLabel} confirmed for case ${h.case_id || 'N/A'}. Thank you.`);

  } catch (err) {
    console.error('[processTwilioHandshake]', err);
    // Return TwiML error — never expose internals in response body
    return twiml('A system error occurred. Please contact your coordinator.');
  }
});
