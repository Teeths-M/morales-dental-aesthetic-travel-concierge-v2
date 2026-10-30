import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * getDispatchOfferState — what the responder needs to see after accepting.
 *
 * Authorized by the offer_token, which is scoped to one offer. Returns only the
 * job: the two reported addresses, each labelled with who reported it and when,
 * the arrival deadline, and what has been recorded so far. No patient record, no
 * contact details, no clinical detail beyond what a driver must know to arrive.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const offerToken = String(body.offer_token || '').trim();

    if (!offerToken) return Response.json({ error: 'offer_token is required' }, { status: 400 });

    const found = await base44.asServiceRole.entities.DispatchOffer
      .filter({ offer_token: offerToken }, '-created_date', 1)
      .catch(() => []);
    const offer = (found as any[])[0];
    if (!offer) return Response.json({ error: 'Offer not found' }, { status: 404 });

    const incident = await base44.asServiceRole.entities.Incident.get(offer.incident_id).catch(() => null);

    return Response.json({
      offer: {
        status: offer.status,
        display_name: offer.display_name,
        attempt_number: offer.attempt_number,
        expires_at: offer.expires_at,
        accepted_at: offer.accepted_at,
        accepted_eta_seconds: offer.accepted_eta_seconds ?? null,
        arrival_buffer_seconds: offer.arrival_buffer_seconds ?? null,
        arrival_deadline_at: offer.arrival_deadline_at ?? null,
        arrival_deadline_missed_at: offer.arrival_deadline_missed_at ?? null,
        arrived_at: offer.arrived_at ?? null,
        arrival_validation: offer.arrival_validation ?? 'pending',
        gps_checkin_distance_m: offer.gps_checkin_distance_m ?? null,
        in_person_outcome: offer.in_person_outcome ?? null,
        in_person_note: offer.in_person_note ?? null,
        withdrawal_reason: offer.withdrawal_reason ?? null,
        superseded: !!offer.superseded,
        driver_brief: offer.driver_brief ?? null,
      },
      incident: incident
        ? {
          status: incident.status,
          type: incident.type,
          traveller_first_name: String(incident.patient_name || '').split(/\s+/)[0] || null,
          country_code: incident.country_code,
        }
        : null,
    });
  } catch (error) {
    console.error('[getDispatchOfferState]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});