import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    if (action === 'emergency_pin') {
      const pin = match[1];
      const records = await base44.asServiceRole.entities.OfflineHandshake.filter({ emergency_pin: pin, executed: false });
      if (records.length > 0) {
        await base44.asServiceRole.entities.OfflineHandshake.update(records[0].id, { executed: true, pin_used_at: new Date().toISOString() });
        responseMsg = 'PIN validated. Emergency access granted for 30 minutes.';
        executionResult = 'pin_validated';
      } else {
        responseMsg = 'Invalid or expired PIN.';
        executionResult = 'pin_invalid';
      }
    } else if (action === 'sos_emergency') {
      // Escalate immediately
      if (caseId) {
        const cases = await base44.asServiceRole.entities.CaseRecord.filter({ id: caseId });
        if (cases[0]) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: 'admin@moralesmedical.com',
            subject: `🚨 SOS VIA SMS — Patient ${cases[0].client_name}`,
            body: `<h2 style="color:red;">SOS Emergency via SMS Shortcode</h2>
<p>Patient: ${cases[0].client_name} | Case: ${caseId}</p>
<p>From phone: ${from}</p>
<p>Time: ${new Date().toLocaleString()}</p>
<p style="color:red;"><strong>IMMEDIATE ACTION REQUIRED</strong></p>`
          });
        }
      }
      responseMsg = 'SOS received. Emergency team alerted. Stay where you are.';
      executionResult = 'sos_dispatched';
    } else if (action === 'checkin_safe') {
      responseMsg = 'Check-in recorded. You are marked safe. Thank you.';
      executionResult = 'checkin_safe';
    } else if (action === 'checkin_pain') {
      const painLevel = parseInt(match[1]);
      responseMsg = `Pain level ${painLevel}/10 recorded. ${painLevel >= 7 ? 'Your care team has been alerted.' : 'Thank you for checking in.'}`;
      executionResult = `checkin_pain_${painLevel}`;
      if (painLevel >= 7) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: 'admin@moralesmedical.com',
          subject: `⚠️ High Pain Report via SMS — Level ${painLevel}/10`,
          body: `<p>Patient reported pain level ${painLevel}/10 via SMS from ${from}. Case: ${caseId || 'unknown'}. Please follow up.</p>`
        });
      }
    } else if (action === 'agency_flight_delay') {
      if (caseId) {
        await base44.asServiceRole.entities.CaseRecord.update(caseId, {
          itinerary_status: 'PENDING',
          admin_notes: `SMS shortcode: AGENCY FLIGHT DELAY reported at ${new Date().toISOString()}`
        });
      }
      responseMsg = 'Flight delay logged. Coordinator notified.';
      executionResult = 'flight_delay_logged';
    } else if (action === 'agency_hotel_change') {
      responseMsg = 'Hotel change request logged. Coordinator will contact you.';
      executionResult = 'hotel_change_flagged';
    } else if (action === 'agency_confirm') {
      if (caseId) {
        await base44.asServiceRole.entities.CaseRecord.update(caseId, { itinerary_status: 'CONFIRMED' });
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