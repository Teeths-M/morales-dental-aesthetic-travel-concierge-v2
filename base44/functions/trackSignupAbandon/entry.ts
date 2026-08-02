import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { z, strictObject } from '../../shared/validate.ts';

/**
 * trackSignupAbandon — the write side of struggle-aware recovery for
 * pre-account signup flows. Called from signupDraft.js's trackSignupProgress()
 * each time a draft is saved AND a phone or email has just appeared in it —
 * not on every keystroke, not before there's any way to reach the person.
 *
 * Public (no session exists yet, mid-signup) but self-gated: bodySchema
 * rejects anything unexpected, and createHandler's default public rate
 * limit applies (no override needed — this fires at most once per step,
 * not per keystroke). Writes only via asServiceRole; SignupProgress has no
 * client-readable/writable RLS (see the entity file) — this function is
 * the only path in.
 */

const TrackSignupSchema = strictObject({
  phone: z.string().trim().max(32).optional().default(''),
  email: z.string().trim().toLowerCase().max(254).optional().default(''),
  flow: z.enum(['patient', 'doctor', 'travel_agency', 'taxi_service', 'companion', 'security_agency']),
  last_step_reached: z.string().trim().max(60).optional().default(''),
});

export default createHandler(async ({ base44, body }) => {
  const { phone, email, flow, last_step_reached } = await body<z.infer<typeof TrackSignupSchema>>();

  if (!phone && !email) {
    return err('phone or email is required');
  }

  const now = new Date().toISOString();
  const filterField = phone ? { phone } : { email };

  const existing = await base44.asServiceRole.entities.SignupProgress.filter(
    { ...filterField, flow },
    '-last_seen_at',
    1,
  ).catch(() => []);

  if (existing[0]) {
    await base44.asServiceRole.entities.SignupProgress.update(existing[0].id, {
      last_seen_at: now,
      last_step_reached: last_step_reached || existing[0].last_step_reached,
    });
  } else {
    await base44.asServiceRole.entities.SignupProgress.create({
      phone: phone || undefined,
      email: email || undefined,
      flow,
      last_step_reached,
      first_seen_at: now,
      last_seen_at: now,
    });
  }

  return ok({ tracked: true });
}, { name: 'trackSignupAbandon', requireAuth: false, bodySchema: TrackSignupSchema });
