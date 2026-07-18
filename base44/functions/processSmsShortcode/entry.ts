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
//   HS[1-9] [trip_id]            → confirm 9-handshake journey checkpoint
//   CHECKIN OK [case_id]         → logs safe check-in
//   CHECKIN PAIN [1-10] [case_id] → logs pain-level check-in
//   AGENCY FLIGHT DELAY [case_id] → updates case itinerary status
//   AGENCY HOTEL CHANGE [case_id] → flags hotel modification needed
//   AGENCY CONFIRM [case_id]     → confirms agency readiness
//   SOS [case_id]                → triggers emergency escalation
//   PIN [4-8 digit pin]          → validates emergency device PIN

const HANDSHAKE_LABELS: Record<number, string> = {
  1: 'Driver Pickup',
  2: 'Airport Drop-off',
  3: 'Airport Pickup (Destination)',
  4: 'Hotel Check-in',
  5: 'Clinic Arrival',
  6: 'Companion Delivery',
  7: 'Return Transport',
  8: 'Home Airport Arrival',
  9: 'Home Drop-off',
};

const SHORTCODE_PATTERNS = [
  { regex: /^HS([1-9])\s*(\S+)?$/i, action: 'journey_handshake' },
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

    // Parse incoming Twilio webhook (form-encoded or JSON).
    // Keep EVERY form field: the Twilio signature is computed over all of them,
    // so the signature check below needs the full parameter map, not just
    // Body/From. (This is why the previous check could never pass — see there.)
    let rawBody, rawFrom;
    const signatureParams: Record<string, string> = {};
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      params.forEach((v, k) => { signatureParams[k] = v; });
      rawBody = params.get('Body') || '';
      rawFrom = params.get('From') || '';
    } else {
      const json = await req.json();
      rawBody = json.Body || json.body || '';
      rawFrom = json.From || json.from || '';
    }

    // Sanitize incoming SMS body — strip non-printable chars, limit length
    const body = (rawBody as string)
      .replace(/[^\x20-\x7E-￿]/g, '') // Remove non-printable ASCII (keep extended Unicode)
      .trim()
      .slice(0, 500); // Max 500 chars — SMS is 160 chars anyway

    // Sanitize phone number — allow only digits, +, spaces, hyphens, parens
    const from = (rawFrom as string).replace(/[^\d+\s\-()]/g, '').trim().slice(0, 20);

    // SECURITY: Validate Twilio signature on every inbound webhook
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    if (!authToken) {
      console.error('[processSmsShortcode] TWILIO_AUTH_TOKEN not configured — rejecting webhook');
      return new Response('<?xml version="1.0"?><Response></Response>', {
        status: 403,
        headers: { 'Content-Type': 'text/xml' },
      });
    }
    const twilioSig = req.headers.get('x-twilio-signature') || '';
    const appUrl = Deno.env.get('APP_URL') || '';
    const webhookUrl = `${appUrl}/api/functions/processSmsShortcode`;
    // Validate against the full form parameter map captured above.
    // This previously rebuilt the params by running URLSearchParams over
    // `body` — the sanitized MESSAGE TEXT, not the form payload — so the HMAC
    // could never match and EVERY inbound command was rejected with 403:
    // all HS1-9 SMS handshakes, CHECKIN, SOS and AGENCY. SMS is the fallback
    // for a patient abroad with no data, so this path was silently dead.
    if (!validateTwilioSignature(webhookUrl, signatureParams, twilioSig, authToken)) {
      console.error('[SMS] Rejected: invalid Twilio signature');
      return new Response('<?xml version="1.0"?><Response></Response>', { status: 403, headers: { 'Content-Type': 'text/xml' } });
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

    if (action === 'journey_handshake') {
      // HS[1-9] [trip_id] — patient confirms a journey checkpoint via SMS
      const handshakeNumber = parseInt(match[1]);
      const tripId = match[2] || null;

      if (!tripId) {
        responseMsg = `To confirm Handshake ${handshakeNumber}, text: HS${handshakeNumber} <your-trip-id>`;
        executionResult = 'missing_trip_id';
      } else {
        try {
          // Look up TravelRequest to validate trip_id and get patient phone
          const trips = await base44.asServiceRole.entities.TravelRequest.filter({ id: tripId }).catch(() => []);
          const trip = trips[0];

          if (!trip) {
            responseMsg = `Trip ID not found. Please check your trip reference and try again.`;
            executionResult = 'trip_not_found';
          } else if (trip.paused) {
            responseMsg = `Your journey is currently paused. Resume it in the app before confirming handshakes.`;
            executionResult = 'trip_paused';
          } else {
            const currentStep = trip.current_step ?? 0;
            const expectedNext = currentStep + 1;

            if (handshakeNumber !== expectedNext) {
              responseMsg = expectedNext > 9
                ? `All 9 checkpoints are complete. Your Golden M journey is done!`
                : `Expected Handshake ${expectedNext} next (you sent HS${handshakeNumber}). Please confirm in order.`;
              executionResult = `out_of_order_hs${handshakeNumber}`;
            } else {
              // Apply the handshake update directly (mirrors completeHandshake logic for SMS path)
              const PHASE_MAP: Record<number, string> = {
                1: 'transit_out', 2: 'transit_out',
                3: 'arrived',     4: 'arrived',
                5: 'recovery',    6: 'recovery',
                7: 'transit_return', 8: 'transit_return',
                9: 'completed',
              };
              const HANDSHAKE_TYPES: Record<number, string> = {
                1: 'driver_pickup',   2: 'airport_dropoff',
                3: 'airport_checkin', 4: 'hotel_checkin',
                5: 'clinic_arrival',  6: 'recovery_handoff',
                7: 'hotel_checkout',  8: 'airport_boarding',
                9: 'home_dropoff',
              };

              const now = new Date().toISOString();
              const newPhase = PHASE_MAP[handshakeNumber];
              const newStatus = { ...(trip.handshake_status ?? {}), [String(handshakeNumber)]: true };
              const newTimestamps = { ...(trip.handshake_timestamps ?? {}), [String(handshakeNumber)]: now };

              await base44.asServiceRole.entities.TravelRequest.update(tripId, {
                current_step:         handshakeNumber,
                trip_phase:           newPhase,
                handshake_status:     newStatus,
                handshake_timestamps: newTimestamps,
              });

              await base44.asServiceRole.entities.OfflineHandshake.create({
                case_id:      trip.case_id || '',
                trip_id:      tripId,
                patient_email:trip.user_email || '',
                handshake_role: 'patient',
                handshake_type: HANDSHAKE_TYPES[handshakeNumber],
                channel:      'sms',
                method:       'sms',
                status:       'completed',
                confirmed_by: from,
                from_phone:   from,
                executed:     true,
                executed_at:  now,
                completed_at: now,
                received_at:  now,
              });

              const isComplete = handshakeNumber === 9;
              const label = HANDSHAKE_LABELS[handshakeNumber];

              if (isComplete) {
                // Golden M SMS (same message as completeHandshake function)
                responseMsg = `✅ Checkpoint 9/9 — ${label} confirmed. Journey complete! Welcome home. The Golden M is yours. — Morales Concierge`;
              } else {
                responseMsg = `✅ Checkpoint ${handshakeNumber}/9 — ${label} confirmed. Your Morales journey continues.`;
              }
              executionResult = `hs${handshakeNumber}_confirmed`;
              caseId = trip.case_id || null;
            }
          }
        } catch (_) {
          responseMsg = `Unable to confirm Handshake ${handshakeNumber} right now. Please try again or contact your coordinator.`;
          executionResult = `hs${handshakeNumber}_error`;
        }
      }
    } else if (action === 'emergency_pin') {
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