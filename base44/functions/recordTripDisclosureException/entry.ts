import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import {
  isTripAssistanceEnabled,
  recordDisclosureException,
} from '../../shared/tripAssistanceEngine.ts';

/**
 * recordTripDisclosureException — the guard on the emergency exception.
 *
 * When the traveller cannot answer, a human may say only what is on the
 * approved standing list. Anything beyond it has to be written down first: what
 * will be disclosed, why it cannot wait, and which named human is accountable —
 * and the row is created before the words are spoken, not after. An exception
 * that is recorded afterwards is a note about something that already happened to
 * someone's privacy.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });

    if (!['admin', 'platform_admin'].includes(String(user.role || ''))) {
      return Response.json({ error: 'Care-team access required.' }, { status: 403 });
    }

    if (!(await isTripAssistanceEnabled(base44))) {
      return Response.json({ enabled: false, error: 'Trip assistance is not switched on.' });
    }

    const body = await req.json().catch(() => ({}));

    // The standing list, if supplied, lets the engine say "that is already
    // allowed" instead of demanding an exception for something approved.
    const disclosure = body?.trip_id
      ? (await base44.asServiceRole.entities.TripEmergencyDisclosure
          .filter({ trip_id: String(body.trip_id) }, '-version', 1)
          .catch(() => []))?.[0] || null
      : null;

    const result = await recordDisclosureException(base44, {
      user,
      body: { ...body, disclosure },
    });

    return Response.json(result);
  } catch (error: any) {
    const message = error?.message || 'An internal error occurred.';
    console.error('[recordTripDisclosureException]', message);
    const status = /reason|authoris|authoriz|disclosed|incident/i.test(message) ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
});