import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import {
  buildDedupeKey,
  pickSurvivingIncident,
  buildFanoutTargets,
  resolveOccurredAt,
} from '../../shared/incidentDispatch.ts';
import {
  loadPolicy,
  resolveContacts,
  createNotificationRows,
  fireFanout,
  advanceDispatch,
  pageCareTeam,
  moveIncident,
  appendAudit,
} from '../../shared/incidentEngine.ts';

/**
 * openIncident — the single entry point that opens an emergency.
 *
 * Deterministic end to end: no model is consulted to decide whether this is a
 * real emergency, who to notify, or who to dispatch. The request supplies the
 * facts; the policy supplies the rules; the state machine does the rest.
 *
 * The two halves run independently:
 *   • the notification fanout fires to everyone at once
 *   • dispatch starts its sequential offers
 * Neither waits on the other, and a failure in one cannot cancel the other.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Sign in to raise an emergency alert.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const isAdmin = user.role === 'admin' || user.role === 'platform_admin';
    const patientEmail = (isAdmin && body.patient_email) ? String(body.patient_email) : user.email;
    const patientId = (isAdmin && body.patient_id) ? String(body.patient_id) : user.id;

    const type = String(body.type || 'medical');
    const triggerSource = String(body.trigger_source || 'patient_sos');
    const now = new Date().toISOString();
    const occurred = resolveOccurredAt(body, now);

    const tripId = body.trip_id ? String(body.trip_id) : null;

    const dedupeKey = buildDedupeKey({
      patientId,
      tripId,
      type,
      at: occurred.occurred_at,
    });

    // ── Idempotency: a duplicate trigger is the SAME incident ────────────────
    const existing = await base44.asServiceRole.entities.Incident
      .filter({ dedupe_key: dedupeKey }, '-created_date', 5)
      .catch(() => []);

    if (Array.isArray(existing) && existing.length > 0) {
      return Response.json({
        incident_id: existing[0].id,
        status: existing[0].status,
        deduplicated: true,
        notifications: 0,
        offer: null,
        unresolved: existing[0].status === 'UNRESOLVED',
      });
    }

    const countryCode = body.country_code ? String(body.country_code).toUpperCase() : null;
    const policy = await loadPolicy(base44, countryCode);

    const incident = await base44.asServiceRole.entities.Incident.create({
      patient_id: patientId,
      patient_email: patientEmail,
      patient_name: body.patient_name || null,
      patient_phone: body.patient_phone || null,
      trip_id: tripId,
      case_id: body.case_id || null,
      type,
      trigger_source: triggerSource,
      client_ref: body.client_ref || null,
      dedupe_key: dedupeKey,
      status: 'OPEN',
      country_code: countryCode,
      latitude: typeof body.latitude === 'number' ? body.latitude : null,
      longitude: typeof body.longitude === 'number' ? body.longitude : null,
      location_label: body.location_label || null,
      clinical_risk_flags: Array.isArray(body.clinical_risk_flags) ? body.clinical_risk_flags : [],
      policy_snapshot: policy
        ? {
          country_code: policy.country_code,
          emergency_number: policy.emergency_number || null,
          emergency_number_label: policy.emergency_number_label || null,
          requires_emergency_call: !!policy.requires_emergency_call,
          notify_roles: policy.notify_roles || null,
          offer_timeout_seconds: policy.offer_timeout_seconds || 90,
          max_offers: policy.max_offers || 5,
          version: policy.version || 1,
        }
        : null,
      policy_missing: !policy,
      triggered_at: occurred.occurred_at,
      triggered_at_source: occurred.occurred_at_source,
      received_at: now,
    });

    await appendAudit(base44, {
      incident_id: incident.id,
      patient_email: patientEmail,
      subject_type: 'incident',
      subject_id: incident.id,
      from_state: null,
      to_state: 'OPEN',
      actor: triggerSource,
      actor_type: triggerSource === 'admin' ? 'admin' : 'patient',
      timestamp: now,
      evidence: {
        trigger_source: triggerSource,
        type,
        triggered_at: occurred.occurred_at,
        triggered_at_source: occurred.occurred_at_source,
        policy_found: !!policy,
        country_code: countryCode,
      },
    });

    // ── Concurrent-trigger tiebreak ──────────────────────────────────────────
    // Two requests can both pass the read above. The winner is deterministic:
    // the smallest id. The loser suppresses itself and dispatches nobody.
    const allWithKey = await base44.asServiceRole.entities.Incident
      .filter({ dedupe_key: dedupeKey }, '-created_date', 10)
      .catch(() => []);

    const survivor = pickSurvivingIncident(allWithKey as any[]);
    if (survivor && survivor.id !== incident.id) {
      await moveIncident(base44, {
        incident,
        to: 'DUPLICATE_SUPPRESSED',
        actor: 'dispatch_engine',
        actor_type: 'engine',
        now,
        evidence: { duplicate_of: survivor.id },
        extraFields: { duplicate_of: survivor.id },
      });

      return Response.json({
        incident_id: survivor.id,
        status: survivor.status,
        deduplicated: true,
        notifications: 0,
        offer: null,
        unresolved: survivor.status === 'UNRESOLVED',
      });
    }

    // ── Fanout and dispatch, in parallel and independent ─────────────────────
    const contacts = await resolveContacts(base44, incident, policy);
    const targets = buildFanoutTargets({ policy, contacts });
    const rows = await createNotificationRows(base44, incident, targets, now);

    const dispatchPromise = (async () => {
      if (!policy) {
        // No policy for this country: the incident still exists, the fanout
        // still went out, and dispatch is honestly declared unresolvable
        // rather than guessing a number or a responder.
        const moved = await moveIncident(base44, {
          incident,
          to: 'UNRESOLVED',
          actor: 'dispatch_engine',
          actor_type: 'engine',
          now,
          evidence: { reason: 'no_policy', country_code: countryCode },
          extraFields: { unresolved_reason: 'no_policy' },
        });
        await pageCareTeam(base44, moved, null, 'no_policy', now);
        return { offer: null, unresolved: true };
      }
      const result = await advanceDispatch(base44, { incident, policy, now, reason: triggerSource });
      return { offer: result.offer, unresolved: result.unresolved };
    })();

    const [, dispatchOutcome] = await Promise.allSettled([
      fireFanout(base44, incident, rows, now),
      dispatchPromise,
    ]);

    const dispatch = dispatchOutcome.status === 'fulfilled'
      ? dispatchOutcome.value
      : { offer: null, unresolved: true };

    return Response.json({
      incident_id: incident.id,
      status: dispatch.unresolved ? 'UNRESOLVED' : 'DISPATCHING',
      deduplicated: false,
      notifications: rows.length,
      offer: dispatch.offer
        ? { id: dispatch.offer.id, expires_at: dispatch.offer.expires_at, attempt_number: dispatch.offer.attempt_number }
        : null,
      unresolved: !!dispatch.unresolved,
      policy_missing: !policy,
    });
  } catch (error) {
    console.error('[openIncident]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});