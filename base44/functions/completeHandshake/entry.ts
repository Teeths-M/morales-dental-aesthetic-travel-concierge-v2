import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';

// ── High-risk checkpoints requiring dual-party confirmation ──────────────────
// HS4 (hotel_checkin) and HS5 (clinic_arrival) are life-safety inflection points.
// A single actor's device is not sufficient proof of physical arrival —
// a compromised device could confirm without the patient being present.
//
// For these steps, the patient's tap creates a SECONDARY pending OfflineHandshake
// record targeting the destination (hotel/clinic). An SMS challenge is sent to the
// destination's registered phone. Their reply via the Twilio webhook closes the
// second signal. If no reply arrives, the escalation engine will page admin.
//
// The trip DOES advance (journey is not blocked) but the destination_ack status
// is recorded so admin can see which arrivals are unverified.
const HIGH_RISK_STEPS = new Set([4, 5]);

// Inline SMS helper — mirrors pattern from escalateMissedDriverHandshake
async function sendSmsDirect(to: string, body: string) {
  const sid   = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from  = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !token || !from || !to) return { ok: false, reason: 'not_configured' };
  try {
    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${sid}:${token}`),
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
    });
    return resp.ok ? { ok: true } : { ok: false, reason: 'twilio_error' };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}

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
  } = await body();

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
    prev_hash:  await computePrevHash(base44),
  });

  // ── Dual-signal verification for HIGH-RISK checkpoints (HS4, HS5) ────────────
  // The patient's tap is Signal 1. We now request Signal 2 from the destination.
  // A single device can be compromised — two independent actors from different roles
  // eliminates the single point of failure.
  //
  // For HS4 (hotel_checkin): SMS challenge to hotel's registered contact number.
  // For HS5 (clinic_arrival): SMS challenge to the assigned doctor's registered number,
  //   and the doctor must complete logPhysicalIntakeHandshake to close the second signal.
  //
  // Journey advances regardless — we do not block the patient at a checkpoint if the
  // destination is slow to respond. But the destination_ack_status is tracked and
  // the escalation engine pages admin if it remains 'pending' past the deadline.
  if (HIGH_RISK_STEPS.has(n)) {
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || '';
    const dstCheckpointId = `DST_${Array.from(crypto.getRandomValues(new Uint8Array(4))).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
    const dstDeadline = new Date(Date.now() + 15 * 60_000).toISOString();

    let destinationPhone: string | null = null;
    let destinationLabel = hs.label;

    try {
      // Fetch the case record to get destination contact info.
      if (trip.case_id) {
        const caseRecords = await base44.asServiceRole.entities.CaseRecord.filter({ id: trip.case_id }).catch(() => []);
        const cr = caseRecords?.[0];
        if (cr) {
          if (n === 5) {
            // HS5 — clinic: use doctor's phone if available
            destinationPhone = cr.doctor_phone || cr.assigned_doctor_phone || null;
            destinationLabel = 'Clinic / Doctor';
          } else if (n === 4) {
            // HS4 — hotel: use hotel contact if stored on the booking
            destinationPhone = cr.hotel_phone || cr.accommodation_phone || null;
            destinationLabel = 'Hotel';
          }
        }
      }
    } catch (_) {}

    // Create a secondary PENDING OfflineHandshake for the destination — this is
    // the record that the destination's SMS reply will close via the Twilio webhook.
    await base44.asServiceRole.entities.OfflineHandshake.create({
      case_id:              trip.case_id || '',
      trip_id,
      patient_email:        trip.user_email || '',
      patient_name:         trip.user_name  || '',
      handshake_role:       'destination',
      handshake_type:       hs.type,
      channel:              'sms',
      method:               'sms',
      status:               'pending',
      checkpoint_id:        dstCheckpointId,
      destination_phone:    destinationPhone || '',
      primary_driver_phone: destinationPhone || '',  // used by phone validation in Twilio webhook
      timeout_at:           dstDeadline,
      parent_handshake_step: n,
      received_at:          now,
    }).catch(e => console.error('[completeHandshake] destination handshake create failed:', e));

    if (destinationPhone) {
      const smsBody = `Morales Medical Concierge: ${trip.user_name || 'Your patient'} says they have just arrived at ${destinationLabel}. Reply: HANDSHAKE ${dstCheckpointId} to confirm presence. If they have NOT arrived, reply: ALERT ${dstCheckpointId}`;
      sendSmsDirect(destinationPhone, smsBody).catch(() => {});
    } else {
      // No destination phone on record — alert admin so they can manually verify.
      if (adminEmail) {
        base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'Morales Safety',
          to: adminEmail,
          subject: `⚠️ HS${n} Destination Verification Required — ${trip.user_name || trip.user_email}`,
          body: `Patient ${trip.user_name || trip.user_email} has confirmed HS${n} (${hs.label}) arrival via app.\n\nNo ${destinationLabel} contact phone is on file for case ${trip.case_id}.\n\nManually verify the patient is physically present at the destination within 15 minutes.\n\nTrip ID: ${trip_id}\nCase ID: ${trip.case_id}\nHandshake: ${hs.label}\nConfirmed at: ${now}`,
        }).catch(() => {});
      }
    }

    // GPS check: if this is a high-risk checkpoint and no GPS was provided,
    // flag it — GPS is the baseline independent signal even without destination reply.
    if (!gps_location?.lat || !gps_location?.lng) {
      if (adminEmail) {
        base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'Morales Safety',
          to: adminEmail,
          subject: `⚠️ HS${n} confirmed WITHOUT GPS — ${trip.user_name || trip.user_email}`,
          body: `Patient ${trip.user_name || trip.user_email} confirmed HS${n} (${hs.label}) with no GPS coordinates attached.\n\nThis is a high-risk checkpoint. A position-verified confirmation was not possible.\n\nTrip ID: ${trip_id}\nCase ID: ${trip.case_id || 'N/A'}\nConfirmed at: ${now}`,
        }).catch(() => {});
      }
    }
  }

  const isComplete = n === 9;

  // ── Patient push notification — key handshake moments only ───────────────
  // HS1, HS3, HS5, HS6, HS9 are the moments that matter most to the patient.
  const PATIENT_PUSH: Record<number, { title: string; body: string; type: string }> = {
    1: { title: '🚗 Journey Begun',        body: 'Your driver has arrived. Checkpoint 1 of 9 confirmed.',         type: 'safe'      },
    3: { title: '✈️ Landed Safely',         body: `You have arrived safely. Welcome to your destination.`,          type: 'success'   },
    5: { title: '🏥 Clinic Check-In',       body: 'You are in good hands. Your care team is ready for you.',       type: 'success'   },
    6: { title: '🍽️ Companion Confirmed',   body: 'Your recovery companion has checked in. You are not alone.',    type: 'companion' },
    9: { title: '⭐ The Golden M Is Yours', body: 'Welcome home. All 9 checkpoints complete. Journey done.',        type: 'golden_m'  },
  };

  if (PATIENT_PUSH[n] && trip.user_email) {
    const pp = PATIENT_PUSH[n];
    base44.asServiceRole.functions?.invoke?.('sendPushNotification', {
      user_email: trip.user_email,
      title:      pp.title,
      body:       pp.body,
      url:        '/dashboard',
      type:       pp.type,
      tag:        `hs-${n}-${trip_id}`,
      internal_secret: Deno.env.get('CRON_SECRET'),
    }).catch(() => {}); // non-blocking
  }

  // (Escrow release is dispatched with the async cluster below — see there.)

  // ── Guardian / Safety Circle SMS — key safety checkpoints ──────────────────
  // Family gets a calm message at airport, hotel, clinic, and home arrival.
  // Guardian phone comes from case emergency_contact field.
  const GUARDIAN_MESSAGES: Record<number, string> = {
    3: `${trip.patient_name || 'Your traveller'} has landed safely at the destination airport. They are in good hands. — Morales Concierge`,
    4: `${trip.patient_name || 'Your traveller'} has checked in safely at the hotel. They are comfortable and settling in. — Morales Concierge`,
    5: `${trip.patient_name || 'Your traveller'} has arrived safely at the clinic. The care team is ready. — Morales Concierge`,
    9: `${trip.patient_name || 'Your traveller'} is home safely. Journey complete. The Golden M is theirs. Thank you for trusting Morales. — Morales Concierge`,
  };

  if (GUARDIAN_MESSAGES[n]) {
    // Fetch case record to get emergency_contact phone
    const caseRecords = await base44.asServiceRole.entities.CaseRecord.filter({ id: trip.case_id || trip_id }).catch(() => []);
    const caseRecord = caseRecords?.[0];
    const guardianPhone = caseRecord?.emergency_contact?.phone || caseRecord?.guardian_phone || null;
    if (guardianPhone) {
      sendSms(guardianPhone, GUARDIAN_MESSAGES[n]).catch(() => {}); // non-blocking
    }
  }

  // ── Async dispatch cluster — Promise.allSettled so no single failure blocks ──
  // Matches the Enterprise Asynchronous Infrastructure diagram:
  // every handshake fans out to Patient App Portal + Master Admin Log + Partner notifications.
  const downstream: Promise<unknown>[] = [];

  // ── Escrow release ────────────────────────────────────────────────────────
  // HS1, HS5, HS6, HS7, HS9 each release specific partner holds.
  //
  // This used to be scheduled with setTimeout(..., 24h) inside the request.
  // A Deno edge invocation does not survive 24 hours — the isolate is torn down
  // once the response is returned, so that timer never fired and the release
  // was silently dropped. Partners simply never got paid, with no error
  // anywhere.
  //
  // Dispatched with the cluster instead. releaseEscrowPayment independently
  // re-verifies trip.handshake_status[n] === true before moving any money, so
  // this cannot release against an unconfirmed checkpoint.
  if ([1, 5, 6, 7, 9].includes(n)) {
    downstream.push(
      base44.asServiceRole.functions?.invoke?.('releaseEscrowPayment', {
        case_id: trip_id, handshake_number: n,
      }).catch(() => {}) ?? Promise.resolve()
    );
  }

  // Patient App Portal: Golden M SMS on HS9
  if (isComplete && trip.user_phone) {
    downstream.push(
      sendSms(
        trip.user_phone,
        'Welcome home. We\'re honored to have been part of your journey. The Golden M is yours. — Morales Concierge'
      )
    );
  }

  // ── Mother's Touch auto-activation on HS5 (Clinic Arrival) ─────────────────
  // The moment the patient walks into the clinic, Mother's Touch fires.
  // Auto-matches a vetted companion, creates meal schedule, notifies both parties.
  if (n === 5) {
    base44.asServiceRole.functions?.invoke?.('activateMotherTouch', {
      internal_secret: Deno.env.get('CRON_SECRET'),
      case_id: trip.case_id || trip_id,
      handshake_number: n,
    }).catch(() => {}); // non-blocking — handshake confirms regardless
  }

  // Partner Portal notifications (doctor on HS5, companion on HS6, all on HS9)
  // sendHandshakeAlert and sendGoldenMNotification handle role-routing internally.
  if ([5, 6, 9].includes(n)) {
    downstream.push(
      base44.asServiceRole.functions?.invoke?.('sendHandshakeAlert', {
        handshake_number: n,
        trip_id,
        case_id: trip.case_id || '',
        internal_secret: Deno.env.get('CRON_SECRET'),
      }).catch(() => {}) ?? Promise.resolve()
    );
  }

  // Golden M email + celebration notification (patient + doctor) on HS9
  if (isComplete) {
    downstream.push(
      base44.asServiceRole.functions?.invoke?.('sendGoldenMNotification', {
        trip_id,
        internal_secret: Deno.env.get('CRON_SECRET'),
      }).catch(() => {}) ?? Promise.resolve()
    );

    // Schedule 30-day post-op recovery check-ins (Day 3, 7, 14, 30)
    if (trip.case_id) {
      downstream.push(
        base44.asServiceRole.functions?.invoke?.('schedulePostOpCheckIns', {
          case_id: trip.case_id,
          trip_id,
        }).catch(() => {}) ?? Promise.resolve()
      );
    }
  }

  // Fire all downstream tasks concurrently — failures are non-fatal
  if (downstream.length > 0) {
    await Promise.allSettled(downstream);
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
