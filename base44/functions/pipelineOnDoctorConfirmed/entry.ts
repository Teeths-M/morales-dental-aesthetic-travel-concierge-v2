import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

const BRAND = 'Morales Medical Travel Safety';

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

    // Helper: check blackout for a specific notification
    const isBlackedOut = async (notification_type, recipient_role, recipient_identifier) => {
      const res = await base44.functions.invoke('checkNotificationBlackout', {
        case_id: caseRecordId,
        notification_type,
        recipient_role,
        recipient_identifier,
        event_trigger: 'pipelineOnDoctorConfirmed',
        payload: body
      }).catch(() => ({ data: { suppressed: false } }));
      return res.data?.suppressed === true;
    };

    // ── FAULT-TOLERANT DISPATCH: labeled tasks for granular failure attribution ──
    const labeledDispatches = [];
    const results = { patient: null, travel_agencies: [], chauffeurs: [] };

    // ── 1. NOTIFY PATIENT ────────────────────────────────────────────────────
    const patientDashboard = `${appUrl}/dashboard/case-status`;
    const patientSms = `Hi ${patientName.split(' ')[0]}, wonderful news — your doctor has reviewed and confirmed your case. Our concierge team is now arranging your travel, accommodation, and transfers. You will hear from us within 24 hours with your complete package. — ${BRAND}`;

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

    if (patientPhone && !await isBlackedOut('sms', 'patient', patientPhone)) {
      labeledDispatches.push({ label: 'Patient SMS', provider_type: 'patient', provider_name: patientName, provider_email: patientPhone, dispatch_type: 'sms', fn: () => sendSms(patientPhone, patientSms) });
    }
    if (patientEmail && !await isBlackedOut('email', 'patient', patientEmail)) {
      labeledDispatches.push({ label: 'Patient Confirmation Email', provider_type: 'patient', provider_name: patientName, provider_email: patientEmail, dispatch_type: 'email', fn: () => base44.asServiceRole.integrations.Core.SendEmail({ from_name: BRAND, to: patientEmail, subject: `Your doctor has confirmed — next steps | ${BRAND}`, body: patientEmailHtml }) });
    }
    results.patient = { email: patientEmail, sms_sent: !!patientPhone };

    // ── 2. NOTIFY ALL ACTIVE TRAVEL AGENCIES ────────────────────────────────
    const travelAgencies = await base44.asServiceRole.entities.TravelAgency.filter({ status: 'active' });

    for (const agency of travelAgencies) {
      const agencyName = agency.agency_name || agency.contact_person || agency.email;
      const token = encodePortalToken({ consultation_id: consultationId, partner_id: agency.id, portal_type: 'travel' });
      const portalUrl = `${appUrl}/portal/travel?token=${token}`;

      const agencySms = `Hello ${agencyName}, a doctor has confirmed a new patient with Morales. ${patientName} requires a complete travel package. Please open your portal to submit pricing within 48 hours: ${portalUrl} — ${BRAND}`;

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

      if (agency.phone && !await isBlackedOut('sms', 'vendor', agency.phone)) {
        labeledDispatches.push({ label: `Travel Agency SMS — ${agencyName}`, provider_type: 'travel_agency', provider_name: agencyName, provider_email: agency.phone, dispatch_type: 'sms', fn: () => sendSms(agency.phone, agencySms) });
      }
      if (agency.email && !await isBlackedOut('email', 'vendor', agency.email)) {
        labeledDispatches.push({ label: `Travel Agency Email — ${agencyName}`, provider_type: 'travel_agency', provider_name: agencyName, provider_email: agency.email, dispatch_type: 'email', fn: () => base44.asServiceRole.integrations.Core.SendEmail({ from_name: BRAND, to: agency.email, subject: `Travel quote needed — ${patientName} | ${BRAND}`, body: agencyEmailHtml }) });
      }
      results.travel_agencies.push({ name: agencyName, email: agency.email, portal_url: portalUrl });
    }

    // ── 3. NOTIFY ALL ACTIVE CHAUFFEUR / TAXI SERVICES ──────────────────────
    const chauffeurs = await base44.asServiceRole.entities.TaxiService.filter({ status: 'active' });

    for (const driver of chauffeurs) {
      const driverName = driver.driver_name || driver.company_name || driver.email;
      const token = encodePortalToken({ consultation_id: consultationId, partner_id: driver.id, portal_type: 'chauffeur' });
      const portalUrl = `${appUrl}/portal/transfer?token=${token}`;

      const driverSms = `Hello ${driverName}, a new patient has been confirmed with Morales. ${patientName} requires medical transfers in your region. Please open your portal to submit your pricing within 48 hours: ${portalUrl} — ${BRAND}`;

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

      if (driver.phone && !await isBlackedOut('sms', 'vendor', driver.phone)) {
        labeledDispatches.push({ label: `Chauffeur SMS — ${driverName}`, provider_type: 'chauffeur', provider_name: driverName, provider_email: driver.phone, dispatch_type: 'sms', fn: () => sendSms(driver.phone, driverSms) });
      }
      if (driver.email && !await isBlackedOut('email', 'vendor', driver.email)) {
        labeledDispatches.push({ label: `Chauffeur Email — ${driverName}`, provider_type: 'chauffeur', provider_name: driverName, provider_email: driver.email, dispatch_type: 'email', fn: () => base44.asServiceRole.integrations.Core.SendEmail({ from_name: BRAND, to: driver.email, subject: `Transfer quote needed — ${patientName} | ${BRAND}`, body: driverEmailHtml }) });
      }
      results.chauffeurs.push({ name: driverName, email: driver.email, portal_url: portalUrl });
    }

    // ── 4. NOTIFY COMPANIONS (new — quota request for recovery service) ────────
    const companions = await base44.asServiceRole.entities.Companion.filter({
      verification_status: 'verified', is_available: true
    }).catch(() => []);
    const procedureCountry = caseData.procedure_country || '';
    const companion = companions.find(c => (c.service_regions || []).includes(procedureCountry)) ?? companions[0];

    if (companion) {
      const companionName = companion.full_name || companion.email;
      const companionEmailHtml = emailLayout({
        eyebrow: 'Companion Service Quote Request',
        title: `Companion quote needed: ${patientName}`,
        intro: `${companionName}, a patient has been confirmed by their doctor and requires a recovery companion. Please review the details and submit your availability and pricing for the recovery period.`,
        rows: [
          ['Patient', patientName],
          ['Procedure(s)', (caseData.procedures || []).join(', ') || '—'],
          ['Recovery Days', String(caseData.recovery_days || 3)],
          ['Location', procedureCountry || '—'],
        ],
        note: '🍽️ Your quote should cover daily meal delivery, emotional support, and availability for the full recovery period.',
        ctaText: 'Open Companion Dashboard',
        ctaUrl: `${appUrl}/companion-dashboard`,
      });
      if (companion.phone && !await isBlackedOut('sms', 'vendor', companion.phone)) {
        labeledDispatches.push({ label: `Companion SMS — ${companionName}`, provider_type: 'companion', provider_name: companionName, provider_email: companion.phone, dispatch_type: 'sms',
          fn: () => sendSms(companion.phone, `Hello ${companionName}, a confirmed patient (${patientName}) needs a recovery companion in ${procedureCountry}. Please log in to confirm your availability and pricing: ${appUrl}/companion-dashboard — ${BRAND}`) });
      }
      if (companion.email && !await isBlackedOut('email', 'vendor', companion.email)) {
        labeledDispatches.push({ label: `Companion Email — ${companionName}`, provider_type: 'companion', provider_name: companionName, provider_email: companion.email, dispatch_type: 'email',
          fn: () => base44.asServiceRole.integrations.Core.SendEmail({ from_name: BRAND, to: companion.email, subject: `Companion quote needed — ${patientName} | ${BRAND}`, body: companionEmailHtml }) });
      }
    }

    // ── 5. NOTIFY CLINIC (doctor's clinic — facility fee quote) ─────────────
    const doctorEmail = caseData.doctor_email;
    if (doctorEmail) {
      const clinicEmailHtml = emailLayout({
        eyebrow: 'Clinic Facility Fee — Quote Request',
        title: `Facility fee quote needed: ${patientName}`,
        intro: `Doctor, as the confirmed physician for this case, please provide the clinic facility fee, anaesthesia cost (if applicable), and post-operative consultation fee so we can finalise the patient's complete package pricing.`,
        rows: [
          ['Patient', patientName],
          ['Procedure(s)', (caseData.procedures || []).join(', ') || '—'],
          ['Procedure Date', caseData.procedure_date || caseData.preferred_date || 'To be confirmed'],
          ['Case Reference', caseRecordId.slice(-8).toUpperCase()],
        ],
        note: '🏥 Please include: clinic facility fee, anaesthesia (if applicable), and post-op follow-up cost. Submit via your dashboard.',
        ctaText: 'Open Doctor Dashboard',
        ctaUrl: `${appUrl}/doctor-dashboard`,
      });
      if (!await isBlackedOut('email', 'vendor', doctorEmail)) {
        labeledDispatches.push({ label: 'Clinic Facility Fee Email', provider_type: 'clinic', provider_name: 'Doctor', provider_email: doctorEmail, dispatch_type: 'email',
          fn: () => base44.asServiceRole.integrations.Core.SendEmail({ from_name: BRAND, to: doctorEmail, subject: `Clinic facility fee quote needed — ${patientName} | ${BRAND}`, body: clinicEmailHtml }) });
      }
    }

    // ── FAULT-TOLERANT SETTLEMENT: isolate failures, continue all other dispatches ──
    const settled = await Promise.allSettled(labeledDispatches.map(d => d.fn()));
    const failureWrites = [];
    for (let i = 0; i < settled.length; i++) {
      if (settled[i].status === 'rejected') {
        const d = labeledDispatches[i];
        failureWrites.push(
          base44.asServiceRole.entities.DispatchFailureLog.create({
            case_id: caseRecordId,
            case_name: patientName,
            pipeline_stage: 'pipelineOnDoctorConfirmed',
            provider_type: d.provider_type,
            provider_name: d.provider_name,
            provider_email: d.provider_email,
            dispatch_type: d.dispatch_type,
            error_message: `${d.label} — ${settled[i].reason?.message || 'Dispatch connection failed'}`,
            status: 'pending_intervention',
            logged_at: new Date().toISOString(),
          })
        );
      }
    }
    if (failureWrites.length > 0) {
      await Promise.allSettled(failureWrites);
      console.warn(`[FaultTolerance] ${failureWrites.length} dispatch(es) failed and logged for admin intervention`);
    }

    // Update CaseRecord to Vendor-Pending — waiting for all 4 partner quotes to come back.
    // Status moves to Proposal-Sent only after all_quotas_confirmed = true via calculatePackagePrice.
    await base44.asServiceRole.entities.CaseRecord.update(caseRecordId, {
      status:               'Vendor-Pending',
      quotas_requested_at:  new Date().toISOString(),
    });

    console.log(`[pipelineOnDoctorConfirmed] Quota requests dispatched to ${labeledDispatches.length} partner channels for case ${caseRecordId}`);
    return Response.json({ success: true, results, partners_notified: labeledDispatches.length });
  } catch (error) {
    console.error('[pipelineOnDoctorConfirmed]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});