import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { computePrevHash } from '../../shared/auditHashChain.ts';
import { createHandler } from '../../shared/createHandler.ts';

// ── recalculateTripTimings ────────────────────────────────────────────────────
// Triggered by manageTripPause on resume.
// Shifts ALL time-sensitive fields forward by the pause duration so no
// partner is penalized for time spent paused.
//
// Fields shifted:
//   TravelRequest.scheduled_arrival       + duration_minutes
//   OfflineHandshake.timeout_at (pending) + duration_minutes
//   TripLog.pickup_time                   + duration_minutes
//   RecoverySession.checkins[].scheduled_at (pending) + duration_minutes
//
// After recalculation: notifies driver/clinic/hotel by email (SMS stub).
// Marks PauseEvent.timings_recalculated = true on success.

function shiftIso(isoStr, minutes) {
  if (!isoStr) return isoStr;
  return new Date(new Date(isoStr).getTime() + minutes * 60_000).toISOString();
}

async function sendSms(to, body) {
  const sid  = Deno.env.get('TWILIO_ACCOUNT_SID');
  const auth = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !auth || !from) return { ok: false, error: 'twilio_not_configured' };
  const url  = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const form = new URLSearchParams({ To: to, From: from, Body: body });
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${auth}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const r = await resp.json().catch(() => ({}));
  return resp.ok ? { ok: true, sid: r.sid } : { ok: false, error: r.message };
}

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    const { trip_id, duration_minutes, pause_event_id } = await req.json();
    if (!trip_id || !duration_minutes) {
      return Response.json({ error: 'trip_id and duration_minutes required' }, { status: 400 });
    }
    if (duration_minutes <= 0) {
      return Response.json({ success: true, skipped: 'duration_minutes <= 0' });
    }

    const nowIso  = new Date().toISOString();
    const shifted = [];

    // ── 1. Shift TravelRequest.scheduled_arrival ─────────────────────────────
    const trip = await base44.asServiceRole.entities.TravelRequest.get(trip_id).catch(() => null);
    if (!trip) return Response.json({ error: 'Trip not found' }, { status: 404 });

    // SECURITY: `user && !allowedRoles.includes(...)` used to SKIP this check
    // entirely when user was null (no session) since `user && ...` short-
    // circuits to false — the same bug pattern already found and fixed in
    // escalateMissedDriverHandshake/pollActiveTripFlights. The correct
    // replacement here is an ownership check, not cronAuthorized, since the
    // real (and only) caller is manageTripPause, which forwards the acting
    // patient's/admin's own session and already runs this identical check
    // on itself before invoking this function.
    const isAdmin = !!user && ['admin', 'platform_admin', 'coordinator'].includes(user.role);
    if (!user || (!isAdmin && trip.user_email !== user.email && trip.user_id !== user.id)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (trip) {
      const updates = {};
      if (trip.scheduled_arrival) updates.scheduled_arrival = shiftIso(trip.scheduled_arrival, duration_minutes);
      if (trip.scheduled_departure) updates.scheduled_departure = shiftIso(trip.scheduled_departure, duration_minutes);
      if (Object.keys(updates).length) {
        await base44.asServiceRole.entities.TravelRequest.update(trip_id, updates);
        shifted.push({ entity: 'TravelRequest', id: trip_id, fields: Object.keys(updates) });
      }
    }

    // ── 2. Shift pending OfflineHandshake.timeout_at ─────────────────────────
    const handshakes = await base44.asServiceRole.entities.OfflineHandshake.filter({
      trip_id,
      status: 'pending',
    }).catch(() => []);
    for (const h of handshakes) {
      if (!h.timeout_at) continue;
      await base44.asServiceRole.entities.OfflineHandshake.update(h.id, {
        timeout_at: shiftIso(h.timeout_at, duration_minutes),
      }).catch(() => {});
      shifted.push({ entity: 'OfflineHandshake', id: h.id, checkpoint_id: h.checkpoint_id });
    }

    // ── 3. Shift TripLog.pickup_time ─────────────────────────────────────────
    const tripLogs = await base44.asServiceRole.entities.TripLog.filter({
      consultation_id: trip_id,
    }).catch(() => []);
    for (const log of tripLogs) {
      if (!log.pickup_time || log.status === 'completed' || log.status === 'cancelled') continue;
      const newPickup = shiftIso(log.pickup_time, duration_minutes);
      await base44.asServiceRole.entities.TripLog.update(log.id, {
        pickup_time: newPickup,
        special_notes: `[AUTO-RESUME] Pickup rescheduled +${duration_minutes}min (journey was paused). New pickup: ${newPickup}.`,
      }).catch(() => {});
      shifted.push({ entity: 'TripLog', id: log.id, new_pickup_time: newPickup });
    }

    // ── 4. Shift RecoverySession pending check-in schedule ───────────────────
    // Match via patient email from TravelRequest
    if (trip) {
      const sessions = await base44.asServiceRole.entities.RecoverySession.filter({
        patient_email: trip.user_email,
        is_active: true,
      }).catch(() => []);
      for (const s of sessions) {
        if (!s.checkins || !s.checkins.length) continue;
        const newCheckins = s.checkins.map(c => {
          if (c.status !== 'pending' || !c.scheduled_at) return c;
          return { ...c, scheduled_at: shiftIso(c.scheduled_at, duration_minutes) };
        });
        await base44.asServiceRole.entities.RecoverySession.update(s.id, { checkins: newCheckins }).catch(() => {});
        shifted.push({ entity: 'RecoverySession', id: s.id });
      }
    }

    // ── 5. Notify partners of updated timings ─────────────────────────────────
    // Driver
    if (trip?.chauffeur_id) {
      const driver = await base44.asServiceRole.entities.TaxiService.get(trip.chauffeur_id).catch(() => null);
      if (driver?.phone) {
        await sendSms(driver.phone,
          `Morales update: Patient journey resumed after ${duration_minutes}min pause. ` +
          `All pickup times have been shifted forward by ${duration_minutes} minutes. Please check your schedule.`
        ).catch(() => {});
      }
      if (driver?.email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'Morales Concierge',
          to: driver.email,
          subject: `Schedule Update — Patient Journey Resumed (+${duration_minutes}min shift)`,
          body: `<p>The patient's journey has resumed after a ${duration_minutes}-minute pause. All your scheduled pickup times have been shifted forward by ${duration_minutes} minutes.</p><p>Please review your updated schedule in the Morales Driver Portal.</p>`,
        }).catch(() => {});
      }
    }

    // Travel Agency
    if (trip?.travel_agency_id) {
      const agency = await base44.asServiceRole.entities.TravelAgency.get(trip.travel_agency_id).catch(() => null);
      if (agency?.email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'Morales Concierge',
          to: agency.email,
          subject: `Itinerary Update — Journey Resumed (+${duration_minutes}min)`,
          body: `<p>Patient journey for ${trip.user_name || trip.user_email} has resumed. All itinerary timings shifted +${duration_minutes} minutes due to a pause period.</p>`,
        }).catch(() => {});
      }
    }

    // Mark PauseEvent as recalculated
    if (pause_event_id) {
      await base44.asServiceRole.entities.PauseEvent.update(pause_event_id, {
        timings_recalculated: true,
      }).catch(() => {});
    }

    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'trip_timings_recalculated',
      resource_type: 'travel_request',
      resource_id: trip_id,
      actor_id: user?.id || 'system',
      actor_name: user?.email || 'recalculateTripTimings',
      case_id: '',
      details: { trip_id, duration_minutes, shifted_count: shifted.length, shifted },
      sensitive: false,
      timestamp: nowIso,
      prev_hash: await computePrevHash(base44),
    }).catch(() => {});

    return Response.json({
      success: true,
      trip_id,
      duration_minutes,
      shifted_count: shifted.length,
      shifted,
      recalculated_at: nowIso,
    });

  } catch (err) {
    console.error('[recalculateTripTimings]', err);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'recalculateTripTimings', requireAuth: false }));
