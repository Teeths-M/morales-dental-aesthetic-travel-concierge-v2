import { createHandler, ok, err } from '../../shared/createHandler.ts';

/**
 * activateEmergencyBeacon
 *
 * Called when a user triggers the 3-second Emergency Mesh Beacon.
 * Works even when relayed offline — the offline queue sends it when
 * connectivity is restored.
 *
 * Input: { case_id?, lat, lon, accuracy?, device_id?, offline_queued?, relay_count? }
 * Output: { beacon_id, received_at, coords }
 */

const BRAND = 'Morales Medical Travel Safety';

function fmtCoord(lat: number, lon: number): string {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const { case_id, lat, lon, accuracy, device_id, offline_queued, relay_count } = await body();

  if (lat === undefined || lon === undefined) return err('lat and lon are required');

  const numLat    = Number(lat);
  const numLon    = Number(lon);
  if (isNaN(numLat) || isNaN(numLon)) return err('lat and lon must be numbers');

  const now      = new Date().toISOString();
  const beaconId = crypto.randomUUID();
  const coords   = fmtCoord(numLat, numLon);

  // Log audit event
  await base44.asServiceRole?.entities?.AuditLog?.create({
    event_type:    'EMERGENCY_BEACON_ACTIVATED',
    case_id:       case_id || null,
    lat:           numLat,
    lon:           numLon,
    accuracy_m:    accuracy ? Number(accuracy) : null,
    device_id:     device_id || null,
    relay_count:   relay_count ? Number(relay_count) : 0,
    offline_queued: !!offline_queued,
    beacon_id:     beaconId,
    timestamp:     now,
  }).catch(() => {});

  // Stamp the case record
  if (case_id) {
    await base44.asServiceRole?.entities?.CaseRecord?.update(case_id, {
      active_beacon_id:    beaconId,
      beacon_lat:          numLat,
      beacon_lon:          numLon,
      beacon_activated_at: now,
    }).catch(() => {});
  }

  // Notify concierge team
  const caseLabel  = case_id ? `Case ${String(case_id).slice(-6).toUpperCase()}` : 'Unknown Patient';
  const CONCIERGE  = Deno.env.get('CONCIERGE_EMAIL') || 'concierge@moralesdentalandaesthetics.com';
  const relayNodes = relay_count ? Number(relay_count) : 0;

  const emailBody = `<!doctype html><html><body style="margin:0;background:#0a0a0a;font-family:Arial,sans-serif;color:#fff;padding:28px;">
<div style="max-width:560px;margin:0 auto;">
  <h1 style="color:#ef4444;margin:0 0 6px;font-size:22px;">🚨 EMERGENCY BEACON ACTIVE</h1>
  <p style="margin:0 0 24px;font-size:13px;color:rgba(255,255,255,0.5);">${BRAND} · Automated Dispatch · ${now}</p>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
    <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
      <td style="padding:10px 0;color:rgba(255,255,255,0.45);font-size:12px;width:38%;">Patient / Case</td>
      <td style="padding:10px 0;font-size:13px;font-weight:700;">${caseLabel}</td>
    </tr>
    <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
      <td style="padding:10px 0;color:rgba(255,255,255,0.45);font-size:12px;">GPS Coordinates</td>
      <td style="padding:10px 0;font-size:13px;font-family:monospace;">${coords}</td>
    </tr>
    <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
      <td style="padding:10px 0;color:rgba(255,255,255,0.45);font-size:12px;">Accuracy</td>
      <td style="padding:10px 0;font-size:13px;">${accuracy ? `±${accuracy}m` : 'Unknown'}</td>
    </tr>
    <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
      <td style="padding:10px 0;color:rgba(255,255,255,0.45);font-size:12px;">Mesh Relay Nodes</td>
      <td style="padding:10px 0;font-size:13px;">${relayNodes} node${relayNodes !== 1 ? 's' : ''}</td>
    </tr>
    <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
      <td style="padding:10px 0;color:rgba(255,255,255,0.45);font-size:12px;">Offline Queued</td>
      <td style="padding:10px 0;font-size:13px;">${offline_queued ? 'Yes — transmitted via mesh relay' : 'No — direct connection'}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;color:rgba(255,255,255,0.45);font-size:12px;">Beacon ID</td>
      <td style="padding:10px 0;font-size:11px;font-family:monospace;color:rgba(255,255,255,0.5);">${beaconId}</td>
    </tr>
  </table>
  <div style="padding:16px;border-radius:10px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.4);">
    <p style="margin:0;color:#ef4444;font-weight:700;font-size:14px;">DISPATCH EMERGENCY SERVICES TO ABOVE COORDINATES IMMEDIATELY.</p>
    <p style="margin:6px 0 0;color:rgba(255,255,255,0.5);font-size:12px;">This alert went to the concierge inbox ONLY. Fire, police and embassy are NOT contacted automatically — a human must escalate now.</p>
  </div>
</div></body></html>`;

  await base44.asServiceRole?.integrations?.Core?.SendEmail({
    from_name: `${BRAND} — Emergency System`,
    to:        CONCIERGE,
    subject:   `🚨 BEACON ACTIVATED — ${caseLabel} · ${coords}`,
    body:      emailBody,
  }).catch(() => {});

  return ok({ beacon_id: beaconId, received_at: now, coords, relay_count: relayNodes });
}, { name: 'activateEmergencyBeacon', requireAuth: false }));
