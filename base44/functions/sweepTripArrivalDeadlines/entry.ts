import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { breachArrivalDeadlines, purgeExpiredScans } from '../../shared/tripCardEngine.ts';

/**
 * sweepTripArrivalDeadlines — runs every minute alongside the offer sweep.
 *
 * Two jobs:
 *   1. Breach any ACCEPTED offer whose arrival deadline has passed. The
 *      accepting driver is marked missed and superseded but stays ACCEPTED and
 *      fully tracked, the care team is paged, and the next driver is offered.
 *   2. Delete scan rows past their 24-hour retention boundary, so nothing about
 *      a bystander outlives the shift.
 *
 * It cannot accept an offer, cannot resolve an incident, and cannot skip the
 * ranking — everything it does goes through the same dispatch engine.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    if (!(await cronAuthorized(req, base44))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date().toISOString();

    const breaches = await breachArrivalDeadlines(base44, now);
    const purged = await purgeExpiredScans(base44, now);

    return Response.json({
      success: true,
      breached: breaches.length,
      detail: breaches,
      scans_purged: purged,
    });
  } catch (error) {
    console.error('[sweepTripArrivalDeadlines]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});