import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { reportLostOrStolen } from '../../shared/tripCardSetEngine.ts';

/**
 * reportTripCardLostStolen — replace exactly one card.
 *
 * The traveller names the card, because there are two and a mis-tap would revoke
 * the one still in their bag. Then the two events stay distinct:
 *
 *   lost   — the card stays live and a replacement is issued. A dropped card that
 *            a stranger picks up and scans is the product working, not a breach:
 *            the token can only raise an emergency, and a false alarm is closed
 *            for the cost of one assignment fee.
 *   stolen — the card is revoked, then replaced.
 *
 * Three live cards per trip, then a care-team review. No lost card is a risk
 * decision, so nothing here waits on a human — right up until the cap, which is
 * the one place a human genuinely has to look.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const tripCardId = String(body?.trip_card_id || '').trim();
    const instanceId = String(body?.instance_id || '').trim();
    const action = String(body?.action || '').trim();

    if (!tripCardId || !instanceId) {
      return Response.json({ error: 'Choose which card this is about.' }, { status: 400 });
    }
    if (action !== 'lost' && action !== 'stolen') {
      return Response.json({ error: "Choose 'lost' or 'stolen'." }, { status: 400 });
    }

    const card = await base44.asServiceRole.entities.TripEmergencyCard.get(tripCardId).catch(() => null);
    if (!card) return Response.json({ error: 'That trip card set could not be found.' }, { status: 404 });
    if (card.revoked) return Response.json({ error: 'This card set has been revoked.' }, { status: 409 });

    const isAdmin = ['admin', 'platform_admin'].includes(String(user.role || ''));
    if (!isAdmin && String(card.patient_email || '').toLowerCase() !== String(user.email || '').toLowerCase()) {
      return Response.json({ error: 'That trip card set is not yours.' }, { status: 403 });
    }

    const instance = await base44.asServiceRole.entities.TripCardInstance.get(instanceId).catch(() => null);

    const result = await reportLostOrStolen(base44, {
      card,
      instance,
      action,
      actor: user.email,
      now: new Date().toISOString(),
    });

    if (!result.ok) {
      return Response.json({ error: result.error, blocked: !!result.blocked }, { status: result.blocked ? 409 : 400 });
    }

    return Response.json({
      success: true,
      replacement: {
        instance_id: result.replacement.instance_id,
        short_ref: result.replacement.short_ref,
        local_number: result.replacement.local_number,
        action: result.replacement.action,
        replaced_ref: result.replacement.replaced_ref,
      },
    });
  } catch (error) {
    console.error('[reportTripCardLostStolen]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});