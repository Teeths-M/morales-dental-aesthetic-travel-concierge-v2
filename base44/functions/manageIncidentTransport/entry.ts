import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { appendAudit } from '../../shared/incidentEngine.ts';
import { canTransitionTransport, transportIsSecured } from '../../shared/emergencyIncident.ts';

/**
 * manageIncidentTransport — the ride, kept honest.
 *
 * The traveller chooses the destination. Nobody picks where an injured person
 * is taken on their behalf, which is why set_destination requires a confirmed
 * traveller action and why every later state is derived from a real driver
 * event rather than a status flag.
 *
 * 'ACCEPTED' is the only thing that means a ride exists. REQUESTED and OFFERED
 * are words for "we are asking" — and the screen is fed transportIsSecured so it
 * can never say otherwise.
 */
Deno.serve(createHandler(async ({ base44, user, body }) => {
  const b = await body<any>();
  const isCareTeam = user?.role === 'admin' || user?.role === 'platform_admin';
  const now = new Date().toISOString();

  const rows = await base44.asServiceRole.entities.Incident
    .filter({ id: String(b?.incident_id || '') }, '-created_date', 1).catch(() => []);
  const incident = rows?.[0];
  if (!incident) return err('Alert not found.', 404);

  const owns = incident.patient_email === user?.email || incident.patient_id === user?.id;
  if (!isCareTeam && !owns) return err('You do not have access to this alert.', 403);
  if (incident.closed_at) return err('This alert is closed.', 409);

  const existing = await base44.asServiceRole.entities.EmergencyTransportRequest
    .filter({ incident_id: incident.id }, '-created_date', 10).catch(() => []);
  const active = (existing || []).find(
    (t: any) => !['CANCELLED', 'FAILED', 'UNAVAILABLE'].includes(t.state),
  ) || null;

  // ── 1. The traveller chooses where to go ─────────────────────────────────
  if (b.action === 'set_destination') {
    const label = String(b.destination_label || '').trim();
    if (!label) return err('Choose where you want to be taken.', 400);

    if (active) {
      return err('A transport request is already open for this alert.', 409);
    }

    const lat = typeof b.destination_latitude === 'number' ? b.destination_latitude : null;
    const lng = typeof b.destination_longitude === 'number' ? b.destination_longitude : null;

    const created = await base44.asServiceRole.entities.EmergencyTransportRequest.create({
      incident_id: incident.id,
      patient_email: incident.patient_email,
      case_id: incident.case_id || null,
      requested_by: isCareTeam ? 'care_team' : 'traveller',
      destination_label: label.slice(0, 300),
      destination_address: b.destination_address ? String(b.destination_address).slice(0, 500) : null,
      destination_latitude: lat,
      destination_longitude: lng,
      destination_source: b.destination_source === 'traveller_typed' || b.destination_source === 'care_team_confirmed'
        ? b.destination_source
        : 'traveller_selected',
      destination_confirmed: true,
      destination_confirmed_at: now,
      destination_confirmed_by: user?.email || null,
      state: 'REQUESTED',
      state_source: 'server',
      transition_log: [{
        from_state: null, to_state: 'REQUESTED', at: now,
        actor: user?.email || 'traveller', source: 'server', note: 'Destination confirmed.',
      }],
    });

    await appendAudit(base44, {
      incident_id: incident.id,
      patient_email: incident.patient_email,
      subject_type: 'incident',
      subject_id: created.id,
      from_state: null,
      to_state: 'TRANSPORT_REQUESTED',
      actor: user?.email || 'traveller',
      actor_type: isCareTeam ? 'care_team' : 'patient',
      channel: null,
      timestamp: now,
      evidence: { destination_label: label, destination_source: created.destination_source },
    });

    return ok({
      transport: created,
      secured: false,
      message: 'Destination confirmed. We are now asking a driver — no ride is secured until one accepts.',
    });
  }

  // ── 2. Advance an existing request ───────────────────────────────────────
  if (!active) return err('There is no transport request to update.', 404);

  const toState = String(b.to_state || '');
  if (!canTransitionTransport(active.state, toState as any)) {
    return err(`A ride cannot go from ${active.state} to ${toState}.`, 409);
  }

  const patch: any = {
    state: toState,
    state_source: b.state_source || (isCareTeam ? 'care_team' : 'driver_portal'),
    transition_log: [...(active.transition_log || []), {
      from_state: active.state, to_state: toState, at: now,
      actor: user?.email || 'system', source: b.state_source || 'server', note: b.note || null,
    }],
  };
  if (toState === 'OFFERED') {
    patch.offered_at = now;
    patch.offer_expires_at = new Date(Date.now() + 90_000).toISOString();
  }
  if (toState === 'ACCEPTED') {
    if (!b.driver_name) return err('An accepted ride needs the driver\'s name.', 400);
    patch.accepted_at = now;
    patch.driver_name = String(b.driver_name).slice(0, 120);
    patch.driver_phone = b.driver_phone ? String(b.driver_phone).slice(0, 40) : null;
    patch.driver_id = b.driver_id || null;
    patch.driver_source = b.recovery_transport_request_id ? 'portal_assignment' : 'care_team';
    patch.recovery_transport_request_id = b.recovery_transport_request_id || null;
  }
  if (toState === 'EN_ROUTE') patch.en_route_at = now;
  if (toState === 'ARRIVED') patch.arrived_at = now;
  if (toState === 'UNAVAILABLE') patch.unavailable_at = now;
  if (toState === 'FAILED') patch.failed_at = now;
  if (toState === 'CANCELLED') {
    patch.cancelled_at = now;
    patch.cancel_reason = b.note ? String(b.note).slice(0, 300) : 'Cancelled.';
  }

  const updated = await base44.asServiceRole.entities.EmergencyTransportRequest.update(active.id, patch);

  await appendAudit(base44, {
    incident_id: incident.id,
    patient_email: incident.patient_email,
    subject_type: 'incident',
    subject_id: active.id,
    from_state: active.state,
    to_state: toState,
    actor: user?.email || 'system',
    actor_type: isCareTeam ? 'care_team' : 'provider_callback',
    channel: null,
    timestamp: now,
    evidence: { driver_name: patch.driver_name || null, note: b.note || null },
  });

  return ok({
    transport: updated,
    secured: transportIsSecured(toState as any),
    message: transportIsSecured(toState as any)
      ? 'A driver has accepted this ride.'
      : 'No ride is secured yet.',
  });
}, { name: 'manageIncidentTransport' }));