import { createHandler, ok, err } from '../../shared/createHandler.ts';

// storeLiveLocationUpdate — public, token-gated. The /share-location/:token
// page streams GPS updates here (no user session — the token authorizes). It
// upserts the LiveLocation record tied to the patient's case, marks the
// request active, and refreshes the staleness window. action:'revoke' stops
// sharing (patient tapped Stop) and deactivates the live beacon.

function validCoord(lat: any, lng: any): boolean {
  return typeof lat === 'number' && typeof lng === 'number'
    && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    && !isNaN(lat) && !isNaN(lng);
}

export default createHandler(async ({ base44, body }) => {
  const b = await body().catch(() => ({}));
  const token = String(b.token || '').trim();
  if (!token) return err('Token is required.', 400);

  let req: any = null;
  try {
    const reqs = await base44.asServiceRole.entities.LiveLocationRequest.filter({ token }, '-created_at', 1);
    req = reqs?.[0] || null;
  } catch (_) { req = null; }

  if (!req) return err('This location-sharing link is not valid.', 404);
  if (req.status === 'revoked') return err('Sharing has been stopped.', 410);
  if (new Date(req.expires_at).getTime() < Date.now()) {
    try { await base44.asServiceRole.entities.LiveLocationRequest.update(req.id, { status: 'expired' }); } catch (_) {}
    return err('This location-sharing link has expired.', 410);
  }

  // ── Revoke: patient stopped sharing ──────────────────────────────────────
  if (b.action === 'revoke') {
    try { await base44.asServiceRole.entities.LiveLocationRequest.update(req.id, { status: 'revoked' }); } catch (_) {}
    if (req.case_id) {
      try {
        const locs = await base44.asServiceRole.entities.LiveLocation.filter({ case_id: req.case_id }, '-updated_at', 1);
        if (locs?.[0]) await base44.asServiceRole.entities.LiveLocation.update(locs[0].id, { is_active: false });
      } catch (_) {}
    }
    return ok({ revoked: true });
  }

  // ── Store a GPS update ────────────────────────────────────────────────────
  const { latitude, longitude, accuracy_meters, heading, speed, altitude, source = 'gps' } = b;
  if (!validCoord(latitude, longitude)) return err('Invalid coordinates.', 400);
  if (!req.case_id) return err('No case is linked to this request.', 400);

  const now = new Date();
  const staleAfter = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  let record: any = null;
  try {
    const existing = await base44.asServiceRole.entities.LiveLocation.filter({ case_id: req.case_id }, '-updated_at', 1);
    record = existing?.[0] ?? null;
  } catch (_) { record = null; }

  const locationData = {
    case_id: req.case_id,
    user_id: req.user_id,
    user_email: req.user_email,
    latitude,
    longitude,
    accuracy_meters: accuracy_meters ?? null,
    heading: (heading != null && !isNaN(heading)) ? heading : null,
    speed: (speed != null && !isNaN(speed)) ? speed : null,
    altitude: (altitude != null && !isNaN(altitude)) ? altitude : null,
    source,
    updated_at: now.toISOString(),
    is_active: true,
    stale_after: staleAfter,
    guardian_share_enabled: true,
    stale_alerted_15m: false,
    stale_alerted_30m: false,
  };

  try {
    if (record) await base44.asServiceRole.entities.LiveLocation.update(record.id, locationData);
    else await base44.asServiceRole.entities.LiveLocation.create(locationData);
  } catch (_) {
    return err('Could not store your location. Please try again.', 500);
  }

  try {
    await base44.asServiceRole.entities.LiveLocationRequest.update(req.id, { status: 'active', last_shared_at: now.toISOString() });
  } catch (_) { /* status refresh is best-effort */ }

  return ok({ success: true, updated_at: now.toISOString() });
}, { name: 'storeLiveLocationUpdate', requireAuth: false, rateLimit: { max: 180, windowSeconds: 60 } });