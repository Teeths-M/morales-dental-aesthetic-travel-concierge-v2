import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { closeAsFalseAlarm } from '../../shared/tripCardEngine.ts';
import { FALSE_ALARM_REASONS } from '../../shared/tripCard.ts';

/**
 * closeTripFalseAlarm — the only exit from a live request.
 *
 * Guarded by three things, all of them someone else's:
 *   • a human actually spoke to the traveller or the guardian, with a time
 *   • a reason code, because a false alarm is usually a card the traveller did
 *     not understand — which is a card you can fix
 *   • the driver has NOT already arrived. If he has, confirming in person beats
 *     a phone call and he is already there.
 *
 * If the care team cannot reach anyone, this refuses and the request stays open
 * at one live offer. "Could not reach them" is not a closure.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch(() => null);
    if (!user || !['admin', 'platform_admin'].includes(user.role)) {
      return Response.json({ error: 'Only the care team can close a request.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const cardId = String(body.card_id || '').trim();
    if (!cardId) return Response.json({ error: 'card_id is required' }, { status: 400 });

    const card = await base44.asServiceRole.entities.TripEmergencyCard.get(cardId).catch(() => null);
    if (!card) return Response.json({ error: 'Card not found' }, { status: 404 });

    const now = new Date().toISOString();
    const result = await closeAsFalseAlarm(base44, {
      card,
      contactParty: String(body.contact_party || ''),
      contactMethod: String(body.contact_method || ''),
      contactAt: String(body.contact_at || ''),
      reasonCode: String(body.reason_code || ''),
      notes: body.notes ? String(body.notes) : null,
      actor: user.email,
      now,
    });

    if (!result.ok) return Response.json({ error: result.error }, { status: 409 });

    return Response.json({
      success: true,
      withdrawn_offer_id: result.withdrawn_offer_id || null,
      assignment_fee_recorded_usd: result.fee_recorded_usd || 0,
      note: 'The recall fee is recorded against the driver for payout. No funds were moved by this action.',
      reasons: FALSE_ALARM_REASONS.map((r) => r.code),
    });
  } catch (error) {
    console.error('[closeTripFalseAlarm]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});