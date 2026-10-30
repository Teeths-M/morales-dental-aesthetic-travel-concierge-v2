import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { isFeatureEnabled } from '../../shared/featureFlags.ts';
import { TRIP_CARD_SET_FLAG } from '../../shared/tripCardSet.ts';
import { sweepReadiness } from '../../shared/tripCardSetEngine.ts';

/**
 * sweepTripCardReadiness — the trigger the readiness check needed.
 *
 * Without it, "did they print it" is a screen nobody opens. 72 hours before the
 * first flight, an unacknowledged card set gets chased: an email with the PDF
 * ATTACHED (the channel that actually reaches everyone, with no app and no push
 * credentials required), an in-app notification that stays in front of them on the
 * trip screen, push if it happens to be wired, and a message to the person on call
 * rather than a row in an admin console.
 *
 * One reminder per readiness cycle. A retried sweep cannot chase twice, and if the
 * trip moves the cycle key moves with it.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    if (!(await cronAuthorized(req, base44))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!(await isFeatureEnabled(base44, TRIP_CARD_SET_FLAG, false))) {
      return Response.json({ skipped: true, reason: 'module_disabled', reminded: 0 });
    }

    const now = new Date().toISOString();
    const reminded = await sweepReadiness(base44, now);

    return Response.json({
      swept_at: now,
      reminded: reminded.length,
      detail: reminded,
    });
  } catch (error) {
    console.error('[sweepTripCardReadiness]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});