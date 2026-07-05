import { createHandler, ok, err } from '../_shared/createHandler.ts';

async function encodePortalToken(payload: object): Promise<string> {
  const secret = Deno.env.get('PORTAL_TOKEN_SECRET') || 'change-me-in-production';
  const data = JSON.stringify({ ...payload, expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return btoa(data) + '.' + sigHex;
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const { case_id, local_doctor_id } = await body();
  if (!case_id || !local_doctor_id) return err('case_id and local_doctor_id are required');

  const token = await encodePortalToken({ case_id, partner_id: local_doctor_id, portal_type: 'local_doctor' });
  const portalUrl = `/portal/local-doctor/${token}`;

  await base44.asServiceRole.entities.LocalDoctorReferral.create({
    case_id,
    local_doctor_id,
    portal_token: token,
    status: 'pending',
    created_date: new Date().toISOString(),
  });

  return ok({
    portal_url: portalUrl,
    token,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
}, { name: 'generateLocalDoctorPortalLink', requireAuth: true, allowedRoles: ['admin', 'platform_admin'] }));
