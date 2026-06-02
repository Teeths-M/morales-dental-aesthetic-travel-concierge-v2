import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Inline token encoder (no local imports allowed)
async function encodePortalToken({ consultation_id, partner_id, portal_type }) {
  const payload = { consultation_id, partner_id, portal_type, expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  const rawBytes = new Uint8Array(32);
  crypto.getRandomValues(rawBytes);
  const randomSuffix = Array.from(rawBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const utf8 = new TextEncoder().encode(JSON.stringify(payload));
  return btoa(String.fromCharCode.apply(null, utf8)) + '.' + randomSuffix;
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

const BRAND = 'Morales Dental & Aesthetics';

const emailLayout = ({ eyebrow, title, intro, rows = [], ctaText, ctaUrl }) => `<!doctype html>
<html><body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #dde5df;border-radius:22px;overflow:hidden;">
<tr><td style="background:#29483d;padding:28px 32px;color:#fff;">
  <div style="font-family:Georgia,serif;font-size:26px;">${BRAND}</div>
  <div style="margin-top:8px;font-size:12px;letter-spacing:1.8px;text-transform:uppercase;color:#d9c19b;">${eyebrow}</div>
</td></tr>
<tr><td style="padding:32px;">
  <h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:28px;font-weight:400;color:#13221d;">${title}</h1>
  <p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#40514a;">${intro}</p>
  ${rows.length ? `<table width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e7ede9;border-bottom:1px solid #e7ede9;margin:22px 0;">${rows.map(([l,v]) => `<tr><td style="padding:10px 0;color:#64746d;font-size:13px;width:38%;">${l}</td><td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${v||'—'}</td></tr>`).join('')}</table>` : ''}
  ${ctaText && ctaUrl ? `<a href="${ctaUrl}" style="display:inline-block;margin-top:6px;background:#29483d;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:15px;font-weight:700;">${ctaText} →</a>` : ''}
  <p style="margin:28px 0 0;font-size:13px;color:#64746d;">Questions? Reply to this email or contact our concierge team.</p>
  <p style="margin:12px 0 0;font-size:14px;color:#13221d;font-weight:700;">Morales Concierge Team</p>
</td></tr>
</table></td></tr></table>
</body></html>`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
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

    const consultation = await base44.asServiceRole.entities.Consultation.get(consultationId);
    if (!consultation) {
      return Response.json({ error: 'Consultation not found' }, { status: 404 });
    }

    const appUrl = (Deno.env.get('APP_URL') || '').replace(/\/$/, '');
    const results = { patient: null, doctor: null };

    // ── 1. NOTIFY PATIENT ────────────────────────────────────────────────────
    const patientName = consultation.patient_name || 'Valued Patient';
    const patientEmail = consultation.email;
    const patientPhone = consultation.phone;
    const dashboardUrl = `${appUrl}/dashboard/case-status`;

    const patientSms = `Hi ${patientName}! ✅ Your consultation fee is confirmed. Our team is reviewing your case and will assign you a doctor shortly. Track your journey: ${dashboardUrl} — Morales Dental & Aesthetics`;

    const patientEmailHtml = emailLayout({
      eyebrow: 'Consultation Fee Confirmed',
      title: `You're officially in the queue, ${patientName}!`,
      intro: 'Your consultation fee payment has been received. Our clinical concierge team is now reviewing your medical profile and will assign a specialist shortly. You will receive updates at each stage of your journey.',
      rows: [
        ['Status', 'Fee Paid ✓'],
        ['Next Step', 'Doctor Assignment'],
        ['Estimated Update', 'Within 24 hours'],
      ],
      ctaText: 'Track My Journey',
      ctaUrl: dashboardUrl,
    });

    const sendTasks = [];

    if (patientPhone) sendTasks.push(sendSms(patientPhone, patientSms));
    if (patientEmail) {
      sendTasks.push(base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND,
        to: patientEmail,
        subject: `Your consultation fee is confirmed — ${BRAND}`,
        body: patientEmailHtml,
      }));
    }

    // ── 2. NOTIFY ASSIGNED DOCTOR (if already assigned via CaseRecord) ────────
    let caseRecord = null;
    try {
      const cases = await base44.asServiceRole.entities.CaseRecord.filter({ consultation_id: consultationId });
      caseRecord = cases.length > 0 ? cases[0] : null;
    } catch(e) { /* no case record yet */ }

    if (caseRecord && caseRecord.doctor_selected && caseRecord.doctor_email) {
      const doctorId = caseRecord.doctor_selected;
      const doctorEmail = caseRecord.doctor_email;

      let doctor = null;
      try { doctor = await base44.asServiceRole.entities.Doctor.get(doctorId); } catch(e) {}

      const doctorName = doctor?.full_name || 'Doctor';
      const doctorPhone = doctor?.phone;

      const token = await encodePortalToken({ consultation_id: consultationId, partner_id: doctorId, portal_type: 'doctor' });
      const doctorPortalUrl = `${appUrl}/portal/doctor/${token}`;

      const doctorSms = `Hello Dr. ${doctorName}, a new patient (${patientName}) has paid their consultation fee and awaits your review. Open your portal to confirm or decline: ${doctorPortalUrl} — Morales Dental & Aesthetics`;

      const doctorEmailHtml = emailLayout({
        eyebrow: 'New Patient — Action Required',
        title: `Case review needed: ${patientName}`,
        intro: `Dr. ${doctorName}, a patient has paid their consultation fee and is awaiting your confirmation. Please review their medical profile and submit your availability and procedure quote via your secure portal.`,
        rows: [
          ['Patient', patientName],
          ['Procedure', (consultation.procedure_interest || '').replace(/_/g, ' ')],
          ['Preferred Date', consultation.preferred_date || 'Flexible'],
          ['Destination', consultation.destination_country || consultation.procedure_country || '—'],
        ],
        ctaText: 'Open My Doctor Portal',
        ctaUrl: doctorPortalUrl,
      });

      if (doctorPhone) sendTasks.push(sendSms(doctorPhone, doctorSms));
      sendTasks.push(base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND,
        to: doctorEmail,
        subject: `New patient awaiting your review — ${patientName} | ${BRAND}`,
        body: doctorEmailHtml,
      }));

      results.doctor = { email: doctorEmail, portal_url: doctorPortalUrl };
    }

    await Promise.allSettled(sendTasks);

    results.patient = { email: patientEmail, sms_sent: !!patientPhone };

    return Response.json({ success: true, results });
  } catch (error) {
    console.error('pipelineOnConsultationFeePaid error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});