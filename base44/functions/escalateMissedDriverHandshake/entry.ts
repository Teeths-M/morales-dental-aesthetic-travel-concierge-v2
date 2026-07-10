import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../_shared/createHandler.ts';

// ── escalateMissedDriverHandshake — cron/scheduled function ──────────────────
// Runs every minute via Base44 scheduler.
// Finds pending driver handshakes where timeout_at < now (15-min window),
// marks them status=timeout, attempts to auto-assign a replacement driver
// from the TaxiService agency pool, fires a reroute SMS notification.
//
// Schedule (Base44 cron): */1 * * * *   (every minute)

// Outbound SMS (Twilio) — inline to avoid shared module issues in Base44
async function sendSms(to: string, message: string) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken  = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!accountSid || !authToken || !fromNumber) {
    return { ok: false, error: 'twilio_not_configured' };
  }
  const url  = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const form = new URLSearchParams({ To: to, From: fromNumber, Body: message });
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  const result = await resp.json().catch(() => ({}));
  return resp.ok ? { ok: true, sid: result.sid } : { ok: false, error: result.message || 'twilio_error' };
}

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduler (no user session) or admins
    let user = null;
    try { user = await base44.auth.me(); } catch (_) { /* scheduler context */ }
    if (user && !['admin', 'platform_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const nowIso = new Date().toISOString();

    // Find all pending driver handshakes whose timeout_at has passed
    // Primary filter: handshake_role=driver, status=pending
    const pendings = await base44.asServiceRole.entities.OfflineHandshake.filter({
      handshake_role: 'driver',
      status: 'pending',
    });

    // Secondary filter: timeout_at < now, not rerouted, and trip is NOT paused
    // isTripPaused: check TravelRequest.paused flag — suppress reroutes while paused
    async function isTripPaused(tripId) {
      if (!tripId) return false;
      try {
        const t = await base44.asServiceRole.entities.TravelRequest.get(tripId);
        return t?.paused === true;
      } catch (err) {
        console.error(`[escalateMissedDriverHandshake] Failed to check pause for trip ${tripId}:`, err?.message);
        return false; // Assume not paused — better to escalate than miss
      }
    }

    const timedOutRaw = (pendings || []).filter(
      (h) => !h.rerouted && h.timeout_at && h.timeout_at < nowIso
    );
    const pausedChecks = await Promise.all(timedOutRaw.map(h => isTripPaused(h.trip_id)));
    const timedOut = timedOutRaw.filter((_, i) => !pausedChecks[i]);

    if (!timedOut.length) {
      return Response.json({ success: true, timed_out_count: 0 });
    }

    // Load full TaxiService pool to find available replacement drivers
    // Filter to active drivers in the same city as the case (best-effort)
    const allDrivers = await base44.asServiceRole.entities.TaxiService.filter({
      status: 'active',
    }).catch(() => []);

    const results = [];
    for (const h of timedOut) {
      // Mark timed out (idempotent: rerouted guard prevents double-processing)
      await base44.asServiceRole.entities.OfflineHandshake.update(h.id, {
        status: 'timeout',
        escalated: true,
        escalated_at: nowIso,
        execution_result: 'primary_driver_timeout',
      });

      // Auto-assign: pick the first available driver that isn't the primary
      const replacement = allDrivers.find(
        (d) => d.id !== h.primary_driver_id && d.phone
      );

      let rerouteSmsSent  = false;
      let rerouteSmsError = 'no_replacement_found';
      let rerouteDriverId = null;

      if (replacement) {
        rerouteDriverId = replacement.id;

        // Mark rerouted on the original handshake
        await base44.asServiceRole.entities.OfflineHandshake.update(h.id, {
          rerouted: true,
          reroute_driver_id: replacement.id,
          reroute_triggered_at: nowIso,
        });

        // Fire reroute SMS to replacement driver
        const reroute = await sendSms(
          replacement.phone,
          `Morales dispatch: driver reassignment. Please confirm pickup for checkpoint ${h.checkpoint_id || h.id}.` +
          ` Reply: HANDSHAKE ${h.checkpoint_id || h.id}`
        );
        rerouteSmsSent  = reroute.ok;
        rerouteSmsError = reroute.ok ? null : reroute.error;

        // Also SMS the backup_driver if set and different from replacement
        if (h.backup_driver_phone && h.backup_driver_phone !== replacement.phone) {
          await sendSms(
            h.backup_driver_phone,
            `Morales backup alert: primary driver missed checkpoint ${h.checkpoint_id || ''}. Replacement en route.`
          ).catch(() => {});
        }
      } else if (h.backup_driver_phone) {
        // No replacement found in pool — fall back to the pre-designated backup
        const fallback = await sendSms(
          h.backup_driver_phone,
          `Morales dispatch: primary driver missed checkpoint ${h.checkpoint_id || ''}. Please confirm pickup.` +
          ` Reply: HANDSHAKE ${h.checkpoint_id || h.id}`
        );
        rerouteSmsSent  = fallback.ok;
        rerouteSmsError = fallback.ok ? null : fallback.error;
        await base44.asServiceRole.entities.OfflineHandshake.update(h.id, {
          rerouted: true,
          reroute_driver_id: h.backup_driver_id || 'backup_phone',
          reroute_triggered_at: nowIso,
        });
      }

      // Audit: DispatchFailureLog for dashboard visibility
      await base44.asServiceRole.entities.DispatchFailureLog.create({
        case_id: h.case_id || 'unknown',
        pipeline_stage: 'handshake_timeout_reroute',
        provider_type: 'chauffeur',
        provider_name: h.primary_driver_id || 'primary_driver',
        dispatch_type: 'sms',
        error_message: `Driver handshake ${h.checkpoint_id || h.id} timed out after 15 min. Reroute: ${rerouteDriverId || 'none'}.`,
        status: rerouteSmsSent ? 'rerouted' : 'pending_intervention',
        logged_at: nowIso,
      });

      await base44.asServiceRole.entities.NotificationLog.create({
        case_id: h.case_id || 'unknown',
        notification_type: 'sms',
        recipient_role: 'vendor',
        recipient_identifier: replacement?.phone || h.backup_driver_phone || 'none',
        event_trigger: 'escalateMissedDriverHandshake',
        suppressed_payload: {
          checkpoint_id: h.checkpoint_id,
          handshake_type: h.handshake_type,
          reroute_driver_id: rerouteDriverId,
          sms_sent: rerouteSmsSent,
          sms_error: rerouteSmsError,
        },
        logged_at: nowIso,
      });

      results.push({
        handshake_id: h.checkpoint_id || h.id,
        case_id: h.case_id,
        handshake_type: h.handshake_type,
        reroute_driver_id: rerouteDriverId,
        reroute_sms_sent: rerouteSmsSent,
        reroute_sms_error: rerouteSmsError,
      });
    }

    return Response.json({
      success: true,
      timed_out_count: timedOut.length,
      results,
    });

  } catch (err) {
    console.error('[escalateMissedDriverHandshake]', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}, { name: 'escalateMissedDriverHandshake', requireAuth: false }));
