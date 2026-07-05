import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { computePrevHash } from '../_shared/auditHashChain.ts';

// ── manageTripPause ───────────────────────────────────────────────────────────
// Handles pause and resume of the patient journey.
//
// Actions:
//   pause  — sets TravelRequest.paused=true, records paused_at + reason
//   resume — sets paused=false, records resumed_at, computes duration,
//            creates PauseEvent audit record, triggers recalculateTripTimings
//
// While paused, ALL outbound notifications from Tasks 1-3 are suppressed:
//   - Flight delay/landed alerts   (pollActiveTripFlights)
//   - Driver handshake reroutes    (escalateMissedDriverHandshake)
//   - Recovery anomaly alerts      (checkRecoveryAnomaly)
//   - Missed check-in reminders    (checkMissedRecoveryCheckins)
// Each of those functions checks trip.paused / isPatientTripPaused() before firing.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, trip_id, reason } = await req.json();
    if (!action || !trip_id) {
      return Response.json({ error: 'action and trip_id required' }, { status: 400 });
    }

    const trip = await base44.asServiceRole.entities.TravelRequest.get(trip_id);
    if (!trip) return Response.json({ error: 'Trip not found' }, { status: 404 });

    // Ownership check — patient or admin
    const isAdmin = ['admin', 'platform_admin', 'coordinator'].includes(user.role);
    if (!isAdmin && trip.user_email !== user.email && trip.user_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const nowIso = new Date().toISOString();

    // ── PAUSE ────────────────────────────────────────────────────────────────
    if (action === 'pause') {
      if (trip.paused) {
        return Response.json({ success: false, message: 'Trip is already paused', paused_at: trip.paused_at });
      }
      await base44.asServiceRole.entities.TravelRequest.update(trip_id, {
        paused:       true,
        paused_at:    nowIso,
        pause_reason: reason?.trim() || 'No reason provided',
        resumed_at:   null,
      });
      await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'trip_paused',
        resource_type: 'travel_request',
        resource_id: trip_id,
        actor_id: user.id,
        actor_name: user.full_name || user.email,
        case_id: '',
        details: { trip_id, reason: reason || '', paused_at: nowIso },
        sensitive: false,
        timestamp: nowIso,
        prev_hash: await computePrevHash(base44),
      }).catch(() => {});

      return Response.json({ success: true, action: 'paused', paused_at: nowIso, reason: reason || '' });
    }

    // ── RESUME ───────────────────────────────────────────────────────────────
    if (action === 'resume') {
      if (!trip.paused) {
        return Response.json({ success: false, message: 'Trip is not currently paused' });
      }

      const pausedAtMs     = trip.paused_at ? new Date(trip.paused_at).getTime() : Date.now();
      const durationMin    = Math.max(0, Math.round((Date.now() - pausedAtMs) / 60_000));

      await base44.asServiceRole.entities.TravelRequest.update(trip_id, {
        paused:     false,
        resumed_at: nowIso,
      });

      // Immutable audit record (read by Task 5 journey log)
      const pauseEvent = await base44.asServiceRole.entities.PauseEvent.create({
        trip_id,
        user_id:          user.id,
        user_email:       user.email,
        paused_at:        trip.paused_at || nowIso,
        resumed_at:       nowIso,
        duration_minutes: durationMin,
        reason:           trip.pause_reason || '',
        timings_recalculated: false,
      });

      await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'trip_resumed',
        resource_type: 'travel_request',
        resource_id: trip_id,
        actor_id: user.id,
        actor_name: user.full_name || user.email,
        case_id: '',
        details: { trip_id, duration_minutes: durationMin, paused_at: trip.paused_at, resumed_at: nowIso },
        sensitive: false,
        timestamp: nowIso,
        prev_hash: await computePrevHash(base44),
      }).catch(() => {});

      // Trigger timing recalculation (best-effort — frontend also calls when online)
      await base44.functions.invoke('recalculateTripTimings', {
        trip_id,
        duration_minutes: durationMin,
        pause_event_id:   pauseEvent.id,
      }).catch((e) => console.error('[manageTripPause] recalculate error:', e.message));

      return Response.json({
        success: true,
        action: 'resumed',
        resumed_at: nowIso,
        duration_minutes: durationMin,
        pause_event_id: pauseEvent.id,
      });
    }

    return Response.json({ error: 'Invalid action. Use: pause | resume' }, { status: 400 });

  } catch (err) {
    console.error('[manageTripPause]', err);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});
