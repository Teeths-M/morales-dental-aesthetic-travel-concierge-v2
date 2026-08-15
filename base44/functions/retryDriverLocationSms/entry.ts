import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';

// retryDriverLocationSms — scheduled (runs every minute via a Base44 automation
// or the safety-cron GitHub Actions tier). For each RecoveryTransportRequest
// that has a driver assigned AND a driver_location_token but the driver
// hasn't started sharing yet:
//   - at 3 minutes after dispatch: send the driver a second SMS
//     ("Your passenger is waiting. Tap to share your location: [url]").
//   - at 5 minutes after dispatch: alert the M-Care care team (admin email)
//     to call the driver directly.
// PRD §3 (SMS Retry + Reminder). Dedup via driver_share_reminder_sent_at and
// driver_share_care_team_alerted_at on the RecoveryTransportRequest.

export default createHandler(async ({ req, base44 }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const now = new Date();
  const appUrl = Deno.env.get('APP_URL') || 'https://morales.app';
  const adminEmail = Deno.env.get('ADMIN_EMAIL') || '';
  const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
  const twilioAuth = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
  const twilioFrom = Deno.env.get('TWILIO_PHONE_NUMBER') || '';

  // Fetch recent driver-assigned transports (last 15 min) — filter in code since
  // RecoveryTransportRequest.filter doesn't reliably support $exists across all
  // operators. We pull recent rows and check driver_location_token presence here.
  let transports: any[] = [];
  try {
    transports = await base44.asServiceRole.entities.RecoveryTransportRequest.filter({}, '-created_at', 50) || [];
  } catch (_) { transports = []; }

  const cutoffMs = now.getTime() - 15 * 60 * 1000;
  const active = transports.filter((t) =>
    t.driver_location_token &&
    t.driver_phone &&
    t.dispatched_at &&
    new Date(t.dispatched_at).getTime() >= cutoffMs &&
    ['driver_assigned', 'dispatched', 'en_route', 'requested'].includes(t.status),
  );

  let remindersSent = 0;
  let careAlertsSent = 0;

  for (const t of active) {
    const dispatchedMs = new Date(t.dispatched_at).getTime();
    const minutesSince = (now.getTime() - dispatchedMs) / 60000;

    // Has the driver started sharing? Resolve the LiveLocationRequest.
    let driverStarted = false;
    try {
      const reqs = await base44.asServiceRole.entities.LiveLocationRequest.filter({ token: t.driver_location_token }, '-created_at', 1);
      const dr = reqs?.[0];
      driverStarted = dr?.status === 'active' || dr?.last_shared_at != null;
    } catch (_) { driverStarted = false; }

    if (driverStarted) continue; // nothing to do — driver is sharing

    // ── 3-minute reminder SMS ───────────────────────────────────────────────
    if (minutesSince >= 3 && minutesSince < 5 && !t.driver_share_reminder_sent_at) {
      const shareUrl = `${appUrl}/share-location/${t.driver_location_token}`;
      const smsBody = `MORALES: Your passenger is waiting. Tap to share your live location so they can see you approaching: ${shareUrl}`;
      if (twilioSid && twilioAuth && twilioFrom) {
        try {
          await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
            method: 'POST',
            headers: {
              Authorization: 'Basic ' + btoa(`${twilioSid}:${twilioAuth}`),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ From: twilioFrom, To: t.driver_phone, Body: smsBody }),
          });
          remindersSent++;
        } catch (_) { /* best-effort */ }
      }
      try { await base44.asServiceRole.entities.RecoveryTransportRequest.update(t.id, { driver_share_reminder_sent_at: now.toISOString() }); } catch (_) {}
    }

    // ── 5-minute care-team alert ────────────────────────────────────────────
    if (minutesSince >= 5 && !t.driver_share_care_team_alerted_at) {
      if (adminEmail) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'Morales Safety — Driver Share Alert',
            to: adminEmail,
            subject: `Driver hasn't shared location — call them (${t.driver_name || 'Driver'})`,
            body: `<div style="font-family:sans-serif;max-width:560px;padding:24px;border:2px solid #f59e0b;border-radius:12px;">
<p style="margin:0 0 8px;color:#b45309;font-weight:700;">⚠️ Driver hasn't started location sharing 5+ minutes after dispatch</p>
<table style="width:100%;border-collapse:collapse;">
<tr><td style="padding:4px 0;color:#6b7280;">Traveler</td><td>${t.user_name || ''}</td></tr>
<tr><td style="padding:4px 0;color:#6b7280;">Driver</td><td>${t.driver_name || ''} — ${t.driver_phone || ''}</td></tr>
<tr><td style="padding:4px 0;color:#6b7280;">Ride ID</td><td>${t.id}</td></tr>
<tr><td style="padding:4px 0;color:#6b7280;">Dispatched</td><td>${t.dispatched_at}</td></tr>
</table>
<p style="margin-top:12px;color:#374151;">Please call the driver directly and ask them to tap the share link in their SMS.</p>
</div>`,
          });
          careAlertsSent++;
        } catch (_) { /* best-effort */ }
      }
      try { await base44.asServiceRole.entities.RecoveryTransportRequest.update(t.id, { driver_share_care_team_alerted_at: now.toISOString() }); } catch (_) {}
    }
  }

  return ok({ checked: active.length, reminders_sent: remindersSent, care_alerts_sent: careAlertsSent });
}, { name: 'retryDriverLocationSms', requireAuth: false });