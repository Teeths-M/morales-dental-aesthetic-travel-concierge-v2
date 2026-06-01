import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Inline token encoding to avoid import issues in Deno
function encodePortalToken({ consultation_id, partner_id, portal_type }) {
  const payload = {
    consultation_id,
    partner_id,
    portal_type,
    expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const utf8 = new TextEncoder().encode(JSON.stringify(payload));
  return btoa(String.fromCharCode.apply(null, utf8));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { consultation_id, taxi_service_id } = body;

    if (!consultation_id || !taxi_service_id) {
      return Response.json({ error: 'consultation_id and taxi_service_id are required' }, { status: 400 });
    }

    // Generate portal token
    const payload = {
      consultation_id,
      partner_id: taxi_service_id,
      portal_type: 'chauffeur',
      expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    
    const token = encodePortalToken({
      consultation_id,
      partner_id: taxi_service_id,
      portal_type: 'chauffeur',
    });
    const portalUrl = `/portal/transfer?token=${token}`;

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