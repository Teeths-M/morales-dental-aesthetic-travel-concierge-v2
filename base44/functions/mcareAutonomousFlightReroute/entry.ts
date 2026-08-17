import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { logJourneyEvent } from '../../shared/logJourneyEvent.ts';

// mcareAutonomousFlightReroute — the third autonomous "heartbeat" of M-Care.
//
// Triggered by an entity automation the instant a TravelRequest's flight_status
// transitions to 'cancelled'. M-Care does NOT wait for a coordinator to notice
// the cancellation — it runs the full partner-notification cascade itself and
// speaks first to the patient.
//
// This reuses the existing disruption LOGIC (handleFlightDisruption, which
// already pauses the trip, notifies driver + companion + guardian, flags
// hotel rebooking to admin, updates the CaseRecord timeline, and writes an
// AuditLog) and layers on the two things that function is missing:
//   1. A proactive JourneyEvent chat bubble (+ push) so the PATIENT hears
//      "I caught that your flight was cancelled — I've already told everyone
//      and paused your trip" before they panic.
//   2. A permanent CrisisReroute audit record for the ledger.
//
// Note: handleFlightDisruption has allowedRoles: ['admin','platform_admin'].
// We invoke it as the service role (platform-level). If that gate ever blocks
// the invoke, we still write the patient message + CrisisReroute + admin alert
// so the traveler is never left in silence — the "loud, honest failure"
// pattern shared with mcareAutonomousDoctorReroute.

Deno.serve(createHandler(async ({ req, base44, body }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const payload = await body().catch(() => ({} as any));
  const entityId: string = payload?.event?.entity_id || '';
  if (!entityId) return err('Missing entity_id', 400);

  // Re-read the real TravelRequest — never trust the payload body.
  let trip: any = null;
  try { trip = await base44.asServiceRole.entities.TravelRequest.get(entityId); } catch (_) { trip = null; }
  if (!trip) return ok({ skipped: 'trip_not_found' });

  // Only act on the TRANSITION into cancelled (dedup — don't re-fire on every
  // subsequent update while the record stays cancelled).
  const oldStatus: string = payload?.old_data?.flight_status || '';
  const newStatus: string = trip.flight_status || '';
  if (oldStatus === newStatus) return ok({ skipped: 'no_status_change' });
  if (newStatus !== 'cancelled') return ok({ skipped: `status_not_cancelled:${newStatus}` });

  const clientEmail: string = trip.user_email || '';
  const clientName: string = trip.user_name || 'there';
  if (!clientEmail) return ok({ skipped: 'no_patient_email' });

  // Resolve the linked CaseRecord (TravelRequest.case_id is declared) for the
  // JourneyEvent case_id (must match the active CaseRecord the frontend's
  // useJourneyEvents hook polls) and the patient display name.
  const caseId: string = trip.case_id || '';
  let caseRecord: any = null;
  if (caseId) {
    try { caseRecord = await base44.asServiceRole.entities.CaseRecord.get(caseId); } catch (_) { caseRecord = null; }
  }
  const displayName: string = caseRecord?.client_name || clientName;
  const firstName: string = displayName.split(' ')[0] || 'there';
  const flightLabel: string = trip.flight_number ? `flight ${trip.flight_number}` : 'your flight';
  const now = new Date().toISOString();

  // ── Reuse the existing disruption cascade ─────────────────────────────────
  // handleFlightDisruption pauses the trip, notifies driver + companion +
  // guardian, flags admin for hotel rebooking, updates the CaseRecord timeline,
  // and writes an AuditLog. It does NOT message the patient directly — that's
  // our job below. Best-effort: if the invoke is blocked, we still speak to the
  // patient and alert the admin.
  let cascadeOk = false;
  let cascadeActions: string[] = [];
  try {
    const res = await base44.asServiceRole.functions.invoke('handleFlightDisruption', {
      case_id: caseId,
      trip_id: trip.id,
      disruption_type: 'cancellation',
      delay_minutes: 0,
      original_arrival: trip.scheduled_arrival || '',
      new_arrival: null,
      reason: 'Autonomous detection: flight_status → cancelled',
      flight_number: trip.flight_number || '',
    });
    const data: any = res?.data ?? res ?? {};
    if (data && (data.success || Array.isArray(data.actions_taken))) {
      cascadeOk = true;
      cascadeActions = Array.isArray(data.actions_taken) ? data.actions_taken : [];
    }
  } catch (_) { cascadeOk = false; }

  // If the cascade couldn't run (e.g. allowedRoles gate), alert the admin so a
  // human picks up the manual work the cascade would have done.
  const adminEmail = Deno.env.get('ADMIN_EMAIL') || '';
  if (!cascadeOk && adminEmail) {
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Morales Safety — Autonomous Flight Reroute',
        to: adminEmail,
        subject: `Flight cancelled — ${firstName}'s disruption cascade needs manual run`,
        body: `<div style="font-family:sans-serif;max-width:560px;padding:24px;border:2px solid #dc2626;border-radius:12px;">
<p style="margin:0 0 8px;color:#b91c1c;font-weight:700;">✈️ M-Care detected a flight cancellation but couldn't run handleFlightDisruption</p>
<table style="width:100%;border-collapse:collapse;">
<tr><td style="padding:4px 0;color:#6b7280;">Patient</td><td>${displayName}</td></tr>
<tr><td style="padding:4px 0;color:#6b7280;">Email</td><td>${clientEmail}</td></tr>
<tr><td style="padding:4px 0;color:#6b7280;">Flight</td><td>${trip.flight_number || 'N/A'}</td></tr>
<tr><td style="padding:4px 0;color:#6b7280;">Trip ID</td><td>${trip.id}</td></tr>
<tr><td style="padding:4px 0;color:#6b7280;">Case ID</td><td>${caseId || 'N/A'}</td></tr>
</table>
<p style="margin-top:12px;color:#374151;">The patient has been told you're arranging a new flight. Please run handleFlightDisruption manually (pause trip, notify driver/companion/guardian, rebook flight).</p>
</div>`,
      });
    } catch (_) { /* best-effort */ }
  }

  // ── Proactive M-Care chat bubble to the PATIENT (+ push, critical) ────────
  const patientMessage = cascadeOk
    ? `I caught that ${flightLabel} was cancelled. I've already told your driver, your companion, and your guardian that you're safe, and I've paused your journey so you're not flagged for missed check-ins while we sort this out. My care team is arranging a new flight for you right now — I'll tell you the moment it's confirmed.`
    : `I caught that ${flightLabel} was cancelled. I've paused your journey so you're not disturbed, and I've escalated to your care team to arrange a new flight for you immediately. Sit tight — I'll tell you the moment your new flight is confirmed.`;

  await logJourneyEvent(base44, {
    case_id: caseId,
    client_email: clientEmail,
    event_type: 'flight_disruption_handled',
    source: 'mcareAutonomousFlightReroute',
    message_text: patientMessage,
    priority: 'critical',
    action_taken: cascadeOk
      ? `Ran handleFlightDisruption cascade for trip ${trip.id}. Actions: ${cascadeActions.join(', ') || 'none reported'}.`
      : `handleFlightDisruption invoke failed; alerted admin. Trip paused via patient message only.`,
    tool_result: { trip_id: trip.id, case_id: caseId, flight_number: trip.flight_number, cascade_ok: cascadeOk, cascade_actions: cascadeActions },
    user_action_required: false,
    escalation_occurred: !cascadeOk,
  });

  // ── Permanent CrisisReroute audit record ─────────────────────────────────
  try {
    await base44.asServiceRole.entities.CrisisReroute.create({
      case_id: caseId,
      client_email: clientEmail,
      client_name: displayName,
      original_booking_id: trip.id,
      original_provider_id: trip.flight_number || '',
      original_provider_name: flightLabel,
      original_provider_type: 'flight',
      crisis_type: 'FLIGHT_CANCELLED',
      detected_at: now,
      detected_by: 'CRON',
      source_message: `Autonomous detection: TravelRequest ${trip.id} flight_status → cancelled`,
      selected_backup_id: '',
      selected_backup_name: '',
      selected_backup_type: '',
      patient_message: patientMessage,
      all_stakeholders_notified: cascadeOk,
      stakeholders_notified: cascadeOk ? ['driver', 'companion', 'guardian', 'admin'] : ['admin'],
      timeline_preserved: false,
      status: cascadeOk ? 'rerouting' : 'human_escalated',
      human_escalated: !cascadeOk,
      human_escalated_reason: !cascadeOk ? 'handleFlightDisruption invoke failed; admin alerted to run cascade manually' : '',
      audit_log: [
        { timestamp: now, action: 'detected', actor: 'mcareAutonomousFlightReroute', notes: `flight_status → cancelled` },
        { timestamp: now, action: cascadeOk ? 'cascade_run' : 'escalated', actor: 'mcareAutonomousFlightReroute', notes: cascadeOk ? `handleFlightDisruption actions: ${cascadeActions.join(',')}` : 'admin alerted' },
      ],
    });
  } catch (_) { /* audit is best-effort */ }

  return ok({
    acted: true,
    trip_id: trip.id,
    flight_number: trip.flight_number || null,
    cascade_ok: cascadeOk,
    patient_notified: true,
  });
}, { name: 'mcareAutonomousFlightReroute', requireAuth: false }));