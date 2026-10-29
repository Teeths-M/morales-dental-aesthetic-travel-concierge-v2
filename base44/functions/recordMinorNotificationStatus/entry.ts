import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { isMinorReunificationEnabled } from '../../shared/featureFlags.ts';
import { advanceNotification } from '../../shared/minorReunificationEngine.ts';
import { canAdvanceMinorNotification, type MinorNotificationStatus } from '../../shared/minorReunification.ts';

/**
 * recordMinorNotificationStatus — the only writer of DELIVERED, ACKNOWLEDGED
 * and ANSWERED.
 *
 * Two distinct authorities, deliberately kept apart:
 *   • A PROVIDER callback (Twilio delivery receipt, Retell call event) proves
 *     DELIVERED and, for a live call, ANSWERED. It may NOT claim a human
 *     acknowledged a message — only a person can do that.
 *   • An authenticated care-team member may record ACKNOWLEDGED or ANSWERED
 *     after actually speaking to the guardian or group leader.
 *
 * This separation is the whole reason a row can't quietly jump from SENT to
 * "acknowledged" without a human: the provider path is fenced off from it, and
 * the human path requires a real session.
 *
 * Gated by MINOR_REUNIFICATION_WEBHOOK_SECRET (query string or header), because
 * a delivery receipt that anyone can post is a delivery receipt that means
 * nothing.
 */
const PROVIDER_ALLOWED: MinorNotificationStatus[] = ['DELIVERED', 'ANSWERED', 'FAILED'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    if (!(await isMinorReunificationEnabled(base44))) {
      return Response.json({ error: 'This module is not enabled.' }, { status: 404 });
    }

    const url = new URL(req.url);
    const provided = req.headers.get('x-reunification-secret') || url.searchParams.get('secret') || '';
    const expected = Deno.env.get('MINOR_REUNIFICATION_WEBHOOK_SECRET') || '';

    const isProvider = !!expected && provided === expected;

    let user: any = null;
    if (!isProvider) {
      user = await base44.auth.me().catch(() => null);
      if (!user) return Response.json({ error: 'Not authorised.' }, { status: 401 });
      if (user.role !== 'admin' && user.role !== 'platform_admin') {
        return Response.json({ error: 'Only the care team can record a notification outcome.' }, { status: 403 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const notificationId = body.notification_id ? String(body.notification_id) : '';
    const to = String(body.status || '') as MinorNotificationStatus;

    if (!notificationId) return Response.json({ error: 'A notification id is required.' }, { status: 400 });
    if (!to) return Response.json({ error: 'A status is required.' }, { status: 400 });

    const row = await base44.asServiceRole.entities.MinorNotification
      .get(notificationId)
      .catch(() => null);
    if (!row) return Response.json({ error: 'Notification not found.' }, { status: 404 });

    // A provider may never claim a human acknowledgement or answer on a
    // messaging channel — only DELIVERED is its to write there.
    if (isProvider && !PROVIDER_ALLOWED.includes(to)) {
      return Response.json(
        { error: `A provider callback cannot set ${to}. Only a care-team member can record that.`, code: 'provider_cannot_assert_human_state' },
        { status: 403 },
      );
    }

    if (!canAdvanceMinorNotification(row.status as MinorNotificationStatus, to, row.channel)) {
      return Response.json(
        {
          error: `${row.status} cannot become ${to} on a ${row.channel} notification.`,
          code: 'illegal_notification_transition',
        },
        { status: 409 },
      );
    }

    const at = new Date().toISOString();
    const result = await advanceNotification(base44, {
      row,
      to,
      at,
      providerRef: body.provider_ref ? String(body.provider_ref) : null,
      answeredBy: body.answered_by ? String(body.answered_by) : (isProvider ? null : (user?.email || null)),
      note: body.note ? String(body.note).slice(0, 500) : null,
    });

    if (!result.ok) {
      return Response.json({ error: 'That transition is not allowed.', code: result.code }, { status: 409 });
    }

    return Response.json({
      notification_id: row.id,
      status: to,
      recorded_at: at,
      by: isProvider ? 'provider_callback' : 'care_team',
    });
  } catch (error) {
    console.error('[recordMinorNotificationStatus]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});