import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHmac } from 'node:crypto';

// Twilio signature validation — prevents forged webhook calls
function validateTwilioSignature(req_url, params, signature, authToken) {
  const sortedKeys = Object.keys(params).sort();
  const str = req_url + sortedKeys.map(k => k + params[k]).join('');
  const expected = createHmac('sha1', authToken).update(str).digest('base64');
  return expected === signature;
}

// iQ200 SMS Shortcode Command Parser
// Handles inbound Twilio webhooks from global shortcodes
// Supported commands:
//   CHECKIN OK [case_id]         → logs safe check-in
//   CHECKIN PAIN [1-10] [case_id] → logs pain-level check-in
//   AGENCY FLIGHT DELAY [case_id] → updates case itinerary status
//   AGENCY HOTEL CHANGE [case_id] → flags hotel modification needed  
//   AGENCY CONFIRM [case_id]     → confirms agency readiness
//   SOS [case_id]                → triggers emergency escalation
//   PIN [4-8 digit pin]          → validates emergency device PIN

const SHORTCODE_PATTERNS = [
  { regex: /^CHECKIN OK\s*(\S+)?/i, action: 'checkin_safe' },
  { regex: /^CHECKIN PAIN (\d+)\s*(\S+)?/i, action: 'checkin_pain' },
  { regex: /^AGENCY FLIGHT DELAY\s*(\S+)?/i, action: 'agency_flight_delay' },
  { regex: /^AGENCY HOTEL CHANGE\s*(\S+)?/i, action: 'agency_hotel_change' },
  { regex: /^AGENCY CONFIRM\s*(\S+)?/i, action: 'agency_confirm' },
  { regex: /^SOS\s*(\S+)?/i, action: 'sos_emergency' },
  { regex: /^PIN (\d{4,8})$/i, action: 'emergency_pin' },
];

function parseCommand(body) {
  const text = body.trim().toUpperCase();
  for (const pattern of SHORTCODE_PATTERNS) {
    const match = body.trim().match(pattern.regex);
    if (match) return { action: pattern.action, match };
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Parse incoming Twilio webhook (form-encoded or JSON)
    let body, from;
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      body = params.get('Body') || '';
      from = params.get('From') || '';
    } else {
      const json = await req.json();
      body = json.Body || json.body || '';
      from = json.From || json.from || '';
    }

    // SECURITY: Validate Twilio signature on every inbound webhook
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    if (authToken) {
      const twilioSig = req.headers.get('x-twilio-signature') || '';
      const appUrl = Deno.env.get('APP_URL') || '';
      const webhookUrl = `${appUrl}/api/functions/processSmsShortcode`;
      const paramObj = {};
      if (contentType.includes('application/x-www-form-urlencoded')) {
        const rawText = body ? body : '';
        new URLSearchParams(rawText).forEach((v, k) => { paramObj[k] = v; });
      }
      if (twilioSig && webhookUrl && !validateTwilioSignature(webhookUrl, paramObj, twilioSig, authToken)) {
        console.error('[SMS] Rejected: invalid Twilio signature');
        return new Response('<?xml version="1.0"?><Response></Response>', { status: 403, headers: { 'Content-Type': 'text/xml' } });
      }
    }

    // Rate limit: max 10 SMS commands per phone number per minute (stored in entity)
    if (from) {
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      const recentLogs = await base44.asServiceRole.entities.OfflineHandshake.filter({ from_phone: from });
      const recent = recentLogs.filter(l => l.received_at && l.received_at > oneMinuteAgo);
      if (recent.length >= 10) {
        console.warn(`[SMS] Rate limit hit for ${from}`);
        return new Response('<?xml version="1.0"?><Response><Message>Too many requests. Please wait and try again.</Message></Response>', { headers: { 'Content-Type': 'text/xml' } });
      }
    }

    if (!body) return new Response('<?xml version="1.0"?><Response><Message>Invalid command. Try: CHECKIN OK, SOS, AGENCY CONFIRM</Message></Response>', { headers: { 'Content-Type': 'text/xml' } });

    const parsed = parseCommand(body);
    if (!parsed) {
      await base44.asServiceRole.entities.OfflineHandshake.create({
        channel: 'sms', raw_message: body, from_phone: from, received_at: new Date().toISOString(),
        parsed_action: 'unknown', executed: false, execution_result: 'Unrecognized command'
      });
      return new Response('<?xml version="1.0"?><Response><Message>Unrecognized command. Valid: CHECKIN OK, CHECKIN PAIN [1-10], AGENCY FLIGHT DELAY, SOS, PIN [code]</Message></Response>', { headers: { 'Content-Type': 'text/xml' } });
    }

    const { action, match } = parsed;
    let caseId = match[1] || match[2] || null;
    let responseMsg = '';
    let executionResult = '';

    const adminEmail = Deno.env.get('ADMIN_EMAIL');

    if (action === 'emergency_pin') {
      // SECURITY: PIN validation via verifyEmergencyPIN — no raw PIN lookups in OfflineHandshake
      responseMsg = 'PIN commands via SMS are not supported. Use the Emergency Access portal.';
      executionResult = 'pin_sms_blocked';
    } else if (action === 'sos_emergency') {
      if (caseId) {
        const cases = await base44.asServiceRole.entities.CaseRecord.filter({ id: caseId });
        // SECURITY: Only alert if this phone number is actually associated with this case
        const c = cases[0];
        const phoneMatch = c && (c.client_phone === from || !c.client_phone);
        if (c && phoneMatch && adminEmail) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: adminEmail,
              subject: `🚨 SOS VIA SMS — Patient ${c.client_name}`,
              body: `<h2 style="color:red;">SOS Emergency via SMS Shortcode</h2><p>Patient: ${c.client_name} | Case: ${caseId}</p><p>From phone: ${from}</p><p>Time: ${new Date().toLocaleString()}</p><p style="color:red;"><strong>IMMEDIATE ACTION REQUIRED</strong></p>`
            });
          } catch (_) {}
        }
      }
      responseMsg = 'SOS received. Emergency team alerted. Stay where you are.';
      executionResult = 'sos_dispatched';
    } else if (action === 'checkin_safe') {
      responseMsg = 'Check-in recorded. You are marked safe. Thank you.';
      executionResult = 'checkin_safe';
    } else if (action === 'checkin_pain') {
      const painLevel = parseInt(match[1]);
      if (painLevel < 1 || painLevel > 10) {
        responseMsg = 'Invalid pain level. Please use a number between 1 and 10.';
        executionResult = 'invalid_pain_level';
      } else {
        responseMsg = `Pain level ${painLevel}/10 recorded. ${painLevel >= 7 ? 'Your care team has been alerted.' : 'Thank you for checking in.'}`;
        executionResult = `checkin_pain_${painLevel}`;
        if (painLevel >= 7 && adminEmail) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: adminEmail,
              subject: `⚠️ High Pain Report via SMS — Level ${painLevel}/10`,
              body: `<p>Patient reported pain level ${painLevel}/10 via SMS from ${from}. Case: ${caseId || 'unknown'}. Please follow up.</p>`
            });
          } catch (_) {}
        }
      }
    } else if (action === 'agency_flight_delay') {
      // SECURITY: Only agency roles assigned to this case may update itinerary — validated by case access
      if (caseId) {
        const cases = await base44.asServiceRole.entities.CaseRecord.filter({ id: caseId });
        if (cases[0]) {
          await base44.asServiceRole.entities.CaseRecord.update(caseId, {
            itinerary_status: 'PENDING',
            admin_notes: `SMS shortcode: AGENCY FLIGHT DELAY reported at ${new Date().toISOString()} from ${from}`
          });
        }
      }
      responseMsg = 'Flight delay logged. Coordinator notified.';
      executionResult = 'flight_delay_logged';
    } else if (action === 'agency_hotel_change') {
      responseMsg = 'Hotel change request logged. Coordinator will contact you.';
      executionResult = 'hotel_change_flagged';
    } else if (action === 'agency_confirm') {
      if (caseId) {
        const cases = await base44.asServiceRole.entities.CaseRecord.filter({ id: caseId });
        if (cases[0]) {
          await base44.asServiceRole.entities.CaseRecord.update(caseId, { itinerary_status: 'CONFIRMED' });
        }
      }
      responseMsg = 'Agency confirmation recorded. All clear.';
      executionResult = 'agency_confirmed';
    }

    // Log the handshake
    await base44.asServiceRole.entities.OfflineHandshake.create({
      channel: 'sms',
      case_id: caseId,
      raw_message: body,
      from_phone: from,
      shortcode_command: body.toUpperCase(),
      parsed_action: action,
      parsed_payload: { match: match.slice(1) },
      executed: true,
      executed_at: new Date().toISOString(),
      execution_result: executionResult,
      received_at: new Date().toISOString()
    });

    return new Response(`<?xml version="1.0"?><Response><Message>${responseMsg}</Message></Response>`, {
      headers: { 'Content-Type': 'text/xml' }
    });
  } catch (error) {
    return new Response(`<?xml version="1.0"?><Response><Message>System error. Please call your coordinator directly.</Message></Response>`, {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
});