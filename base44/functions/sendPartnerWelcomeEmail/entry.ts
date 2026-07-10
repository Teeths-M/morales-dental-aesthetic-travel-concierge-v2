import { createHandler } from '../_shared/createHandler.ts';
import { renderEmail } from '../_shared/emailTemplate.ts';

const BRAND = 'Morales Medical Travel Safety';

// HMAC-signed to match verifyPortalToken() in getPortalData — previously
// unsigned (plain btoa(JSON)) and would fail that verification, making the
// welcome email's portal link silently non-functional.
async function makePortalToken(payload: Record<string, unknown>) {
  const data = JSON.stringify(payload);
  const secret = Deno.env.get('PORTAL_TOKEN_SECRET') || 'change-me-in-production';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return btoa(data) + '.' + sigHex;
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
    const { partner_type, partner_id } = await body();
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
        ['Full Name', partner.full_name],
        ['Email', partner.email],
        ['Clinic Location', `${partner.clinic_city || ''}, ${partner.clinic_country || ''}`],
        ['Specialties', partner.specialties?.join(', ') || 'Not specified'],
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
        ['Agency Name', partner.agency_name],
        ['Contact Person', partner.contact_person],
        ['Email', partner.email],
        ['Service Regions', partner.service_regions?.join(', ') || 'Not specified'],
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
        ['Driver/Company', partner.driver_name || partner.company_name],
        ['Email', partner.email],
        ['Operating City', partner.operating_city],
        ['Operating Country', partner.operating_country],
        ['Vehicle Types', partner.vehicle_types?.join(', ') || 'Not specified'],
      ];
      ctaText = 'Access Chauffeur Portal →';
    } else {
      return Response.json({ error: 'Invalid partner_type' }, { status: 400 });
    }

    // Generate portal token (generic access - not case-specific)
    const token = await makePortalToken({
      partner_id: partner_id,
      portal_type: portalType,
      partner_email: partner.email,
      expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days for initial access
    });

    const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
    const portalLink = `${appUrl}${portalPath}?token=${token}`;

    // Send welcome email
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND,
      to: partner.email,
      subject: `Welcome to ${BRAND} - Your Portal Access`,
      body: renderEmail({
        appUrl,
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
}, { name: 'sendPartnerWelcomeEmail' }));
