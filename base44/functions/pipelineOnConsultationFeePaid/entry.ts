import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../_shared/cronAuth.ts';
import { linkOnlyEmail, linkOnlySms } from '../_shared/notify.ts';

// Inline token encoder (no local imports allowed)
// FIX: the '.'-suffix was previously crypto.getRandomValues() random bytes — it
// LOOKED like an HMAC signature (matching the payload.sigHex shape getPortalData's
// verifyPortalToken expects) but was never derived from the payload or any secret,
// so it always failed real verification while appearing correctly formatted. Now
// actually HMAC-signed so the token verifies and the portal link works.
async function encodePortalToken({ consultation_id, partner_id, portal_type }) {
  const payload = { consultation_id, partner_id, portal_type, expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  const secret = (() => {
    // FAIL CLOSED. This used to fall back to 'change-me-in-production', a value
    // published in this repository — so anyone who could read the repo could
    // mint a portal token for any case and read a patient's record. Refusing to
    // sign is a support ticket; a forgeable token is a breach.
    const s = Deno.env.get('PORTAL_TOKEN_SECRET');
    if (!s || s === 'change-me-in-production') {
      throw new Error('PORTAL_TOKEN_SECRET is not set — refusing to sign or verify a portal token.');
    }
    return s;
  })();
  const data = JSON.stringify(payload);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return btoa(data) + '.' + sigHex;
}

async function sendSms(to, message) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!accountSid || !authToken || !fromNumber || !accountSid.startsWith('AC') || !to) return;
  const form = new URLSearchParams();
  form.append('To', to);
  form.append('From', fromNumber);
  form.append('Body', message);
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
}

const BRAND = 'Morales Medical Travel Safety';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Cron secret OR admin session. This endpoint had NO guard at all: it is
    // reachable over HTTP like every deployed function, so anyone with the URL
    // could drive it — triggering real notifications, spend and state changes.
    // NOTE: a Base44-dashboard schedule driving this must send X-Cron-Secret.
    if (!(await cronAuthorized(req, base44))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json();
    const { data: feePaidData, changed_fields } = body;

    // Only fire when fee_paid flips to true
    if (!changed_fields?.includes('fee_paid') || feePaidData?.fee_paid !== true) {
      return Response.json({ skipped: true, reason: 'fee_paid not set to true' });
    }

    const consultationId = feePaidData.consultation_id;
    if (!consultationId) {
      return Response.json({ skipped: true, reason: 'No consultation_id on fee record' });
    }

    // SECURITY: This is an entity-trigger endpoint with no user session, so the
    // request body cannot be trusted at face value — an unauthenticated caller
    // could otherwise forge `{ data: { fee_paid: true, consultation_id }, changed_fields: ['fee_paid'] }`
    // for any real consultation_id and trigger a fake "payment confirmed" notification
    // to a real patient/doctor without anyone actually paying. Independently re-verify
    // against the real ConsultationFee record before sending anything.
    if (feePaidData.id) {
      const realFee = await base44.asServiceRole.entities.ConsultationFee.get(feePaidData.id).catch(() => null);
      if (!realFee || realFee.fee_paid !== true) {
        return Response.json({ skipped: true, reason: 'fee_paid not confirmed on server record' });
      }
    }

    const consultation = await base44.asServiceRole.entities.Consultation.get(consultationId);
    if (!consultation) {
      return Response.json({ error: 'Consultation not found' }, { status: 404 });
    }

    const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
    const results = { patient: null, doctor: null };

    // ── 1. NOTIFY PATIENT — status/next-step stay in the dashboard the link opens ──
    const patientEmail = consultation.email;
    const patientPhone = consultation.phone;
    const dashboardUrl = `${appUrl}/dashboard/case-status`;

    const sendTasks = [];

    if (patientPhone) {
      sendTasks.push(sendSms(patientPhone, linkOnlySms({
        line: 'Your consultation fee is confirmed. Track your journey for the next steps.',
        url: dashboardUrl,
        from: 'pipelineOnConsultationFeePaid',
      })));
    }
    if (patientEmail) {
      sendTasks.push(base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND,
        to: patientEmail,
        subject: 'Your consultation fee is confirmed',
        body: linkOnlyEmail({
          title: "You're officially in the queue",
          line: 'Your consultation fee payment has been received. Our clinical concierge team is reviewing your medical profile and will assign a specialist shortly.',
          ctaUrl: dashboardUrl,
          ctaLabel: 'Track My Journey',
          brand: BRAND,
          from: 'pipelineOnConsultationFeePaid',
        }),
      }));
    }

    // ── 2. NOTIFY ASSIGNED DOCTOR (if already assigned via CaseRecord) ────────
    // HIGH-RISK GATE: Never notify the doctor on high-risk consultations.
    // These are held at Admin-Review and only released manually by a concierge admin.
    const isHighRiskReview = consultation.high_risk_medical_review === true;

    let caseRecord = null;
    try {
      const cases = await base44.asServiceRole.entities.CaseRecord.filter({ consultation_id: consultationId });
      caseRecord = cases.length > 0 ? cases[0] : null;
    } catch(e) { /* no case record yet */ }

    if (!isHighRiskReview && caseRecord && caseRecord.doctor_selected && caseRecord.doctor_email) {
      const doctorId = caseRecord.doctor_selected;
      const doctorEmail = caseRecord.doctor_email;

      let doctor = null;
      try { doctor = await base44.asServiceRole.entities.Doctor.get(doctorId); } catch(e) {}

      const doctorPhone = doctor?.phone;

      const token = await encodePortalToken({ consultation_id: consultationId, partner_id: doctorId, portal_type: 'doctor' });
      const doctorPortalUrl = `${appUrl}/portal/doctor/${token}`;

      // Patient identity/procedure/date stay in the doctor portal the token
      // opens — the notification only says a review is waiting.
      if (doctorPhone) {
        sendTasks.push(sendSms(doctorPhone, linkOnlySms({
          line: 'A new patient awaits your review. Open your portal to confirm or decline.',
          url: doctorPortalUrl,
          from: 'pipelineOnConsultationFeePaid',
        })));
      }
      sendTasks.push(base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND,
        to: doctorEmail,
        subject: 'New patient awaiting your review',
        body: linkOnlyEmail({
          title: 'A new patient needs your review',
          line: 'A patient has paid their consultation fee and is awaiting your confirmation. Please review their medical profile and submit your availability and quote in your secure portal.',
          ctaUrl: doctorPortalUrl,
          ctaLabel: 'Open My Doctor Portal',
          brand: BRAND,
          from: 'pipelineOnConsultationFeePaid',
        }),
      }));

      results.doctor = { email: doctorEmail, portal_url: doctorPortalUrl };
    }

    await Promise.allSettled(sendTasks);

    results.patient = { email: patientEmail, sms_sent: !!patientPhone };

    return Response.json({ success: true, results });
  } catch (error) {
    console.error('[pipelineOnConsultationFeePaid]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});