import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { computePrevHash } from '../_shared/auditHashChain.ts';

/**
 * receiveSatelliteWebhook
 *
 * Public webhook endpoint — Rock Seven calls this URL whenever a patient's
 * RockBLOCT device transmits a Mobile-Originated (MO) message via satellite.
 *
 * Rock Seven POST payload (application/x-www-form-urlencoded):
 *   imei          — 15-digit device IMEI
 *   momsn         — MO message sequence number
 *   transmit_time — UTC timestamp "YY-MM-DD HH:MM:SS"
 *   iridium_latitude  / iridium_longitude — approximate Iridium beam position
 *   iridium_cep   — location accuracy in km
 *   data          — hex-encoded payload string from the device
 *
 * Configure in Rock Seven Online → Device → Delivery Groups → HTTP POST
 * URL: https://your-base44-url/receiveSatelliteWebhook
 *
 * Garmin inReach users reply via SMS — routed through the existing Twilio
 * webhook (twilioSmsHandshakeWebhook). No separate endpoint needed.
 *
 * What this function does:
 *  1. Identify the patient by IMEI → SatelliteDevice → CaseRecord
 *  2. Decode the hex message
 *  3. Parse "SAFE", "SOS", or free-text
 *  4. Update GPS position + last_ping_at
 *  5. If "SAFE" → mark solo check-in confirmed, halt escalation
 *  6. If "SOS"  → trigger full security dispatch immediately
 *  7. Notify admin + Guardian View
 *  8. Return 200 (Rock Seven retries on non-200)
 */

const BRAND = 'Morales Concierge';

/**
 * Is this POST provably from Rock Seven, or could anyone have sent it?
 *
 * Rock Seven does not sign its callbacks, so the shared secret travels in the
 * delivery-group URL (…/receiveSatelliteWebhook?s=<SATELLITE_WEBHOOK_SECRET>);
 * an X-Satellite-Secret header is also accepted for manual testing.
 *
 * This is NOT a gate that rejects the request — see the asymmetric trust rule
 * at the call site. An IMEI is not a secret (it is printed on the device and
 * its packaging), so without this check anyone able to guess one could speak
 * for a patient's device.
 */
function satelliteVerified(req: Request): boolean {
  const secret = Deno.env.get('SATELLITE_WEBHOOK_SECRET');
  if (!secret) return false; // unset ⇒ nothing is verified, never "everything is"
  const provided =
    new URL(req.url).searchParams.get('s') ||
    req.headers.get('x-satellite-secret') ||
    req.headers.get('X-Satellite-Secret') ||
    '';
  return provided.length === secret.length && provided === secret;
}

function hexToString(hex: string): string {
  if (!hex) return '';
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

async function sendSms(to: string, body: string) {
  const sid  = Deno.env.get('TWILIO_ACCOUNT_SID');
  const auth = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !auth || !from || !to) return;
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${auth}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  }).catch(() => {});
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Parse Rock Seven POST body
    let imei = '', momsn = '', data = '', transmit_time = '';
    let iridium_latitude = 0, iridium_longitude = 0;

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text   = await req.text();
      const params = new URLSearchParams(text);
      imei               = params.get('imei')              || '';
      momsn              = params.get('momsn')             || '';
      data               = params.get('data')              || '';
      transmit_time      = params.get('transmit_time')     || '';
      iridium_latitude   = parseFloat(params.get('iridium_latitude')  || '0');
      iridium_longitude  = parseFloat(params.get('iridium_longitude') || '0');
    } else {
      // Also accept JSON for testing
      const json = await req.json().catch(() => ({}));
      imei              = json.imei || '';
      data              = json.data || '';
      iridium_latitude  = json.iridium_latitude  || 0;
      iridium_longitude = json.iridium_longitude || 0;
    }

    if (!imei) return Response.json({ error: 'imei required' }, { status: 400 });

    const now        = new Date().toISOString();
    const decoded    = hexToString(data).trim().toUpperCase();
    const isSafe     = decoded.includes('SAFE') || decoded === 'S' || decoded === 'OK';
    const isSOS      = decoded.includes('SOS')  || decoded === 'HELP' || decoded === 'EMERGENCY';

    // ── Asymmetric trust: an unverified message may RAISE alarm, never CLEAR it ─
    // The same rule the safety engine applies to the LLM ("AI may raise caution,
    // never clear it"). The two failure modes are not symmetric:
    //   • dropping a real SOS because a secret was misconfigured could cost a life
    //   • honouring a forged SAFE calls off help for someone still in danger
    // So SOS dispatch runs unconditionally, and de-escalation requires proof.
    const verified = satelliteVerified(req);

    // Look up device by IMEI
    const devices = await base44.asServiceRole.entities.SatelliteDevice.filter({ rock7_imei: imei }).catch(() => []);
    const device  = devices?.[0];

    if (!device) {
      console.warn(`[receiveSatelliteWebhook] Unknown IMEI: ${imei}`);
      return Response.json({ received: true, warning: 'unregistered_imei' });
    }

    const caseId = device.case_id;

    // Update device last-seen + GPS position
    await base44.asServiceRole.entities.SatelliteDevice.update(device.id, {
      last_ping_at:      now,
      last_message_at:   now,
      last_gps_lat:      iridium_latitude  || null,
      last_gps_lng:      iridium_longitude || null,
      last_mo_message:   decoded,
      messages_received: (device.messages_received || 0) + 1,
    });

    // Update CaseRecord with satellite GPS fix.
    // Verified only: this position is what a security team would be sent to, so a
    // spoofed fix would actively misdirect a rescue. Unverified coordinates are
    // still recorded on the device row above for forensics, but never promoted to
    // the case's authoritative last-known location.
    if (verified && caseId && iridium_latitude && iridium_longitude) {
      await base44.asServiceRole.entities.CaseRecord.update(caseId, {
        last_known_lat:       iridium_latitude,
        last_known_lng:       iridium_longitude,
        last_location_source: 'satellite_iridium',
        last_location_at:     now,
      }).catch(() => {});
    }

    const tasks: Promise<unknown>[] = [];

    // ── SAFE reply ────────────────────────────────────────────────────────────
    if (isSafe) {
      // Only a VERIFIED device may stand down an escalation (asymmetric trust,
      // above). An unverified SAFE is routed to a human instead — it is treated
      // as an unconfirmed claim, never as a resolution.
      if (verified && caseId) {
        // An escalation in progress is any check-in that is neither acknowledged
        // nor resolved. The previous filter looked for status 'escalating' and
        // wrote 'safe_confirmed' — neither value exists in SoloCheckIn's enum
        // (pending | acknowledged | escalated_2h/3h/5h/9h | resolved), so this
        // matched nothing and a real patient's SAFE never actually halted their
        // escalation. Vocabulary now matches acknowledgeSoloCheckIn.
        const openCheckIns = await base44.asServiceRole.entities.SoloCheckIn.filter({
          case_id: caseId,
        }).catch(() => []);

        const active = (openCheckIns as any[]).filter(
          (ci) => !['acknowledged', 'resolved'].includes(ci.status),
        );

        for (const ci of active) {
          tasks.push(base44.asServiceRole.entities.SoloCheckIn.update(ci.id, {
            status:          'acknowledged',
            responded_time:  now,
            acknowledged_at: now,
            response_method: 'satellite',
          }));
        }
      } else if (!verified) {
        // Unverified stand-down request — escalation deliberately continues.
        const reviewEmail = Deno.env.get('ADMIN_EMAIL');
        if (reviewEmail) {
          tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
            from_name: BRAND,
            to:        reviewEmail,
            subject:   `⚠️ Unverified satellite SAFE — needs human review | ${BRAND}`,
            body:      `<p>A SAFE message was received for a registered device, but the request was <strong>not verified</strong> (missing or wrong satellite webhook secret).</p>
                       <p><strong>The escalation has NOT been halted.</strong> This may be a misconfigured SATELLITE_WEBHOOK_SECRET, or an attempt to call off help for a patient still in danger.</p>
                       <p>Open the case in the admin console to confirm the patient's status directly.</p>`,
          }).catch(() => {}));
        }
      }

      // Reply to patient via satellite (Rock Seven supports MT reply).
      // Verified only — an unverified sender must not receive a confirmation
      // telling them the stand-down was accepted.
      if (verified) tasks.push(
        base44.asServiceRole.functions?.invoke?.('sendSatelliteMessage', {
          case_id: caseId,
          message: `MORALES: Got it. Glad you're safe. Check in again in 12 hours. — ${BRAND}`,
          reason:  'safe_confirmed',
        }).catch(() => {}) ?? Promise.resolve()
      );

      // Notify admin: satellite safe confirmation received.
      // Verified only — the unverified case sends its own "needs review" notice
      // above, and this copy asserts "escalation halted", which would be false.
      const adminEmail = verified ? Deno.env.get('ADMIN_EMAIL') : null;
      if (adminEmail) {
        tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
          from_name: BRAND,
          to:        adminEmail,
          subject:   `✅ Satellite SAFE — ${device.patient_name || device.patient_email}`,
          body:      `<p>Patient <strong>${device.patient_name || device.patient_email}</strong> replied SAFE via satellite (IMEI: ${imei}).</p>
                     <p>GPS: ${iridium_latitude}, ${iridium_longitude} (Iridium beam, ±~50km)</p>
                     <p>Escalation halted. All open check-ins marked confirmed.</p>`,
        }).catch(() => {}));
      }
    }

    // ── SOS via satellite ─────────────────────────────────────────────────────
    if (isSOS) {
      // Dispatch security immediately — no timer, this is a live emergency
      tasks.push(
        base44.asServiceRole.functions?.invoke?.('runMedGuardAnalysis', {
          case_id:       caseId,
          force_critical: true,
          source:         'satellite_sos',
        }).catch(() => {}) ?? Promise.resolve()
      );

      // Acknowledge via satellite immediately
      tasks.push(
        base44.asServiceRole.functions?.invoke?.('sendSatelliteMessage', {
          case_id: caseId,
          message: `SOS RECEIVED. Help dispatched to your coordinates. Stay where you are. — ${BRAND}`,
          reason:  'sos_acknowledged',
        }).catch(() => {}) ?? Promise.resolve()
      );

      // Critical audit log
      const satelliteSosPrevHash = await computePrevHash(base44);
      tasks.push(base44.asServiceRole.entities.AuditLog.create({
        event_type:   'satellite_sos_received',
        actor_id:     'system',
        actor_role:   'system',
        actor_name:   `${BRAND} Satellite Layer`,
        resource_type:'SatelliteDevice',
        resource_id:  device.id,
        case_id:      caseId,
        sensitive:    true,
        timestamp:    now,
        details:      { imei, momsn, gps_lat: iridium_latitude, gps_lng: iridium_longitude, decoded },
        prev_hash:    satelliteSosPrevHash,
      }));
    }

    // ── Audit log for all satellite messages ──────────────────────────────────
    const satelliteMsgPrevHash = await computePrevHash(base44);
    tasks.push(base44.asServiceRole.entities.AuditLog.create({
      event_type:   'satellite_message_received',
      actor_id:     device.patient_email || imei,
      actor_role:   'patient',
      resource_type:'SatelliteDevice',
      resource_id:  device.id,
      case_id:      caseId || '',
      sensitive:    false,
      timestamp:    now,
      details:      {
        imei, momsn, decoded,
        gps_lat: iridium_latitude, gps_lng: iridium_longitude,
        is_safe: isSafe, is_sos: isSOS,
        // On the hash chain so a forged stand-down attempt is provable after the fact.
        verified,
      },
      prev_hash:    satelliteMsgPrevHash,
    }).catch(() => {}));

    await Promise.allSettled(tasks);

    // Rock Seven requires 200 — any other status triggers a retry
    return new Response('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });

  } catch (error) {
    console.error('[receiveSatelliteWebhook]', error);
    // Still return 200 to prevent Rock Seven infinite retries
    return new Response('OK', { status: 200 });
  }
});
