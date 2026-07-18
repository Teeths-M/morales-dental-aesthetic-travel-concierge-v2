import { createHandler } from '../_shared/createHandler.ts';

async function encodePortalToken({ consultation_id, partner_id, portal_type }) {
  const payload = { consultation_id, partner_id, portal_type, expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  const secret = (() => {
    // FAIL CLOSED. This used to fall back to 'change-me-in-production', a value
    // published in this repository — so anyone who could read the repo could
    // mint a portal token for any case and read a patient's record. Refusing to
    // sign is a support ticket; a forgeable token is a breach.
    const s = Deno.env.get('PORTAL_TOKEN_SECRET');
    if (!s || s === 'change-me-in-production') {
      throw new Error('PORTAL_TOKEN_SECRET is not set — refusing to sign or verify a portal token.');
    }
    return s;
  })();
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
