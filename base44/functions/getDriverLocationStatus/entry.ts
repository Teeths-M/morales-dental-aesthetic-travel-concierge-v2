import { createHandler, ok, err } from '../../shared/createHandler.ts';

// getDriverLocationStatus — authenticated. The traveler's inline map widget
// (DriverMapWidget) polls this every 10 seconds with the RecoveryTransportRequest
// id the M-Care dispatch reply named, to render the matched driver's live
// approaching GPS. Verifies the caller owns the linked case (or is an admin),
// then returns the driver's current lat/lng, updated_at, status, driver name,
// visual safety code, pickup coords, and the transport request status so the
// widget can drive its state machine (waiting → on the way → arrived → ended).

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default createHandler(async ({ base44, user, body }) => {
  const b = await body().catch(() => ({}));
  const transport_request_id = String(b.transport_request_id || '').trim();
  if (!transport_request_id) return err('transport_request_id is required.', 400);

  // ── Resolve the transport request + ownership ───────────────────────────
  let transport: any = null;
  try {
    const transports = await base44.asServiceRole.entities.RecoveryTransportRequest.filter({ id: transport_request_id }, '-created_at', 1);
    transport = transports?.[0] || null;
  } catch (_) { transport = null; }

  if (!transport) return err('Ride not found.', 404);

  const isOwner = transport.user_email && user && user.email && transport.user_email === user.email;
  const isAdmin = user && (user.role === 'admin' || user.role === 'platform_admin');
  if (!isOwner && !isAdmin) {
    return err('You can only track rides for your own case.', 403);
  }

  // ── Resolve the driver's LiveLocationRequest via the stored token ─────────
  const driverToken = transport.driver_location_token;
  if (!driverToken) {
    // No driver link was generated (no_driver dispatch, or pre-this-feature record).
    return ok({
      role: 'driver',
      transport_id: transport_request_id,
      transport_status: transport.status,
      dispatched_at: transport.dispatched_at || null,
      driver_assigned: !!transport.driver_id,
      driver_name: transport.driver_name || '',
      driver_phone: transport.driver_phone || '',
      visual_code: '',
      pickup_latitude: transport.pickup_latitude ?? null,
      pickup_longitude: transport.pickup_longitude ?? null,
      driver_request_status: 'requested',
      driver_location: null,
      distance_to_pickup_meters: null,
      eta_minutes: null,
      is_stale: false,
    });
  }

  let driverReq: any = null;
  try {
    const reqs = await base44.asServiceRole.entities.LiveLocationRequest.filter({ token: driverToken }, '-created_at', 1);
    driverReq = reqs?.[0] || null;
  } catch (_) { driverReq = null; }

  if (!driverReq) {
    return err('Driver location link is not valid.', 404);
  }

  // ── Read the driver's current LiveLocation ────────────────────────────────
  // driverReq.case_id is normally backfilled to transport_request_id right
  // after dispatch (see recoveryTransportDispatch.ts). If that best-effort
  // backfill ever failed and left it empty, fall back to the transport id we
  // already resolved and verified ownership of above — self-heals the read
  // path even when the write-side backfill didn't land.
  const driverLocationKey = driverReq.case_id || transport_request_id;
  let driverLoc: any = null;
  try {
    const locs = await base44.asServiceRole.entities.LiveLocation.filter({ case_id: driverLocationKey }, '-updated_at', 1);
    driverLoc = locs?.[0] || null;
  } catch (_) { driverLoc = null; }

  const now = Date.now();
  const updatedMs = driverLoc?.updated_at ? new Date(driverLoc.updated_at).getTime() : 0;
  const isStale = driverLoc && (now - updatedMs) > 60_000; // 60s stale window per PRD

  // ── Distance + ETA (Haversine + naive speed estimate) ─────────────────────
  let distanceMeters: number | null = null;
  let etaMinutes: number | null = null;
  if (driverLoc && transport.pickup_latitude != null && transport.pickup_longitude != null) {
    distanceMeters = haversineMeters(
      driverLoc.latitude, driverLoc.longitude,
      transport.pickup_latitude, transport.pickup_longitude,
    );
    // Estimate ETA: assume 30 km/h urban average if no speed reported.
    const speedMps = (typeof driverLoc.speed === 'number' && driverLoc.speed > 1) ? driverLoc.speed : 8.33; // 30km/h
    etaMinutes = distanceMeters > 50 ? Math.ceil(distanceMeters / speedMps / 60) : 0;
  }

  // ── Auto-detect arrival (geofence: within 50m → arrived) ──────────────────
  // PRD §2: auto-detect arrival when driver GPS is within 50m of pickup for the
  // widget. We mark it server-side here so every polling client converges on
  // the same 'arrived' state without each one needing to compute it.
  let transportStatus = transport.status;
  if (distanceMeters != null && distanceMeters <= 50 && driverReq.status === 'active' && !['arrived', 'completed', 'cancelled'].includes(transport.status)) {
    transportStatus = 'arrived';
    try {
      await base44.asServiceRole.entities.RecoveryTransportRequest.update(transport.id, {
        status: 'arrived',
        arrived_at: new Date().toISOString(),
      });
    } catch (_) { /* best-effort */ }
  }

  return ok({
    role: 'driver',
    transport_id: transport_request_id,
    transport_status: transportStatus,
    dispatched_at: transport.dispatched_at || null,
    driver_assigned: !!transport.driver_id,
    driver_name: driverReq.driver_name || transport.driver_name || '',
    driver_phone: transport.driver_phone || '',
    visual_code: driverReq.visual_code || '',
    pickup_latitude: transport.pickup_latitude ?? driverReq.pickup_latitude ?? null,
    pickup_longitude: transport.pickup_longitude ?? driverReq.pickup_longitude ?? null,
    driver_request_status: driverReq.status, // requested | active | revoked | expired
    driver_location: driverLoc
      ? {
          latitude: driverLoc.latitude,
          longitude: driverLoc.longitude,
          updated_at: driverLoc.updated_at,
          accuracy_meters: driverLoc.accuracy_meters,
          heading: driverLoc.heading,
          speed: driverLoc.speed,
        }
      : null,
    distance_to_pickup_meters: distanceMeters,
    eta_minutes: etaMinutes,
    is_stale: !!isStale,
  });
}, { name: 'getDriverLocationStatus', requireAuth: true });