/**
 * triggerCovertSOS
 *
 * Silent emergency trigger — fired when patient uses the covert gesture
 * (5-tap or Orb keyword) while being watched or coerced.
 *
 * CRITICAL: This function returns a generic 200 response immediately,
 * never an error, and never reveals what was triggered. The attacker
 * must not be able to tell from any screen reaction that SOS fired.
 *
 * Escalation: Jump straight to Strike 3 (immediate security dispatch).
 * Reason: if someone used the covert trigger, the situation is already critical.
 */
import { createHandler, ok } from '../_shared/createHandler.ts';

async function sendSms(to: string, message: string) {
  const sid   = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from  = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !token || !from || !to) return;
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method:  'POST',
    headers: { 'Authorization': `Basic ${btoa(`${sid}:${token}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({ To: to, From: from, Body: message }).toString(),
  }).catch(() => {});
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const {
    case_id,
    gps_lat,
    gps_lng,
    accuracy_m,
    trigger_method = 'gesture',   // 'gesture' | 'orb_keyword'
  } = await body<{
    case_id?:       string;
    gps_lat?:       number;
    gps_lng?:       number;
    accuracy_m?:    number;
    trigger_method?: string;
  }>();

  const now = new Date().toISOString();

  // Resolve case — use provided case_id or find by email
  let resolvedCaseId = case_id;
  let caseRec: any = null;

  if (resolvedCaseId) {
    caseRec = await base44.asServiceRole.entities.CaseRecord.get(resolvedCaseId).catch(() => null);
  } else if (user?.email) {
    const cases = await base44.asServiceRole.entities.CaseRecord.filter(
      { client_email: user.email }, '-created_date', 1
    ).catch(() => []);
    caseRec = cases[0] ?? null;
    resolvedCaseId = caseRec?.id;
  }

  const patientName  = caseRec?.client_name  || user?.full_name || user?.email || 'Patient';
  const patientPhone = caseRec?.client_phone || user?.phone || '';
  const guardianPhone = caseRec?.emergency_contact_phone || '';
  const guardianName  = caseRec?.emergency_contact       || '';
  const destination   = caseRec?.procedure_country || 'unknown location';
  const adminEmail    = Deno.env.get('ADMIN_EMAIL') || '';

  // GPS string for messages
  const gpsStr = (gps_lat && gps_lng)
    ? `https://maps.google.com/maps?q=${gps_lat},${gps_lng}`
    : 'Location not available';

  // ── 1. AuditLog — covert SOS event ───────────────────────────────────────
  await base44.asServiceRole.entities.AuditLog.create({
    event_type:   'covert_sos_triggered',
    actor_email:  user?.email || 'unknown',
    resource_id:  resolvedCaseId || '',
    case_id:      resolvedCaseId || '',
    details: {
      trigger_method,
      gps_lat,   gps_lng,  accuracy_m,
      destination,
      patient_name: patientName,
    },
    sensitive:   true,
    timestamp:   now,
  }).catch(() => {});

  // ── 2. Create/update SOS record — skip standard escalation chain,
  //       jump straight to Strike 3 (security dispatch + guardian) ───────────
  await base44.asServiceRole.entities.SOSEvent.create({
    case_id:        resolvedCaseId || '',
    patient_email:  user?.email || '',
    patient_name:   patientName,
    trigger_type:   'covert_gesture',
    trigger_method,
    status:         'dispatching',
    strike:         3,
    gps_lat,   gps_lng,  accuracy_m,
    destination,
    triggered_at:   now,
  }).catch(() => {});

  // ── 3. SMS — guardian / emergency contact ─────────────────────────────────
  if (guardianPhone) {
    await sendSms(
      guardianPhone,
      `🚨 URGENT — ${patientName} has silently activated an emergency alert. They may be in danger and unable to call for help. Last location: ${gpsStr}. Contact them immediately. If you cannot reach them, call police. — Morales Concierge`
    );
  }

  // ── 4. SMS — patient's own phone (if known and different from guardian) ───
  // This is a safety confirmation the patient can see later even if coerced now
  if (patientPhone && patientPhone !== guardianPhone) {
    await sendSms(
      patientPhone,
      `Morales: Your emergency team has been alerted. Help is on the way. Stay calm. — Morales Concierge`
    );
  }

  // ── 5. Admin email — immediate alert ──────────────────────────────────────
  if (adminEmail) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Morales — 🚨 COVERT SOS ALERT',
      to:        adminEmail,
      subject:   `🚨 COVERT SOS — ${patientName} in ${destination} — IMMEDIATE ACTION REQUIRED`,
      body: `<h2 style="color:#dc2626">🚨 COVERT SILENT SOS TRIGGERED</h2>
<p><strong>Patient:</strong> ${patientName} (${user?.email || 'unknown email'})</p>
<p><strong>Destination:</strong> ${destination}</p>
<p><strong>Trigger method:</strong> ${trigger_method}</p>
<p><strong>GPS:</strong> <a href="${gpsStr}">${gpsStr}</a></p>
<p><strong>Guardian notified:</strong> ${guardianName} (${guardianPhone || 'no phone'})</p>
<p><strong>Time:</strong> ${new Date(now).toLocaleString()}</p>
<hr/>
<p style="color:#dc2626"><strong>This patient used the silent/covert SOS. They may be unable to speak freely or are being coerced. Contact all parties immediately and dispatch security.</strong></p>`,
    }).catch(() => {});
  }

  // ── 6. Notify security agency if assigned ────────────────────────────────
  if (caseRec?.security_agency_email) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Morales — EMERGENCY DISPATCH',
      to:        caseRec.security_agency_email,
      subject:   `🚨 IMMEDIATE DISPATCH — Covert SOS — ${patientName}`,
      body: `<p>Your client <strong>${patientName}</strong> has activated a covert emergency. They may be in immediate danger. Last known location: <a href="${gpsStr}">${gpsStr}</a>. Dispatch immediately.</p>`,
    }).catch(() => {});
  }

  // CRITICAL: Always return 200 with a benign-looking response.
  // The attacker must not see any error or unusual screen change.
  return ok({ status: 'ok' });

}, { name: 'triggerCovertSOS', requireAuth: true }));
