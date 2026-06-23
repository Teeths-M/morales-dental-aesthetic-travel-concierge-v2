import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── pollActiveTripFlights — cron/scheduled function ───────────────────────────
// Runs every 5 minutes via Base44 scheduler.
// Schedule (Base44 cron): */5 * * * *
//
// For every TravelRequest with a flight_number and non-terminal status
// (scheduled | delayed | in_progress) within the 24-hour polling window:
//   - Calls checkFlightStatus (mock in stub mode, real FlightStats when live)
//   - On status -> "delayed":
//       * Recalculates ETA = scheduled_arrival + delay_minutes
//       * Pushes updated pickup_time to linked TripLog (driver record)
//       * Fires SMS notification to patient
//   - On status -> "in_progress":
//       * Triggers cacheWelcomePayload so offline welcome is ready at landing
//   - On status -> "landed":
//       * Triggers cacheWelcomePayload if not already cached
//       * Fires welcome notification to patient

// Inline Twilio SMS (scheduler has no user session, cannot call sendSmsNotification)
async function sendSms(to, body) {
  const sid  = Deno.env.get('TWILIO_ACCOUNT_SID');
  const auth = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !auth || !from) return { ok: false, error: 'twilio_not_configured' };

  const url  = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const form = new URLSearchParams({ To: to, From: from, Body: body });
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${sid}:${auth}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  const result = await resp.json().catch(() => ({}));
  return resp.ok ? { ok: true, sid: result.sid } : { ok: false, error: result.message };
}

// Inline flight check (mirrors checkFlightStatus mock — avoids HTTP self-call)
function inferFlightStatus(scheduledArrivalIso) {
  const minsToArrival = (new Date(scheduledArrivalIso).getTime() - Date.now()) / 60_000;
  if (minsToArrival < 0)   return 'landed';
  if (minsToArrival < 30)  return 'in_progress';
  if (minsToArrival < 120) return 'in_progress';
  return 'scheduled';
  // LIVE: replace with FlightStats API call — see checkFlightStatus/entry.ts for full stub
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Scheduler has no user session
    let user = null;
    try { user = await base44.auth.me(); } catch (_) { /* scheduler */ }
    if (user && !['admin', 'platform_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now     = new Date();
    const nowIso  = now.toISOString();
    // Only poll flights scheduled to depart within the next 24 hours (± 12 from now)
    const windowStart = new Date(now.getTime() - 12 * 3600_000).toISOString();
    const windowEnd   = new Date(now.getTime() + 24 * 3600_000).toISOString();

    // Load active trips with flight numbers
    const allTrips = await base44.asServiceRole.entities.TravelRequest.filter({
      package_status: 'confirmed',
    }).catch(() => []);

    const activeTrips = (allTrips || []).filter(t =>
      t.flight_number &&
      ['scheduled', 'delayed', 'in_progress'].includes(t.flight_status || 'scheduled') &&
      t.scheduled_departure >= windowStart &&
      t.scheduled_departure <= windowEnd
    );

    const results = [];

    for (const trip of activeTrips) {
      const prevStatus = trip.flight_status || 'scheduled';
      const newStatus  = inferFlightStatus(trip.scheduled_arrival || trip.scheduled_departure);
      const changed    = prevStatus !== newStatus;

      // Always update last_checked; only write other fields on status change
      const updatePayload = { last_checked: nowIso };
      if (changed) updatePayload.flight_status = newStatus;

      // ── PAUSE GUARD: suppress all notifications while journey is paused ────
      // Timings are still tracked so recalculateTripTimings can shift them on resume.
      if (trip.paused) {
        await base44.asServiceRole.entities.TravelRequest.update(trip.id, updatePayload);
        results.push({ trip_id: trip.id, flight: trip.flight_number, skipped: 'trip_paused' });
        continue;
      }

      // ── DELAYED ─────────────────────────────────────────────────────────
      // LIVE: delay_minutes comes from FlightStats API; mock uses 0 for now
      if (newStatus === 'delayed' && prevStatus !== 'delayed') {
        const delayMin = trip.delay_minutes || 45;  // mock 45-min delay; live: use API value
        const originalArrival = new Date(trip.scheduled_arrival || trip.scheduled_departure);
        const updatedArrival  = new Date(originalArrival.getTime() + delayMin * 60_000);
        updatePayload.delay_minutes = delayMin;

        await base44.asServiceRole.entities.TravelRequest.update(trip.id, updatePayload);

        // Update linked TripLog pickup_time (driver record)
        const tripLogs = await base44.asServiceRole.entities.TripLog.filter({
          consultation_id: trip.id,
        }).catch(() => []);
        for (const log of tripLogs) {
          await base44.asServiceRole.entities.TripLog.update(log.id, {
            pickup_time: updatedArrival.toISOString(),
            special_notes: `[AUTO] Pickup rescheduled: flight ${trip.flight_number} delayed ${delayMin} min. New arrival ~${updatedArrival.toLocaleString()}.`,
          }).catch(() => {});
        }

        // SMS patient
        if (trip.user_phone) {
          const smsBody = `Morales update: Flight ${trip.flight_number} is delayed ${delayMin} min. ` +
            `New estimated arrival: ${updatedArrival.toLocaleString('en-US', { timeStyle: 'short', dateStyle: 'short' })}. ` +
            `Your driver has been notified. — Morales Concierge`;
          await sendSms(trip.user_phone, smsBody).catch(() => {});
        }

        await base44.asServiceRole.entities.NotificationLog.create({
          channel: 'sms',
          case_id: trip.id,
          recipient_type: 'traveler',
          recipient_phone: trip.user_phone || '',
          recipient_email: trip.user_email || '',
          message_type: 'general',
          status: trip.user_phone ? 'sent' : 'no_phone',
          notes: `Flight delay notification: ${trip.flight_number} +${delayMin}min`,
          created_at: nowIso,
        }).catch(() => {});
      }

      // ── IN_PROGRESS — pre-cache welcome before landing ──────────────────
      else if (newStatus === 'in_progress' && prevStatus === 'scheduled' && !trip.welcome_cached_at) {
        await base44.asServiceRole.entities.TravelRequest.update(trip.id, updatePayload);
        // Trigger welcome pre-cache (best-effort; frontend also does this)
        await base44.functions.invoke('cacheWelcomePayload', {
          trip_id: trip.id,
          trigger: 'in_progress_poller',
        }).catch((e) => console.error('[pollActiveTripFlights] cacheWelcomePayload error:', e.message));
      }

      // ── LANDED ──────────────────────────────────────────────────────────
      else if (newStatus === 'landed' && prevStatus !== 'landed') {
        await base44.asServiceRole.entities.TravelRequest.update(trip.id, updatePayload);

        // Ensure welcome payload is cached (in case in_progress was missed)
        if (!trip.welcome_cached_at) {
          await base44.functions.invoke('cacheWelcomePayload', {
            trip_id: trip.id,
            trigger: 'landed_poller',
          }).catch(() => {});
        }

        // Welcome SMS
        if (trip.user_phone) {
          const welcomeSms = `Welcome to ${trip.destination_city || 'your destination'}! ` +
            `Your driver ${trip.driver_name || 'your Morales driver'} is waiting. ` +
            `Check the Morales app for your full welcome briefing. — Morales Concierge`;
          await sendSms(trip.user_phone, welcomeSms).catch(() => {});
        }

        await base44.asServiceRole.entities.NotificationLog.create({
          channel: 'sms',
          case_id: trip.id,
          recipient_type: 'traveler',
          recipient_phone: trip.user_phone || '',
          recipient_email: trip.user_email || '',
          message_type: 'welcome',
          status: trip.user_phone ? 'sent' : 'no_phone',
          notes: `Landed welcome notification for ${trip.flight_number}`,
          created_at: nowIso,
        }).catch(() => {});
      }

      // No status change — just bump last_checked
      else {
        await base44.asServiceRole.entities.TravelRequest.update(trip.id, updatePayload);
      }

      results.push({
        trip_id: trip.id,
        flight: trip.flight_number,
        prev_status: prevStatus,
        new_status: newStatus,
        changed,
      });
    }

    return Response.json({
      success: true,
      polled: activeTrips.length,
      results,
      polled_at: nowIso,
    });

  } catch (err) {
    console.error('[pollActiveTripFlights]', err);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});
