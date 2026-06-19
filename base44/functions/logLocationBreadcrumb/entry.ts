import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const VALID_SOURCES = ['gps', 'manual', 'ip_geo', 'checkin_handshake'];

function validCoord(v, min, max) {
  return v == null || (typeof v === 'number' && !isNaN(v) && v >= min && v <= max);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      action,
      case_id,
      latitude,
      longitude,
      accuracy_meters,
      place_label,
      source,
      country,
      country_code,
      city,
      region,
      timezone,
      breadcrumb_id,
    } = body;

    // ── LIST ─────────────────────────────────────────────────────────────────
    if (action === 'list') {
      if (!case_id) return Response.json({ error: 'case_id required' }, { status: 400 });
      const crumbs = await base44.asServiceRole.entities.LocationBreadcrumb.filter({ case_id, is_purged: false });
      return Response.json({ crumbs });
    }

    // ── SAVE ─────────────────────────────────────────────────────────────────
    if (action === 'save') {
      if (!breadcrumb_id) return Response.json({ error: 'breadcrumb_id required' }, { status: 400 });
      await base44.asServiceRole.entities.LocationBreadcrumb.update(breadcrumb_id, { is_saved: true });
      return Response.json({ saved: true });
    }

    // ── PURGE_JOURNEY ────────────────────────────────────────────────────────
    if (action === 'purge_journey') {
      if (!case_id) return Response.json({ error: 'case_id required' }, { status: 400 });
      const crumbs = await base44.asServiceRole.entities.LocationBreadcrumb.filter({ case_id, is_saved: false, is_purged: false });
      let purged = 0;
      for (const c of crumbs) {
        await base44.asServiceRole.entities.LocationBreadcrumb.update(c.id, { is_purged: true });
        purged++;
      }
      return Response.json({ purged_count: purged });
    }

    // ── LOG ──────────────────────────────────────────────────────────────────
    if (action === 'log') {
      if (!case_id) return Response.json({ error: 'case_id required' }, { status: 400 });

      const resolvedSource = VALID_SOURCES.includes(source) ? source : 'gps';

      // Validate coordinate ranges
      if (!validCoord(latitude, -90, 90)) return Response.json({ error: 'Invalid latitude' }, { status: 400 });
      if (!validCoord(longitude, -180, 180)) return Response.json({ error: 'Invalid longitude' }, { status: 400 });

      // Determine precision
      const precision = (latitude != null && longitude != null && resolvedSource === 'gps')
        ? 'precise' : 'approximate';
      const provider = resolvedSource === 'gps' ? 'browser_gps'
        : resolvedSource === 'ip_geo' ? 'ip_geo' : 'manual';

      // Build label if not provided
      let label = place_label || null;
      if (!label) {
        if (latitude != null && longitude != null) {
          label = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        } else if (city && country) {
          label = `${city}, ${country}`;
        } else {
          label = country || 'Unknown location';
        }
      }

      const autoPurgeAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const crumb = await base44.asServiceRole.entities.LocationBreadcrumb.create({
        case_id,
        patient_email: user.email,
        patient_name: user.full_name || user.email,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        accuracy_meters: accuracy_meters ?? null,
        place_label: label,
        country: country ?? null,
        country_code: country_code ?? null,
        city: city ?? null,
        region: region ?? null,
        timezone: timezone ?? null,
        location_precision: precision,
        provider,
        logged_at: new Date().toISOString(),
        auto_purge_at: autoPurgeAt,
        is_saved: false,
        is_purged: false,
        source: resolvedSource,
      });

      return Response.json({ crumb_id: crumb.id, logged: true });
    }

    return Response.json({ error: 'Unknown action. Use: log, save, purge_journey, list' }, { status: 400 });
  } catch (_) {
    return Response.json({ error: 'Location service unavailable' }, { status: 500 });
  }
});