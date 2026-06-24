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

    // Increment view count (fire-and-forget)
    base44.asServiceRole.entities.GuardianSession.update(session.id, {
      view_count: (session.view_count || 0) + 1,
      last_viewed_at: new Date().toISOString(),
    }).catch(() => {});

    // Load case — only safe public fields (no medical notes, PII, admin notes)
    let casePublic = null;
    let tripProgress = null;
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

        // Load 9-handshake progress for the TripProgressStepper (guardian read-only).
        // Uses client_email from the case — returns only non-sensitive progress fields.
        if (c.client_email) {
          try {
            const trips = await base44.asServiceRole.entities.TravelRequest.filter(
              { user_email: c.client_email }, '-created_at', 3
            );
            const activeTrip = trips.find(t => t.trip_phase && t.trip_phase !== 'pre_departure') || trips[0];
            if (activeTrip) {
              tripProgress = {
                current_step:         activeTrip.current_step ?? 0,
                trip_phase:           activeTrip.trip_phase ?? 'pre_departure',
                handshake_timestamps: activeTrip.handshake_timestamps ?? {},
                departure_date:       activeTrip.departure_date ?? null,
              };
            }
          } catch (_) {}
        }
      }
    }

    const hasLocationScope = !session.shared_data_scope || session.shared_data_scope.includes('location');
    let latestLocation = null;

    if (session.case_id && hasLocationScope) {
      // 1. Try LiveLocation first — real-time moving dot
      try {
        const liveLocations = await base44.asServiceRole.entities.LiveLocation.filter({
          case_id: session.case_id,
          is_active: true,
        });

        // Prefer GPS records over IP geo. IP geo resolves to the ISP's registered city
        // (not the patient's physical location) and caused Guardians to see the wrong
        // city (e.g. Caracas) when the patient was abroad. GPS-source records are always
        // preferred; IP geo is only used if no GPS record exists AND it is recent (< 10 min).
        const sorted = liveLocations.sort((a, b) => {
          const aIsGps = a.source === 'gps';
          const bIsGps = b.source === 'gps';
          if (aIsGps !== bIsGps) return aIsGps ? -1 : 1;  // GPS first
          return new Date(b.updated_at) - new Date(a.updated_at);  // then most recent
        });

        let live = sorted[0] ?? null;

        // Discard IP geo records older than 10 minutes — they are city-level guesses
        // and become misleading once the patient has moved.
        if (live && live.source === 'ip_geo') {
          const ageMs = Date.now() - new Date(live.updated_at || 0).getTime();
          if (ageMs > 10 * 60 * 1000) live = null;
        }

        if (live && live.latitude != null && live.longitude != null) {
          latestLocation = {
            latitude: live.latitude,
            longitude: live.longitude,
            accuracy_meters: live.accuracy_meters ?? null,
            heading: live.heading ?? null,
            speed: live.speed ?? null,
            altitude: live.altitude ?? null,
            source: live.source ?? null,
            updated_at: live.updated_at ?? null,
            is_live: true,
            stale_after: live.stale_after ?? null,
            location_precision: live.source === 'ip_geo' ? 'approximate' : 'precise',
          };
        }
      } catch (_) {}

      // 2. Fall back to LocationBreadcrumb if no LiveLocation
      if (!latestLocation) {
        try {
          const crumbs = await base44.asServiceRole.entities.LocationBreadcrumb.filter({
            case_id: session.case_id,
            is_purged: false,
          });
          if (crumbs && crumbs.length > 0) {
            const withCoords = crumbs.filter(c => c.latitude != null && c.longitude != null);
            const sorted = (withCoords.length > 0 ? withCoords : crumbs)
              .sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));
            const latest = sorted[0];
            latestLocation = {
              latitude: latest.latitude ?? null,
              longitude: latest.longitude ?? null,
              accuracy_meters: latest.accuracy_meters ?? null,
              heading: null,
              speed: null,
              source: latest.source ?? null,
              updated_at: latest.logged_at ?? null,
              is_live: false,
              stale_after: null,
              place_label: latest.place_label ?? null,
              location_precision: latest.location_precision ?? (latest.source === 'ip_geo' ? 'approximate' : 'precise'),
              city: latest.city ?? null,
              country: latest.country ?? null,
            };
          }
        } catch (_) {}
      }
    }

    // Load escalation status (latest active check-in for this case)
    let escalationInfo = null;
    if (session.case_id) {
      try {
        const [esc5h, esc3h, esc2h] = await Promise.all([
          base44.asServiceRole.entities.SoloCheckIn.filter({ case_id: session.case_id, status: 'escalated_5h' }, '-scheduled_time', 1),
          base44.asServiceRole.entities.SoloCheckIn.filter({ case_id: session.case_id, status: 'escalated_3h' }, '-scheduled_time', 1),
          base44.asServiceRole.entities.SoloCheckIn.filter({ case_id: session.case_id, status: 'escalated_2h' }, '-scheduled_time', 1),
        ]);
        const escalated = esc5h[0] || esc3h[0] || esc2h[0];
        if (escalated) {
          escalationInfo = {
            status: escalated.status,
            escalation_level: escalated.escalation_level,
            guardian_alerted_at: escalated.guardian_alerted_at,
            security_dispatched_at: escalated.security_dispatched_at,
            police_escalation_required_at: escalated.police_escalation_required_at,
            overdue_since: escalated.scheduled_time,
          };
        }
      } catch (_) {}
    }

    // Check for active wilderness SOS event
    let wildernessSOS = null;
    if (session.case_id) {
      try {
        const sosEvents = await base44.asServiceRole.entities.SOSEvent.filter({
          case_id: session.case_id,
        }, '-triggered_at', 5);
        const activeSOS = sosEvents.find(e =>
          ['triggered', 'dispatched', 'acknowledged'].includes(e.status)
        );
        if (activeSOS) {
          wildernessSOS = {
            status: activeSOS.status,
            trigger_type: activeSOS.trigger_type,
            latitude: activeSOS.latitude ?? null,
            longitude: activeSOS.longitude ?? null,
            location_label: activeSOS.location_label,
            triggered_at: activeSOS.triggered_at,
            responder_name: activeSOS.responder_name ?? null,
            responder_eta_minutes: activeSOS.responder_eta_minutes ?? null,
            notifications_sent: activeSOS.notifications_sent ?? [],
          };
          // If SOS has GPS but latestLocation doesn't, use SOS GPS for map
          if (!latestLocation && activeSOS.latitude != null) {
            latestLocation = {
              latitude: activeSOS.latitude,
              longitude: activeSOS.longitude,
              accuracy_meters: null,
              source: 'gps',
              updated_at: activeSOS.triggered_at,
              is_live: false,
              stale_after: null,
              location_precision: 'precise',
              place_label: activeSOS.location_label || 'SOS Location',
            };
          }
        }
      } catch (_) {}
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
      escalation: escalationInfo,
      wilderness_sos: wildernessSOS,
      trip_progress: tripProgress,
    });
  } catch (_) {
    return Response.json({ status: 'error', error: 'Unable to load guardian data. Please try again.' });
  }
});