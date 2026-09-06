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
import { createHandler, ok } from '../../shared/createHandler.ts';
import { emergencyDispatch } from '../../shared/notify.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';
import { reportIncident, generateIncidentCode } from '../../shared/incidentReporting.ts';

// Config-gap visibility — same proven pattern getGeolocationAndCurrency/
// triggerSOS use: a real ReliabilityIncident row (+ an INCIDENT_ALERT_EMAILS
// alert email at high/critical) instead of a silent skip nobody sees.
// Cooldown-gated so a standing misconfiguration doesn't spam a fresh row on
// every covert trigger. Never affects the response either way — this is the
// one function in the app that must always return a benign 200.
let lastConfigIncidentAt = 0;
const CONFIG_INCIDENT_COOLDOWN_MS = 60 * 60 * 1000;

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

// NOTE: deliberately NOT given a bodySchema. This function's entire security
// property is "always return a benign 200, never reveal anything unusual" —
// a schema that rejects malformed input with a 400 would let an attacker
// fingerprint "did the covert trigger fire" by response code. Every field
// below is already read defensively (destructuring with no required checks),
// so an odd-shaped body just falls through with defaults, exactly as today.
Deno.serve(createHandler(async ({ base44, user, body }) => {
  const {
    case_id,
    gps_lat,
    gps_lng,
    accuracy_m,
    trigger_method = 'gesture',   // 'gesture' | 'orb_keyword'
  } = await body();

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
  const twilioConfigured = !!(Deno.env.get('TWILIO_ACCOUNT_SID') && Deno.env.get('TWILIO_AUTH_TOKEN') && Deno.env.get('TWILIO_PHONE_NUMBER'));

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
    prev_hash:   await computePrevHash(base44),
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

  // ── 3. LiveLocation — real-time position for the guardian view ───────────
  // triggerSOS already does this; a covert trigger is the one path where the
  // patient can't safely reach for the phone again, so a stale static Maps
  // link in an SMS shouldn't be the only location signal a guardian gets.
  if (gps_lat != null && gps_lng != null && resolvedCaseId) {
    try {
      const liveLocations = await base44.asServiceRole.entities.LiveLocation.filter({ case_id: resolvedCaseId });
      const existingLive = liveLocations?.[0];
      const liveData = {
        case_id: resolvedCaseId, user_id: user?.email || '', user_email: user?.email || '',
        latitude: gps_lat, longitude: gps_lng,
        source: 'gps', updated_at: now, is_active: true, guardian_share_enabled: true,
        stale_after: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        stale_alerted_15m: false, stale_alerted_30m: false,
      };
      if (existingLive) {
        await base44.asServiceRole.entities.LiveLocation.update(existingLive.id, liveData);
      } else {
        await base44.asServiceRole.entities.LiveLocation.create(liveData);
      }
    } catch (_) {}
  }

  // ── 4. SMS — guardian / emergency contact ─────────────────────────────────
  // AUTHORISED EXEMPTION from the link-only comms policy (Portia, 2026-07-18).
  // Identity and last known location ARE the payload here: this person is being
  // asked to go find someone who may be in danger and cannot call for help.
  // Sending them a portal link instead would put a login between a responder
  // and a missing patient.
  if (guardianPhone) {
    await sendSms(
      guardianPhone,
      emergencyDispatch({
        reason: 'sos_triggered',
        from: 'triggerCovertSOS/guardian',
        body: `🚨 URGENT — ${patientName} has silently activated an emergency alert. They may be in danger and unable to call for help. Last location: ${gpsStr}. Contact them immediately. If you cannot reach them, call police. — Morales Concierge`,
      }),
    );
  }

  // ── 5. SMS — patient's own phone (if known and different from guardian) ───
  // This is a safety confirmation the patient can see later even if coerced now
  if (patientPhone && patientPhone !== guardianPhone) {
    await sendSms(
      patientPhone,
      `Morales: Your emergency team has been alerted. Help is on the way. Stay calm. — Morales Concierge`
    );
  }

  // ── 6. Admin email — immediate alert ──────────────────────────────────────
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

  // ── 6b. Admin push notification — an ADDITIONAL channel alongside the
  //        email above, not a replacement. A different channel from the
  //        link-only email/SMS policy (comms-audit.mjs only scans SendEmail/
  //        SMS/Twilio/WhatsApp bodies; a push is shown only on the
  //        recipient's own device, same exemption already used by
  //        sendGoldenMNotification/sendHandshakeAlert). Independently
  //        try/caught and non-blocking — a missing/expired push subscription
  //        must never affect the response or any other channel above. ──────
  // LEAK-SCAN-IGNORE-START
  if (adminEmail) {
    await base44.asServiceRole.functions.invoke('sendPushNotification', {
      user_email: adminEmail,
      title: '🚨 Covert SOS Triggered',
      body: `${patientName} in ${destination} — check email/SMS immediately.`,
      url: '/admin',
      urgent: true,
      tag: 'covert-sos',
      internal_secret: Deno.env.get('CRON_SECRET'),
    }).catch(() => {});
  }
  // LEAK-SCAN-IGNORE-END

  // ── 7. Notify security agency — prefer the one already assigned to this
  //       case; otherwise fall back to any other verified, available agency
  //       in the same destination country. This file's own header says a
  //       covert trigger should "jump straight to Strike 3 (immediate
  //       security dispatch)" — until now that only happened when a case had
  //       one pre-assigned. Query shape mirrors shared/dispatchSecurityForCheckIn.ts's
  //       proven "find candidates by country + is_available" lookup — not the
  //       function itself, which is bound to SoloCheckIn's own handshake/
  //       timeout state machine and isn't safe to reuse for a one-shot covert
  //       alert with no SoloCheckIn record to anchor state on. ──────────────
  let securityNotified = false;
  if (caseRec?.security_agency_email) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Morales — EMERGENCY DISPATCH',
      to:        caseRec.security_agency_email,
      subject:   `🚨 IMMEDIATE DISPATCH — Covert SOS — ${patientName}`,
      body: `<p>Your client <strong>${patientName}</strong> has activated a covert emergency. They may be in immediate danger. Last known location: <a href="${gpsStr}">${gpsStr}</a>. Dispatch immediately.</p>`,
    }).catch(() => {});
    securityNotified = true;
  } else if (destination && destination !== 'unknown location') {
    try {
      const candidates = await base44.asServiceRole.entities.SecurityAgency.filter(
        { country: destination, is_available: true }, '-created_date', 5
      );
      const fallbackAgency = (candidates || []).find((a: any) => a.email);
      if (fallbackAgency) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'Morales — EMERGENCY DISPATCH',
          to:        fallbackAgency.email,
          subject:   `🚨 IMMEDIATE DISPATCH — Covert SOS — traveler in ${destination}`,
          body: `<p>A Morales traveler, <strong>${patientName}</strong>, in <strong>${destination}</strong> has activated a covert emergency alert and may be in immediate danger. Last known location: <a href="${gpsStr}">${gpsStr}</a>. This case had no security agency pre-assigned — please dispatch and contact Morales admin to confirm.</p>`,
        }).catch(() => {});
        securityNotified = true;
      }
    } catch (_) {}
  }

  // Config-gap visibility, cooldown-gated (declared above). Never affects the
  // response either way.
  if (Date.now() - lastConfigIncidentAt > CONFIG_INCIDENT_COOLDOWN_MS) {
    const guardianSmsIssue = !!guardianPhone && !twilioConfigured;
    if (!adminEmail || guardianSmsIssue || !securityNotified) {
      lastConfigIncidentAt = Date.now();
      try {
        await Promise.race([
          reportIncident({
            base44,
            incidentCode: generateIncidentCode(),
            severity: (!adminEmail || !securityNotified) ? 'critical' : 'high',
            source: 'api',
            feature: 'triggerCovertSOS',
            errorMessage: !adminEmail
              ? 'ADMIN_EMAIL not configured — covert SOS admin alert was not sent.'
              : !securityNotified
              ? 'No security agency assigned or available for covert SOS dispatch.'
              : 'Twilio not configured — covert SOS guardian SMS was not sent.',
          }),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ]);
      } catch (_) { /* incident reporting must never affect the response */ }
    }
  }

  // CRITICAL: Always return 200 with a benign-looking response.
  // The attacker must not see any error or unusual screen change.
  return ok({ status: 'ok' });

}, { name: 'triggerCovertSOS', requireAuth: true }));
