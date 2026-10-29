import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { canAdvanceNotification, type NotificationStatus } from '../../shared/incidentDispatch.ts';
import { appendAudit } from '../../shared/incidentEngine.ts';

/**
 * incidentChannelStatus — inbound provider delivery receipt (e.g. a Twilio
 * status callback).
 *
 * This is the ONLY path that may move a notification to DELIVERED. Without it
 * every row would stop at SENT, which is correct but incomplete: SENT means
 * "the carrier accepted it", DELIVERED means "it reached the handset". In an
 * emergency that difference is the whole question, so it is recorded only when
 * a provider actually says so.
 *
 * Auth: a shared secret header. Default-deny — if DISPATCH_WEBHOOK_SECRET is
 * not configured, every call is rejected rather than leaving the endpoint open.
 */
Deno.serve(async (req) => {
  try {
    const secret = Deno.env.get('DISPATCH_WEBHOOK_SECRET');
    const provided = req.headers.get('x-webhook-secret');
    if (!secret || !provided || provided !== secret) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const providerRef = body.MessageSid || body.message_sid || body.provider_ref;
    const rawStatus = String(body.MessageStatus || body.message_status || body.status || '').toLowerCase();

    if (!providerRef) return Response.json({ error: 'provider_ref is required' }, { status: 400 });

    const map: Record<string, NotificationStatus> = {
      delivered: 'DELIVERED',
      undelivered: 'FAILED',
      failed: 'FAILED',
      sent: 'SENT',
      queued: 'QUEUED',
    };
    const to = map[rawStatus];
    if (!to) return Response.json({ ok: true, ignored: rawStatus });

    const found = await base44.asServiceRole.entities.IncidentNotification
      .filter({ provider_ref: providerRef }, '-created_date', 1)
      .catch(() => []);

    const row = (found as any[])[0];
    if (!row) return Response.json({ ok: true, unmatched: true });

    const from = row.status as NotificationStatus;
    if (!canAdvanceNotification(from, to)) {
      return Response.json({ ok: true, refused: true, from, to });
    }

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status: to };
    if (to === 'DELIVERED') patch.delivered_at = now;
    if (to === 'FAILED') { patch.failed_at = now; patch.failure_reason = body.ErrorMessage || 'provider_reported_failure'; }

    await base44.asServiceRole.entities.IncidentNotification.update(row.id, patch);

    await appendAudit(base44, {
      incident_id: row.incident_id,
      patient_email: row.patient_email,
      subject_type: 'notification',
      subject_id: row.id,
      from_state: from,
      to_state: to,
      actor: 'provider_callback',
      actor_type: 'provider_callback',
      channel: row.channel,
      timestamp: now,
      evidence: { provider_ref: providerRef, provider_status: rawStatus },
    });

    return Response.json({ ok: true, from, to });
  } catch (error) {
    console.error('[incidentChannelStatus]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});