import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, validate, z } from '../../shared/validate.ts';
import { STEP_UP_ACTIONS, allowedOrigins, rpFor } from '../../shared/passkeyRules.ts';
import {
  activePasskeys, beginAuthentication, beginRegistration, emailOf, finishRegistration, publicDevice, recordLockEvent,
  removePasskeys, requireFreshPasskey, verifyPasskeyAssertion,
} from '../../shared/passkeys.ts';

/**
 * managePasskeys — a traveler's own Face ID / fingerprint lock (base44/shared/passkeys.ts).
 *
 *   status          whether the lock is on, the phones that can unlock it, and whether it works on this web address
 *   register_begin  start setting up a passkey on this phone. Adding one when the lock is already on needs a fresh
 *                   check from an existing passkey first, so a thief holding an unlocked phone can't add their own.
 *   register_finish save the passkey after the phone made it
 *   auth_begin      a challenge for unlocking, or for a step-up before one named action
 *   unlock_finish   check an unlock
 *   remove          remove one passkey (needs a fresh check). Removing the last one turns the lock off.
 *
 * The first passkey needs no check, because there is nothing to check against yet. The owner gets an email whenever
 * the lock is turned on or off or a phone is added or removed, so a lock someone else set up is noticed.
 */
const StepUp = z.object({ challenge_id: z.string().max(100), response: z.object({}).passthrough() }).optional();
const WebAuthnResponse = z.object({ id: z.string().max(1024) }).passthrough();

const Body = z.discriminatedUnion('action', [
  strictObject({ action: z.literal('status'), origin: z.string().max(200).optional() }),
  strictObject({ action: z.literal('register_begin'), origin: z.string().max(200), step_up: StepUp }),
  strictObject({
    action: z.literal('register_finish'),
    challenge_id: z.string().max(100),
    response: WebAuthnResponse,
    device_label: z.string().max(80).optional(),
  }),
  strictObject({
    action: z.literal('auth_begin'),
    origin: z.string().max(200),
    purpose: z.enum(['unlock', 'step_up']),
    step_up_action: z.enum(STEP_UP_ACTIONS).optional(),
  }),
  strictObject({ action: z.literal('unlock_finish'), challenge_id: z.string().max(100), response: WebAuthnResponse }),
  strictObject({ action: z.literal('remove'), passkey_id: z.string().max(100), step_up: StepUp }),
]);

const NOT_HERE = "The Face ID lock doesn't work on this web address. Open M-Care at its usual address to use it.";

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const parsed = validate(Body, await body());
  if (!parsed.ok) return err(parsed.message, 400);
  const input: any = parsed.data;
  const email = emailOf(user);
  if (!email) return err('Your account has no email address.', 400);

  if (input.action === 'status') {
    const creds = await activePasskeys(base44, email);
    const origins = allowedOrigins({ PASSKEY_ORIGINS: Deno.env.get('PASSKEY_ORIGINS'), APP_URL: Deno.env.get('APP_URL') });
    const rp = rpFor(input.origin, origins);
    const here = rp ? creds.filter((c) => c.rp_id === rp.rpID) : [];
    return ok({
      enrolled: creds.length > 0,
      devices: creds.map(publicDevice),
      available_here: !!rp,
      // Passkeys made on this address, so the lock screen knows whether this phone can unlock at all. Their ids are
      // not secret (every unlock request lists them); the phone keeps them for an unlock while offline.
      usable_here: here.length > 0,
      credential_ids: here.map((c) => c.credential_id),
    });
  }

  if (input.action === 'register_begin') {
    const gate = await requireFreshPasskey(base44, user, 'add_device', input.step_up);
    if (!gate.ok) return gate.response;
    const started = await beginRegistration(base44, user, input.origin);
    if (!started.ok) return err(NOT_HERE, 400);
    return ok({ challenge_id: started.challenge_id, options: started.options });
  }

  if (input.action === 'register_finish') {
    const done = await finishRegistration(base44, user, input);
    if (!done.ok) {
      return err(done.code === 'challenge_expired'
        ? 'That took too long. Start again and confirm with Face ID or your fingerprint.'
        : "We couldn't save this passkey. Start again.", 400);
    }
    await recordLockEvent(base44, user, email, done.first ? 'phone_lock_enabled' : 'phone_lock_device_added',
      { device_label: done.device.device_label, backed_up: done.device.backed_up });
    return ok({ enrolled: true, device: done.device });
  }

  if (input.action === 'auth_begin') {
    if (input.purpose === 'step_up' && !input.step_up_action) return err('Say which action this check is for.', 400);
    const started = await beginAuthentication(base44, user, input.origin, input.purpose,
      input.purpose === 'step_up' ? input.step_up_action : null);
    if (!started.ok) {
      return err(started.code === 'made_on_another_address'
        ? "Your Face ID lock was set up on a different web address. Open M-Care at that address, or ask the care team to reset the lock."
        : NOT_HERE, 400);
    }
    if (!started.enrolled) return ok({ enrolled: false });
    return ok({ enrolled: true, challenge_id: started.challenge_id, options: started.options });
  }

  if (input.action === 'unlock_finish') {
    const result = await verifyPasskeyAssertion(base44, user, input, { purpose: 'unlock' });
    if (!result.ok) return err("That didn't unlock M-Care. Try again.", 403);
    return ok({ unlocked: true });
  }

  if (input.action === 'remove') {
    const creds = await activePasskeys(base44, email);
    const target = creds.find((c) => c.id === input.passkey_id);
    if (!target) return err('That phone is not on your lock.', 404);
    const gate = await requireFreshPasskey(base44, user, 'remove_device', input.step_up);
    if (!gate.ok) return gate.response;
    await removePasskeys(base44, [target], 'removed_by_traveler');
    const left = creds.length - 1;
    await recordLockEvent(base44, user, email, left ? 'phone_lock_device_removed' : 'phone_lock_disabled',
      { device_label: target.device_label || '' });
    return ok({ enrolled: left > 0, removed: target.id });
  }

  return err('Unknown action', 400);
}, { name: 'managePasskeys', requireAuth: true, rateLimit: { max: 40, windowSeconds: 300 } }));
