import { createHandler } from '../_shared/createHandler.ts';

const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

function buildTwilioSms(to, message, accountSid, authToken, fromNumber) {
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const formData = new URLSearchParams();
  formData.append('To', to);
  formData.append('From', fromNumber);
  formData.append('Body', message);
  return fetch(twilioUrl, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    // `const body = await body()` shadowed the destructured `body` parameter —
    // a SyntaxError ("Identifier 'body' has already been declared"), so this
    // file could never even parse, let alone run. Renamed the local.
    const reqBody = await body();
    const { dry_run = false, target_groups = ['doctors', 'travel_agencies', 'taxi_services', 'patients'] } = reqBody;

    const twilioReady = accountSid && authToken && fromNumber && accountSid.startsWith('AC');

    const results = { sent: [], failed: [], skipped: [] };

    // ─── DOCTORS ───────────────────────────────────────────────────────
    if (target_groups.includes('doctors')) {
      const doctors = await base44.asServiceRole.entities.Doctor.filter({ status: 'active' });
      for (const doctor of doctors) {
        if (!doctor.phone && !doctor.email) { results.skipped.push({ name: doctor.full_name, reason: 'No phone or email' }); continue; }

        // Generate portal link using existing function
        let portalUrl = `${APP_URL}/portal/doctor/`;
        try {
          const linkRes = await base44.functions.invoke('generateDoctorPortalLink', { doctor_id: doctor.id });
          // SDK may return data directly or wrapped in .data; portal_url may be relative
          const raw = linkRes?.portal_url ?? linkRes?.data?.portal_url;
          if (raw) portalUrl = raw.startsWith('http') ? raw : `${APP_URL}${raw}`;
        } catch (_) { /* fallback to base url */ }

        const smsMsg = `Hi Dr. ${doctor.full_name}! Access your Morales D&A doctor portal here: ${portalUrl} - Questions? Reply to this message.`;
        const emailBody = `<p>Dear Dr. ${doctor.full_name},</p><p>Your secure doctor portal link is ready. Click below to access your cases, confirm appointments, and manage your schedule:</p><p><a href="${portalUrl}" style="background:#2d6a4f;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Open My Doctor Portal</a></p><p>- Morales Medical Travel Safety Team</p>`;

        if (doctor.email) {
          try {
            const blackoutRes = await base44.asServiceRole.functions.invoke('checkNotificationBlackout', {
              case_id: null,
              notification_type: 'email',
              recipient_role: 'partner',
              recipient_identifier: doctor.email,
              event_trigger: 'portal_broadcast',
              payload: { subject: '🔗 Your Doctor Portal Link - Morales D&A' }
            }).catch(() => ({ suppressed: false }));
            if (blackoutRes?.suppressed || blackoutRes?.data?.suppressed) {
              console.log(`Portal broadcast to ${doctor.email} suppressed — blackout active`);
              results.skipped.push({ name: doctor.full_name, reason: 'Blackout active' });
            } else {
              await base44.asServiceRole.integrations.Core.SendEmail({ to: doctor.email, subject: '🔗 Your Doctor Portal Link - Morales D&A', body: emailBody, from_name: 'Morales Medical Travel Safety' });
              results.sent.push({ name: doctor.full_name, type: 'doctor', channel: 'email' });
            }
          } catch (e) { results.failed.push({ name: doctor.full_name, type: 'doctor', channel: 'email', error: 'send_failed' }); }
        }

        if (doctor.phone && !dry_run && twilioReady) {
          try {
            const r = await buildTwilioSms(doctor.phone, smsMsg, accountSid, authToken, fromNumber);
            const rJson = await r.json();
            if (r.ok) results.sent.push({ name: doctor.full_name, type: 'doctor', channel: 'sms' });
            else results.failed.push({ name: doctor.full_name, type: 'doctor', channel: 'sms', error: rJson.message });
          } catch (e) { results.failed.push({ name: doctor.full_name, type: 'doctor', channel: 'sms', error: 'send_failed' }); }
        } else if (doctor.phone && dry_run) {
          results.sent.push({ name: doctor.full_name, type: 'doctor', channel: 'sms (dry_run)', preview: smsMsg });
        }
      }
    }

    // ─── TRAVEL AGENCIES ───────────────────────────────────────────────
    if (target_groups.includes('travel_agencies')) {
      const agencies = await base44.asServiceRole.entities.TravelAgency.filter({ status: 'active' });
      for (const agency of agencies) {
        if (!agency.phone && !agency.email) { results.skipped.push({ name: agency.agency_name, reason: 'No phone or email' }); continue; }

        let portalUrl = `${APP_URL}/portal/travel`;
        try {
          const linkRes = await base44.functions.invoke('generateTravelAgencyPortalLink', { agency_id: agency.id });
          const raw = linkRes?.portal_url ?? linkRes?.data?.portal_url;
          if (raw) portalUrl = raw.startsWith('http') ? raw : `${APP_URL}${raw}`;
        } catch (_) { /* fallback */ }

        const smsMsg = `Hi ${agency.agency_name}! Access your Morales D&A travel agency portal here: ${portalUrl} - Submit travel quotes and manage bookings directly.`;
        const emailBody = `<p>Dear ${agency.contact_person || agency.agency_name},</p><p>Your secure travel agency portal link is ready. Click below to view patient cases and submit travel arrangements:</p><p><a href="${portalUrl}" style="background:#2d6a4f;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Open My Travel Portal</a></p><p>- Morales Medical Travel Safety Team</p>`;

        if (agency.email) {
          try {
            const blackoutRes = await base44.asServiceRole.functions.invoke('checkNotificationBlackout', {
              case_id: null,
              notification_type: 'email',
              recipient_role: 'partner',
              recipient_identifier: agency.email,
              event_trigger: 'portal_broadcast',
              payload: { subject: '🔗 Your Travel Agency Portal Link - Morales D&A' }
            }).catch(() => ({ suppressed: false }));
            if (blackoutRes?.suppressed || blackoutRes?.data?.suppressed) {
              console.log(`Portal broadcast to ${agency.email} suppressed — blackout active`);
              results.skipped.push({ name: agency.agency_name, reason: 'Blackout active' });
            } else {
              await base44.asServiceRole.integrations.Core.SendEmail({ to: agency.email, subject: '🔗 Your Travel Agency Portal Link - Morales D&A', body: emailBody, from_name: 'Morales Medical Travel Safety' });
              results.sent.push({ name: agency.agency_name, type: 'travel_agency', channel: 'email' });
            }
          } catch (e) { results.failed.push({ name: agency.agency_name, type: 'travel_agency', channel: 'email', error: 'send_failed' }); }
        }

        const phone = agency.whatsapp_number || agency.phone;
        if (phone && !dry_run && twilioReady) {
          try {
            const r = await buildTwilioSms(phone, smsMsg, accountSid, authToken, fromNumber);
            const rJson = await r.json();
            if (r.ok) results.sent.push({ name: agency.agency_name, type: 'travel_agency', channel: 'sms' });
            else results.failed.push({ name: agency.agency_name, type: 'travel_agency', channel: 'sms', error: rJson.message });
          } catch (e) { results.failed.push({ name: agency.agency_name, type: 'travel_agency', channel: 'sms', error: 'send_failed' }); }
        } else if (phone && dry_run) {
          results.sent.push({ name: agency.agency_name, type: 'travel_agency', channel: 'sms (dry_run)', preview: smsMsg });
        }
      }
    }

    // ─── TAXI / CHAUFFEUR SERVICES ─────────────────────────────────────
    if (target_groups.includes('taxi_services')) {
      const drivers = await base44.asServiceRole.entities.TaxiService.filter({ status: 'active' });
      for (const driver of drivers) {
        if (!driver.phone && !driver.email) { results.skipped.push({ name: driver.driver_name, reason: 'No phone or email' }); continue; }

        let portalUrl = `${APP_URL}/portal/transfer`;
        try {
          const linkRes = await base44.functions.invoke('generateChauffeurPortalLink', { driver_id: driver.id });
          const raw = linkRes?.portal_url ?? linkRes?.data?.portal_url;
          if (raw) portalUrl = raw.startsWith('http') ? raw : `${APP_URL}${raw}`;
        } catch (_) { /* fallback */ }

        const name = driver.driver_name || driver.company_name;
        const smsMsg = `Hi ${name}! Access your Morales D&A chauffeur portal here: ${portalUrl} - View transfer assignments and submit quotes.`;
        const emailBody = `<p>Dear ${name},</p><p>Your secure chauffeur portal link is ready. Click below to view patient transfers and submit pricing:</p><p><a href="${portalUrl}" style="background:#2d6a4f;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Open My Transfer Portal</a></p><p>- Morales Medical Travel Safety Team</p>`;

        if (driver.email) {
          try {
            const blackoutRes = await base44.asServiceRole.functions.invoke('checkNotificationBlackout', {
              case_id: null,
              notification_type: 'email',
              recipient_role: 'partner',
              recipient_identifier: driver.email,
              event_trigger: 'portal_broadcast',
              payload: { subject: '🔗 Your Chauffeur Portal Link - Morales D&A' }
            }).catch(() => ({ suppressed: false }));
            if (blackoutRes?.suppressed || blackoutRes?.data?.suppressed) {
              console.log(`Portal broadcast to ${driver.email} suppressed — blackout active`);
              results.skipped.push({ name, reason: 'Blackout active' });
            } else {
              await base44.asServiceRole.integrations.Core.SendEmail({ to: driver.email, subject: '🔗 Your Chauffeur Portal Link - Morales D&A', body: emailBody, from_name: 'Morales Medical Travel Safety' });
              results.sent.push({ name, type: 'taxi_service', channel: 'email' });
            }
          } catch (e) { results.failed.push({ name, type: 'taxi_service', channel: 'email', error: 'send_failed' }); }
        }

        if (driver.phone && !dry_run && twilioReady) {
          try {
            const r = await buildTwilioSms(driver.phone, smsMsg, accountSid, authToken, fromNumber);
            const rJson = await r.json();
            if (r.ok) results.sent.push({ name, type: 'taxi_service', channel: 'sms' });
            else results.failed.push({ name, type: 'taxi_service', channel: 'sms', error: rJson.message });
          } catch (e) { results.failed.push({ name, type: 'taxi_service', channel: 'sms', error: 'send_failed' }); }
        } else if (driver.phone && dry_run) {
          results.sent.push({ name, type: 'taxi_service', channel: 'sms (dry_run)', preview: smsMsg });
        }
      }
    }

    // ─── PATIENTS (active consultations with case records) ─────────────
    if (target_groups.includes('patients')) {
      // BUG-R12-05 FIX: filter({}) loads the ENTIRE CaseRecord table into memory on every broadcast.
      // On a platform with hundreds of cases this causes OOM and the function times out.
      // Limit to 200 most recent; payable status filtering happens client-side from this set.
      const cases = await base44.asServiceRole.entities.CaseRecord.filter({}, '-updated_date', 200);
      const payableStatuses = ['Proposal-Sent', 'PMP-25', 'PMP-50', 'Deposit-Paid', 'Travel-Coordination', 'Ready-For-Travel'];
      const payableCases = cases.filter(c => payableStatuses.includes(c.status) && c.proposal_token);

      for (const caseRecord of payableCases) {
        if (!caseRecord.client_phone && !caseRecord.client_email) { results.skipped.push({ name: caseRecord.client_name, reason: 'No phone or email' }); continue; }

        const payUrl = `${APP_URL}/portal/proposal/${caseRecord.proposal_token}`;
        const smsMsg = `Hi ${caseRecord.client_name}! Your Morales D&A treatment proposal & payment portal is ready. Access it here: ${payUrl} - Pay now to secure your spot!`;
        const emailBody = `<p>Dear ${caseRecord.client_name},</p><p>Your personalized treatment proposal is ready and your payment portal is now open. Click below to review your package and complete your payment:</p><p><a href="${payUrl}" style="background:#2d6a4f;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">View Proposal & Pay Now</a></p><p>Current Status: <strong>${caseRecord.status}</strong></p><p>- Morales Medical Travel Safety Team</p>`;

        if (caseRecord.client_email) {
          try {
            // Blackout guard for patient emails
            const blackoutRes = await base44.asServiceRole.functions.invoke('checkNotificationBlackout', {
              case_id: caseRecord.id,
              notification_type: 'email',
              recipient_role: 'patient',
              recipient_identifier: caseRecord.client_email,
              event_trigger: 'broadcastPortalLinks',
              payload: { subject: '💳 Your Treatment Proposal & Payment Portal - Morales D&A' }
            }).catch(() => ({ suppressed: false }));
            if (blackoutRes?.suppressed || blackoutRes?.data?.suppressed) {
              results.skipped.push({ name: caseRecord.client_name, reason: 'Blackout active' });
            } else {
              await base44.asServiceRole.integrations.Core.SendEmail({ to: caseRecord.client_email, subject: '💳 Your Treatment Proposal & Payment Portal - Morales D&A', body: emailBody, from_name: 'Morales Medical Travel Safety' });
              results.sent.push({ name: caseRecord.client_name, type: 'patient', channel: 'email' });
            }
          } catch (e) { results.failed.push({ name: caseRecord.client_name, type: 'patient', channel: 'email', error: 'send_failed' }); }
        }

        if (caseRecord.client_phone && !dry_run && twilioReady) {
          try {
            const r = await buildTwilioSms(caseRecord.client_phone, smsMsg, accountSid, authToken, fromNumber);
            const rJson = await r.json();
            if (r.ok) results.sent.push({ name: caseRecord.client_name, type: 'patient', channel: 'sms' });
            else results.failed.push({ name: caseRecord.client_name, type: 'patient', channel: 'sms', error: rJson.message });
          } catch (e) { results.failed.push({ name: caseRecord.client_name, type: 'patient', channel: 'sms', error: 'send_failed' }); }
        } else if (caseRecord.client_phone && dry_run) {
          results.sent.push({ name: caseRecord.client_name, type: 'patient', channel: 'sms (dry_run)', preview: smsMsg });
        }
      }
    }

    return Response.json({
      success: true,
      dry_run,
      summary: {
        total_sent: results.sent.length,
        total_failed: results.failed.length,
        total_skipped: results.skipped.length,
      },
      details: results,
    });
}, { name: 'broadcastPortalLinks', allowedRoles: ['admin', 'platform_admin'] }));
