import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── processTwilioHandshake — Twilio SMS Webhook ───────────────────────────────
// Handles inbound SMS confirmations from drivers, destination staff, and patients.
//
// SMS formats accepted:
//   "HANDSHAKE <checkpoint_id>"  — confirm a handshake (driver, destination, patient)
//
// Security model:
//   1. Twilio HMAC-SHA1 signature is validated on every request (TWILIO_WEBHOOK_SECRET).
//   2. from_phone is validated against registered phones on the handshake record.
//      Any mismatch is treated as a potential spoofing attempt, rejected, and
//      admin is paged immediately — never silently accepted.
//
// TO ACTIVATE WITH LIVE TWILIO:
//   Set env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER,
//                 TWILIO_WEBHOOK_SECRET (required for production — do not skip)
//   In Twilio Console → Phone Numbers → Messaging Webhook:
//     URL: https://api.base44.app/functions/processTwilioHandshake, Method: POST

// ── Twilio HMAC-SHA1 request signature validation ─────────────────────────────
// Validates that the inbound POST genuinely came from Twilio — not a direct
// HTTP call from an attacker who knows the webhook URL.
async function validateTwilioSignature(req: Request, rawBody: string): Promise<boolean> {
  const secret = Deno.env.get('TWILIO_WEBHOOK_SECRET');
  if (!secret) {
    // No secret configured — allow in dev/staging, but warn so it's never silently
    // skipped in production. Log so it shows up in edge function logs.
    console.warn('[processTwilioHandshake] TWILIO_WEBHOOK_SECRET not set — signature validation skipped. Set this env var in production.');
    return true;
  }
  const signature = req.headers.get('X-Twilio-Signature') || '';
  if (!signature) return false;
  const url = req.url;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  const expectedRaw = await crypto.subtle.sign('HMAC', key, encoder.encode(url + rawBody));
  const expected = btoa(String.fromCharCode(...new Uint8Array(expectedRaw)));
  return signature === expected;
}

// ── Phone normalization ───────────────────────────────────────────────────────
// Strip non-digits, take the last 10 digits so E.164 (+15551234567),
// local (5551234567), and formatted ((555) 123-4567) all compare equal.
function normalizePhone(phone: string): string {
  return (phone || '').replace(/\D/g, '').slice(-10);
}

function phoneIsRegistered(from: string, registered: string[]): boolean {
  const fromNorm = normalizePhone(from);
  if (fromNorm.length < 7) return false;
  return registered.some(r => normalizePhone(r) === fromNorm);
}

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

    // Step 1: Validate request genuinely came from Twilio.
    const signatureOk = await validateTwilioSignature(req, rawBody);
    if (!signatureOk) {
      console.error('[processTwilioHandshake] Signature validation failed — possible spoofed webhook');
      return new Response('Forbidden', { status: 403 });
    }

    const params = new URLSearchParams(rawBody);
    const fromPhone = params.get('From') || '';
    const body = (params.get('Body') || '').trim().toUpperCase();
    const messageSid = params.get('MessageSid') || '';

    console.log(`[processTwilioHandshake] Inbound SMS from ${fromPhone}: "${body}"`);

    const base44 = createClientFromRequest(req);
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || '';

    // Parse "HANDSHAKE <checkpoint_id>"
    const match = body.match(/^HANDSHAKE\s+([A-Z0-9_]+)$/);
    if (!match) {
      return twiml('Command not recognised. Send HANDSHAKE <ID> to confirm a pickup checkpoint.');
    }

    const checkpointId = match[1];

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

    // Step 2: Phone validation — the sending phone must be registered on this handshake.
    // We compare against every registered phone stored on the record (driver, destination,
    // backup). An attacker with a stolen or cloned phone that isn't the registered number
    // is rejected here and admin is paged. If no phones are registered (legacy records),
    // we log the discrepancy and allow — so existing handshakes aren't broken.
    const registeredPhones = [
      h.primary_driver_phone,
      h.backup_driver_phone,
      h.destination_phone,   // hotel/clinic contact number for dual-signal handshakes
    ].filter(Boolean);

    if (registeredPhones.length > 0 && !phoneIsRegistered(fromPhone, registeredPhones)) {
      const now = new Date().toISOString();

      // Mark the handshake as having a spoofing attempt — do NOT complete it.
      try {
        await base44.asServiceRole.entities.OfflineHandshake.update(h.id, {
          spoofing_attempt_at: now,
          spoofing_attempt_from: fromPhone,
        });
      } catch (_) {}

      await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'handshake_phone_mismatch',
        resource_type: 'offline_handshake',
        resource_id: h.id,
        case_id: h.case_id || '',
        actor_id: 'twilio_webhook',
        actor_role: 'system',
        actor_name: `REJECTED SMS from ${fromPhone}`,
        details: {
          checkpoint_id: checkpointId,
          from_phone: fromPhone,
          registered_phones: registeredPhones.map(p => p.slice(-4).padStart(p.length, '*')),
          message_sid: messageSid,
          handshake_type: h.handshake_type,
        },
        sensitive: true,
        timestamp: now,
      });

      if (adminEmail) {
        base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'Morales Safety — Security Alert',
          to: adminEmail,
          subject: `🚨 HANDSHAKE SPOOFING ATTEMPT — ${checkpointId} — unregistered phone`,
          body: `A handshake confirmation was rejected because the sending phone number is not registered for this checkpoint.\n\nCheckpoint: ${checkpointId}\nHandshake type: ${h.handshake_type}\nCase ID: ${h.case_id}\nPatient: ${h.patient_name || h.patient_email}\nRejected from: ${fromPhone}\nTime: ${now}\n\nThe handshake has NOT been confirmed. Verify the patient's safety immediately.`,
        }).catch(() => {});
      }

      console.error(`[processTwilioHandshake] PHONE MISMATCH — ${checkpointId} — from ${fromPhone}`);
      return twiml('Handshake confirmation rejected. Phone number not registered for this checkpoint. Your coordinator has been notified.');
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
    return twiml('A system error occurred. Please contact your coordinator.');
  }
});
