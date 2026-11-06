import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, z } from '../../shared/validate.ts';
import { cleanPushSubscription } from '../../shared/pushSubscription.ts';

/**
 * registerPushSubscription — saves this browser's push subscription for the
 * signed-in user.
 *
 * Before this, the browser saved UserPushSubscription records itself, and
 * the rules let anyone signed in create one with someone else's id or email.
 * sendPushNotification sends to every record matching a user's id or email,
 * so that person's notifications would also reach the other phone. Now the
 * record is written only here, and the id and email always come from the
 * session.
 *
 * One subscription per user, as before: a new device replaces the old one.
 * Any other record carrying this user's id or email is removed, which also
 * clears one made under their name before this fix.
 */

const bodySchema = strictObject({
  subscription: z.string().min(2).max(4000),
  user_agent: z.string().max(512).optional(),
});

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { subscription, user_agent } = await body<{ subscription: string; user_agent?: string }>();
  const clean = cleanPushSubscription(subscription);
  if (!clean) return err('That push subscription is not valid.');

  const subs = base44.asServiceRole.entities.UserPushSubscription;
  const fields = {
    user_id: user.id,
    user_email: user.email,
    subscription: JSON.stringify(clean),
    user_agent: (user_agent || '').slice(0, 512),
  };

  const [byId, byEmail] = await Promise.all([
    subs.filter({ user_id: user.id }, '-created_date', 50).catch(() => []),
    user.email ? subs.filter({ user_email: user.email }, '-created_date', 50).catch(() => []) : [],
  ]);
  const mine = (byId || []).find((s: any) => s.user_email === user.email) || null;

  let savedId: string;
  if (mine) {
    await subs.update(mine.id, fields);
    savedId = mine.id;
  } else {
    savedId = (await subs.create(fields)).id;
  }

  const strays = [...(byId || []), ...(byEmail || [])].filter((s: any) => s.id !== savedId);
  const seen = new Set<string>();
  for (const s of strays) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    await subs.delete(s.id).catch(() => {});
  }

  return ok({ saved: true, removed: seen.size });
}, { name: 'registerPushSubscription', requireAuth: true, bodySchema }));
