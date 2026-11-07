import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, z } from '../../shared/validate.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';
import { requireFreshPasskey } from '../../shared/passkeys.ts';

/**
 * setPrivateMode — M-Care's Private Mode pauses or resumes the traveler's own pending safety check-ins.
 *
 * The browser used to pause them itself (SoloCheckIn.updateMany). Since check-ins became server-write-only, that
 * write was refused and the error swallowed, so Private Mode paused nothing and logged nothing. This does it as the
 * server, for the signed-in traveler's own check-ins only.
 *
 * Pausing switches help off, so a traveler with the Face ID lock must confirm it (requireFreshPasskey). Resuming
 * never needs a check: turning help back on is always allowed.
 */
const PAUSE_DAYS = 30;
const MAX_ROWS = 50;

const Body = strictObject({
  paused: z.boolean(),
  step_up: z.object({ challenge_id: z.string().max(100), response: z.object({}).passthrough() }).optional(),
});

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { paused, step_up } = await body<{ paused: boolean; step_up?: unknown }>();
  const email = String(user?.email || '').trim();
  if (!email) return err('Sign in to change Private Mode.', 401);

  if (paused) {
    const gate = await requireFreshPasskey(base44, user, 'pause_safety_checkins', step_up);
    if (!gate.ok) return gate.response;
  }

  const rows = await base44.asServiceRole.entities.SoloCheckIn
    .filter({ user_email: email, status: 'pending' }, '-created_date', MAX_ROWS);
  const until = paused ? new Date(Date.now() + PAUSE_DAYS * 24 * 60 * 60 * 1000).toISOString() : null;
  let changed = 0;
  for (const row of rows || []) {
    try {
      await base44.asServiceRole.entities.SoloCheckIn.update(row.id, { pause_until: until });
      changed++;
    } catch (e) {
      console.error('[setPrivateMode] could not update a check-in:', (e as Error)?.message);
    }
  }

  try {
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: paused ? 'safety_monitoring_paused' : 'safety_monitoring_resumed',
      actor_id: user?.id || email,
      actor_role: user?.role || 'client',
      actor_name: user?.full_name || '',
      actor_email: email,
      resource_type: 'User',
      resource_id: user?.id || '',
      resource_name: email,
      case_id: null,
      details: paused ? { paused_for_days: PAUSE_DAYS, check_ins: changed } : { check_ins: changed },
      sensitive: false,
      timestamp: new Date().toISOString(),
      prev_hash: await computePrevHash(base44),
    });
  } catch (e) {
    console.error('[setPrivateMode] audit entry failed (the change itself was saved):', (e as Error)?.message);
  }

  return ok({ paused, check_ins: changed });
}, { name: 'setPrivateMode', requireAuth: true, bodySchema: Body, rateLimit: { max: 20, windowSeconds: 600 } }));
