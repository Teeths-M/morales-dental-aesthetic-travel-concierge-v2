import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const BRAND = 'Morales Dental & Aesthetics';

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

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
              ${rows.length > 0 ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e7ede9;border-bottom:1px solid #e7ede9;margin:22px 0;">${rows.join('')}</table>` : ''}
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

const row = (label, value) => `
  <tr>
    <td style="padding:10px 0;color:#64746d;font-size:13px;width:38%;">${escapeHtml(label)}</td>
    <td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${escapeHtml(value || 'Not provided')}</td>
  </tr>`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { partner_type, partner_id } = await req.json();
    if (!partner_type || !partner_id) {
      return Response.json({ error: 'partner_type and partner_id are required' }, { status: 400 });
    }

    let partner;
    let portalType;
    let portalPath;
    let eyebrow;
    let title;
    let intro;
    let rows = [];
    let ctaText;

    if (partner_type === 'doctor') {
      // BUG-R13-03 FIX: filter({ id }) always returns [] — use .get()
      partner = await base44.asServiceRole.entities.Doctor.get(partner_id);
      if (!partner) {
        return Response.json({ error: 'Doctor not found' }, { status: 404 });
      }
      portalType = 'doctor';
      portalPath = `/portal/doctor`;
      eyebrow = 'Doctor Portal Access';
      title = 'Your secure doctor portal is ready';
      intro = `Welcome ${partner.full_name || partner.email}! Your doctor portal account has been created. You can now access patient consultations, confirm availability, and manage your profile.`;
      rows = [
        row('Full Name', partner.full_name),
        row('Email', partner.email),
        row('Clinic Location', `${partner.clinic_city || ''}, ${partner.clinic_country || ''}`),
        row('Specialties', partner.specialties?.join(', ') || 'Not specified'),
      ];
      ctaText = 'Access Doctor Portal →';
    } else if (partner_type === 'travel_agency') {
      // BUG-R13-03 FIX: filter({ id }) always returns [] — use .get()
      partner = await base44.asServiceRole.entities.TravelAgency.get(partner_id);
      if (!partner) {
        return Response.json({ error: 'Travel agency not found' }, { status: 404 });
      }
      portalType = 'travel';
      portalPath = `/portal/travel`;
      eyebrow = 'Travel Agency Portal Access';
      title = 'Your travel agency portal is ready';
      intro = `Welcome ${partner.contact_person || partner.agency_name || partner.email}! Your travel agency portal account has been created. You can now receive patient travel requests and submit quotes.`;
      rows = [
        row('Agency Name', partner.agency_name),
        row('Contact Person', partner.contact_person),
        row('Email', partner.email),
        row('Service Regions', partner.service_regions?.join(', ') || 'Not specified'),
      ];
      ctaText = 'Access Travel Portal →';
    } else if (partner_type === 'taxi_service') {
      // BUG-R13-03 FIX: filter({ id }) always returns [] — use .get()
      partner = await base44.asServiceRole.entities.TaxiService.get(partner_id);
      if (!partner) {
        return Response.json({ error: 'Taxi service not found' }, { status: 404 });
      }
      portalType = 'transfer';
      portalPath = `/portal/transfer`;
      eyebrow = 'Chauffeur Portal Access';
      title = 'Your chauffeur portal is ready';
      intro = `Welcome ${partner.driver_name || partner.company_name || partner.email}! Your chauffeur portal account has been created. You can now receive patient transfer requests and submit pricing.`;
      rows = [
        row('Driver/Company', partner.driver_name || partner.company_name),
        row('Email', partner.email),
        row('Operating City', partner.operating_city),
        row('Operating Country', partner.operating_country),
        row('Vehicle Types', partner.vehicle_types?.join(', ') || 'Not specified'),
      ];
      ctaText = 'Access Chauffeur Portal →';
    } else {
      return Response.json({ error: 'Invalid partner_type' }, { status: 400 });
    }

    // Generate portal token (generic access - not case-specific)
    const token = btoa(JSON.stringify({
      partner_id: partner_id,
      portal_type: portalType,
      partner_email: partner.email,
      expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days for initial access
    }));
    
    const portalLink = `${portalPath}?token=${token}`;

    // Send welcome email
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND,
      to: partner.email,
      subject: `Welcome to ${BRAND} - Your Portal Access`,
      body: emailLayout({
        eyebrow,
        title,
        intro,
        rows,
        ctaText,
        ctaUrl: portalLink,
        footer: 'Bookmark this link for quick access to your partner portal. You will receive case-specific links when patients are assigned to you.',
      }),
    });

    return Response.json({ 
      success: true, 
      portal_link: portalLink,
      partner_email: partner.email,
      partner_name: partner.full_name || partner.agency_name || partner.driver_name || partner.email,
    });
  } catch (error) {
    // BUG-R13-02 FIX: SEC-10
    console.error('[sendPartnerWelcomeEmail]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});