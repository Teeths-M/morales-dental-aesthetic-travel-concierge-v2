import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../_shared/cronAuth.ts';
import webPush from 'npm:web-push@3.6.7';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Cron secret OR admin session. This endpoint had NO guard at all: it is
    // reachable over HTTP like every deployed function, so anyone with the URL
    // could drive it — triggering real notifications, spend and state changes.
    // NOTE: a Base44-dashboard schedule driving this must send X-Cron-Secret.
    if (!(await cronAuthorized(req, base44))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { data, old_data } = await req.json();

    // Only fire when status changes from 'pending' -> 'confirmed'
    if (!old_data || old_data.status !== 'pending' || data.status !== 'confirmed') {
      return Response.json({ skipped: true, reason: 'Not a pending→confirmed transition' });
    }

    const clientEmail = data.email;
    if (!clientEmail) {
      return Response.json({ skipped: true, reason: 'No client email on consultation' });
    }

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      return Response.json({ error: 'VAPID keys not configured' }, { status: 500 });
    }

    webPush.setVapidDetails(
      'mailto:admin@moralesdentalandaesthetics.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    const subs = await base44.asServiceRole.entities.UserPushSubscription.filter({ user_email: clientEmail });

    if (!subs || subs.length === 0) {
      return Response.json({ skipped: true, reason: 'No push subscriptions found for client' });
    }

    const payload = JSON.stringify({
      title: '✅ Consultation Approved!',
      body: `Your consultation for ${data.procedure_interest || 'your procedure'} has been approved. Check your dashboard for next steps.`,
      url: '/dashboard',
    });

    const results = { sent: [], failed: [] };

    for (const sub of subs) {
      try {
        const parsed = typeof sub.subscription === 'string' ? JSON.parse(sub.subscription) : sub.subscription;
        await webPush.sendNotification(parsed, payload);
        results.sent.push(sub.id);
      } catch (e) {
        if (e.statusCode === 410) {
          await base44.asServiceRole.entities.UserPushSubscription.delete(sub.id).catch(() => {});
        }
        results.failed.push({ id: sub.id, error: e.message });
      }
    }

    return Response.json({ success: true, client: clientEmail, results });
  } catch (error) {
    // BUG-R11-02 FIX: SEC-10
    console.error('[notifyClientConsultationApproved]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});