import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { pageHumans } from '../../shared/tripCardEngine.ts';
import { appendAudit, loadPolicy } from '../../shared/incidentEngine.ts';

/**
 * tripCardDriverConfirm — what the driver found when he looked.
 *
 * Only reachable after a validated GPS arrival, because confirming in person
 * is worth nothing if nobody is actually there. Kept separate from arrived_at:
 * one is "the phone is at the place", the other is "a human saw the traveller".
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const offerToken = String(body.offer_token || '').trim();
    const outcome = String(body.outcome || '').trim();

    if (!offerToken) return Response.json({ error: 'offer_token is required' }, { status: 400 });
    if (!['traveller_safe', 'help_needed', 'unknown'].includes(outcome)) {
      return Response.json({ error: "outcome must be 'traveller_safe', 'help_needed' or 'unknown'" }, { status: 400 });
    }

    const found = await base44.asServiceRole.entities.DispatchOffer
      .filter({ offer_token: offerToken }, '-created_date', 1)
      .catch(() => []);
    const offer = (found as any[])[0];
    if (!offer) return Response.json({ error: 'Offer not found' }, { status: 404 });

    if (!offer.arrived_at) {
      return Response.json({
        error: 'Arrival has not been validated yet. An in-person confirmation is recorded after the GPS check-in at the destination.',
      }, { status: 409 });
    }

    const incident = await base44.asServiceRole.entities.Incident.get(offer.incident_id).catch(() => null);
    if (!incident) return Response.json({ error: 'Incident not found' }, { status: 404 });

    const now = new Date().toISOString();
    const note = body.note ? String(body.note).slice(0, 500) : null;

    await base44.asServiceRole.entities.DispatchOffer.update(offer.id, {
      in_person_safety_confirmed_at: now,
      in_person_outcome: outcome,
      in_person_note: note,
    }).catch(() => {});

    await appendAudit(base44, {
      incident_id: incident.id,
      patient_email: incident.patient_email,
      subject_type: 'offer',
      subject_id: offer.id,
      from_state: 'ARRIVED',
      to_state: 'ARRIVED',
      actor: `responder:${offer.responder_id}`,
      actor_type: 'responder',
      timestamp: now,
      evidence: {
        action: 'in_person_safety_confirmation',
        outcome,
        note,
        arrived_at: offer.arrived_at,
        arrived_at_source: 'gps_checkin',
      },
    });

    if (outcome !== 'traveller_safe') {
      const policy = await loadPolicy(base44, incident.country_code);
      await pageHumans(
        base44,
        incident,
        policy,
        `IN PERSON: ${offer.display_name || 'The driver'} has reached the traveller and reports ${outcome === 'help_needed' ? 'HELP IS NEEDED' : 'the situation is unclear'}.${note ? ` Note: ${note}` : ''}`,
        'driver_in_person_report',
        now,
      );
    }

    return Response.json({ recorded: true, outcome, confirmed_at: now });
  } catch (error) {
    console.error('[tripCardDriverConfirm]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});