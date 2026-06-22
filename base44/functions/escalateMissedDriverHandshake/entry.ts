import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Outbound Twilio SMS — inline (shared functions/_shared folder breaks Base44 deploys)
async function sendSms(to, message) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!accountSid || !authToken || !fromNumber) return { ok: false, error: 'twilio_not_configured' };

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const form = new URLSearchParams();
  form.append('To', to);
  form.append('From', fromNumber);
  form.append('Body', message);

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  const result = await resp.json().catch(() => ({}));
  if (!resp.ok) return { ok: false, error: result.message || 'twilio_error' };
  return { ok: true, sid: result.sid };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled automation (no user context) or admins only.
    let user = null;
    try { user = await base44.auth.me(); } catch (_) { /* automation context */ }
    if (user && user.role !== 'admin' && user.role !== 'platform_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const thresholdMin = Number(body.threshold_minutes) > 0 ? Number(body.threshold_minutes) : 15;
    const cutoff = new Date(Date.now() - thresholdMin * 60000).toISOString();

    // Pending DRIVER handshakes, not yet escalated, older than the threshold.
    const pendings = await base44.asServiceRole.entities.OfflineHandshake.filter({
      handshake_role: 'driver',
      status: 'pending',
    });
    const stale = (pendings || []).filter(
      (h) => !h.escalated && (h.created_date || h.received_at || '') < cutoff
    );

    const results = [];
    for (const h of stale) {
      const nowIso = new Date().toISOString();

      // Mark primary driver missed + escalated (idempotent guard via `escalated`).
      await base44.asServiceRole.entities.OfflineHandshake.update(h.id, {
        status: 'escalated',
        escalated: true,
        escalated_at: nowIso,
        execution_result: 'primary_driver_missed',
      });

      // Notify backup driver by SMS, if we have a number.
      let smsSent = false;
      let smsError = null;
      if (h.backup_driver_phone) {
        try {
          const r = await sendSms(
            h.backup_driver_phone,
            `Morales dispatch: primary driver missed checkpoint ${h.checkpoint_id || ''}. Please confirm pickup by replying: DRIVER ${h.checkpoint_id || ''}`
          );
          smsSent = r.ok;
          smsError = r.ok ? null : r.error;
        } catch (e) {
          smsError = e.message;
        }
      } else {
        smsError = 'no_backup_driver_phone';
      }

      // Audit: dispatch failure (needs human attention) + notification record.
      await base44.asServiceRole.entities.DispatchFailureLog.create({
        case_id: h.case_id || 'unknown',
        pipeline_stage: 'sms_handshake_escalation',
        provider_type: 'chauffeur',
        provider_name: h.primary_driver_id || 'primary_driver',
        dispatch_type: 'sms',
        error_message: `Primary driver missed SMS handshake for checkpoint ${h.checkpoint_id || '?'} after ${thresholdMin}m`,
        status: 'pending_intervention',
        logged_at: nowIso,
      });

      await base44.asServiceRole.entities.NotificationLog.create({
        case_id: h.case_id || 'unknown',
        notification_type: 'sms',
        recipient_role: 'vendor',
        recipient_identifier: h.backup_driver_phone || 'none',
        event_trigger: 'escalateMissedDriverHandshake',
        suppressed_payload: { checkpoint_id: h.checkpoint_id, sms_sent: smsSent, sms_error: smsError },
        logged_at: nowIso,
      });

      results.push({ handshake_id: h.id, checkpoint_id: h.checkpoint_id, sms_sent: smsSent, sms_error: smsError });
    }

    return Response.json({ success: true, escalated_count: results.length, threshold_minutes: thresholdMin, results });
  } catch (error) {
    console.error('[escalate] error:', error.message);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
});