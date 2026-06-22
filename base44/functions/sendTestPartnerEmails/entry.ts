import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const BRAND = 'Morales Dental & Aesthetics';

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const partnerEmail = ({ type, name }) => `<!doctype html>
<html>
  <body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;color:#13221d;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #dde5df;border-radius:22px;overflow:hidden;">
          <tr><td style="background:#29483d;padding:28px 32px;color:#ffffff;"><div style="font-family:Georgia,serif;font-size:26px;">${BRAND}</div><div style="margin-top:8px;font-size:12px;letter-spacing:1.8px;text-transform:uppercase;color:#d9c19b;">Partner notification test</div></td></tr>
          <tr><td style="padding:32px;">
            <h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:30px;line-height:1.15;font-weight:400;">Your partner notifications are active</h1>
            <p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#40514a;">Hello ${escapeHtml(name)}, this confirms your ${escapeHtml(type)} notification channel is ready.</p>
            <div style="padding:16px 18px;background:#f8f4ee;border-left:4px solid #b68a52;border-radius:12px;color:#40514a;font-size:14px;line-height:1.6;">You will receive clear case details when a patient needs your service. Please keep your availability, pricing, and contact details current.</div>
            <p style="margin:28px 0 0;font-size:14px;color:#13221d;font-weight:700;">Morales Concierge Team</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  const [travelAgencies, taxiServices] = await Promise.all([
    base44.asServiceRole.entities.TravelAgency.filter({ status: 'active' }),
    base44.asServiceRole.entities.TaxiService.filter({ status: 'active' }),
  ]);

  const results = { travel: [], taxi: [], errors: [] };

  // Send to active travel agencies
  for (const agency of travelAgencies) {
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Morales Dental & Aesthetics',
        to: agency.email,
        subject: '✈️ Partner Notification — Flight & Hotel Package Coordination',
        body: partnerEmail({ type: 'travel agency', name: agency.agency_name }),
      });
      results.travel.push({ name: agency.agency_name, email: agency.email, sent: true });
    } catch (error) {
      results.errors.push({ name: agency.agency_name, email: agency.email, error: error.message });
    }
  }

  // Send to active taxi services
  for (const taxi of taxiServices) {
    const name = taxi.company_name || taxi.driver_name;
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Morales Dental & Aesthetics',
        to: taxi.email,
        subject: '🚗 Partner Notification — Client Airport & Clinic Transfers',
        body: partnerEmail({ type: 'transfer partner', name }),
      });
      results.taxi.push({ name, email: taxi.email, sent: true });
    } catch (error) {
      results.errors.push({ name, email: taxi.email, error: error.message });
    }
  }

  return Response.json({
    status: 'done',
    travel_agencies_notified: results.travel.length,
    taxi_services_notified: results.taxi.length,
    details: results,
  });
});