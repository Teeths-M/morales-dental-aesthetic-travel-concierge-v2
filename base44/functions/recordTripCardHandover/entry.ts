import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { recordHandover } from '../../shared/tripCardSetEngine.ts';

const PARTNER_ROLES = ['doctor', 'travel_agency', 'taxi_service', 'companion', 'security_agency', 'local_doctor'];

/**
 * recordTripCardHandover — the one partner-side card event with a reason to exist.
 *
 * If a human hands a laminated card over in Trinidad, that partner needs a single
 * action on that trip. It is scoped to the handover, not to the printed status:
 * the traveller's own "I've printed and packed my card" stays in the safety layer,
 * and this records only that a card changed hands. A driver still learns nothing
 * about whether the traveller did their homework.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });

    const isAdmin = ['admin', 'platform_admin'].includes(String(user.role || ''));
    const isPartner = PARTNER_ROLES.includes(String(user.role || ''));
    if (!isAdmin && !isPartner) {
      return Response.json({ error: 'Only the care team or the partner on the trip can record a handover.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const tripCardId = String(body?.trip_card_id || '').trim();
    if (!tripCardId) return Response.json({ error: 'trip_card_id is required' }, { status: 400 });

    const card = await base44.asServiceRole.entities.TripEmergencyCard.get(tripCardId).catch(() => null);
    if (!card) return Response.json({ error: 'That trip card set could not be found.' }, { status: 404 });
    if (card.revoked) return Response.json({ error: 'This card set has been revoked.' }, { status: 409 });

    const partnerType = String(body?.partner_type || (isPartner ? user.role : 'care_team'));
    const partnerName = String(body?.partner_name || (isPartner ? user.full_name || user.email : '')).trim();

    if (!partnerName) {
      return Response.json({ error: 'Record who handed the card over.' }, { status: 400 });
    }

    const row = await recordHandover(base44, {
      card,
      partnerName,
      partnerType,
      partnerId: body?.partner_id ? String(body.partner_id) : null,
      note: body?.note ? String(body.note) : null,
      actor: user.email,
      now: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      handover: {
        id: row?.id,
        partner_name: row?.partner_name,
        handed_over_at: row?.handed_over_at,
        card_refs: row?.card_refs || [],
      },
    });
  } catch (error) {
    console.error('[recordTripCardHandover]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});