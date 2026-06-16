import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, case_id, latitude, longitude, accuracy_meters, place_label, source, breadcrumb_id, save_permanently } = await req.json();

    if (action === 'log') {
      if (!case_id) return Response.json({ error: 'case_id required' }, { status: 400 });

      // Auto-purge time: 24 hours after logging, unless saved
      const autoPurgeAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const crumb = await base44.asServiceRole.entities.LocationBreadcrumb.create({
        case_id,
        patient_email: user.email,
        patient_name: user.full_name || user.email,
        latitude: latitude || null,
        longitude: longitude || null,
        accuracy_meters: accuracy_meters || null,
        place_label: place_label || 'Unknown location',
        logged_at: new Date().toISOString(),
        auto_purge_at: autoPurgeAt,
        is_saved: false,
        is_purged: false,
        source: source || 'gps'
      });

      return Response.json({ crumb_id: crumb.id, logged: true });
    }

    if (action === 'save') {
      if (!breadcrumb_id) return Response.json({ error: 'breadcrumb_id required' }, { status: 400 });
      await base44.asServiceRole.entities.LocationBreadcrumb.update(breadcrumb_id, { is_saved: true });
      return Response.json({ saved: true });
    }

    if (action === 'purge_journey') {
      // Purge all unsaved breadcrumbs for a case on journey completion
      if (!case_id) return Response.json({ error: 'case_id required' }, { status: 400 });
      const crumbs = await base44.asServiceRole.entities.LocationBreadcrumb.filter({ case_id, is_saved: false, is_purged: false });
      let purged = 0;
      for (const crumb of crumbs) {
        await base44.asServiceRole.entities.LocationBreadcrumb.update(crumb.id, { is_purged: true });
        purged++;
      }
      return Response.json({ purged_count: purged, message: `${purged} unsaved breadcrumbs purged` });
    }

    if (action === 'list') {
      if (!case_id) return Response.json({ error: 'case_id required' }, { status: 400 });
      const crumbs = await base44.asServiceRole.entities.LocationBreadcrumb.filter({ case_id, is_purged: false });
      return Response.json({ crumbs });
    }

    return Response.json({ error: 'Unknown action. Use: log, save, purge_journey, list' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});