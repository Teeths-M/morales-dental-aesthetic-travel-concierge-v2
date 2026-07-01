import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const BRAND = 'Morales Medical Travel Safety';

function encodePortalToken({ consultation_id, partner_id, portal_type }: {
  consultation_id: string; partner_id: string; portal_type: string;
}) {
  const payload = { consultation_id, partner_id, portal_type, expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  const utf8 = new TextEncoder().encode(JSON.stringify(payload));
  return btoa(String.fromCharCode.apply(null, [...utf8]));
}

async function sendSms(to: string, message: string) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken  = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!accountSid?.startsWith('AC') || !authToken || !fromNumber || !to) return;
  const form = new URLSearchParams({ To: to, From: fromNumber, Body: message });
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  }).catch(() => {});
}

// ── 3-stage professional email templates ──────────────────────────────────────
// Stage 1 (24-48 hr): Warm, collaborative — just letting you know
// Stage 2 (48-72 hr): Gentle follow-up — still waiting, but friendly
// Stage 3 (72hr+):    SMS only — brief, professional, last resort

function stage1Email({ partnerName, patientName, ctaUrl, role }: {
  partnerName: string; patientName: string; ctaUrl: string; role: string;
}) {
  const roleMsg = role === 'travel_agency'
    ? 'flight and hotel package pricing'
    : 'transfer leg pricing';
  return `<!doctype html><html><body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #dde5df;border-radius:22px;overflow:hidden;">
<tr><td style="background:#29483d;padding:28px 32px;color:#fff;">
  <div style="font-family:Georgia,serif;font-size:22px;">${BRAND}</div>
  <div style="margin-top:8px;font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#d9c19b;">Quote Request — Action Needed</div>
</td></tr>
<tr><td style="padding:32px;">
  <h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#13221d;">
    Hi ${partnerName}, a patient is waiting on you.
  </h1>
  <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#40514a;">
    We wanted to let you know that <strong>${patientName}</strong> is currently being coordinated through our platform and we're still missing your <strong>${roleMsg}</strong>.
  </p>
  <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#40514a;">
    There's no rush — but submitting your quote helps us lock in their care package so they can travel with confidence. It takes just a few minutes in your portal.
  </p>
  <a href="${ctaUrl}" style="display:inline-block;background:#29483d;color:#fff;text-decoration:none;padding:13px 24px;border-radius:999px;font-size:14px;font-weight:700;">
    Submit Quote →
  </a>
  <p style="margin:28px 0 0;font-size:13px;color:#64746d;line-height:1.6;">
    Questions? Reply to this email or reach us on WhatsApp — we're happy to help.
  </p>
  <p style="margin:14px 0 0;font-size:14px;color:#13221d;font-weight:700;">The Morales Concierge Team</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

function stage2Email({ partnerName, patientName, ctaUrl, role, hoursAgo }: {
  partnerName: string; patientName: string; ctaUrl: string; role: string; hoursAgo: number;
}) {
  const roleMsg = role === 'travel_agency' ? 'travel package' : 'transfer pricing';
  return `<!doctype html><html><body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #dde5df;border-radius:22px;overflow:hidden;">
<tr><td style="background:#29483d;padding:28px 32px;color:#fff;">
  <div style="font-family:Georgia,serif;font-size:22px;">${BRAND}</div>
  <div style="margin-top:8px;font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#d9c19b;">Friendly Follow-Up</div>
</td></tr>
<tr><td style="padding:32px;">
  <h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#13221d;">
    Just following up, ${partnerName}.
  </h1>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#40514a;">
    We sent you a note about a quote for <strong>${patientName}</strong> around ${Math.round(hoursAgo)} hours ago.
    We understand schedules get busy, and we appreciate your patience with us.
  </p>
  <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#40514a;">
    The patient is eager to finalise their ${roleMsg}. Your submission would mean the world to them and keeps their journey on track.
  </p>
  <div style="background:#fff8ed;border-left:4px solid #e8a020;padding:14px 18px;border-radius:0 12px 12px 0;margin-bottom:24px;">
    <p style="margin:0;font-size:14px;color:#40514a;line-height:1.6;">
      If you have any questions about the patient's requirements or need the brief resent, please reach us on WhatsApp and we'll sort it immediately.
    </p>
  </div>
  <a href="${ctaUrl}" style="display:inline-block;background:#29483d;color:#fff;text-decoration:none;padding:13px 24px;border-radius:999px;font-size:14px;font-weight:700;">
    Submit Quote Now →
  </a>
  <p style="margin:28px 0 0;font-size:13px;color:#64746d;line-height:1.6;">
    Thank you for being a valued partner. We count on your expertise to deliver world-class care to every patient.
  </p>
  <p style="margin:14px 0 0;font-size:14px;color:#13221d;font-weight:700;">Morales Concierge Team</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44  = createClientFromRequest(req);
    const appUrl  = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
    const now     = Date.now();

    const HR_24 = 24 * 60 * 60 * 1000;
    const HR_48 = 48 * 60 * 60 * 1000;
    const HR_72 = 72 * 60 * 60 * 1000;

    const cases = await base44.asServiceRole.entities.CaseRecord.filter(
      { status: 'Travel-Coordination' }, 'updated_date', 100
    );

    const results: { type: string; name: string; case: string; stage: number }[] = [];
    let skipped = 0;

    for (const caseRecord of cases) {
      const consultationId = caseRecord.consultation_id;
      if (!consultationId) { skipped++; continue; }

      const triggeredAt = new Date(caseRecord.doctor_confirmed_at || caseRecord.updated_date).getTime();
      const ageMs       = now - triggeredAt;

      // Under 24hr — too soon, skip entirely
      if (ageMs < HR_24) { skipped++; continue; }

      const stage = ageMs < HR_48 ? 1 : ageMs < HR_72 ? 2 : 3;

      const tasks: Promise<unknown>[] = [];

      // ── Travel Agencies ─────────────────────────────────────────────────────
      if (caseRecord.itinerary_status === 'PENDING') {
        const agencies = await base44.asServiceRole.entities.TravelAgency.filter({ status: 'active' });
        for (const agency of agencies) {
          const agencyName = agency.agency_name || agency.email;
          const token      = encodePortalToken({ consultation_id: consultationId, partner_id: agency.id, portal_type: 'travel' });
          const portalUrl  = `${appUrl}/portal/travel?token=${token}`;

          // Blackout guard
          const blackout = await base44.functions.invoke('checkNotificationBlackout', {
            case_id: caseRecord.id, notification_type: stage === 3 ? 'sms' : 'email',
            recipient_role: 'vendor', recipient_identifier: agency.email || agency.phone || '',
            event_trigger: `sendQuoteReminders_stage${stage}`,
            payload: { case_id: caseRecord.id, consultation_id: consultationId }
          }).catch(() => ({ data: { suppressed: false } }));
          if (blackout.data?.suppressed) { skipped++; continue; }

          if (stage === 1 && agency.email) {
            tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
              from_name: BRAND, to: agency.email,
              subject: `Quote request for ${caseRecord.client_name} — ${BRAND}`,
              body: stage1Email({ partnerName: agencyName, patientName: caseRecord.client_name, ctaUrl: portalUrl, role: 'travel_agency' }),
            }));
            results.push({ type: 'travel_agency', name: agencyName, case: caseRecord.client_name, stage: 1 });
          } else if (stage === 2 && agency.email) {
            tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
              from_name: BRAND, to: agency.email,
              subject: `Following up — ${caseRecord.client_name}'s travel quote | ${BRAND}`,
              body: stage2Email({ partnerName: agencyName, patientName: caseRecord.client_name, ctaUrl: portalUrl, role: 'travel_agency', hoursAgo: ageMs / (60 * 60 * 1000) }),
            }));
            results.push({ type: 'travel_agency', name: agencyName, case: caseRecord.client_name, stage: 2 });
          } else if (stage === 3 && agency.phone) {
            tasks.push(sendSms(agency.phone,
              `Hi ${agencyName}, we're still awaiting your travel quote for ${caseRecord.client_name}. This is our final reminder — please submit via your portal: ${portalUrl} — ${BRAND}`
            ));
            results.push({ type: 'travel_agency', name: agencyName, case: caseRecord.client_name, stage: 3 });
          }
        }
      }

      // ── Chauffeurs ──────────────────────────────────────────────────────────
      if (caseRecord.transfer_status === 'PENDING') {
        const chauffeurs = await base44.asServiceRole.entities.TaxiService.filter({ status: 'active' });
        for (const driver of chauffeurs) {
          const driverName = driver.driver_name || driver.company_name || driver.email;
          const token      = encodePortalToken({ consultation_id: consultationId, partner_id: driver.id, portal_type: 'chauffeur' });
          const portalUrl  = `${appUrl}/portal/transfer?token=${token}`;

          const blackout = await base44.functions.invoke('checkNotificationBlackout', {
            case_id: caseRecord.id, notification_type: stage === 3 ? 'sms' : 'email',
            recipient_role: 'vendor', recipient_identifier: driver.email || driver.phone || '',
            event_trigger: `sendQuoteReminders_stage${stage}`,
            payload: { case_id: caseRecord.id, consultation_id: consultationId }
          }).catch(() => ({ data: { suppressed: false } }));
          if (blackout.data?.suppressed) { skipped++; continue; }

          if (stage === 1 && driver.email) {
            tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
              from_name: BRAND, to: driver.email,
              subject: `Transfer pricing request for ${caseRecord.client_name} — ${BRAND}`,
              body: stage1Email({ partnerName: driverName, patientName: caseRecord.client_name, ctaUrl: portalUrl, role: 'chauffeur' }),
            }));
            results.push({ type: 'chauffeur', name: driverName, case: caseRecord.client_name, stage: 1 });
          } else if (stage === 2 && driver.email) {
            tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
              from_name: BRAND, to: driver.email,
              subject: `Following up — transfer quote for ${caseRecord.client_name} | ${BRAND}`,
              body: stage2Email({ partnerName: driverName, patientName: caseRecord.client_name, ctaUrl: portalUrl, role: 'chauffeur', hoursAgo: ageMs / (60 * 60 * 1000) }),
            }));
            results.push({ type: 'chauffeur', name: driverName, case: caseRecord.client_name, stage: 2 });
          } else if (stage === 3 && driver.phone) {
            tasks.push(sendSms(driver.phone,
              `Hi ${driverName}, we're still awaiting your transfer quote for ${caseRecord.client_name}. Final reminder — please submit: ${portalUrl} — ${BRAND}`
            ));
            results.push({ type: 'chauffeur', name: driverName, case: caseRecord.client_name, stage: 3 });
          }
        }
      }

      await Promise.allSettled(tasks);
    }

    console.log(`sendQuoteReminders: ${results.length} reminders sent (stage breakdown: ${[1,2,3].map(s => `s${s}=${results.filter(r=>r.stage===s).length}`).join(' ')}), ${skipped} skipped`);
    return Response.json({ success: true, results, skipped });
  } catch (error) {
    console.error('[sendQuoteReminders]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});
