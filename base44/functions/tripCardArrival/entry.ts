import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { recordGpsArrival } from '../../shared/tripCardEngine.ts';
import { validCoordinate } from '../../shared/tripCard.ts';

/**
 * tripCardArrival — the driver's arrival, as a fact rather than a tap.
 *
 * A driver who taps "arrived" from a mile out produces a false arrived-at, and
 * arrived-at is the timestamp the whole record is judged on later. So arrival
 * only exists here if a GPS check-in reaches the server AND lands inside the
 * radius of the care team's confirmed destination.
 *
 * Authorization is the offer_token, exactly as for accept/decline: partner
 * drivers have no app account, and the unguessable token is the credential.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const offerToken = String(body.offer_token || '').trim();
    if (!offerToken) return Response.json({ error: 'offer_token is required' }, { status: 400 });

    const coord = validCoordinate(body.lat, body.lng);
    if (!coord) return Response.json({ error: 'A valid GPS position is required to record arrival.' }, { status: 400 });

    const found = await base44.asServiceRole.entities.DispatchOffer
      .filter({ offer_token: offerToken }, '-created_date', 1)
      .catch(() => []);
    const offer = (found as any[])[0];
    if (!offer) return Response.json({ error: 'Offer not found' }, { status: 404 });

    if (offer.status !== 'ACCEPTED') {
      return Response.json({ error: 'This job is not assigned to you.', offer_status: offer.status }, { status: 409 });
    }

    if (offer.arrived_at) {
      return Response.json({
        already_arrived: true,
        arrived_at: offer.arrived_at,
        arrival_validation: offer.arrival_validation,
        distance_m: offer.gps_checkin_distance_m ?? null,
      });
    }

    const incident = await base44.asServiceRole.entities.Incident.get(offer.incident_id).catch(() => null);
    if (!incident) return Response.json({ error: 'Incident not found' }, { status: 404 });

    const cards = await base44.asServiceRole.entities.TripEmergencyCard
      .filter({ trip_id: incident.trip_id || '' }, '-created_date', 5)
      .catch(() => []);
    const card = (cards as any[])[0] || null;

    const now = new Date().toISOString();
    const result = await recordGpsArrival(base44, {
      offer,
      incident,
      card,
      lat: coord.lat,
      lng: coord.lng,
      now,
    });

    if (!result.ok) {
      return Response.json({
        error: result.error || 'Arrival could not be validated.',
        distance_m: result.distance_m ?? null,
      }, { status: 409 });
    }

    return Response.json({
      accepted: true,
      arrived_at: result.arrived_at,
      distance_m: result.distance_m,
      validation: 'gps_validated',
    });
  } catch (error) {
    console.error('[tripCardArrival]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});