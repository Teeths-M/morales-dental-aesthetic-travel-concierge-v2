import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import {
  isTripAssistanceEnabled,
  recordOutcome,
} from '../../shared/tripAssistanceEngine.ts';

/**
 * recordTripAssistanceOutcome — what the care team actually got back.
 *
 * Admin-only, because this is the care team's own account of a call. It writes
 * the traveller-facing line from the structured fields only: the summary is
 * assembled from attempt, agreement and next step, never from a reading of the
 * conversation, so a status screen cannot invent reassurance.
 *
 * One retry, then a human owns it — enforced here rather than left to whoever is
 * on shift, because "we'll try again" is how a request sits open all night.
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
    if (!body?.request_id) return Response.json({ error: 'Which request?' }, { status: 400 });

    const updated = await recordOutcome(base44, {
      request_id: String(body.request_id),
      user,
      attempt_status: body.attempt_status,
      agreement: body.agreement,
      outcome_notes: body.outcome_notes,
      next_step: body.next_step,
      close: body.close === true,
    });

    return Response.json({
      request: {
        id: updated.id,
        status: updated.status,
        attempt_status: updated.attempt_status,
        agreement: updated.agreement,
        retry_used: updated.retry_used === true,
        next_step: updated.next_step,
        summary_text: updated.summary_text,
      },
    });
  } catch (error: any) {
    const message = error?.message || 'An internal error occurred.';
    console.error('[recordTripAssistanceOutcome]', message);
    return Response.json({ error: message }, { status: 500 });
  }
});