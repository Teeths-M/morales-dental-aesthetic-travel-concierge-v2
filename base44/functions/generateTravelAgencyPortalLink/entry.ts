import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    // Generate portal token
    const payload = {
      consultation_id,
      partner_id: travel_agency_id,
      portal_type: 'travel',
      expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    
    const token = btoa(JSON.stringify(payload));
    // URL-encode the token to handle Base64 special characters (+, /, =)
    const encodedToken = encodeURIComponent(token);
    // Use relative URL path - will work in any environment
    const portalUrl = `/portal/travel?token=${encodedToken}`;

    return Response.json({
      success: true,
      portal_url: portalUrl,
      token: token,
      expires_at: new Date(payload.expires_at).toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});