/**
 * handleFlightDisruption
 *
 * Full cascade triggered when a patient's flight is delayed or cancelled.
 * A single call handles everything — M coordinates so the patient doesn't have to.
 *
 * Actions:
 *   1. Pauses the trip (suppresses missed check-in alerts during disruption)
 *   2. Notifies driver — pickup is delayed, new ETA provided
 *   3. Notifies companion — stay extended or standby as needed
 *   4. Notifies guardian — patient is safe, flight is delayed
 *   5. If overnight disruption (delay > 4 hours) — flags for hotel rebooking + notifies admin
 *   6. Updates CaseRecord timeline with full disruption log
 *   7. AuditLog entry
 *
 * Does NOT auto-resume the trip — call manageTripPause action:'resume' once
 * the patient is airborne or the disruption is resolved.
 */

import { createHandler, ok, err } from '../_shared/createHandler.ts';

async function sendSms(to: string, body: string): Promise<void> {
  const sid  = Deno.env.get('TWILIO_ACCOUNT_SID');
  const auth = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_FROM_NUMBER') || Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !auth || !from || !sid.startsWith('AC')) return;
  const form = new URLSearchParams({ To: to, From: from, Body: body });
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${sid}:${auth}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  }).catch(e => console.warn('[handleFlightDisruption] SMS failed:', e.message));
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const {
    case_id,
    trip_id,
    disruption_type,   // 'delay' | 'cancellation'
    delay_minutes,     // estimated delay in minutes (0 if cancellation)
    original_arrival,  // ISO string — original expected arrival
    new_arrival,       // ISO string — new expected arrival (null if cancelled)
    reason,            // free-text reason (e.g. "weather", "mechanical")
    flight_number,
  } = await body<{
    case_id: string;
    trip_id?: string;
    disruption_type: 'delay' | 'cancellation';
    delay_minutes?: number;
    original_arrival?: string;
    new_arrival?: string;
    reason?: string;
    flight_number?: string;
  }>();

  if (!case_id) return err('case_id is required');
  if (!disruption_type) return err('disruption_type is required (delay | cancellation)');

  const caseRecord = await base44.asServiceRole.entities.CaseRecord
    .get(case_id)
    .catch(() => null);
  if (!caseRecord) return err('Case not found', 404);

  const now           = new Date().toISOString();
  const patientName   = caseRecord.client_name   || caseRecord.client_email || 'Patient';
  const firstName     = patientName.split(' ')[0];
  const patientEmail  = caseRecord.client_email   || '';
  const driverEmail   = caseRecord.driver_email   || '';
  const driverPhone   = caseRecord.driver_phone   || '';
  const companionEmail = caseRecord.companion_email || '';
  const companionPhone = caseRecord.companion_phone || '';
  const guardianPhone  = caseRecord.guardian_phone || caseRecord.emergency_contact?.phone || '';
  const guardianEmail  = caseRecord.guardian_email || caseRecord.emergency_contact?.email || '';
  const guardianName   = caseRecord.emergency_contact?.name || 'Emergency Contact';
  const delayMin       = delay_minutes ?? 0;
  const isOvernight    = delayMin > 240 || disruption_type === 'cancellation';
  const flightLabel    = flight_number ? `Flight ${flight_number}` : 'Flight';

  const actions: string[] = [];

  // ── 1. Pause the trip ────────────────────────────────────────────────────────
  if (trip_id) {
    await base44.asServiceRole.entities.TravelRequest.update(trip_id, {
      paused: true,
      paused_at: now,
      pause_reason: `Flight disruption: ${disruption_type}${reason ? ` — ${reason}` : ''}`,
    }).catch(e => console.error('[handleFlightDisruption] pause failed:', e?.message));
    actions.push('trip_paused');
  }

  // ── 2. Notify driver ─────────────────────────────────────────────────────────
  const driverMsg = disruption_type === 'delay'
    ? `Morales: ${firstName}'s ${flightLabel} is delayed by ${delayMin} minutes. New arrival: ${new_arrival ? new Date(new_arrival).toLocaleTimeString() : 'TBD'}. Please standby — we will confirm pickup when airborne.`
    : `Morales: ${firstName}'s ${flightLabel} has been CANCELLED. Pickup is suspended. We will contact you once the passenger has a new flight. Thank you for your patience.`;

  if (driverPhone) { await sendSms(driverPhone, driverMsg); actions.push('driver_sms'); }
  if (driverEmail) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Morales Operations',
      to: driverEmail,
      subject: `Flight disruption — ${firstName} — ${disruption_type === 'delay' ? `${delayMin}min delay` : 'CANCELLED'}`,
      body: driverMsg,
    }).catch(() => {});
    actions.push('driver_email');
  }

  // ── 3. Notify companion ──────────────────────────────────────────────────────
  const companionMsg = isOvernight
    ? `Morales: ${firstName}'s ${flightLabel} has been disrupted (${disruption_type}${disruption_type === 'delay' ? `, ${delayMin} min` : ''}). This may require an overnight extension. Please standby and await assignment update from Morales operations.`
    : `Morales: ${firstName}'s ${flightLabel} is delayed by ${delayMin} minutes. Estimated new arrival: ${new_arrival ? new Date(new_arrival).toLocaleTimeString() : 'TBD'}. Please adjust your schedule.`;

  if (companionPhone) { await sendSms(companionPhone, companionMsg); actions.push('companion_sms'); }
  if (companionEmail) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Morales Operations',
      to: companionEmail,
      subject: `Schedule update — ${firstName} flight disruption`,
      body: companionMsg,
    }).catch(() => {});
    actions.push('companion_email');
  }

  // ── 4. Notify guardian ───────────────────────────────────────────────────────
  const guardianSms = disruption_type === 'delay'
    ? `Morales: ${firstName}'s ${flightLabel} is delayed by approximately ${delayMin} minutes. They are safe. Morales is monitoring and coordinating. New arrival: ${new_arrival ? new Date(new_arrival).toLocaleTimeString() : 'TBD'}.`
    : `Morales: ${firstName}'s ${flightLabel} has been cancelled. They are safe and with our team. We are arranging an alternative. You will receive an update when a new flight is confirmed.`;

  if (guardianPhone) { await sendSms(guardianPhone, guardianSms); actions.push('guardian_sms'); }
  if (guardianEmail) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Morales Care Team',
      to: guardianEmail,
      subject: `${firstName} — flight ${disruption_type === 'delay' ? 'delayed' : 'cancelled'} — they are safe`,
      body: `Dear ${guardianName},\n\n${firstName}'s ${flightLabel} has been ${disruption_type === 'delay' ? `delayed by approximately ${delayMin} minutes` : 'cancelled'}.\n\n${firstName} is safe. The Morales team is coordinating and monitoring the situation.${new_arrival ? `\n\nNew estimated arrival: ${new Date(new_arrival).toLocaleString()}` : ''}\n\nYou will receive another update once the situation is resolved.\n\n— Morales Care Team`,
    }).catch(() => {});
    actions.push('guardian_email');
  }

  // ── 5. Flag for hotel rebooking if overnight disruption ──────────────────────
  const adminEmail = Deno.env.get('ADMIN_EMAIL');
  if (isOvernight && adminEmail) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Morales Operations — URGENT',
      to: adminEmail,
      subject: `🚨 Overnight disruption — ${firstName} — hotel rebooking required`,
      body: `Patient ${patientName} (${patientEmail}) has experienced an overnight flight disruption.\n\nDisruption type: ${disruption_type}\nFlight: ${flightLabel}\nDelay: ${delayMin} minutes\nReason: ${reason || 'Not specified'}\nOriginal arrival: ${original_arrival || 'Unknown'}\nNew arrival: ${new_arrival || 'Cancelled / TBD'}\n\nACTIONS REQUIRED:\n1. Confirm patient accommodation for tonight\n2. Rebook flight if cancelled\n3. Update driver and companion once new times are known\n4. Call manageTripPause action:resume once patient is airborne\n\nCase ID: ${case_id}`,
    }).catch(() => {});
    actions.push('admin_overnight_alert');
  }

  // ── 6. Update CaseRecord timeline ────────────────────────────────────────────
  const updatedTimeline = [
    ...(caseRecord.timeline_log || []),
    {
      timestamp: now,
      action: 'flight_disruption',
      details: `${disruption_type === 'delay' ? `Flight delayed by ${delayMin} minutes` : 'Flight cancelled'}. ${reason ? `Reason: ${reason}.` : ''} Partners notified: ${actions.join(', ')}.${isOvernight ? ' Overnight disruption flagged to admin.' : ''}`,
      performed_by: 'system:handleFlightDisruption',
      non_repudiable: true,
      disruption_type,
      delay_minutes: delayMin,
      original_arrival,
      new_arrival: new_arrival || null,
      flight_number: flight_number || null,
    },
  ];

  await base44.asServiceRole.entities.CaseRecord.update(case_id, {
    flight_disruption_at: now,
    flight_disruption_type: disruption_type,
    timeline_log: updatedTimeline,
  }).catch(e => console.error('[handleFlightDisruption] case update failed:', e?.message));

  // ── 7. AuditLog ───────────────────────────────────────────────────────────────
  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'flight_disruption',
    resource_type: 'case_record',
    resource_id: case_id,
    actor_id: 'system',
    actor_name: 'handleFlightDisruption',
    case_id,
    details: {
      patient_name: patientName,
      disruption_type,
      delay_minutes: delayMin,
      flight_number: flight_number || null,
      is_overnight: isOvernight,
      actions_taken: actions,
    },
    sensitive: false,
    timestamp: now,
  }).catch(() => {});

  return ok({
    success: true,
    case_id,
    disruption_type,
    delay_minutes: delayMin,
    is_overnight: isOvernight,
    actions_taken: actions,
    hotel_rebooking_required: isOvernight,
    next_step: 'Call manageTripPause action:resume once patient is airborne or new flight confirmed.',
  });

}, { name: 'handleFlightDisruption', requireAuth: true, allowedRoles: ['admin', 'platform_admin'] }));
