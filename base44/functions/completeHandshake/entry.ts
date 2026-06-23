import { createHandler, ok, err } from '../_shared/createHandler.ts';

// ── Handshake sequence definition ─────────────────────────────────────────────
// Maps handshake_number (1-9) → physical type + journey phase.
// Phase transitions are cumulative: completing HS2 sets phase=transit_out,
// completing HS3 advances it to arrived, etc.

const HANDSHAKE_MAP: Record<number, { type: string; label: string; phase: string }> = {
  1: { type: 'driver_pickup',   label: 'Driver Pickup — Home to Airport',        phase: 'transit_out'    },
  2: { type: 'airport_dropoff', label: 'Airport Drop-off — Origin',               phase: 'transit_out'    },
  3: { type: 'airport_checkin', label: 'Airport Pickup — Destination Arrivals',   phase: 'arrived'        },
  4: { type: 'hotel_checkin',   label: 'Hotel Check-in',                          phase: 'arrived'        },
  5: { type: 'clinic_arrival',  label: 'Clinic Appointment',                      phase: 'recovery'       },
  6: { type: 'recovery_handoff','label': 'Companion Meal Delivery',               phase: 'recovery'       },
  7: { type: 'hotel_checkout',  label: 'Return Transport — Hotel to Airport',     phase: 'transit_return' },
  8: { type: 'airport_boarding','label': 'Arrived at Home Airport',               phase: 'transit_return' },
  9: { type: 'home_dropoff',    label: 'Home Drop-off — Journey Complete',        phase: 'completed'      },
};

// Inline Twilio SMS — mirrors pattern from escalateMissedDriverHandshake
async function sendSms(to: string, message: string) {
  const sid   = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from  = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !token || !from) return { ok: false };
  const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${sid}:${token}`),
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: from, Body: message }).toString(),
  });
  return resp.ok ? { ok: true } : { ok: false };
}

// ── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(createHandler(async ({ base44, user, body }) => {
  const {
    trip_id,
    handshake_number,
    gps_location,
    trigger_method = 'app',
    offline_packet_id,
  } = await body<{
    trip_id: string;
    handshake_number: number;
    gps_location?: { lat: number; lng: number; accuracy_m?: number };
    trigger_method?: 'app' | 'sms';
    offline_packet_id?: string;
  }>();

  if (!trip_id)          return err('trip_id is required');
  if (!handshake_number) return err('handshake_number is required');

  const n = Number(handshake_number);
  if (!Number.isInteger(n) || n < 1 || n > 9) return err('handshake_number must be 1–9');

  const hs = HANDSHAKE_MAP[n];

  // Load trip
  const trip = await base44.asServiceRole.entities.TravelRequest.get(trip_id).catch(() => null);
  if (!trip) return err('Trip not found', 404);

  // Pause guard
  if (trip.paused) return err('Trip is currently paused — resume the trip before confirming handshakes', 409);

  const currentStep = trip.current_step ?? 0;
  const handshakeStatus = trip.handshake_status ?? {};

  // Idempotency: already confirmed
  if (handshakeStatus[String(n)] === true) {
    return ok({ success: true, current_step: currentStep, trip_phase: trip.trip_phase, idempotent: true });
  }

  // Sequential order enforcement
  if (n !== currentStep + 1) {
    const expected = currentStep + 1;
    return err(
      expected > 9
        ? 'All 9 handshakes are already complete'
        : `Handshakes must be confirmed in order. Expected Handshake ${expected}, got ${n}.`,
      400
    );
  }

  const now = new Date().toISOString();
  const timeoutAt = new Date(Date.now() + 15 * 60_000).toISOString();

  // Create OfflineHandshake record
  await base44.asServiceRole.entities.OfflineHandshake.create({
    case_id:           trip.case_id || '',
    trip_id,
    patient_email:     trip.user_email || '',
    patient_name:      trip.user_name  || '',
    handshake_role:    'patient',
    handshake_type:    hs.type,
    channel:           trigger_method === 'sms' ? 'sms' : 'sms',
    method:            trigger_method === 'app' ? 'tap' : 'sms',
    status:            'completed',
    confirmed_by:      user!.id,
    confirmed_by_name: user!.full_name || user!.email,
    gps_lat:           gps_location?.lat    ?? null,
    gps_lng:           gps_location?.lng    ?? null,
    gps_accuracy_m:    gps_location?.accuracy_m ?? null,
    offline_packet_id: offline_packet_id || null,
    executed:          true,
    executed_at:       now,
    completed_at:      now,
    received_at:       now,
    timeout_at:        timeoutAt,
  });

  // Update TravelRequest aggregate counters
  await base44.asServiceRole.entities.TravelRequest.update(trip_id, {
    current_step:        n,
    trip_phase:          hs.phase,
    handshake_status:    { ...handshakeStatus, [String(n)]: true },
    handshake_timestamps:{ ...(trip.handshake_timestamps ?? {}), [String(n)]: now },
  });

  // Audit log
  await base44.asServiceRole.entities.AuditLog.create({
    event_type:   'handshake_completed',
    actor_id:     user!.id,
    actor_role:   user!.role,
    actor_name:   user!.full_name || user!.email,
    actor_email:  user!.email,
    resource_type:'travel_request',
    resource_id:  trip_id,
    case_id:      trip.case_id || '',
    details: {
      handshake_number: n,
      handshake_type:   hs.type,
      label:            hs.label,
      phase:            hs.phase,
      trigger_method,
      gps:              gps_location ?? null,
      offline_packet_id: offline_packet_id || null,
    },
    sensitive:  false,
    timestamp:  now,
  });

  const isComplete = n === 9;

  // Golden M SMS — fired on final handshake completion
  if (isComplete && trip.user_phone) {
    await sendSms(
      trip.user_phone,
      'Welcome home. We\'re honored to have been part of your journey. The Golden M is yours. — Morales Concierge'
    ).catch(() => {});
  }

  return ok({
    success:        true,
    current_step:   n,
    trip_phase:     hs.phase,
    handshake_type: hs.type,
    label:          hs.label,
    is_complete:    isComplete,
    confirmed_at:   now,
  });
}, { name: 'completeHandshake', requireAuth: true }));
