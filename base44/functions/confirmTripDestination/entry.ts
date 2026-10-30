import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { confirmDestinationAndDispatch, destinationCandidates } from '../../shared/tripCardEngine.ts';
import { validCoordinate } from '../../shared/tripCard.ts';

/**
 * confirmTripDestination — the human decision that unblocks dispatch.
 *
 * Two addresses can be on file: the one a stranger reported and the trip's last
 * confirmed position. They routinely disagree, and the driver has to be sent to
 * ONE of them. Neither is silently preferred; the care team picks, and the
 * driver then receives both, each labelled with who reported it and when.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch(() => null);
    if (!user || !['admin', 'platform_admin'].includes(user.role)) {
      return Response.json({ error: 'Only the care team can confirm a dispatch destination.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const cardId = String(body.card_id || '').trim();
    const basis = String(body.basis || '').trim();

    if (!cardId) return Response.json({ error: 'card_id is required' }, { status: 400 });
    if (!['traveller_location', 'bystander_location', 'manual'].includes(basis)) {
      return Response.json({ error: 'basis must be traveller_location, bystander_location or manual' }, { status: 400 });
    }

    const card = await base44.asServiceRole.entities.TripEmergencyCard.get(cardId).catch(() => null);
    if (!card) return Response.json({ error: 'Card not found' }, { status: 404 });

    if (card.destination_state === 'confirmed') {
      return Response.json({ error: 'The destination has already been confirmed for this request.' }, { status: 409 });
    }

    const candidates = destinationCandidates(card);
    const chosen = basis !== 'manual'
      ? candidates.find((c) => c.basis === basis)
      : null;

    if (basis !== 'manual' && !chosen) {
      return Response.json({
        error: `No ${basis === 'bystander_location' ? 'bystander-reported' : 'last-confirmed traveller'} location is on file for this request.`,
      }, { status: 400 });
    }

    const bodyCoord = validCoordinate(body.lat, body.lng);
    const candidateCoord = chosen ? validCoordinate(chosen.lat, chosen.lng) : null;
    const coord = basis === 'manual' ? bodyCoord : (candidateCoord || bodyCoord);

    if (!coord) {
      return Response.json({
        error: 'Dispatch needs coordinates so the driver\'s arrival can be validated. Pick the located address, or enter coordinates for the manual one.',
      }, { status: 400 });
    }

    const label = String(body.label || chosen?.label || '').trim();
    if (!label) return Response.json({ error: 'A destination label is required.' }, { status: 400 });

    const now = new Date().toISOString();
    const result = await confirmDestinationAndDispatch(base44, {
      card,
      basis,
      lat: coord.lat,
      lng: coord.lng,
      label,
      actor: user.email,
      now,
    });

    if (!result.ok) return Response.json({ error: result.error }, { status: 409 });

    return Response.json({
      success: true,
      destination: { basis, lat: coord.lat, lng: coord.lng, label },
      offer: result.offer
        ? {
          id: result.offer.id,
          attempt_number: result.offer.attempt_number,
          expires_at: result.offer.expires_at,
          responder_name: result.offer.display_name,
        }
        : null,
      unresolved: !!result.unresolved,
    });
  } catch (error) {
    console.error('[confirmTripDestination]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});