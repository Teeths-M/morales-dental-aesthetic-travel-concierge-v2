import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, validate, z } from '../../shared/validate.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';
import { MAX_PBKDF2_ITERATIONS } from '../../shared/pinHashing.ts';
import { checkCheckInCode, findCheckInCode, hashCheckInCode, isCheckInCode, newSalt } from '../../shared/checkInCode.ts';

/**
 * manageCheckInCode — a traveler sets or changes their own check-in code and duress code (checkInCode.ts).
 *
 *   status: whether a code is set, and when.
 *   set:    { code, duress_code, current_code? } — both 4 digits and different. Changing an existing code needs the
 *           current one, so someone holding an unlocked phone can't quietly replace it. Never the duress code: that
 *           would let a thief who forced it out change the codes.
 *
 * The codes are only ever stored as hashes, and never returned.
 */
const Body = z.discriminatedUnion('action', [
  strictObject({ action: z.literal('status') }),
  strictObject({
    action: z.literal('set'),
    code: z.string(),
    duress_code: z.string(),
    current_code: z.string().optional(),
  }),
]);

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const parsed = validate(Body, await body());
  if (!parsed.ok) return err(parsed.message, 400);
  const input = parsed.data;
  const email = String(user!.email || '').trim().toLowerCase();
  if (!email) return err('Your account has no email address.', 400);

  const existing = await findCheckInCode(base44, email);
  if (input.action === 'status') {
    return ok({ has_code: !!existing, set_at: existing?.set_at || null });
  }

  if (!isCheckInCode(input.code) || !isCheckInCode(input.duress_code)) {
    return err('Both codes must be exactly 4 digits.', 400);
  }
  if (input.code === input.duress_code) {
    return err('Your duress code must be different from your check-in code.', 400);
  }

  if (existing) {
    const check = await checkCheckInCode(base44, email, input.current_code);
    if (check === 'locked') return err('Too many wrong codes. Try again in 30 minutes.', 429);
    if (check !== 'valid') return err('Enter your current check-in code to change it.', 403);
  }

  const now = new Date().toISOString();
  const codeSalt = newSalt();
  const duressSalt = newSalt();
  const record = {
    user_email: email,
    user_id: user!.id || '',
    code_hash: await hashCheckInCode(input.code, codeSalt, MAX_PBKDF2_ITERATIONS),
    code_salt: codeSalt,
    duress_hash: await hashCheckInCode(input.duress_code, duressSalt, MAX_PBKDF2_ITERATIONS),
    duress_salt: duressSalt,
    iterations: MAX_PBKDF2_ITERATIONS,
    set_at: now,
    failed_attempts: 0,
    locked_until: null,
  };
  if (existing) await base44.asServiceRole.entities.CheckInCode.update(existing.id, record);
  else await base44.asServiceRole.entities.CheckInCode.create(record);

  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'checkin_code_set',
    actor_id: user!.id || email,
    actor_role: user!.role || 'client',
    actor_name: user!.full_name || '',
    actor_email: email,
    resource_type: 'CheckInCode',
    resource_id: existing?.id || '',
    details: { changed: !!existing },
    sensitive: true,
    timestamp: now,
    prev_hash: await computePrevHash(base44),
  }).catch((e: any) => console.error('[manageCheckInCode] audit failed:', e?.message));

  return ok({ has_code: true, set_at: now, changed: !!existing });
}, { name: 'manageCheckInCode', requireAuth: true, rateLimit: { max: 10, windowSeconds: 600 } }));
