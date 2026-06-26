import { createHandler, ok, err } from '../_shared/createHandler.ts';

/**
 * sendSatelliteMessage
 *
 * Sends a message to a patient's satellite device when cellular networks are down.
 *
 * Supports two real hardware paths:
 *   1. Rock Seven / Iridium SBD — bidirectional, programmable HTTP API, global coverage.
 *      Device: RockBLOCT 9603 or RockBLOCT 9Plus.
 *      API: POST core.rock7.com/rockblock/MT (Mobile Terminated)
 *      Data limit: 340 bytes (hex-encoded).
 *
 *   2. Garmin inReach via SMS — Garmin assigns a real phone number to each inReach device.
 *      Morales sends via Twilio SMS. Patient replies; Twilio webhook routes it back.
 *      No Rock Seven account needed for inReach customers.
 *
 * Required env vars:
 *   ROCK7_USERNAME       — Rock Seven account username
 *   ROCK7_PASSWORD       — Rock Seven account password
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER  (already present)
 *
 * Called by:
 *   - escalateSoloCheckIn (T+45min tier — when cellular SMS goes unanswered)
 *   - runSilentSafetyEscalation (parallel channel during MedGuard CRITICAL)
 *   - Admin "Send Satellite Message" button in SatelliteDevicePanel
 */

const BRAND      = 'Morales Concierge';
const ROCK7_URL  = 'https://core.rock7.com/rockblock/MT';
const MAX_BYTES  = 330; // 340 max, leave headroom

// Encode string to hex for Iridium SBD
function toHex(str: string): string {
  return Array.from(new TextEncoder().encode(str))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Truncate to byte limit before hex-encoding
function safeTruncate(msg: string, maxBytes: number): string {
  const enc = new TextEncoder();
  const bytes = enc.encode(msg);
  if (bytes.length <= maxBytes) return msg;
  return new TextDecoder().decode(bytes.slice(0, maxBytes));
}

// Twilio SMS — same helper pattern used throughout the platform
async function sendSms(to: string, body: string) {
  const sid  = Deno.env.get('TWILIO_ACCOUNT_SID');
  const auth = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !auth || !from || !to) return { ok: false, reason: 'twilio_not_configured' };
  const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${auth}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  });
  return resp.ok ? { ok: true } : { ok: false, reason: 'twilio_error', status: resp.status };
}

// Rock Seven Mobile Terminated message — fires the satellite tx
async function sendRock7(imei: string, message: string): Promise<{ ok: boolean; reason?: string; status?: number }> {
  const username = Deno.env.get('ROCK7_USERNAME');
  const password = Deno.env.get('ROCK7_PASSWORD');
  if (!username || !password) return { ok: false, reason: 'rock7_not_configured' };
  if (!imei)                  return { ok: false, reason: 'no_imei' };

  const truncated = safeTruncate(message, MAX_BYTES);
  const data      = toHex(truncated);

  const form = new URLSearchParams({ imei, username, password, data });
  const resp = await fetch(ROCK7_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    form.toString(),
  });
  const text = await resp.text();
  // Rock Seven returns "MTMSN,<number>" on success, "FAILED,<reason>" on failure
  if (text.startsWith('MTMSN')) return { ok: true };
  return { ok: false, reason: text || 'rock7_error', status: resp.status };
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const { case_id, message, reason = 'check_in_missed' } = await body();
  if (!case_id)  return err('case_id is required');
  if (!message)  return err('message is required');

  // Look up satellite device registered to this case
  const devices = await base44.asServiceRole.entities.SatelliteDevice.filter({
    case_id,
    registration_status: 'verified',
  }).catch(() => []);

  if (!devices || devices.length === 0) {
    return err('No verified satellite device registered for this case', 404);
  }

  const device = devices[0] as any;
  const now    = new Date().toISOString();
  const results: Record<string, unknown> = {};

  // Build short message (Iridium SBD has 340-byte limit — be concise)
  const safeMsg = message.slice(0, MAX_BYTES);

  // ── Path 1: Rock Seven / Iridium SBD ────────────────────────────────────
  if (device.device_type === 'rockblock_iridium' && device.rock7_imei) {
    const result = await sendRock7(device.rock7_imei, safeMsg);
    results.rock7 = result;

    await base44.asServiceRole.entities.SatelliteDevice.update(device.id, {
      last_message_at: now,
      messages_sent:   (device.messages_sent || 0) + 1,
    });
  }

  // ── Path 2: Garmin inReach via SMS number ────────────────────────────────
  if ((device.device_type === 'inreach_sms' || device.device_type === 'inreach_email') && device.device_phone) {
    const result = await sendSms(device.device_phone, safeMsg);
    results.inreach_sms = result;

    await base44.asServiceRole.entities.SatelliteDevice.update(device.id, {
      last_message_at: now,
      messages_sent:   (device.messages_sent || 0) + 1,
    });
  }

  // ── Audit log ─────────────────────────────────────────────────────────────
  await base44.asServiceRole.entities.AuditLog.create({
    event_type:   'satellite_message_sent',
    actor_id:     'system',
    actor_role:   'system',
    actor_name:   `${BRAND} Satellite Layer`,
    resource_type:'SatelliteDevice',
    resource_id:  device.id,
    case_id,
    sensitive:    false,
    timestamp:    now,
    details:      { device_type: device.device_type, reason, message_length: safeMsg.length, results },
  }).catch(() => {});

  return ok({
    device_type:     device.device_type,
    device_label:    device.device_label || device.rock7_imei || device.device_phone,
    results,
    message_preview: safeMsg.slice(0, 60) + (safeMsg.length > 60 ? '…' : ''),
  });
}, { name: 'sendSatelliteMessage', requireAuth: false }));
