import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { dispatchSecurityForCheckIn } from '../../shared/dispatchSecurityForCheckIn.ts';

// dispatchSoloSecurity — the 5h-tier cron sweep for unresponsive solo
// travelers. The actual per-check-in dispatch logic (find next untried
// agency, real confirmable OfflineHandshake, 15-min timeout before trying
// the next one, loud failure if every agency is exhausted) now lives in
// base44/shared/dispatchSecurityForCheckIn.ts — extracted so
// requestGuardianSecurityCheck can trigger the exact same verified dispatch
// immediately, without waiting for this 5h sweep or touching SoloCheckIn.status.
//
// Runs on the same GitHub Actions safety cron as every other life-safety job
// (cronAuthorized, not an admin session).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    if (!(await cronAuthorized(req, base44))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const escalated5h = await base44.asServiceRole.entities.SoloCheckIn.filter(
      { status: 'escalated_5h' },
      '-scheduled_time',
      50
    );

    let dispatched = 0, confirmed = 0, failed = 0;

    for (const checkIn of escalated5h) {
      const result = await dispatchSecurityForCheckIn(base44, checkIn);
      if (result.outcome === 'dispatched') dispatched++;
      else if (result.outcome === 'confirmed') confirmed++;
      else if (result.outcome === 'failed') failed++;
    }

    return Response.json({ dispatched, confirmed, failed, checked: escalated5h.length });
  } catch (error) {
    console.error('[dispatchSoloSecurity]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});
