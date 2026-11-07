import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, z } from '../../shared/validate.ts';
import { activePasskeys, publicDevice, recordLockEvent, removePasskeys } from '../../shared/passkeys.ts';

/**
 * adminResetPhoneLock — the care team removes a traveler's Face ID lock, for a traveler who lost the phone the lock
 * lives on (or whose passkey doesn't sync to their new phone).
 *
 *   lookup: { user_email }          the traveler's active passkeys
 *   reset:  { user_email, reason }  removes them all; a reason is required and recorded
 *
 * Confirm it really is the traveler before resetting (a call to the number on their trip, not a message from the
 * phone that may have been stolen). The traveler gets an email saying the lock was reset.
 */
const Body = z.discriminatedUnion('action', [
  strictObject({ action: z.literal('lookup'), user_email: z.string().trim().email().max(254) }),
  strictObject({
    action: z.literal('reset'),
    user_email: z.string().trim().email().max(254),
    reason: z.string().trim().min(5, 'Say why the lock is being reset.').max(500),
  }),
]);

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const input: any = await body();
  const email = String(input.user_email).toLowerCase();
  const creds = await activePasskeys(base44, email);

  if (input.action === 'lookup') {
    return ok({ user_email: email, enrolled: creds.length > 0, devices: creds.map(publicDevice) });
  }

  if (!creds.length) return err('This traveler has no Face ID lock to reset.', 404);
  await removePasskeys(base44, creds, `reset_by_care_team: ${input.reason}`);
  await recordLockEvent(base44, user, email, 'phone_lock_reset', { reason: input.reason, removed: creds.length });
  return ok({ reset: true, removed: creds.length });
}, {
  name: 'adminResetPhoneLock',
  requireAuth: true,
  allowedRoles: ['admin', 'platform_admin'],
  bodySchema: Body,
}));
