import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { resolveOccurredAt } from '../../shared/incidentDispatch.ts';
import { arrivalDeadlineAt, arrivalBufferSeconds } from '../../shared/tripCard.ts';
import {
  advanceDispatch,
  notifyResponderMoving,
  moveIncident,
  appendAudit,
  loadPolicy,
} from '../../shared/incidentEngine.ts';

/**
 * respondToDispatchOffer — a responder accepts or declines the one live offer.
 *
 * Authorization is the offer_token itself: responders are partner agencies
 * without app accounts, so the unguessable token issued with the offer is the
 * credential. It is scoped to a single offer and a single incident.
 *
 * The action's ORIGINAL timestamp is honoured. A responder who accepted at
 * 09:14 while offline and whose phone flushed at 09:20 accepted at 09:14 —
 * rewriting that to 09:20 would show them accepting an offer that had already
 * expired, which is a lie about their response time.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const token = String(body.offer_token || '').trim();
    const action = String(body.action || '').toLowerCase();

    if (!token) return Response.json({ error: 'offer_token is required' }, { status: 400 });
    if (action !== 'accept' && action !== 'decline') {
      return Response.json({ error: "action must be 'accept' or 'decline'" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const responded = resolveOccurredAt(body, now);

    const found = await base44.asServiceRole.entities.DispatchOffer
      .filter({ offer_token: token }, '-created_date', 1)
      .catch(() => []);

    const offer = (found as any[])[0];
    if (!offer) return Response.json({ error: 'Offer not found' }, { status: 404 });

    const incident = await base44.asServiceRole.entities.Incident.get(offer.incident_id).catch(() => null);
    if (!incident) return Response.json({ error: 'Incident not found' }, { status: 404 });

    // Live policy, not the frozen snapshot: the pool must reflect a partner
    // suspended since the incident opened. advanceDispatch degrades to
    // UNRESOLVED when there is no policy at all, rather than guessing.
    const policy = await loadPolicy(base44, incident.country_code);

    // ── Already answered ────────────────────────────────────────────────────
    if (offer.status !== 'OFFERED') {
      return Response.json({
        already_responded: true,
        offer_status: offer.status,
        incident_status: incident.status,
        accepted: offer.status === 'ACCEPTED',
      });
    }

    // ── Expiry is judged against the moment the responder acted ─────────────
    const expiresMs = new Date(offer.expires_at).getTime();
    const actedMs = new Date(responded.occurred_at).getTime();
    if (Number.isFinite(expiresMs) && Number.isFinite(actedMs) && actedMs > expiresMs) {
      await base44.asServiceRole.entities.DispatchOffer.update(offer.id, {
        status: 'EXPIRED',
        responded_at: responded.occurred_at,
        responded_at_source: responded.occurred_at_source,
      }).catch(() => {});

      await appendAudit(base44, {
        incident_id: incident.id,
        patient_email: incident.patient_email,
        subject_type: 'offer',
        subject_id: offer.id,
        from_state: 'OFFERED',
        to_state: 'EXPIRED',
        actor: `responder:${offer.responder_id}`,
        actor_type: 'responder',
        timestamp: responded.occurred_at,
        evidence: { reason: 'response_after_expiry', expires_at: offer.expires_at },
      });

      const advanced = policy
        ? await advanceDispatch(base44, { incident, policy, now, reason: 'offer_expired' })
        : { offer: null, unresolved: true };

      return Response.json({
        expired: true,
        offer_status: 'EXPIRED',
        incident_status: advanced.incident?.status || incident.status,
        next_offer: advanced.offer ? { expires_at: advanced.offer.expires_at } : null,
      });
    }

    // ── Accept ──────────────────────────────────────────────────────────────
    if (action === 'accept') {
      // The ETA in force is his OWN quoted time if he supplied one at the
      // moment he said yes, otherwise the partner's declared response time.
      // Never a guess, and never reconstructed later.
      const requestedEta = Number(body.eta_seconds);
      const acceptedEta = Number.isFinite(requestedEta) && requestedEta > 0
        ? Math.round(requestedEta)
        : (Number.isFinite(Number(offer.eta_seconds)) && Number(offer.eta_seconds) > 0
          ? Math.round(Number(offer.eta_seconds))
          : null);

      await base44.asServiceRole.entities.DispatchOffer.update(offer.id, {
        status: 'ACCEPTED',
        responded_at: responded.occurred_at,
        responded_at_source: responded.occurred_at_source,
        accepted_at: responded.occurred_at,
        // Measured from ACCEPTANCE, never from when the offer went out: the
        // ETA only starts existing when he says yes.
        accepted_eta_seconds: acceptedEta,
        arrival_buffer_seconds: arrivalBufferSeconds(acceptedEta),
        arrival_deadline_at: arrivalDeadlineAt(responded.occurred_at, acceptedEta),
        arrival_validation: 'pending',
        superseded: false,
      });

      await appendAudit(base44, {
        incident_id: incident.id,
        patient_email: incident.patient_email,
        subject_type: 'offer',
        subject_id: offer.id,
        from_state: 'OFFERED',
        to_state: 'ACCEPTED',
        actor: `responder:${offer.responder_id}`,
        actor_type: 'responder',
        channel: 'sms',
        timestamp: responded.occurred_at,
        evidence: {
          responder_name: offer.display_name,
          accepted_at: responded.occurred_at,
          occurred_at_source: responded.occurred_at_source,
          attempt_number: offer.attempt_number,
        },
      });

      await moveIncident(base44, {
        incident,
        to: 'ASSIGNED',
        actor: `responder:${offer.responder_id}`,
        actor_type: 'responder',
        now,
        evidence: { offer_id: offer.id, responder_name: offer.display_name },
      });

      await notifyResponderMoving(base44, { incident, offer, policy, now });

      return Response.json({
        accepted: true,
        offer_status: 'ACCEPTED',
        incident_status: 'ASSIGNED',
        responder_name: offer.display_name,
        accepted_at: responded.occurred_at,
      });
    }

    // ── Decline → the next responder, sequentially ──────────────────────────
    await base44.asServiceRole.entities.DispatchOffer.update(offer.id, {
      status: 'DECLINED',
      responded_at: responded.occurred_at,
      responded_at_source: responded.occurred_at_source,
      decline_reason: body.decline_reason ? String(body.decline_reason).slice(0, 300) : null,
    });

    await appendAudit(base44, {
      incident_id: incident.id,
      patient_email: incident.patient_email,
      subject_type: 'offer',
      subject_id: offer.id,
      from_state: 'OFFERED',
      to_state: 'DECLINED',
      actor: `responder:${offer.responder_id}`,
      actor_type: 'responder',
      timestamp: responded.occurred_at,
      evidence: {
        responder_name: offer.display_name,
        attempt_number: offer.attempt_number,
        reason: body.decline_reason ? String(body.decline_reason).slice(0, 300) : null,
      },
    });

    const advanced = policy
      ? await advanceDispatch(base44, { incident, policy, now, reason: 'offer_declined' })
      : { offer: null, unresolved: true };

    return Response.json({
      declined: true,
      offer_status: 'DECLINED',
      incident_status: advanced.incident?.status || incident.status,
      next_offer: advanced.offer ? { expires_at: advanced.offer.expires_at } : null,
      unresolved: !!advanced.unresolved,
    });
  } catch (error) {
    console.error('[respondToDispatchOffer]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});