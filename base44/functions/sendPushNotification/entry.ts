import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import webPush from 'npm:web-push@3.6.7';
import { createHandler } from '../_shared/createHandler.ts';
import { internalOrAdminAuthorized } from '../_shared/internalAuth.ts';

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_id, user_email, title, body, url, urgent, tag, internal_secret } = await req.json();

    // SECURITY: pushes arbitrary title/body/url to any target user's device —
    // a fully anonymous caller must never pass this check. Absence of a user
    // session is NOT evidence of a legitimate internal caller (that was the
    // bug here); require either an admin session or the shared internal
    // secret used by other edge functions that invoke this one.
    if (!(await internalOrAdminAuthorized(internal_secret, base44))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      return Response.json({ error: 'VAPID keys not configured. Run: npx web-push generate-vapid-keys and add to secrets.' }, { status: 500 });
    }

    webPush.setVapidDetails(
      'mailto:admin@moralesdentalandaesthetics.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    // Look up subscriptions by user_id or user_email
    const filter = user_id ? { user_id } : { user_email };
    const subs = await base44.asServiceRole.entities.UserPushSubscription.filter(filter);

    if (!subs || subs.length === 0) {
      return Response.json({ skipped: true, reason: 'No push subscriptions found for user' });
    }

    const payload = JSON.stringify({ title, body, url: url || '/admin', urgent: urgent || false, tag: tag || 'morales' });
    const results = { sent: [], failed: [] };

    for (const sub of subs) {
      try {
        const parsed = typeof sub.subscription === 'string' ? JSON.parse(sub.subscription) : sub.subscription;
        await webPush.sendNotification(parsed, payload);
        results.sent.push(sub.id);
      } catch (e) {
        // If subscription is expired/invalid (410), clean it up
        if (e.statusCode === 410) {
          await base44.asServiceRole.entities.UserPushSubscription.delete(sub.id).catch(() => {});
        }
        results.failed.push({ id: sub.id, error: e.message });
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
// Internal service-to-service call only (internalOrAdminAuthorized) — not
// public traffic in the same sense as a form submission.
}, { name: 'sendPushNotification', requireAuth: false, rateLimit: false }));
