import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Inline token encoder
function encodePortalToken({ consultation_id, partner_id, portal_type }) {
  const payload = { consultation_id, partner_id, portal_type, expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  const utf8 = new TextEncoder().encode(JSON.stringify(payload));
  return btoa(String.fromCharCode.apply(null, utf8));
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

const emailLayout = ({ eyebrow, title, intro, rows = [], ctaText, ctaUrl, note }) => `<!doctype html>
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
  ${note ? `<div style="margin:22px 0;padding:16px 18px;background:#f8f4ee;border-left:4px solid #b68a52;border-radius:12px;color:#40514a;font-size:14px;line-height:1.6;">${note}</div>` : ''}
  ${ctaText && ctaUrl ? `<a href="${ctaUrl}" style="display:inline-block;margin-top:6px;background:#29483d;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:15px;font-weight:700;">${ctaText} →</a>` : ''}
  <p style="margin:28px 0 0;font-size:13px;color:#64746d;">Need help? Reply to this email or contact our concierge team.</p>
  <p style="margin:12px 0 0;font-size:14px;color:#13221d;font-weight:700;">Morales Concierge Team</p>
</td></tr>
</table></td></tr></table>
</body></html>`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { data: caseData, changed_fields } = body;

    // Only fire when doctor_confirmation_status flips to CONFIRMED
    if (!changed_fields?.includes('doctor_confirmation_status') || caseData?.doctor_confirmation_status !== 'CONFIRMED') {
      return Response.json({ skipped: true, reason: 'Not a doctor confirmation event' });
    }

    const consultationId = caseData.consultation_id;
    const caseRecordId = caseData.id;
    const patientName = caseData.client_name || 'Valued Patient';
    const patientEmail = caseData.client_email;
    const patientPhone = caseData.client_phone;
    const appUrl = (Deno.env.get('APP_URL') || '').replace(/\/$/, '');

    const sendTasks = [];
    const results = { patient: null, travel_agencies: [], chauffeurs: [] };

    // ── 1. NOTIFY PATIENT ────────────────────────────────────────────────────
    const patientDashboard = `${appUrl}/dashboard/case-status`;
    const patientSms = `Great news ${patientName}! 🎉 Your doctor has confirmed your case. Our team is now coordinating your travel, hotel, and transfers. Track everything here: ${patientDashboard} — Morales Dental & Aesthetics`;

    const patientEmailHtml = emailLayout({
      eyebrow: 'Doctor Confirmed',
      title: `Your doctor has confirmed your case, ${patientName}!`,
      intro: 'Wonderful news — your assigned doctor has reviewed your profile and confirmed your procedure. Our concierge team is now coordinating all travel logistics: flights, accommodation, and local transfers. You will receive your full package proposal within 24–48 hours.',
      rows: [
        ['Stage', 'Travel Coordination'],
        ['Doctor Status', 'Confirmed ✓'],
        ['Next Update', 'Full package proposal within 24–48 hrs'],
      ],
      ctaText: 'Track My Journey',
      ctaUrl: patientDashboard,
    });

    if (patientPhone) sendTasks.push(sendSms(patientPhone, patientSms));
    if (patientEmail) {
      sendTasks.push(base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND,
        to: patientEmail,
        subject: `Your doctor has confirmed — next steps | ${BRAND}`,
        body: patientEmailHtml,
      }));
    }
    results.patient = { email: patientEmail, sms_sent: !!patientPhone };

    // ── 2. NOTIFY ALL ACTIVE TRAVEL AGENCIES ────────────────────────────────
    const travelAgencies = await base44.asServiceRole.entities.TravelAgency.filter({ status: 'active' });

    for (const agency of travelAgencies) {
      const agencyName = agency.agency_name || agency.contact_person || agency.email;
      const token = encodePortalToken({ consultation_id: consultationId, partner_id: agency.id, portal_type: 'travel' });
      const portalUrl = `${appUrl}/portal/travel?token=${token}`;

      const agencySms = `Hello ${agencyName}, a doctor has confirmed a new patient (${patientName}). Open your portal to submit flight, hotel & travel package pricing: ${portalUrl} — Morales Dental & Aesthetics`;

      const procedureLabel = (caseData.procedures || []).join(', ') || 'Medical procedure';
      const agencyEmailHtml = emailLayout({
        eyebrow: 'Travel Coordination Request',
        title: `Quote needed: ${patientName}`,
        intro: `${agencyName}, a doctor has confirmed this patient for their procedure. Please log into your portal below to submit your travel package quote including flights, hotel accommodation, and any relevant package options.`,
        rows: [
          ['Patient', patientName],
          ['Procedure', procedureLabel],
          ['Preferred Date', caseData.preferred_date || 'To be confirmed'],
          ['Destination', caseData.procedure_country || '—'],
          ['Origin', caseData.client_country || '—'],
          ['Duration of Stay', '—'],
        ],
        note: 'Please include pricing for: ✈️ Flights, 🏨 Hotel (recovery), and any all-inclusive package options you can offer.',
        ctaText: 'Open My Travel Portal',
        ctaUrl: portalUrl,
      });

      if (agency.phone) sendTasks.push(sendSms(agency.phone, agencySms));
      if (agency.email) {
        sendTasks.push(base44.asServiceRole.integrations.Core.SendEmail({
          from_name: BRAND,
          to: agency.email,
          subject: `Travel quote needed — ${patientName} | ${BRAND}`,
          body: agencyEmailHtml,
        }));
      }
      results.travel_agencies.push({ name: agencyName, email: agency.email, portal_url: portalUrl });
    }

    // ── 3. NOTIFY ALL ACTIVE CHAUFFEUR / TAXI SERVICES ──────────────────────
    const chauffeurs = await base44.asServiceRole.entities.TaxiService.filter({ status: 'active' });

    for (const driver of chauffeurs) {
      const driverName = driver.driver_name || driver.company_name || driver.email;
      const token = encodePortalToken({ consultation_id: consultationId, partner_id: driver.id, portal_type: 'chauffeur' });
      const portalUrl = `${appUrl}/portal/transfer?token=${token}`;

      const driverSms = `Hello ${driverName}, a new patient (${patientName}) needs transfer quotes (airport ↔ hotel ↔ clinic). Open your portal to submit leg pricing: ${portalUrl} — Morales Dental & Aesthetics`;

      const driverEmailHtml = emailLayout({
        eyebrow: 'Transfer Quote Request',
        title: `Transfer pricing needed: ${patientName}`,
        intro: `${driverName}, a patient has been confirmed by their doctor and we need transfer quotes for their trip. Please submit pricing for each leg via your secure portal below.`,
        rows: [
          ['Patient', patientName],
          ['Service Area', driver.operating_city ? `${driver.operating_city}, ${driver.operating_country}` : driver.operating_country || '—'],
          ['Legs Required', 'Airport → Hotel → Clinic → Hotel → Airport'],
          ['Vehicle Types', (driver.vehicle_types || []).join(', ') || '—'],
        ],
        note: '🚗 Please submit pricing for all applicable transfer legs. Include any premium vehicle or patient-assistance options.',
        ctaText: 'Open My Chauffeur Portal',
        ctaUrl: portalUrl,
      });

      if (driver.phone) sendTasks.push(sendSms(driver.phone, driverSms));
      if (driver.email) {
        sendTasks.push(base44.asServiceRole.integrations.Core.SendEmail({
          from_name: BRAND,
          to: driver.email,
          subject: `Transfer quote needed — ${patientName} | ${BRAND}`,
          body: driverEmailHtml,
        }));
      }
      results.chauffeurs.push({ name: driverName, email: driver.email, portal_url: portalUrl });
    }

    await Promise.allSettled(sendTasks);

    // Update CaseRecord status to Travel-Coordination
    await base44.asServiceRole.entities.CaseRecord.update(caseRecordId, {
      status: 'Travel-Coordination',
    });

    return Response.json({ success: true, results });
  } catch (error) {
    console.error('pipelineOnDoctorConfirmed error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});