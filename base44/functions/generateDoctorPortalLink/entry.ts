import { createHandler } from '../_shared/createHandler.ts';

async function encodePortalToken({ consultation_id, partner_id, portal_type }) {
  const payload = { consultation_id, partner_id, portal_type, expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  const secret = Deno.env.get('PORTAL_TOKEN_SECRET') || 'change-me-in-production';
  const data = JSON.stringify(payload);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return btoa(data) + '.' + sigHex;
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
    const body = await body();
    const { consultation_id, doctor_id } = body;

    if (!consultation_id || !doctor_id) {
      return Response.json({ error: 'consultation_id and doctor_id are required' }, { status: 400 });
    }

    // Generate portal token
    const token = await encodePortalToken({
      consultation_id,
      partner_id: doctor_id,
      portal_type: 'doctor',
    });
    const portalUrl = `/portal/doctor/${token}`;

    return Response.json({
      success: true,
      portal_url: portalUrl,
      token,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
}, { name: 'generateDoctorPortalLink', allowedRoles: ['admin', 'platform_admin'] }));
