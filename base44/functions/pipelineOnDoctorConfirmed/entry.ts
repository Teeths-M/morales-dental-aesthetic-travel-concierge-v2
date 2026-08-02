import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { linkOnlyEmail, linkOnlySms } from '../../shared/notify.ts';

// Inline token encoder — HMAC-signed to match getPortalData's verifyPortalToken.
// (Previously produced an unsigned btoa(JSON) token with no '.'-suffix signature,
// which verifyPortalToken rejects outright — this portal link was non-functional.)
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
    const { data: caseData, changed_fields } = body;

    // Only fire when doctor_confirmation_status flips to CONFIRMED
    if (!changed_fields?.includes('doctor_confirmation_status') || caseData?.doctor_confirmation_status !== 'CONFIRMED') {
      return Response.json({ skipped: true, reason: 'Not a doctor confirmation event' });
    }

    const consultationId = caseData.consultation_id;
    const caseRecordId = caseData.id;

    // SECURITY: This is an entity-trigger endpoint with no user session, so the
    // request body cannot be trusted at face value — an unauthenticated caller could
    // otherwise forge a doctor-confirmed payload for any real case_id and cause travel
    // agencies/chauffeurs to be dispatched quote requests, and the patient to be told
    // their doctor confirmed, none of which actually happened. Re-verify server-side.
    if (caseRecordId) {
      const realCase = await base44.asServiceRole.entities.CaseRecord.get(caseRecordId).catch(() => null);
      if (!realCase || realCase.doctor_confirmation_status !== 'CONFIRMED') {
        return Response.json({ skipped: true, reason: 'doctor_confirmation_status not confirmed on server record' });
      }
    }
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

    // ── 1. NOTIFY PATIENT — status and next-step detail stay in the dashboard ──
    const patientDashboard = `${appUrl}/dashboard/case-status`;
    const patientSms = linkOnlySms({
      line: 'Wonderful news — your doctor has confirmed your case. Track your journey for next steps.',
      url: patientDashboard,
      from: 'pipelineOnDoctorConfirmed',
    });

    const patientEmailHtml = linkOnlyEmail({
      title: 'Your doctor has confirmed your case',
      line: 'Our concierge team is now coordinating all travel logistics — flights, accommodation and local transfers. You will receive your full package proposal within 24–48 hours.',
      ctaUrl: patientDashboard,
      ctaLabel: 'Track My Journey',
      brand: BRAND,
      from: 'pipelineOnDoctorConfirmed',
    });

    if (patientPhone && !await isBlackedOut('sms', 'patient', patientPhone)) {
      labeledDispatches.push({ label: 'Patient SMS', provider_type: 'patient', provider_name: patientName, provider_email: patientPhone, dispatch_type: 'sms', fn: () => sendSms(patientPhone, patientSms) });
    }
    if (patientEmail && !await isBlackedOut('email', 'patient', patientEmail)) {
      labeledDispatches.push({ label: 'Patient Confirmation Email', provider_type: 'patient', provider_name: patientName, provider_email: patientEmail, dispatch_type: 'email', fn: () => base44.asServiceRole.integrations.Core.SendEmail({ from_name: BRAND, to: patientEmail, subject: 'Your doctor has confirmed — next steps', body: patientEmailHtml }) });
    }
    results.patient = { email: patientEmail, sms_sent: !!patientPhone };

    // ── 2. NOTIFY TRAVEL AGENCIES SERVING THIS DESTINATION ──────────────────
    // Scoped to the case's destination country instead of blasting every active
    // agency globally on every single confirmation — falls back to the full list if
    // no country-scoped match exists so a case never silently gets zero quotes.
    // (procedureCountry is also used by the companion-matching section further down.)
    const procedureCountry = caseData.procedure_country || '';
    let travelAgencies = await base44.asServiceRole.entities.TravelAgency.filter({ status: 'active' }, '-created_date', 1000);
    if (procedureCountry) {
      const scopedAgencies = travelAgencies.filter(a =>
        a.service_regions?.some((r: string) => r.toLowerCase().includes(procedureCountry.toLowerCase()))
      );
      if (scopedAgencies.length > 0) travelAgencies = scopedAgencies;
    }

    // Patient name/procedure/dates stay in the portal the token opens.
    for (const agency of travelAgencies) {
      const agencyName = agency.agency_name || agency.contact_person || agency.email;
      const token = await encodePortalToken({ consultation_id: consultationId, partner_id: agency.id, portal_type: 'travel' });
      const portalUrl = `${appUrl}/portal/travel?token=${token}`;

      const agencySms = linkOnlySms({
        line: 'A doctor has confirmed a new patient. Open your portal to submit a travel quote within 48 hours.',
        url: portalUrl,
        from: 'pipelineOnDoctorConfirmed',
      });

      const agencyEmailHtml = linkOnlyEmail({
        title: 'A travel quote is needed',
        line: 'A doctor has confirmed a patient for their procedure. Log into your portal to submit your travel package quote — flights, hotel and any package options.',
        ctaUrl: portalUrl,
        ctaLabel: 'Open My Travel Portal',
        brand: BRAND,
        from: 'pipelineOnDoctorConfirmed',
      });

      if (agency.phone && !await isBlackedOut('sms', 'vendor', agency.phone)) {
        labeledDispatches.push({ label: `Travel Agency SMS — ${agencyName}`, provider_type: 'travel_agency', provider_name: agencyName, provider_email: agency.phone, dispatch_type: 'sms', fn: () => sendSms(agency.phone, agencySms) });
      }
      if (agency.email && !await isBlackedOut('email', 'vendor', agency.email)) {
        labeledDispatches.push({ label: `Travel Agency Email — ${agencyName}`, provider_type: 'travel_agency', provider_name: agencyName, provider_email: agency.email, dispatch_type: 'email', fn: () => base44.asServiceRole.integrations.Core.SendEmail({ from_name: BRAND, to: agency.email, subject: 'Travel quote needed', body: agencyEmailHtml }) });
      }
      results.travel_agencies.push({ name: agencyName, email: agency.email, portal_url: portalUrl });
    }

    // ── 3. NOTIFY CHAUFFEUR / TAXI SERVICES IN THIS DESTINATION ─────────────
    // Same destination-country scoping as travel agencies above, with the same
    // fall-back-to-full-list safety net when no country-scoped match exists.
    let chauffeurs = procedureCountry
      ? await base44.asServiceRole.entities.TaxiService.filter({ status: 'active', operating_country: procedureCountry }, '-created_date', 500)
      : [];
    if (chauffeurs.length === 0) {
      chauffeurs = await base44.asServiceRole.entities.TaxiService.filter({ status: 'active' }, '-created_date', 1000);
    }

    for (const driver of chauffeurs) {
      const driverName = driver.driver_name || driver.company_name || driver.email;
      const token = await encodePortalToken({ consultation_id: consultationId, partner_id: driver.id, portal_type: 'chauffeur' });
      const portalUrl = `${appUrl}/portal/transfer?token=${token}`;

      const driverSms = linkOnlySms({
        line: 'A new patient has been confirmed and needs medical transfers in your region. Open your portal to submit pricing within 48 hours.',
        url: portalUrl,
        from: 'pipelineOnDoctorConfirmed',
      });

      const driverEmailHtml = linkOnlyEmail({
        title: 'Transfer pricing is needed',
        line: 'A patient has been confirmed by their doctor and needs transfer quotes. Submit pricing for each leg via your secure portal.',
        ctaUrl: portalUrl,
        ctaLabel: 'Open My Chauffeur Portal',
        brand: BRAND,
        from: 'pipelineOnDoctorConfirmed',
      });

      if (driver.phone && !await isBlackedOut('sms', 'vendor', driver.phone)) {
        labeledDispatches.push({ label: `Chauffeur SMS — ${driverName}`, provider_type: 'chauffeur', provider_name: driverName, provider_email: driver.phone, dispatch_type: 'sms', fn: () => sendSms(driver.phone, driverSms) });
      }
      if (driver.email && !await isBlackedOut('email', 'vendor', driver.email)) {
        labeledDispatches.push({ label: `Chauffeur Email — ${driverName}`, provider_type: 'chauffeur', provider_name: driverName, provider_email: driver.email, dispatch_type: 'email', fn: () => base44.asServiceRole.integrations.Core.SendEmail({ from_name: BRAND, to: driver.email, subject: 'Transfer quote needed', body: driverEmailHtml }) });
      }
      results.chauffeurs.push({ name: driverName, email: driver.email, portal_url: portalUrl });
    }

    // ── 4. NOTIFY COMPANIONS (new — quota request for recovery service) ────────
    const companions = await base44.asServiceRole.entities.Companion.filter({
      verification_status: 'verified', is_available: true
    }).catch(() => []);
    const companion = companions.find(c => (c.service_regions || []).includes(procedureCountry)) ?? companions[0];

    if (companion) {
      const companionName = companion.full_name || companion.email;
      const companionEmailHtml = linkOnlyEmail({
        title: 'A companion quote is needed',
        line: 'A patient has been confirmed by their doctor and needs a recovery companion. Review the details and submit your availability and pricing.',
        ctaUrl: `${appUrl}/companion-dashboard`,
        ctaLabel: 'Open Companion Dashboard',
        brand: BRAND,
        from: 'pipelineOnDoctorConfirmed',
      });
      if (companion.phone && !await isBlackedOut('sms', 'vendor', companion.phone)) {
        labeledDispatches.push({ label: `Companion SMS — ${companionName}`, provider_type: 'companion', provider_name: companionName, provider_email: companion.phone, dispatch_type: 'sms',
          fn: () => sendSms(companion.phone, linkOnlySms({
            line: 'A confirmed patient needs a recovery companion in your region — log in to confirm availability and pricing.',
            url: `${appUrl}/companion-dashboard`,
            from: 'pipelineOnDoctorConfirmed',
          })) });
      }
      if (companion.email && !await isBlackedOut('email', 'vendor', companion.email)) {
        labeledDispatches.push({ label: `Companion Email — ${companionName}`, provider_type: 'companion', provider_name: companionName, provider_email: companion.email, dispatch_type: 'email',
          fn: () => base44.asServiceRole.integrations.Core.SendEmail({ from_name: BRAND, to: companion.email, subject: 'Companion quote needed', body: companionEmailHtml }) });
      }
    }

    // ── 5. NOTIFY CLINIC (doctor's clinic — facility fee quote) ─────────────
    const doctorEmail = caseData.doctor_email;
    if (doctorEmail) {
      const clinicEmailHtml = linkOnlyEmail({
        title: 'A clinic facility fee quote is needed',
        line: 'As the confirmed physician for this case, please provide the clinic facility fee, anaesthesia cost (if applicable) and post-operative consultation fee in your dashboard. The patient\'s signed liability and arbitration consent is also available to view there, under Active Patients.',
        ctaUrl: `${appUrl}/doctor-dashboard`,
        ctaLabel: 'Open Doctor Dashboard',
        brand: BRAND,
        from: 'pipelineOnDoctorConfirmed',
      });
      if (!await isBlackedOut('email', 'vendor', doctorEmail)) {
        labeledDispatches.push({ label: 'Clinic Facility Fee Email', provider_type: 'clinic', provider_name: 'Doctor', provider_email: doctorEmail, dispatch_type: 'email',
          fn: () => base44.asServiceRole.integrations.Core.SendEmail({ from_name: BRAND, to: doctorEmail, subject: 'Clinic facility fee quote needed', body: clinicEmailHtml }) });
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