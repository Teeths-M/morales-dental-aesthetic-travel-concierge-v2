import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const BRAND = 'Morales Dental & Aesthetics';

async function sendSms(to: string, body: string): Promise<void> {
  const sid  = Deno.env.get('TWILIO_ACCOUNT_SID');
  const auth = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_FROM_NUMBER') || Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !auth || !from || !sid.startsWith('AC')) return;
  const form = new URLSearchParams({ To: to, From: from, Body: body });
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + btoa(`${sid}:${auth}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  }).catch(e => console.warn('[resendChauffeurPortalEmail] SMS failed:', e.message));
}

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

const row = (label, value) => `
  <tr>
    <td style="padding:10px 0;color:#64746d;font-size:13px;width:38%;">${escapeHtml(label)}</td>
    <td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${escapeHtml(value || 'Not provided')}</td>
  </tr>`;

const emailLayout = ({ eyebrow, title, intro, rows = [], ctaText, ctaUrl, footer }) => `<!doctype html>
<html>
  <body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;color:#13221d;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #dde5df;border-radius:22px;overflow:hidden;">
          <tr>
            <td style="background:#29483d;padding:28px 32px;color:#ffffff;">
              <div style="font-family:Georgia,serif;font-size:26px;letter-spacing:-0.3px;">${BRAND}</div>
              <div style="margin-top:8px;font-size:12px;letter-spacing:1.8px;text-transform:uppercase;color:#d9c19b;">${escapeHtml(eyebrow)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:30px;line-height:1.15;color:#13221d;font-weight:400;">${escapeHtml(title)}</h1>
              <p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#40514a;">${escapeHtml(intro)}</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e7ede9;border-bottom:1px solid #e7ede9;margin:22px 0;">${rows.join('')}</table>
              ${ctaText && ctaUrl ? `<a href="${escapeHtml(ctaUrl)}" style="display:inline-block;margin-top:6px;background:#29483d;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:999px;font-size:14px;font-weight:700;">${escapeHtml(ctaText)}</a>` : ''}
              <p style="margin:28px 0 0;font-size:14px;line-height:1.6;color:#64746d;">${escapeHtml(footer)}</p>
              <p style="margin:18px 0 0;font-size:14px;color:#13221d;font-weight:700;">Morales Concierge Team</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { consultation_id } = body;
    if (!consultation_id) {
      return Response.json({ error: 'consultation_id is required' }, { status: 400 });
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com';

    // Fetch consultation
    const consultations = await base44.asServiceRole.entities.Consultation.filter({ id: consultation_id });
    const consultation = consultations[0];
    if (!consultation) {
      return Response.json({ error: 'Consultation not found' }, { status: 404 });
    }

    // Fetch active taxi services (chauffeur partners)
    const taxiServices = await base44.asServiceRole.entities.TaxiService.filter({ status: 'active' });

    if (taxiServices.length === 0) {
      return Response.json({ error: 'No active taxi services found' }, { status: 404 });
    }

    const sent = [];
    for (const cab of taxiServices) {
      const driverName = cab.driver_name || cab.company_name || 'Partner';
      const token = btoa(JSON.stringify({
        consultation_id,
        partner_id: cab.id,
        portal_type: 'transfer',
        expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000,
      }));
      const portalLink = `${appUrl}/portal/transfer?token=${token}`;

      // Blackout guard
      const blackoutRes = await base44.functions.invoke('checkNotificationBlackout', {
        case_id: consultation_id,
        notification_type: 'email',
        recipient_role: 'vendor',
        recipient_identifier: cab.email,
        event_trigger: 'resendChauffeurPortalEmail',
        payload: body
      }).catch(() => ({ data: { suppressed: false } }));

      if (blackoutRes.data?.suppressed) {
        console.log(`Notification to ${cab.email} suppressed — blackout active`);
        continue;
      }

      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND,
        to: cab.email,
        subject: `Transfer request — ${consultation.patient_name} | ${BRAND}`,
        body: emailLayout({
          eyebrow: 'Transfer request',
          title: 'Patient transfer quote needed',
          intro: `Hello ${driverName}, this confirmed patient will need reliable local transportation support.`,
          rows: [
            row('Patient', consultation.patient_name),
            row('Requested service', 'Airport, clinic, and hotel transfers'),
            row('Preferred date', consultation.preferred_date || 'Flexible'),
            row('Companion', consultation.has_companion ? 'Yes' : 'No'),
            row('Special instructions', consultation.transfer_notes || 'None'),
          ],
          ctaText: 'Open Chauffeur Portal & Submit Pricing →',
          ctaUrl: portalLink,
          footer: 'Click the button above to access your secure portal and submit your per-leg transfer pricing.',
        }),
      });

      // SMS — send alongside email if phone on file
      const phone = cab.whatsapp_number || cab.phone;
      if (phone) {
        await sendSms(phone, `Hi ${driverName}! Transfer request for ${consultation.patient_name}. Access your Morales chauffeur portal: ${portalLink}`);
      }

      sent.push({ name: driverName, email: cab.email, portal_link: portalLink, sms_sent: !!phone });
    }

    return Response.json({ success: true, sent });
  } catch (error) {
    console.error('resendChauffeurPortalEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});