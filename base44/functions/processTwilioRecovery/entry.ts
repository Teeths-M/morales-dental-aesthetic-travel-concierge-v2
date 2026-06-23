import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── processTwilioRecovery — Twilio SMS Webhook ────────────────────────────────
// STUB: Ready for live Twilio credentials. Parses patient SMS recovery check-ins.
//
// TO ACTIVATE WITH LIVE TWILIO:
//   1. Set env vars in Base44 project settings:
//        TWILIO_ACCOUNT_SID   = ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
//        TWILIO_AUTH_TOKEN    = your_auth_token
//        TWILIO_PHONE_NUMBER  = +1XXXXXXXXXX
//   2. In Twilio Console → Phone Numbers → your number → Messaging Webhook:
//        URL: https://api.base44.app/functions/processTwilioRecovery
//        Method: HTTP POST
//   3. Uncomment the Twilio request signature validation block below.
//
// SMS format (patient sends):
//   RECOVERY <pain 1-10> <mobility 1-5> <appetite 1-5> <wound: GOOD|CONCERNING|BAD>
//   Optional trailing free text for notes.
//
//   Examples:
//     "RECOVERY 3 4 5 GOOD"
//     "RECOVERY 7 2 3 BAD feeling worse today"
//
// On parse success: calls checkRecoveryAnomaly internally with submitted_via='sms'.
// Looks up the patient's active RecoverySession by phone number (from_phone).

// Twilio signature validation — uncomment for production
// async function validateTwilioSignature(req, rawBody) {
//   const secret    = Deno.env.get('TWILIO_WEBHOOK_SECRET');
//   if (!secret) return true;
//   const signature = req.headers.get('X-Twilio-Signature') || '';
//   const key = await crypto.subtle.importKey(
//     'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
//   );
//   const raw = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(req.url + rawBody));
//   return signature === btoa(String.fromCharCode(...new Uint8Array(raw)));
// }

function twiml(message) {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  );
}

const WOUND_MAP = { GOOD: 'good', CONCERNING: 'concerning', BAD: 'bad' };

function parseRecoverySms(body) {
  // Normalise: uppercase, trim extra spaces
  const upper   = body.trim().toUpperCase();
  const match   = upper.match(/^RECOVERY\s+(\d+)\s+(\d+)\s+(\d+)\s+(GOOD|CONCERNING|BAD)(.*)$/);
  if (!match) return null;

  const pain        = parseInt(match[1], 10);
  const mobility    = parseInt(match[2], 10);
  const appetite    = parseInt(match[3], 10);
  const wound       = WOUND_MAP[match[4]];
  const notesTail   = match[5]?.trim().toLowerCase() || '';

  // Range validation
  if (pain < 1 || pain > 10)     return null;
  if (mobility < 1 || mobility > 5) return null;
  if (appetite < 1 || appetite > 5) return null;

  return { pain_level: pain, mobility, appetite, wound_status: wound, notes: notesTail };
}

Deno.serve(async (req) => {
  try {
    const rawBody   = await req.text();
    const params    = new URLSearchParams(rawBody);
    const fromPhone = params.get('From') || '';
    const body      = (params.get('Body') || '').trim();
    const messageSid = params.get('MessageSid') || '';

    // MOCK: log incoming SMS
    console.log(`[processTwilioRecovery] MOCK inbound SMS from ${fromPhone}: "${body}"`);

    // Only handle RECOVERY commands — pass other messages through
    if (!body.toUpperCase().startsWith('RECOVERY')) {
      return twiml('Morales: For recovery check-in send: RECOVERY <pain 1-10> <mobility 1-5> <appetite 1-5> <GOOD|CONCERNING|BAD>');
    }

    const parsed = parseRecoverySms(body);
    if (!parsed) {
      return twiml(
        'Morales: Could not parse your check-in. Format: RECOVERY 3 4 5 GOOD (pain mobility appetite wound). ' +
        'Pain 1-10, Mobility 1-5, Appetite 1-5, Wound: GOOD CONCERNING or BAD.'
      );
    }

    // Look up the patient's active session by phone number
    const base44 = createClientFromRequest(req);
    const sessions = await base44.asServiceRole.entities.RecoverySession.filter({
      is_active: true,
    }).catch(() => []);

    // Match by patient_phone stored in linked CaseRecord (best-effort)
    let matchedSession = null;
    for (const s of sessions) {
      if (!s.case_id) continue;
      try {
        const cr = await base44.asServiceRole.entities.CaseRecord.get(s.case_id);
        if (cr && cr.client_phone === fromPhone) { matchedSession = s; break; }
      } catch (_) {}
    }

    if (!matchedSession) {
      return twiml(
        'Morales: Could not match your phone number to an active recovery session. ' +
        'Please check in via the app or contact your coordinator.'
      );
    }

    // Idempotency: check if already submitted today (MessageSid guard)
    const todayStr = new Date().toISOString().slice(0, 10);
    const existing = await base44.asServiceRole.entities.RecoveryLog.filter({
      session_id: matchedSession.id, date: todayStr,
    }).catch(() => []);
    if (existing.length > 0) {
      return twiml(`Morales: Your check-in for today (${todayStr}) has already been recorded. Thank you!`);
    }

    // Submit via checkRecoveryAnomaly
    const res = await base44.functions.invoke('checkRecoveryAnomaly', {
      session_id:   matchedSession.id,
      case_id:      matchedSession.case_id,
      pain_level:   parsed.pain_level,
      mobility:     parsed.mobility,
      appetite:     parsed.appetite,
      wound_status: parsed.wound_status,
      notes:        parsed.notes || `SMS check-in from ${fromPhone}`,
      submitted_via: 'sms',
    }).catch(e => ({ data: { error: e.message } }));

    if (res.data?.error) {
      return twiml(`Morales: Check-in received but could not be saved: ${res.data.error}. Please try again or contact your coordinator.`);
    }

    const severity = res.data?.anomaly_severity || 'none';
    if (severity === 'escalate') {
      return twiml(
        `Morales: Check-in received (Pain ${parsed.pain_level}, Mobility ${parsed.mobility}, Appetite ${parsed.appetite}, Wound ${parsed.wound_status}). ` +
        'Your care team has been alerted and will contact you shortly. If this is an emergency, call local emergency services immediately.'
      );
    }
    if (severity === 'warning') {
      return twiml(
        `Morales: Check-in received. Some values are a little lower than expected — your coordinator has been notified. ` +
        `Reply RECOVERY again tomorrow or contact your coordinator if you need immediate help.`
      );
    }
    return twiml(
      `Morales: Check-in received ✓ (Pain ${parsed.pain_level}/10, Mobility ${parsed.mobility}/5, Appetite ${parsed.appetite}/5, Wound: ${parsed.wound_status}). Keep recovering well!`
    );

  } catch (err) {
    console.error('[processTwilioRecovery]', err);
    return twiml('Morales: A system error occurred. Please try again or contact your coordinator.');
  }
});
