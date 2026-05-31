import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BRAND = 'Morales Dental & Aesthetics';

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
              ${ctaText && ctaUrl ? `<a href="${ctaUrl}" style="display:inline-block;margin-top:6px;background:#29483d;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:999px;font-size:14px;font-weight:700;">${escapeHtml(ctaText)}</a>` : ''}
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

    const { consultation_id } = await req.json();
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

    // Fetch active travel agencies
    const agencies = await base44.asServiceRole.entities.TravelAgency.filter({ status: 'active' });

    if (agencies.length === 0) {
      return Response.json({ error: 'No active travel agencies found' }, { status: 404 });
    }

    const sent = [];
    for (const agency of agencies) {
      const agencyName = agency.agency_name || agency.contact_person || 'Travel Partner';
      const token = btoa(JSON.stringify({
        consultation_id,
        partner_id: agency.id,
        portal_type: 'travel',
        expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000,
      }));
      const portalLink = `${appUrl}/portal/travel?token=${token}`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND,
        to: agency.email,
        subject: `Travel booking request — ${consultation.patient_name} | ${BRAND}`,
        body: emailLayout({
          eyebrow: 'Travel booking request',
          title: 'Patient flight & hotel quote needed',
          intro: `Hello ${agencyName}, a confirmed patient requires international travel coordination for their upcoming medical procedure.`,
          rows: [
            row('Client Full Name', consultation.patient_name),
            row('Procedure Destination', consultation.procedure_country || consultation.destination_country || 'To be confirmed'),
            row('Client Origin Country', consultation.client_country || consultation.nationality || 'To be confirmed'),
            row('Client Origin City', consultation.client_city || 'To be confirmed'),
            row('Passport Number', consultation.passport_number || 'Not provided'),
            row('Passport Issue Date', consultation.passport_issue_date || 'Not provided'),
            row('Passport Expiry Date', consultation.passport_expiry_date || 'Not provided'),
            row('Arrival Date', consultation.preferred_date || 'Flexible'),
            row('Return Date', consultation.return_date || 'To be confirmed'),
            row('Duration of Stay', consultation.duration_of_stay || 'To be confirmed'),
            row('Total Travellers', consultation.has_companion
              ? `${(consultation.number_of_companions || 1) + 1} (Client + ${consultation.number_of_companions || 1} companion${(consultation.number_of_companions || 1) > 1 ? 's' : ''})`
              : '1 (Client only)'),
          ],
          ctaText: 'Open Travel Agency Portal & Submit Quote →',
          ctaUrl: portalLink,
          footer: 'Click the button above to access your secure portal and submit flight and hotel pricing for this patient.',
        }),
      });

      sent.push({ name: agencyName, email: agency.email, portal_link: portalLink });
    }

    return Response.json({ success: true, sent });
  } catch (error) {
    console.error('resendTravelAgencyPortalEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});