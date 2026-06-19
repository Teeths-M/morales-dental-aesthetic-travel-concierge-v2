import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Public-safe guardian data endpoint — no user auth required (link-gated).
// Always returns HTTP 200 with a `status` field so the frontend can branch
// without needing to parse axios error objects.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json().catch(() => ({}));

    if (!token) return Response.json({ status: 'invalid', error: 'Token required' });

    // Validate session (service role — public endpoint, no user login)
    const sessions = await base44.asServiceRole.entities.GuardianSession.filter({ view_token: token });
    const session = sessions[0];

    if (!session) return Response.json({ status: 'invalid', error: 'This guardian link does not exist or has been revoked.' });
    if (!session.is_active) return Response.json({ status: 'revoked', error: 'This guardian link has been revoked by the traveler.' });
    if (new Date(session.expires_at) < new Date()) return Response.json({ status: 'expired', error: 'This guardian link has expired.' });

    // Increment view count (fire-and-forget, don't block response)
    base44.asServiceRole.entities.GuardianSession.update(session.id, {
      view_count: (session.view_count || 0) + 1,
      last_viewed_at: new Date().toISOString(),
    }).catch(() => {});

    // Load case — only safe public fields
    let casePublic = null;
    if (session.case_id) {
      const cases = await base44.asServiceRole.entities.CaseRecord.filter({ id: session.case_id });
      const c = cases[0];
      if (c) {
        casePublic = {
          status: c.status,
          journey_stage: c.journey_stage,
          safe_t_result: c.safe_t_result,
          case_priority: c.case_priority,
          risk_score: c.risk_score,
          procedure_country: c.procedure_country,
          procedures: c.procedures,
        };
      }
    }

    // Load latest unpurged LocationBreadcrumb with coordinates
    let latestLocation = null;
    if (session.case_id) {
      const crumbs = await base44.asServiceRole.entities.LocationBreadcrumb.filter({
        case_id: session.case_id,
        is_purged: false,
      });
      if (crumbs && crumbs.length > 0) {
        // Prefer crumbs with real GPS coordinates; fall back to most recent
        const withCoords = crumbs.filter(c => c.latitude != null && c.longitude != null);
        const sorted = (withCoords.length > 0 ? withCoords : crumbs)
          .sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));
        const latest = sorted[0];
        latestLocation = {
          latitude: latest.latitude ?? null,
          longitude: latest.longitude ?? null,
          accuracy_meters: latest.accuracy_meters ?? null,
          place_label: latest.place_label ?? null,
          source: latest.source ?? null,
          logged_at: latest.logged_at ?? null,
          is_saved: latest.is_saved ?? false,
          location_precision: latest.location_precision ?? (latest.source === 'ip_geo' ? 'approximate' : 'precise'),
          city: latest.city ?? null,
          country: latest.country ?? null,
        };
      }
    }

    return Response.json({
      status: 'ok',
      session: {
        guardian_name: session.guardian_name,
        patient_name: session.patient_name,
        expires_at: session.expires_at,
        shared_data_scope: session.shared_data_scope,
      },
      case: casePublic,
      latest_location: latestLocation,
    });
  } catch (_) {
    return Response.json({ status: 'error', error: 'Unable to load guardian data. Please try again.' });
  }
});