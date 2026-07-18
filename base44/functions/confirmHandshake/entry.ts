import { createHandler } from '../_shared/createHandler.ts';
import { computePrevHash } from '../_shared/auditHashChain.ts';

// ── confirmHandshake ──────────────────────────────────────────────────────────
// Single entry-point for all handshake state transitions.
//
// Actions:
//   create        — opens a new pending handshake, sets timeout_at = now + 15 min
//   tap_confirm   — patient/driver taps in-app; accepts GPS coords
//   sms_confirm   — called internally by processTwilioHandshake after SMS parse
//   get           — read a single handshake by checkpoint_id
//   list          — list all handshakes for a case
//
// Offline reconciliation:
//   The frontend writes to the local queue first (offlineHandshakeQueue.js),
//   then calls this function when online. Pass offline_packet_id so the
//   record can be matched to its queue entry for deduplication.

const TIMEOUT_MINUTES = 15;

function shortId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(5)))
    .map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
    // `const body = await body()` shadowed the destructured `body` parameter
    // and referenced it in its own initializer — a temporal dead zone
    // ReferenceError on every single invocation, so this function could never
    // succeed. Renamed the local.
    const payload = await body();
    const { action } = payload;

    // ── CREATE ──────────────────────────────────────────────────────────────
    if (action === 'create') {
      const {
        case_id, trip_id, handshake_type, primary_driver_id,
        primary_driver_phone, backup_driver_id, backup_driver_phone,
        patient_email, patient_name,
      } = payload;

      if (!handshake_type) {
        return Response.json({ error: 'handshake_type required' }, { status: 400 });
      }

      const checkpointId = `HS_${shortId()}`;
      const now = new Date();
      const timeoutAt = new Date(now.getTime() + TIMEOUT_MINUTES * 60_000).toISOString();

      const record = await base44.asServiceRole.entities.OfflineHandshake.create({
        case_id: case_id || '',
        trip_id: trip_id || '',
        patient_email: patient_email || '',
        patient_name: patient_name || '',
        channel: 'sms',              // default; confirmed channel written on confirmation
        handshake_role: 'driver',
        handshake_type,
        checkpoint_id: checkpointId,
        status: 'pending',
        timeout_at: timeoutAt,
        primary_driver_id: primary_driver_id || '',
        primary_driver_phone: primary_driver_phone || '',
        backup_driver_id: backup_driver_id || '',
        backup_driver_phone: backup_driver_phone || '',
        escalated: false,
        rerouted: false,
        received_at: now.toISOString(),
      });

      await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'handshake_created',
        actor_id: user.id,
        actor_role: user.role,
        actor_name: user.full_name || user.email,
        resource_type: 'offline_handshake',
        resource_id: record.id,
        case_id: case_id || '',
        details: { handshake_type, checkpoint_id: checkpointId, timeout_at: timeoutAt },
        sensitive: false,
        timestamp: now.toISOString(),
        prev_hash: await computePrevHash(base44),
      });

      return Response.json({
        success: true,
        handshake_id: checkpointId,
        record_id: record.id,
        status: 'pending',
        timeout_at: timeoutAt,
        sms_confirmation_text: `HANDSHAKE ${checkpointId}`,
      });
    }

    // ── TAP_CONFIRM ──────────────────────────────────────────────────────────
    if (action === 'tap_confirm') {
      const { checkpoint_id, gps_lat, gps_lng, gps_accuracy_m, offline_packet_id } = payload;
      if (!checkpoint_id) return Response.json({ error: 'checkpoint_id required' }, { status: 400 });

      const records = await base44.asServiceRole.entities.OfflineHandshake.filter({
        checkpoint_id,
      });
      if (!records.length) {
        return Response.json({ error: 'Handshake not found' }, { status: 404 });
      }
      const h = records[0];

      if (user.role === 'doctor') {
        // Doctors can only confirm handshakes for cases assigned to them
        if (h.assigned_doctor_id && h.assigned_doctor_id !== user.id) {
          return Response.json({ error: 'Unauthorized — this handshake is not assigned to you' }, { status: 403 });
        }
      }

      if (h.status !== 'pending') {
        return Response.json({ error: `Cannot confirm — handshake is already ${h.status}` }, { status: 409 });
      }

      const now = new Date().toISOString();
      const updated = await base44.asServiceRole.entities.OfflineHandshake.update(h.id, {
        status: 'completed',
        method: 'tap',
        confirmed_by: user.id,
        confirmed_by_name: user.full_name || user.email,
        gps_lat: gps_lat ?? null,
        gps_lng: gps_lng ?? null,
        gps_accuracy_m: gps_accuracy_m ?? null,
        completed_at: now,
        executed: true,
        executed_at: now,
        offline_packet_id: offline_packet_id || null,
      });

      await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'handshake_tap_confirmed',
        actor_id: user.id,
        actor_role: user.role,
        actor_name: user.full_name || user.email,
        resource_type: 'offline_handshake',
        resource_id: h.id,
        case_id: h.case_id || '',
        details: {
          checkpoint_id,
          handshake_type: h.handshake_type,
          gps_lat, gps_lng,
          offline_packet_id: offline_packet_id || null,
        },
        sensitive: false,
        timestamp: now,
        prev_hash: await computePrevHash(base44),
      });

      return Response.json({ success: true, status: 'confirmed', method: 'tap', confirmed_at: now });
    }

    // ── SMS_CONFIRM — called internally by processTwilioHandshake ────────────
    if (action === 'sms_confirm') {
      const { checkpoint_id, from_phone, message_sid } = payload;
      if (!checkpoint_id) return Response.json({ error: 'checkpoint_id required' }, { status: 400 });

      // Idempotency: if same Twilio MessageSid arrives twice, skip
      if (message_sid) {
        const existing = await base44.asServiceRole.entities.OfflineHandshake.filter({ message_sid });
        if (existing.length) {
          return Response.json({ success: true, status: 'already_confirmed', idempotent: true });
        }
      }

      const records = await base44.asServiceRole.entities.OfflineHandshake.filter({ checkpoint_id });
      if (!records.length) return Response.json({ error: 'Handshake not found' }, { status: 404 });
      const h = records[0];
      if (h.status !== 'pending') {
        return Response.json({ error: `Cannot confirm — handshake is already ${h.status}` }, { status: 409 });
      }

      const now = new Date().toISOString();
      await base44.asServiceRole.entities.OfflineHandshake.update(h.id, {
        status: 'completed',
        method: 'sms',
        confirmed_by: from_phone || 'unknown_phone',
        from_phone: from_phone || '',
        message_sid: message_sid || '',
        completed_at: now,
        executed: true,
        executed_at: now,
      });

      await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'handshake_sms_confirmed',
        resource_type: 'offline_handshake',
        resource_id: h.id,
        case_id: h.case_id || '',
        actor_id: 'twilio_webhook',
        actor_role: 'system',
        actor_name: `SMS from ${from_phone}`,
        details: { checkpoint_id, from_phone, message_sid },
        sensitive: false,
        timestamp: now,
        prev_hash: await computePrevHash(base44),
      });

      return Response.json({ success: true, status: 'confirmed', method: 'sms', confirmed_at: now });
    }

    // ── GET ──────────────────────────────────────────────────────────────────
    if (action === 'get') {
      const { checkpoint_id } = payload;
      if (!checkpoint_id) return Response.json({ error: 'checkpoint_id required' }, { status: 400 });
      const records = await base44.asServiceRole.entities.OfflineHandshake.filter({ checkpoint_id });
      if (!records.length) return Response.json({ error: 'Not found' }, { status: 404 });
      return Response.json({ success: true, handshake: records[0] });
    }

    // ── LIST ─────────────────────────────────────────────────────────────────
    if (action === 'list') {
      const { case_id, trip_id } = payload;
      const filter = case_id ? { case_id } : trip_id ? { trip_id } : null;
      if (!filter) return Response.json({ error: 'case_id or trip_id required' }, { status: 400 });
      const records = await base44.asServiceRole.entities.OfflineHandshake.filter(filter);
      return Response.json({ success: true, handshakes: records });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
}, { name: 'confirmHandshake' }));
