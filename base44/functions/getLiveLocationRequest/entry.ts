import { createHandler, ok, err } from '../../shared/createHandler.ts';

// getLiveLocationRequest — public, token-gated. Returns the context the
// /share-location/:token page needs to render the consent screen: who asked,
// why, expiry, current status, role (traveler vs driver), and the last known
// location (if any). No user session — the token IS the authority, opaque +
// single-use-by-link.

Deno.serve(createHandler(async ({ base44, body }) => {
  const b = await body().catch(() => ({}));
  const token = String(b.token || '').trim();
  if (!token) return err('Token is required.', 400);

  let req: any = null;
  try {
    const reqs = await base44.asServiceRole.entities.LiveLocationRequest.filter({ token }, '-created_at', 1);
    req = reqs?.[0] || null;
  } catch (_) { req = null; }

  if (!req) return err('This location-sharing link is not valid.', 404);
  if (req.status === 'revoked') return err('This location-sharing link has been stopped.', 410);
  if (new Date(req.expires_at).getTime() < Date.now()) {
    try { await base44.asServiceRole.entities.LiveLocationRequest.update(req.id, { status: 'expired' }); } catch (_) {}
    return err('This location-sharing link has expired.', 410);
  }

  let lastLocation: any = null;
  if (req.case_id) {
    try {
      const locs = await base44.asServiceRole.entities.LiveLocation.filter({ case_id: req.case_id }, '-updated_at', 1);
      lastLocation = locs?.[0] || null;
    } catch (_) { lastLocation = null; }
  }

  return ok({
    role: req.role || 'traveler',
    patient_name: req.patient_name || '',
    driver_name: req.driver_name || '',
    visual_code: req.visual_code || '',
    pickup_latitude: req.pickup_latitude ?? null,
    pickup_longitude: req.pickup_longitude ?? null,
    reason: req.reason || '',
    status: req.status,
    expires_at: req.expires_at,
    last_location: lastLocation
      ? {
          latitude: lastLocation.latitude,
          longitude: lastLocation.longitude,
          updated_at: lastLocation.updated_at,
          accuracy_meters: lastLocation.accuracy_meters,
        }
      : null,
  });
}, { name: 'getLiveLocationRequest', requireAuth: false }));