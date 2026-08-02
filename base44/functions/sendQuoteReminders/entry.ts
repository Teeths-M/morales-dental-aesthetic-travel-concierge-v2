import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { linkOnlyEmail } from '../../shared/notify.ts';

const BRAND = 'Morales Medical Travel Safety';

// HMAC-signed to match verifyPortalToken() in getPortalData — was previously
// unsigned and would fail that verification (portal link non-functional).
async function encodePortalToken({ consultation_id, partner_id, portal_type }: {
  consultation_id: string; partner_id: string; portal_type: string;
}) {
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

// LINK-ONLY: the partner opens their portal for the patient/case details. The email
// carries no patient name — only a role-generic prompt + secure link.
function stage1Email({ ctaUrl, role }: {
  partnerName?: string; patientName?: string; ctaUrl: string; role: string;
}) {
  const roleMsg = role === 'travel_agency' ? 'flight and hotel package pricing' : 'transfer leg pricing';
  return linkOnlyEmail({
    title: 'A patient is waiting on your quote.',
    line: `We're still missing your ${roleMsg}. Open your Morales portal to review the request and submit your quote — it takes just a few minutes.`,
    ctaUrl,
    ctaLabel: 'Submit Quote',
  });
}

function stage2Email({ ctaUrl, role }: {
  partnerName?: string; patientName?: string; ctaUrl: string; role: string; hoursAgo?: number;
}) {
  const roleMsg = role === 'travel_agency' ? 'travel package' : 'transfer pricing';
  return linkOnlyEmail({
    title: 'Just following up on your quote.',
    line: `A patient is still hoping to finalise their ${roleMsg}. Open your Morales portal to submit your quote and keep their journey on track.`,
    ctaUrl,
    ctaLabel: 'Submit Quote Now',
  });
}

Deno.serve(async (req) => {
  try {
    const base44  = createClientFromRequest(req);

    // Cron secret OR admin session. This endpoint had NO guard at all: it is
    // reachable over HTTP like every deployed function, so anyone with the URL
    // could drive it — triggering real notifications, spend and state changes.
    // NOTE: a Base44-dashboard schedule driving this must send X-Cron-Secret.
    if (!(await cronAuthorized(req, base44))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
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
          const token      = await encodePortalToken({ consultation_id: consultationId, partner_id: agency.id, portal_type: 'travel' });
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
              subject: `A patient is waiting on your quote | ${BRAND}`,
              body: stage1Email({ partnerName: agencyName, patientName: caseRecord.client_name, ctaUrl: portalUrl, role: 'travel_agency' }),
            }));
            results.push({ type: 'travel_agency', name: agencyName, case: caseRecord.client_name, stage: 1 });
          } else if (stage === 2 && agency.email) {
            tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
              from_name: BRAND, to: agency.email,
              subject: `Following up on your travel quote | ${BRAND}`,
              body: stage2Email({ partnerName: agencyName, patientName: caseRecord.client_name, ctaUrl: portalUrl, role: 'travel_agency', hoursAgo: ageMs / (60 * 60 * 1000) }),
            }));
            results.push({ type: 'travel_agency', name: agencyName, case: caseRecord.client_name, stage: 2 });
          } else if (stage === 3 && agency.phone) {
            tasks.push(sendSms(agency.phone,
              `Hi ${agencyName}, we're still awaiting your travel quote. Final reminder — please submit via your portal: ${portalUrl} — ${BRAND}`
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
          const token      = await encodePortalToken({ consultation_id: consultationId, partner_id: driver.id, portal_type: 'chauffeur' });
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
              subject: `A transfer pricing request is waiting | ${BRAND}`,
              body: stage1Email({ partnerName: driverName, patientName: caseRecord.client_name, ctaUrl: portalUrl, role: 'chauffeur' }),
            }));
            results.push({ type: 'chauffeur', name: driverName, case: caseRecord.client_name, stage: 1 });
          } else if (stage === 2 && driver.email) {
            tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
              from_name: BRAND, to: driver.email,
              subject: `Following up on your transfer quote | ${BRAND}`,
              body: stage2Email({ partnerName: driverName, patientName: caseRecord.client_name, ctaUrl: portalUrl, role: 'chauffeur', hoursAgo: ageMs / (60 * 60 * 1000) }),
            }));
            results.push({ type: 'chauffeur', name: driverName, case: caseRecord.client_name, stage: 2 });
          } else if (stage === 3 && driver.phone) {
            tasks.push(sendSms(driver.phone,
              `Hi ${driverName}, we're still awaiting your transfer quote. Final reminder — please submit: ${portalUrl} — ${BRAND}`
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
