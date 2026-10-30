import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import {
  createRequest,
  ensureBundle,
  isTripAssistanceEnabled,
  resolveTrip,
} from '../../shared/tripAssistanceEngine.ts';

/**
 * createTripAssistanceRequest — compose, show, then record the approval.
 *
 * Two passes over the same rules: `preview: true` composes the script and
 * returns it without writing anything, which is what the review screen shows
 * verbatim. The second call carries the text the traveller actually approved,
 * and the engine recomposes and compares — a mismatch is refused rather than
 * stored, so what is recorded is what was agreed.
 *
 * Tier 3 never reaches a script: it is a human, which is why nothing here can
 * turn a safety request into automated speech.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });

    if (!(await isTripAssistanceEnabled(base44))) {
      return Response.json({ error: 'Trip assistance is not switched on.', enabled: false }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const isAdmin = ['admin', 'platform_admin'].includes(String(user.role || ''));

    const ctx = await resolveTrip(base44, { trip_id: body?.trip_id, user });
    if (!ctx) return Response.json({ error: 'No trip to ask about yet.' }, { status: 404 });

    if (!isAdmin && ctx.patient_email !== String(user.email || '').toLowerCase()) {
      return Response.json({ error: 'That trip is not yours.' }, { status: 403 });
    }

    const bundle = await ensureBundle(base44, ctx);

    // A list that has not been approved cannot be behind a script: without it
    // there is nothing the traveller has agreed may be said if they go quiet.
    if (bundle.disclosure.approved !== true && !body?.preview) {
      return Response.json(
        {
          error: 'Approve your emergency disclosure list first — it decides what may be said if you cannot answer.',
          needs_disclosure: true,
        },
        { status: 409 },
      );
    }

    const result = await createRequest(base44, {
      ctx,
      bundle,
      user,
      body,
      preview: body?.preview === true,
    });

    return Response.json(result);
  } catch (error: any) {
    const message = error?.message || 'An internal error occurred.';
    console.error('[createTripAssistanceRequest]', message);
    const status = /not a category|not finished|changed before/.test(message) ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
});