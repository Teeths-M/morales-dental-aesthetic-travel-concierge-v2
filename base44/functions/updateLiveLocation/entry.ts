import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function validCoord(lat, lng) {
  return typeof lat === 'number' && typeof lng === 'number'
    && lat >= -90 && lat <= 90
    && lng >= -180 && lng <= 180
    && !isNaN(lat) && !isNaN(lng);
}

// Distance in meters between two GPS points (Haversine)
function distanceM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { case_id, latitude, longitude, accuracy_meters, heading, speed, altitude, source = 'gps' } = body;

    if (!case_id) return Response.json({ error: 'case_id required' }, { status: 400 });
    if (!validCoord(latitude, longitude)) return Response.json({ error: 'Invalid coordinates' }, { status: 400 });

    const now = new Date();
    const staleAfter = new Date(now.getTime() + 5 * 60 * 1000).toISOString(); // stale after 5 min

    // Find existing LiveLocation for this case
    let record = null;
    try {
      const existing = await base44.asServiceRole.entities.LiveLocation.filter({ case_id }, '-updated_at', 1);
      record = existing?.[0] ?? null;
    } catch (_) { record = null; }

    const locationData = {
      case_id,
      user_id: user.id,
      user_email: user.email,
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
      stale_alerted_15m: false, // reset on new update
      stale_alerted_30m: false,
    };

    if (record) {
      await base44.asServiceRole.entities.LiveLocation.update(record.id, locationData);
    } else {
      await base44.asServiceRole.entities.LiveLocation.create(locationData);
    }

    // Optionally append breadcrumb if last breadcrumb was >10 min ago
    try {
      const recentCrumbs = await base44.asServiceRole.entities.LocationBreadcrumb.filter(
        { case_id, is_purged: false }, '-logged_at', 1
      );
      const lastCrumb = recentCrumbs?.[0];
      const tenMinAgo = now.getTime() - 10 * 60 * 1000;
      const lastCrumbAge = lastCrumb ? new Date(lastCrumb.logged_at).getTime() : 0;

      let shouldLog = !lastCrumb || lastCrumbAge < tenMinAgo;
      // Also skip if moved less than 25m from last crumb
      if (shouldLog && lastCrumb?.latitude != null) {
        const dist = distanceM(latitude, longitude, lastCrumb.latitude, lastCrumb.longitude);
        if (dist < 25 && lastCrumbAge > tenMinAgo - 60000) shouldLog = false; // within 25m and <11min
      }

      if (shouldLog) {
        const purgeAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await base44.asServiceRole.entities.LocationBreadcrumb.create({
          case_id,
          patient_email: user.email,
          latitude,
          longitude,
          accuracy_meters: accuracy_meters ?? null,
          source: source === 'gps' ? 'browser_gps' : 'ip_geo',
          location_precision: source === 'gps' ? 'precise' : 'approximate',
          logged_at: now.toISOString(),
          auto_purge_at: purgeAt,
          is_purged: false,
          is_saved: false,
        });
      }
    } catch (_) { /* breadcrumb logging is best-effort */ }

    return Response.json({ success: true, updated_at: now.toISOString() });
  } catch (err) {
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
});