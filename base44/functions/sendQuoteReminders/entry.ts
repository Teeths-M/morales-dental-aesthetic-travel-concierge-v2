import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BRAND = 'Morales Dental & Aesthetics';

function encodePortalToken({ consultation_id, partner_id, portal_type }) {
  const payload = { consultation_id, partner_id, portal_type, expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  const utf8 = new TextEncoder().encode(JSON.stringify(payload));
  return btoa(String.fromCharCode.apply(null, utf8));
}

async function sendSms(to, message) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!accountSid?.startsWith('AC') || !authToken || !fromNumber || !to) return;
  const form = new URLSearchParams();
  form.append('To', to); form.append('From', fromNumber); form.append('Body', message);
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
}

const emailLayout = ({ title, intro, ctaText, ctaUrl, note }) => `<!doctype html>
<html><body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #dde5df;border-radius:22px;overflow:hidden;">
<tr><td style="background:#29483d;padding:28px 32px;color:#fff;">
  <div style="font-family:Georgia,serif;font-size:26px;">${BRAND}</div>
  <div style="margin-top:8px;font-size:12px;letter-spacing:1.8px;text-transform:uppercase;color:#d9c19b;">⏰ Reminder — Action Required</div>
</td></tr>
<tr><td style="padding:32px;">
  <h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:28px;font-weight:400;color:#13221d;">${title}</h1>
  <p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#40514a;">${intro}</p>
  ${note ? `<div style="margin:22px 0;padding:16px 18px;background:#fff8ed;border-left:4px solid #e8a020;border-radius:12px;color:#40514a;font-size:14px;line-height:1.6;">${note}</div>` : ''}
  ${ctaText && ctaUrl ? `<a href="${ctaUrl}" style="display:inline-block;margin-top:6px;background:#29483d;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:15px;font-weight:700;">${ctaText} →</a>` : ''}
  <p style="margin:28px 0 0;font-size:13px;color:#64746d;">This is an automated reminder. Please submit your quote promptly to avoid delays for the patient.</p>
  <p style="margin:12px 0 0;font-size:14px;color:#13221d;font-weight:700;">Morales Concierge Team</p>
</td></tr>
</table></td></tr></table>
</body></html>`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const appUrl = (Deno.env.get('APP_URL') || '').replace(/\/$/, '');
    const now = new Date();
    const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48 hours ago

    // Get all Travel-Coordination cases
    const cases = await base44.asServiceRole.entities.CaseRecord.filter({ status: 'Travel-Coordination' });

    const results = { reminders_sent: [], skipped: 0 };

    for (const caseRecord of cases) {
      const consultationId = caseRecord.consultation_id;
      if (!consultationId) { results.skipped++; continue; }

      // Determine when this case entered Travel-Coordination
      const triggeredAt = new Date(caseRecord.doctor_confirmed_at || caseRecord.updated_date);
      if (triggeredAt > cutoff) {
        results.skipped++;
        continue;
      }

      const sendTasks = [];

      // ── Travel Agencies that haven't submitted (itinerary_status still PENDING) ──
      if (caseRecord.itinerary_status === 'PENDING') {
        const agencies = await base44.asServiceRole.entities.TravelAgency.filter({ status: 'active' });
        for (const agency of agencies) {
          const agencyName = agency.agency_name || agency.email;
          const token = encodePortalToken({ consultation_id: consultationId, partner_id: agency.id, portal_type: 'travel' });
          const portalUrl = `${appUrl}/portal/travel?token=${token}`;

          // Blackout guard
          const blackoutRes = await base44.functions.invoke('checkNotificationBlackout', {
            case_id: caseRecord.id,
            notification_type: 'email',
            recipient_role: 'vendor',
            recipient_identifier: agency.email || agency.phone || '',
            event_trigger: 'sendQuoteReminders',
            payload: { case_id: caseRecord.id, consultation_id: consultationId }
          }).catch(() => ({ data: { suppressed: false } }));

          if (blackoutRes.data?.suppressed) {
            console.log(`Reminder to agency ${agency.email} suppressed — blackout active`);
            results.skipped++;
            continue;
          }

          const smsMsg = `⏰ Reminder ${agencyName}: Quote still pending for patient ${caseRecord.client_name}. Please submit your travel pricing now: ${portalUrl} — Morales Dental & Aesthetics`;
          const emailHtml = emailLayout({
            title: `Pending Quote: ${caseRecord.client_name}`,
            intro: `${agencyName}, we're still waiting on your travel pricing quote for patient <strong>${caseRecord.client_name}</strong>. More than 48 hours have passed since this case entered Travel Coordination. Please submit your flight and hotel pricing as soon as possible.`,
            note: '⚠️ This patient is awaiting confirmation of their travel arrangements. A prompt response ensures we can finalize their care package on time.',
            ctaText: 'Submit Quote Now',
            ctaUrl: portalUrl,
          });

          if (agency.phone) sendTasks.push(sendSms(agency.phone, smsMsg));
          if (agency.email) {
            sendTasks.push(base44.asServiceRole.integrations.Core.SendEmail({
              from_name: BRAND,
              to: agency.email,
              subject: `⏰ Reminder: Quote pending for ${caseRecord.client_name} | ${BRAND}`,
              body: emailHtml,
            }));
          }
          results.reminders_sent.push({ type: 'travel_agency', name: agencyName, case: caseRecord.client_name });
        }
      }

      // ── Chauffeurs that haven't submitted (transfer_status still PENDING) ──
      if (caseRecord.transfer_status === 'PENDING') {
        const chauffeurs = await base44.asServiceRole.entities.TaxiService.filter({ status: 'active' });
        for (const driver of chauffeurs) {
          const driverName = driver.driver_name || driver.company_name || driver.email;
          const token = encodePortalToken({ consultation_id: consultationId, partner_id: driver.id, portal_type: 'chauffeur' });
          const portalUrl = `${appUrl}/portal/transfer?token=${token}`;

          // Blackout guard
          const blackoutRes = await base44.functions.invoke('checkNotificationBlackout', {
            case_id: caseRecord.id,
            notification_type: 'email',
            recipient_role: 'vendor',
            recipient_identifier: driver.email || driver.phone || '',
            event_trigger: 'sendQuoteReminders',
            payload: { case_id: caseRecord.id, consultation_id: consultationId }
          }).catch(() => ({ data: { suppressed: false } }));

          if (blackoutRes.data?.suppressed) {
            console.log(`Reminder to chauffeur ${driver.email} suppressed — blackout active`);
            results.skipped++;
            continue;
          }

          const smsMsg = `⏰ Reminder ${driverName}: Transfer pricing still pending for ${caseRecord.client_name}. Submit your leg quotes here: ${portalUrl} — Morales Dental & Aesthetics`;
          const emailHtml = emailLayout({
            title: `Pending Transfer Quote: ${caseRecord.client_name}`,
            intro: `${driverName}, we're still awaiting your transfer pricing for patient <strong>${caseRecord.client_name}</strong>. This case has been in Travel Coordination for over 48 hours. Please submit your leg pricing promptly.`,
            note: '⚠️ Airport, hotel, and clinic transfers are required to finalize this patient\'s care package. Your response is holding up the booking.',
            ctaText: 'Submit Transfer Pricing Now',
            ctaUrl: portalUrl,
          });

          if (driver.phone) sendTasks.push(sendSms(driver.phone, smsMsg));
          if (driver.email) {
            sendTasks.push(base44.asServiceRole.integrations.Core.SendEmail({
              from_name: BRAND,
              to: driver.email,
              subject: `⏰ Reminder: Transfer pricing pending for ${caseRecord.client_name} | ${BRAND}`,
              body: emailHtml,
            }));
          }
          results.reminders_sent.push({ type: 'chauffeur', name: driverName, case: caseRecord.client_name });
        }
      }

      await Promise.allSettled(sendTasks);
    }

    console.log(`sendQuoteReminders: ${results.reminders_sent.length} reminders sent, ${results.skipped} cases skipped`);
    return Response.json({ success: true, results });
  } catch (error) {
    console.error('sendQuoteReminders error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});