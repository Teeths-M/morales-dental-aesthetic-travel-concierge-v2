import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    // Update CaseRecord with satellite GPS fix
    if (caseId && iridium_latitude && iridium_longitude) {
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
      // Mark any open solo check-in as satellite-confirmed → halt escalation
      if (caseId) {
        const openCheckIns = await base44.asServiceRole.entities.SoloCheckIn.filter({
          case_id: caseId,
          status:  'escalating',
        }).catch(() => []);

        for (const ci of openCheckIns as any[]) {
          tasks.push(base44.asServiceRole.entities.SoloCheckIn.update(ci.id, {
            status:              'safe_confirmed',
            confirmed_via:       'satellite',
            satellite_confirmed_at: now,
          }));
        }
      }

      // Reply to patient via satellite (Rock Seven supports MT reply)
      tasks.push(
        base44.asServiceRole.functions?.invoke?.('sendSatelliteMessage', {
          case_id: caseId,
          message: `MORALES: Got it. Glad you're safe. Check in again in 12 hours. — ${BRAND}`,
          reason:  'safe_confirmed',
        }).catch(() => {}) ?? Promise.resolve()
      );

      // Notify admin: satellite safe confirmation received
      const adminEmail = Deno.env.get('ADMIN_EMAIL');
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
      }));
    }

    // ── Audit log for all satellite messages ──────────────────────────────────
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
      },
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
