import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function encodePortalToken({ consultation_id, partner_id, portal_type }) {
  const payload = {
    consultation_id,
    partner_id,
    portal_type,
    expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const rawBytes = new Uint8Array(32);
  crypto.getRandomValues(rawBytes);
  const randomSuffix = Array.from(rawBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const utf8 = new TextEncoder().encode(JSON.stringify(payload));
  return btoa(String.fromCharCode.apply(null, utf8)) + '.' + randomSuffix;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { consultation_id, travel_agency_id } = body;

    if (!consultation_id || !travel_agency_id) {
      return Response.json({ error: 'consultation_id and travel_agency_id are required' }, { status: 400 });
    }

    const token = await encodePortalToken({
      consultation_id,
      partner_id: travel_agency_id,
      portal_type: 'travel',
    });
    const portalUrl = `/portal/travel?token=${token}`;

    return Response.json({
      success: true,
      portal_url: portalUrl,
      token,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});