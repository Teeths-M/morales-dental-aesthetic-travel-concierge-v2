import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import webPush from 'npm:web-push@3.6.7';
import { createHandler } from '../_shared/createHandler.ts';

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    // Allow admin users OR internal service-to-service calls (no auth header = system call)
    const user = await base44.auth.me().catch(() => null);
    const isSystem = !user; // called from another edge function (MedGuard, SOS, etc.)
    if (!isSystem && user?.role !== 'admin' && user?.role !== 'platform_admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { user_id, user_email, title, body, url, urgent, tag } = await req.json();

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
}, { name: 'sendPushNotification', requireAuth: false }));
