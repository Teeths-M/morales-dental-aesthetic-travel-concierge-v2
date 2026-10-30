import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import {
  ensureBundle,
  isTripAssistanceEnabled,
  resolveTrip,
} from '../../shared/tripAssistanceEngine.ts';

/**
 * approveTripDisclosureList — the traveller's own signature on the list.
 *
 * Only the traveller can do this, and only for their own trip. A care-team
 * member cannot approve a standing list on someone's behalf: the entire value of
 * the list is that the person it protects wrote it while calm, and an approval
 * taken by staff would be the same judgement call under pressure this design
 * exists to remove.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });

    if (!(await isTripAssistanceEnabled(base44))) {
      return Response.json({ enabled: false, error: 'Trip assistance is not switched on.' });
    }

    const body = await req.json().catch(() => ({}));
    const ctx = await resolveTrip(base44, { trip_id: body?.trip_id, user });
    if (!ctx) return Response.json({ error: 'No trip to approve yet.' }, { status: 404 });

    if (ctx.patient_email !== String(user.email || '').toLowerCase()) {
      return Response.json({ error: 'Only the traveller can approve this list.' }, { status: 403 });
    }

    const { disclosure } = await ensureBundle(base44, ctx);

    // A newer version on the record means the list changed after the traveller
    // read it. Approving the old text would sign something they never saw.
    if (body?.version && Number(body.version) !== Number(disclosure.version || 1)) {
      return Response.json(
        { error: 'This list changed while you were reading it. Please check it again.' },
        { status: 409 },
      );
    }

    const updated = await base44.asServiceRole.entities.TripEmergencyDisclosure.update(disclosure.id, {
      approved: true,
      approved_at: new Date().toISOString(),
      approved_by: user.email,
    });

    return Response.json({
      disclosure: {
        id: updated.id,
        approved: true,
        approved_at: updated.approved_at,
        version: updated.version,
        fields: updated.fields || [],
      },
    });
  } catch (error) {
    console.error('[approveTripDisclosureList]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});