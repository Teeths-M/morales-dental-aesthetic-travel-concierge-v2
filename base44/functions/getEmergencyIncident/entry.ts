import { createHandler, ok, err } from '../../shared/createHandler.ts';
import {
  evaluateLocationIntegrity,
  evaluateResponseReadiness,
} from '../../shared/emergencyIncident.ts';

/**
 * getEmergencyIncident — everything the M-Safe screen shows, derived fresh.
 *
 * Freshness and capability are RECOMPUTED here rather than trusted from the
 * stored row, because both decay with time: a fix that was current at 03:14 is
 * not current at 03:40, and a team that acknowledged before its shift ended is
 * no longer on duty. Reading the stored verdict would let a stale label survive.
 */
Deno.serve(createHandler(async ({ base44, user, body }) => {
  const b = await body<any>();
  const isCareTeam = user?.role === 'admin' || user?.role === 'platform_admin';
  const now = new Date().toISOString();

  let incident: any = null;
  if (b?.incident_id) {
    const rows = await base44.asServiceRole.entities.Incident
      .filter({ id: String(b.incident_id) }, '-created_date', 1).catch(() => []);
    incident = rows?.[0] || null;
  }

  // A responder holding an ack_token may see the incident they were called to,
  // and nothing else — no other incidents, no other people.
  if (!incident && b?.ack_token) {
    const links = await base44.asServiceRole.entities.IncidentNotification
      .filter({ ack_token: String(b.ack_token) }, '-created_date', 1).catch(() => []);
    if (links?.[0]) {
      const rows = await base44.asServiceRole.entities.Incident
        .filter({ id: links[0].incident_id }, '-created_date', 1).catch(() => []);
      incident = rows?.[0] || null;
    }
  }

  if (!incident) return err('Alert not found.', 404);

  const ownsIncident = incident.patient_email === user?.email || incident.patient_id === user?.id;
  if (!isCareTeam && !ownsIncident && !b?.ack_token) {
    return err('You do not have access to this alert.', 403);
  }

  const [recipients, transports, audits, profileRows] = await Promise.all([
    base44.asServiceRole.entities.IncidentNotification
      .filter({ incident_id: incident.id }, 'created_date', 100).catch(() => []),
    base44.asServiceRole.entities.EmergencyTransportRequest
      .filter({ incident_id: incident.id }, '-created_date', 10).catch(() => []),
    base44.asServiceRole.entities.IncidentAuditEvent
      .filter({ incident_id: incident.id }, 'sequence', 200).catch(() => []),
    incident.readiness_profile_id
      ? base44.asServiceRole.entities.SecurityReadinessProfile
        .filter({ id: incident.readiness_profile_id }, '-created_date', 1).catch(() => [])
      : Promise.resolve([]),
  ]);

  // Responders inside the incident keep only what they were called for.
  const visibleRecipients = (recipients || []).filter((r: any) => {
    if (isCareTeam || ownsIncident) return true;
    return r.ack_token === String(b.ack_token || '');
  });

  const engaged = (recipients || []).some(
    (r: any) => r.recipient_role === 'responder' &&
      ['ACKNOWLEDGED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED'].includes(r.status),
  );

  const readiness = evaluateResponseReadiness({
    profile: (profileRows as any[])?.[0] || null,
    destination: { area_label: incident.location_label, country_code: incident.country_code },
    now,
    acknowledged: engaged,
  });

  const location = evaluateLocationIntegrity({
    source: incident.location_source || 'none',
    captured_at: incident.location_captured_at,
    accuracy_m: incident.location_accuracy_m,
  }, now);

  const activeTransport = (transports || []).find(
    (t: any) => !['CANCELLED', 'FAILED', 'UNAVAILABLE'].includes(t.state),
  ) || (transports || [])[0] || null;

  return ok({
    incident: {
      ...incident,
      // Derived values win over stored ones so a stale label cannot be shown.
      response_capability: readiness.capability,
      response_blockers: readiness.blockers,
      location_freshness: location.freshness,
    },
    readiness,
    location,
    recipients: visibleRecipients,
    transport: activeTransport,
    timeline: audits || [],
    viewer: {
      is_care_team: Boolean(isCareTeam),
      is_patient: Boolean(ownsIncident),
      is_responder: Boolean(b?.ack_token) && !isCareTeam && !ownsIncident,
    },
  });
}, { name: 'getEmergencyIncident', requireAuth: false }));