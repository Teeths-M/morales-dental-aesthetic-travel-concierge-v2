import { createHandler, ok, err } from '../_shared/createHandler.ts';

/**
 * registerSatelliteDevice
 *
 * Admin endpoint to pair a satellite device (RockBLOCT or Garmin inReach)
 * to a patient's case record.
 *
 * On registration:
 *  1. Creates SatelliteDevice record
 *  2. Sends a test MT message to verify the device is reachable
 *  3. Updates CaseRecord with satellite_device_id
 *  4. Notifies patient: "Your satellite safety device is active"
 *
 * Body:
 *   case_id        — required
 *   device_type    — 'rockblock_iridium' | 'inreach_sms' | 'iphone_guidance'
 *   rock7_imei     — required for rockblock_iridium
 *   device_phone   — required for inreach_sms (E.164)
 *   device_label   — human label (e.g. "Garmin inReach Mini 2 — silver")
 *   include_in_package — boolean, true = device included/rented by Morales
 *   send_test      — boolean, true = send verification message (default true)
 */

const BRAND = 'Morales Dental & Aesthetics';

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const {
    case_id,
    device_type = 'rockblock_iridium',
    rock7_imei,
    device_phone,
    device_label,
    include_in_package = false,
    send_test = true,
  } = await body();

  if (!case_id) return err('case_id is required');
  if (device_type === 'rockblock_iridium' && !rock7_imei) return err('rock7_imei is required for Iridium devices');
  if (device_type === 'inreach_sms' && !device_phone) return err('device_phone is required for inReach SMS devices');

  const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!caseRecord) return err('Case not found', 404);

  const now = new Date().toISOString();

  // Create device record
  const device = await base44.asServiceRole.entities.SatelliteDevice.create({
    case_id,
    patient_email:      caseRecord.client_email,
    patient_name:       caseRecord.client_name,
    device_type,
    rock7_imei:         rock7_imei || null,
    device_phone:       device_phone || null,
    device_label:       device_label || (device_type === 'rockblock_iridium' ? `RockBLOCT — ${rock7_imei}` : `inReach — ${device_phone}`),
    registration_status:'pending',
    include_in_package,
    messages_sent:      0,
    messages_received:  0,
  });

  const tasks: Promise<unknown>[] = [];

  // Update CaseRecord with device reference
  tasks.push(base44.asServiceRole.entities.CaseRecord.update(case_id, {
    satellite_device_id:   device.id,
    satellite_device_type: device_type,
    satellite_active:      true,
  }));

  // Send verification message to confirm the device is reachable
  if (send_test && device_type !== 'iphone_guidance') {
    const testMsg = `MORALES SAFETY LINK ACTIVE. Device verified. Reply SAFE to confirm receipt. — ${BRAND}`;
    const testResult = await base44.asServiceRole.functions?.invoke?.('sendSatelliteMessage', {
      case_id,
      message: testMsg,
      reason:  'registration_verification',
    }).catch(e => ({ error: e.message }));

    if (testResult && !testResult.error) {
      tasks.push(base44.asServiceRole.entities.SatelliteDevice.update(device.id, {
        registration_status: 'verified',
        last_message_at:     now,
        messages_sent:       1,
      }));
    }
  } else if (device_type === 'iphone_guidance') {
    tasks.push(base44.asServiceRole.entities.SatelliteDevice.update(device.id, {
      registration_status: 'verified',
    }));
  }

  // Email patient: their satellite safety link is now active
  if (caseRecord.client_email) {
    const caseRef = case_id.slice(-8).toUpperCase();
    tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND,
      to:        caseRecord.client_email,
      subject:   `🛰️ Your Satellite Safety Link is Active — ${caseRef} | ${BRAND}`,
      body: `<!doctype html><html><body style="margin:0;background:#060B16;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#060B16;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#0C1A1D;border:1px solid #2A3F4A;border-radius:22px;overflow:hidden;">
<tr><td style="padding:32px;border-bottom:1px solid #2A3F4A;text-align:center;">
  <div style="font-family:Georgia,serif;font-size:22px;color:#fff;">${BRAND}</div>
  <div style="margin-top:8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#D4AF37;">🛰️ Satellite Safety Link — Active</div>
</td></tr>
<tr><td style="padding:32px;">
  <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#fff;">
    ${caseRecord.client_name?.split(' ')[0]}, your safety link now reaches space.
  </h1>
  <p style="margin:0 0 20px;font-size:15px;color:rgba(255,255,255,0.65);line-height:1.7;">
    A satellite communication device has been registered to your care package. Even if every cellular
    tower goes dark — no LTE, no 5G, no local SIM — we can still reach you directly via satellite.
  </p>
  <div style="background:#0a1a0a;border:1px solid rgba(34,197,94,0.3);border-radius:14px;padding:18px;margin-bottom:24px;">
    <p style="margin:0 0 10px;font-size:12px;letter-spacing:1.5px;color:#4ade80;font-weight:700;text-transform:uppercase;">How It Works</p>
    <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.65);">• If we cannot reach you, we send a message directly to your satellite device</p>
    <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.65);">• Reply <strong style="color:#fff;">SAFE</strong> to confirm you are okay — escalation halts immediately</p>
    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.65);">• Reply <strong style="color:#ef4444;">SOS</strong> and a security team is dispatched to your last known location</p>
  </div>
  <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.4);line-height:1.6;">
    Device: ${device_label || device_type} · Case ${caseRef} · ${BRAND}
  </p>
</td></tr>
</table></td></tr></table></body></html>`,
    }));
  }

  // Audit log
  tasks.push(base44.asServiceRole.entities.AuditLog.create({
    event_type:   'satellite_device_registered',
    actor_id:     user?.id || 'admin',
    actor_role:   user?.role || 'admin',
    actor_name:   user?.full_name || user?.email || 'Admin',
    actor_email:  user?.email || '',
    resource_type:'SatelliteDevice',
    resource_id:  device.id,
    case_id,
    sensitive:    false,
    timestamp:    now,
    details:      { device_type, rock7_imei, device_phone, device_label, include_in_package },
  }).catch(() => {}));

  await Promise.allSettled(tasks);

  return ok({
    device_id:    device.id,
    device_type,
    device_label: device.device_label,
    patient:      caseRecord.client_name,
    case_ref:     case_id.slice(-8).toUpperCase(),
    test_sent:    send_test && device_type !== 'iphone_guidance',
  });
}, { name: 'registerSatelliteDevice', requireAuth: true, allowedRoles: ['admin', 'platform_admin'] }));
