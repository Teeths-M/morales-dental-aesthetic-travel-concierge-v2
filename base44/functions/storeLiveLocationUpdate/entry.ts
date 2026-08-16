import { createHandler, ok, err } from '../../shared/createHandler.ts';

// storeLiveLocationUpdate — public, token-gated. The /share-location/:token
// page streams GPS updates here (no user session — the token authorizes). It
// upserts the LiveLocation record tied to the patient's case (traveler) or the
// transport request (driver), marks the request active, and refreshes the
// staleness window. action:'revoke' stops sharing (sharer tapped Stop).
//
// For role=driver: on the FIRST 'requested' → 'active' transition we send a
// push notification to the traveler ("Your driver is on the way") and bump the
// RecoveryTransportRequest to 'en_route' — so the traveler doesn't have to
// stare at the chat waiting for the driver dot to appear (PRD §4), and so the
// transport status reflects real movement without a manual hook. An optional
// battery_level in the body also drives a one-time care-team alert at <=10%
// (PRD §5) — reusing this endpoint since it's already the one real, public,
// token-verified place a driver's own browser can reach.

function validCoord(lat: any, lng: any): boolean {
  return typeof lat === 'number' && typeof lng === 'number'
    && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    && !isNaN(lat) && !isNaN(lng);
}

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
  if (req.status === 'revoked') return err('Sharing has been stopped.', 410);
  if (new Date(req.expires_at).getTime() < Date.now()) {
    try { await base44.asServiceRole.entities.LiveLocationRequest.update(req.id, { status: 'expired' }); } catch (_) {}
    return err('This location-sharing link has expired.', 410);
  }

  const role = req.role || 'traveler';

  // ── Revoke: sharer stopped sharing ────────────────────────────────────────
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

  // ── Store a GPS update ──────────────────────────────────────────────────────
  const { latitude, longitude, accuracy_meters, heading, speed, altitude, source = 'gps', battery_level } = b;
  if (!validCoord(latitude, longitude)) return err('Invalid coordinates.', 400);
  if (!req.case_id) return err('No case is linked to this request.', 400);

  const now = new Date();
  const staleAfter = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  const wasRequested = req.status === 'requested';

  let record: any = null;
  try {
    const existing = await base44.asServiceRole.entities.LiveLocation.filter({ case_id: req.case_id }, '-updated_at', 1);
    record = existing?.[0] ?? null;
  } catch (_) { record = null; }

  const locationData: any = {
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
  if (role === 'driver') {
    locationData.role = 'driver';
    if (req.transport_request_id) locationData.transport_request_id = req.transport_request_id;
  }

  try {
    if (record) await base44.asServiceRole.entities.LiveLocation.update(record.id, locationData);
    else await base44.asServiceRole.entities.LiveLocation.create(locationData);
  } catch (_) {
    return err('Could not store your location. Please try again.', 500);
  }

  try {
    await base44.asServiceRole.entities.LiveLocationRequest.update(req.id, { status: 'active', last_shared_at: now.toISOString() });
  } catch (_) { /* status refresh is best-effort */ }

  // ── Driver first-share: push the traveler + bump transport status ─────────
  if (role === 'driver' && wasRequested && req.transport_request_id) {
    try {
      // Resolve the traveler's case + user_id for the push.
      const transports = await base44.asServiceRole.entities.RecoveryTransportRequest.filter({ id: req.transport_request_id }, '-created_at', 1);
      const transport = transports?.[0];
      if (transport) {
        // Bump the transport to en_route (only if still driver_assigned/dispatched).
        if (['driver_assigned', 'dispatched', 'requested'].includes(transport.status)) {
          try { await base44.asServiceRole.entities.RecoveryTransportRequest.update(transport.id, { status: 'en_route' }); } catch (_) {}
        }
        // Push the traveler.
        if (transport.case_id) {
          try {
            const cases = await base44.asServiceRole.entities.CaseRecord.filter({ id: transport.case_id }, '-created_date', 1);
            const caseRecord = cases?.[0];
            if (caseRecord?.client_id) {
              const driverFirst = (req.driver_name || transport.driver_name || 'Your driver').split(' ')[0];
              try {
                await base44.asServiceRole.integrations.Core.SendPushNotification({
                  user_id: caseRecord.client_id,
                  title: 'Your driver is on the way',
                  content: `${driverFirst} started moving — tap to watch them approach on your map.`,
                });
              } catch (_) { /* best-effort */ }
            }
          } catch (_) {}
        }
      }
    } catch (_) { /* best-effort */ }
  }

  // ── Driver battery critical: alert the care team, once ─────────────────────
  // The client (ShareLiveLocation.jsx) reports its own best-effort battery
  // reading alongside its normal GPS ticks — this endpoint is already the one
  // real, public, token-verified place a driver's browser can reach, so a
  // second call to a separately-authorized function isn't needed. Dedup via
  // battery_critical_alerted_at so a battery sitting at 8% for the rest of the
  // ride doesn't re-alert on every 10s tick.
  if (role === 'driver' && typeof battery_level === 'number' && battery_level <= 10 && !req.battery_critical_alerted_at) {
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || '';
    if (adminEmail) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'Morales Safety — Driver Battery Alert',
          to: adminEmail,
          subject: `Driver's phone battery critical during location sharing (${req.driver_name || 'Driver'})`,
          body: `<div style="font-family:sans-serif;max-width:560px;padding:24px;border:2px solid #dc2626;border-radius:12px;">
<p style="margin:0 0 8px;color:#b91c1c;font-weight:700;">🔋 Driver's phone battery at ${battery_level}% while sharing location</p>
<table style="width:100%;border-collapse:collapse;">
<tr><td style="padding:4px 0;color:#6b7280;">Driver</td><td>${req.driver_name || 'Driver'}</td></tr>
<tr><td style="padding:4px 0;color:#6b7280;">Ride / transport request</td><td>${req.transport_request_id || req.case_id || ''}</td></tr>
</table>
<p style="margin-top:12px;color:#374151;">Live tracking may drop soon if their phone dies. Consider calling the driver directly.</p>
</div>`,
        });
      } catch (_) { /* best-effort */ }
    }
    try { await base44.asServiceRole.entities.LiveLocationRequest.update(req.id, { battery_critical_alerted_at: now.toISOString() }); } catch (_) { /* best-effort */ }
  }

  return ok({ success: true, updated_at: now.toISOString() });
}, { name: 'storeLiveLocationUpdate', requireAuth: false, rateLimit: { max: 180, windowSeconds: 60 } }));