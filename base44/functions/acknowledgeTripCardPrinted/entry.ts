import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { acknowledgePrinted } from '../../shared/tripCardSetEngine.ts';

/**
 * acknowledgeTripCardPrinted — the one piece of evidence the card set has.
 *
 * Nothing in the card set knows whether anyone actually printed it, and a perfect
 * card sitting unread in an email is the same as no card. This is the traveller
 * saying, in one line, that there is paper in a pocket. It is shown to them and to
 * the care team, and it is deliberately not shown to trip partners.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const tripCardId = String(body?.trip_card_id || '').trim();
    if (!tripCardId) return Response.json({ error: 'trip_card_id is required' }, { status: 400 });

    const card = await base44.asServiceRole.entities.TripEmergencyCard.get(tripCardId).catch(() => null);
    if (!card) return Response.json({ error: 'That trip card set could not be found.' }, { status: 404 });

    const isAdmin = ['admin', 'platform_admin'].includes(String(user.role || ''));
    if (!isAdmin && String(card.patient_email || '').toLowerCase() !== String(user.email || '').toLowerCase()) {
      return Response.json({ error: 'That trip card set is not yours.' }, { status: 403 });
    }
    if (card.revoked) {
      return Response.json({ error: 'This card set has been revoked, so there is nothing to pack.' }, { status: 409 });
    }

    const updated = await acknowledgePrinted(base44, {
      card,
      actor: user.email,
      now: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      printed_acknowledged: true,
      printed_acknowledged_at: updated?.printed_acknowledged_at || new Date().toISOString(),
    });
  } catch (error) {
    console.error('[acknowledgeTripCardPrinted]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});