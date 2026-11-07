/**
 * twilioSafetySmsWebhook — Inbound SMS handler for M-Care safety system
 *
 * Accepts Twilio POST webhook payloads (From, Body, MessageSid).
 * Parses: SAFE, SAFE <checkpoint>, CHECKIN <checkpoint>, SOS, HELP
 *
 * Returns TwiML-compatible XML response.
 * No user login required — validated by MessageSid idempotency + phone lookup.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHmac } from 'node:crypto';
import { alertContactsOfSosText, findActiveCaseForSender, handleRescueSms } from '../../shared/rescueCardFlow.ts';
import { sameStoredPhone } from '../../shared/phoneMatch.ts';
import { logJourneyEvent } from '../../shared/logJourneyEvent.ts';
import { generateIncidentCode, reportIncident } from '../../shared/incidentReporting.ts';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Escaped, since a reply can now carry characters XML reserves. An empty
// message sends no reply at all (after a STOP).
function twimlReply(message) {
  const safe = String(message || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${safe ? `<Message>${safe}</Message>` : ''}</Response>`,
    { status: 200, headers: { 'Content-Type': 'application/xml' } }
  );
}

// An SOS text that reached nobody must not fail quietly.
async function reportUnheardSos(base44, kind) {
  await Promise.race([
    reportIncident({
      base44,
      incidentCode: generateIncidentCode(),
      severity: 'critical',
      source: 'api',
      feature: 'twilioSafetySmsWebhook',
      errorMessage: `A ${kind} text reached nobody: the care team email failed or ADMIN_EMAIL is not set, and no emergency contact could be reached.`,
    }),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]).catch(() => {});
}

// What the traveler sees in M-Care about their own SOS text, true either way.
function sosJourneyLine(careTeamTold, familyReached) {
  if (familyReached > 0) return 'We received your SOS text. Our safety team and your emergency contacts have been alerted.';
  if (careTeamTold) return 'We received your SOS text and alerted our safety team.';
  return "We received your SOS text, but couldn't reach anyone yet. Please call your local emergency number.";
}

// M PRINCIPLE — this webhook can mark an active safety escalation "acknowledged"
// (suppressing rescue dispatch) or trigger a fake SOS. A forged POST here is a
// life-safety issue, not just a data-integrity one — signature validation is mandatory.
function validateTwilioSignature(url, params, signature, authToken) {
  const sortedKeys = Object.keys(params).sort();
  const str = url + sortedKeys.map((k) => k + params[k]).join('');
  const expected = createHmac('sha1', authToken).update(str).digest('base64');
  return expected === signature;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Parse Twilio form-encoded body
    const text = await req.text();
    const paramsObj = {};
    new URLSearchParams(text).forEach((v, k) => { paramsObj[k] = v; });
    const params = new URLSearchParams(text);

    // ── Signature validation: reject forged webhooks ─────────────────────────
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    if (authToken) {
      const twilioSig = req.headers.get('x-twilio-signature') || '';
      const appUrl = Deno.env.get('APP_URL') || '';
      const webhookUrl = `${appUrl}/api/functions/twilioSafetySmsWebhook`;
      if (!twilioSig || !appUrl || !validateTwilioSignature(webhookUrl, paramsObj, twilioSig, authToken)) {
        console.error('[twilioSafetySmsWebhook] rejected: invalid or missing Twilio signature');
        return twimlReply('Invalid request.');
      }
    } else {
      console.error('[twilioSafetySmsWebhook] TWILIO_AUTH_TOKEN not set — signature validation skipped. Configure this before launch.');
    }

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

    let allCheckIns = [...pending, ...esc2h, ...esc3h]
      .sort((a, b) => new Date(b.scheduled_time) - new Date(a.scheduled_time));
    // The number on a check-in is saved as the traveler typed it
    // ("868-555-0142"), but Twilio always sends +18685550142, so an exact
    // match missed every number typed any other way. Compare digits instead.
    if (allCheckIns.length === 0) {
      const [p2, e2, e3] = await Promise.all([
        base44.asServiceRole.entities.SoloCheckIn.filter({ status: 'pending' }, '-scheduled_time', 200).catch(() => []),
        base44.asServiceRole.entities.SoloCheckIn.filter({ status: 'escalated_2h' }, '-scheduled_time', 200).catch(() => []),
        base44.asServiceRole.entities.SoloCheckIn.filter({ status: 'escalated_3h' }, '-scheduled_time', 200).catch(() => []),
      ]);
      allCheckIns = [...p2, ...e2, ...e3]
        .filter((c) => sameStoredPhone(c.user_phone, from))
        .sort((a, b) => new Date(b.scheduled_time) - new Date(a.scheduled_time));
    }
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

      // Tie the packet to the traveler's trip, so their family is told and
      // their guardian page shows it. It used to be saved with no trip.
      const sosCase = await findActiveCaseForSender(base44, from, caseRef).catch(() => null);

      // Create SOSEvent
      const sosEventData = {
        // The traveler's own email once their trip is found; otherwise the
        // phone, for the care team to link by hand.
        patient_email: sosCase?.client_email || from,
        patient_name: sosCase?.client_name || undefined,
        case_id: sosCase?.id || undefined,
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
            case_id: sosCase?.id || '',
            patient_email: sosCase?.client_email || from,
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
      let wildernessCareTeamTold = false;
      if (adminEmail) {
        try {
          const mapsLink = validCoords
            ? `<a href="https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}">📍 Open in Google Maps</a>`
            : 'No GPS coordinates available';
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'M-Care — Wilderness SOS',
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
          wildernessCareTeamTold = true;
        } catch (_) {}
      }

      // The traveler's own people too, not only the care team inbox.
      let wildernessFamilyReached = 0;
      if (sosCase) {
        wildernessFamilyReached = await alertContactsOfSosText(base44, sosCase, {
          latitude: validCoords ? latitude : null,
          longitude: validCoords ? longitude : null,
        }).catch(() => 0);
        await logJourneyEvent(base44, {
          case_id: sosCase.id,
          client_email: sosCase.client_email,
          event_type: 'sos_text_received',
          source: 'twilioSafetySmsWebhook',
          message_text: sosJourneyLine(wildernessCareTeamTold, wildernessFamilyReached),
          priority: 'critical',
          action_taken: `wilderness SOS text; family reached=${wildernessFamilyReached}`,
          escalation_occurred: true,
        });
      }

      // Say only what really happened.
      if (!wildernessCareTeamTold && wildernessFamilyReached === 0) {
        await reportUnheardSos(base44, 'wilderness SOS');
        return twimlReply('M-Care SOS received, but we could not reach our safety team. Call your local emergency number now.');
      }
      return twimlReply('M-Care SOS received. Our safety team has been alerted. Stay where you are if it is safe.');
    }

    // ── Rescue card: someone helping a traveler whose phone is dead ─────────
    // A stranger texts the code from the traveler's printed card, or answers
    // M-Care's questions. rescueCardFlow.ts alerts the traveler's people and
    // writes the reply. It never touches the check-in below.
    const rescueReply = await handleRescueSms(base44, { from, body: rawBody, now }).catch((e) => {
      console.error('[twilioSafetySmsWebhook] rescue handling failed:', e);
      return null;
    });
    if (rescueReply !== null) {
      await logEntry('rescue_card_message', 'Rescue card text', '');
      return twimlReply(rescueReply);
    }

    // Parse command
    const isSafe = body.startsWith('SAFE') || body.startsWith('CHECKIN');
    // MORALESHELP is the covert keyword we document to users in
    // SoloCheckInSettings ("text MORALESHELP if you cannot speak freely").
    // It had NO inbound handler anywhere — the only three references in the
    // repo were the client-side keystroke trigger, so a patient who texted it
    // in a coercive situation got silence. Treated as an SOS here.
    const isCovertKeyword = body.replace(/\s+/g, '') === 'MORALESHELP';
    const isSOS = body === 'SOS' || body === 'HELP'
      || body.startsWith('SOS ') || body.startsWith('HELP ')
      || isCovertKeyword;

    // ── SOS / HELP ────────────────────────────────────────────────────────────
    if (isSOS) {
      // With no check-in, find the traveler's trip from their number, so the
      // SOS is linked to it and their family can be told.
      const sosCase = checkIn ? null : await findActiveCaseForSender(base44, from).catch(() => null);
      const caseId = checkIn?.case_id || sosCase?.id || '';
      await logEntry(
        'received_sos',
        isCovertKeyword ? 'COVERT SOS received via SMS (MORALESHELP)' : 'SOS received via SMS',
        caseId,
      );

      // Create SOSEvent immediately
      try {
        if (caseId) {
          const patientEmail = checkIn?.user_email || sosCase?.client_email || from;
          const patientName = checkIn?.user_name || sosCase?.client_name || from;
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
      let sosCareTeamTold = false;
      if (adminEmail) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'M-Care Safety — SOS',
            to: adminEmail,
            subject: `🆘 SOS received via SMS from ${from}`,
            body: `<p><strong>SOS / HELP received via inbound SMS.</strong></p><p>Phone: ${from}</p><p>Case ID: ${caseId || 'Unknown'}</p><p>Time: ${now}</p><p>Immediate human intervention required.</p>`,
          });
          sosCareTeamTold = true;
        } catch (_) {}
      }

      if (checkIn) {
        await base44.asServiceRole.entities.SoloCheckIn.update(checkIn.id, {
          security_dispatched_at: now,
          escalation_level: 'security_dispatched',
          status: 'escalated_5h',
        }).catch(() => {});
      }

      // The covert keyword gets a deliberately innocuous reply: the whole point
      // is that the patient may be under observation, so an explicit "SOS
      // received / help dispatched" on their lock screen could put them in
      // more danger. Escalation above is identical either way.
      // With no check-in, the check-in ladder isn't handling this, so the
      // traveler's own people are told now too.
      let sosFamilyReached = 0;
      if (!checkIn && sosCase) {
        sosFamilyReached = await alertContactsOfSosText(base44, sosCase, {}).catch(() => 0);
        await logJourneyEvent(base44, {
          case_id: sosCase.id,
          client_email: sosCase.client_email,
          event_type: 'sos_text_received',
          source: 'twilioSafetySmsWebhook',
          message_text: sosJourneyLine(sosCareTeamTold, sosFamilyReached),
          priority: 'critical',
          action_taken: `SOS text with no check-in; family reached=${sosFamilyReached}`,
          escalation_occurred: true,
        });
      }

      // Say only what really happened. With a check-in, the security step
      // above really does send help.
      const anyoneTold = !!checkIn || sosCareTeamTold || sosFamilyReached > 0;
      if (!anyoneTold) await reportUnheardSos(base44, isCovertKeyword ? 'covert SOS' : 'SOS');
      if (isCovertKeyword) return twimlReply('Thanks for your message. Your M-Care account is up to date.');
      if (checkIn) return twimlReply('SOS received. M-Care emergency team has been alerted. Stay where you are. Help is being dispatched.');
      if (anyoneTold) {
        return twimlReply('SOS received. The M-Care safety team has been alerted. If you are in danger, call your local emergency number now.');
      }
      return twimlReply('SOS received, but we could not reach our safety team. Call your local emergency number now.');
    }

    // ── SAFE / CHECKIN ────────────────────────────────────────────────────────
    if (isSafe) {
      if (!checkIn) {
        await logEntry('safe_no_checkin_found', 'No active check-in found for phone', '');
        return twimlReply('Thank you for confirming. We could not find an active check-in for your number. Please log in to your M-Care dashboard if needed.');
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
              from_name: 'M-Care Safety',
              to: adminEmail,
              subject: `✅ ${checkIn.user_name || 'Traveler'} confirmed safe via SMS`,
              body: `<p>${checkIn.user_name || checkIn.user_email} replied SAFE via SMS. Check-in acknowledged. Escalation resolved for case ${checkIn.case_id}.</p><p>Phone: ${from} | Time: ${now}</p>`,
            });
          } catch (_) {}
        }
      }

      // No name: an SMS confirmation lands on a lock screen, and "Thank you,
      // <full name>! You are marked safe" told anyone holding the handset who
      // this person is and that they are a M-Care patient. The confirmation
      // is just as clear without it.
      return twimlReply('You are marked safe. Thank you. Your next check-in is in 12 hours.');
    }

    // ── Unrecognized command ─────────────────────────────────────────────────
    //
    // The comms policy makes email/SMS/WhatsApp notification-only and says an
    // inbound reply is never processed as part of a workflow. This line is the
    // deliberate exception, for the same reason emergency dispatch is: it is
    // the SAFETY number, documented to patients as what to text when they have
    // no data. Answering "please log in to the app" to someone who cannot reach
    // the app is not a privacy win, it is an abandoned patient.
    //
    // So the safety commands stay live here, and the redirect is appended for
    // everything else — a reply to a notification gets pointed back to the app
    // without losing the SAFE/SOS lifeline.
    await logEntry('unrecognized_command', `Body: ${body}`, checkIn?.case_id || '');
    return twimlReply(
      'M-Care Safety: Reply SAFE to confirm you are okay, or SOS for emergency help. '
      + 'For anything else, please log in to the M-Care app — we do not handle requests by reply.',
    );

  } catch (err) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Error processing request. Please contact M-Care support.</Message></Response>`,
      { status: 200, headers: { 'Content-Type': 'application/xml' } }
    );
  }
});