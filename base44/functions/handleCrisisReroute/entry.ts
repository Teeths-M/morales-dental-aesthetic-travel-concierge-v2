/**
 * handleCrisisReroute — the coordination-loop orchestrator.
 *
 * When something breaks on a booked journey (provider cancels < 24h, flight
 * cancelled, driver no-show, credentials expire, companion flags distress),
 * M-Care calls this. It:
 *   1. Looks up the active BookingFallbackRule for the crisis_type.
 *   2. Creates a CrisisReroute record (detected).
 *   3. Executes the rule's fallback action — REUSING the existing backup
 *      finders (findDoctorBackup, findDriverBackup) and handleFlightDisruption
 *      rather than duplicating their logic.
 *   4. Sends the patient the "I've already handled it" message (SMS + email).
 *   5. Notifies every stakeholder (driver, travel agency, companion, admin).
 *   6. Updates the CrisisReroute record with the outcome, timeline_preserved,
 *      resolution_time_seconds, human_escalated, and a full audit trail.
 *   7. Returns the patient message so M-Care can surface it in chat.
 *
 * The patient never sees the panic. They get one calm message that a fix is
 * already in motion. Target: < 3 min detection → reassurance.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { findDoctorBackup } from '../../shared/findDoctorBackup.ts';
import { findDriverBackup } from '../../shared/findDriverBackup.ts';
import { linkOnlyEmail, linkOnlySms } from '../../shared/notify.ts';
import { escapeHtml } from '../../shared/emailTemplate.ts';

const BRAND = 'Morales Medical Travel Safety';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

async function sendSms(to: string, message: string) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !token || !from || !to) return { ok: false };
  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${token}`), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: to, From: from, Body: message }).toString(),
    });
    return { ok: r.ok };
  } catch (_) { return { ok: false }; }
}

function auditEntry(action: string, actor: string, notes: string) {
  return { timestamp: new Date().toISOString(), action, actor, notes };
}

function costDifference(selected: number, original: number): number {
  if (typeof selected !== 'number' || typeof original !== 'number') return 0;
  return Math.round((selected - original) * 100) / 100;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let caller: any = null;
    try { caller = await base44.auth.me(); } catch (_) { caller = null; }
    if (!caller) return Response.json({ error: 'Authentication required' }, { status: 401 });

    let body: any = null;
    try { body = await req.json(); } catch (_) { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }); }

    const {
      case_id,
      crisis_type,
      detected_by = 'AI',
      source_message = '',
      original_provider_id,
      original_provider_name,
      original_provider_type,
      driver_leg = 'destination',
    } = body || {};

    if (!case_id) return Response.json({ error: 'case_id is required' }, { status: 400 });
    if (!crisis_type) return Response.json({ error: 'crisis_type is required' }, { status: 400 });

    let caseRecord: any = null;
    try { caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id); } catch (_) { caseRecord = null; }
    if (!caseRecord) return Response.json({ error: 'Case not found' }, { status: 404 });

    const detectedAt = new Date();
    const audit: any[] = [auditEntry('CRISIS_DETECTED', detected_by, `${crisis_type}: ${source_message || '(no message)'}`)];

    // 1. Look up the governing fallback rule (active, lowest priority number).
    const rules = await base44.asServiceRole.entities.BookingFallbackRule
      .filter({ crisis_type, is_active: true }, 'priority', 10).catch(() => []);
    const rule = (rules as any[])[0] || null;

    // 2. Create the CrisisReroute record.
    let reroute: any = await base44.asServiceRole.entities.CrisisReroute.create({
      case_id,
      client_email: caseRecord.client_email,
      client_name: caseRecord.client_name,
      original_booking_id: case_id,
      original_provider_id: original_provider_id || '',
      original_provider_name: original_provider_name || '',
      original_provider_type: original_provider_type || '',
      crisis_type,
      detected_at: detectedAt.toISOString(),
      detected_by,
      source_message,
      rule_applied_id: rule?.id || '',
      rule_applied_number: rule?.rule_number || null,
      backup_options_searched: [],
      status: 'rerouting',
      audit_log: audit,
    });

    // 3. Execute the fallback action. Reuse existing finders — never duplicate.
    let selectedBackup: any = null;
    let selectedType = '';
    let selectedCost = 0;
    let humanEscalated = !!rule?.human_override_required;
    let humanReason = rule?.human_override_required ? `${rule.trigger_event} requires human override` : '';
    let timelinePreserved = true;
    const stakeholdersNotified: string[] = [];

    if (rule?.human_override_required) {
      // Rule 4 & 5: never auto-resolve — escalate immediately.
      audit.push(auditEntry('HUMAN_ESCALATION_TRIGGERED', 'system', humanReason));
    } else if (crisis_type === 'PROVIDER_CANCELLED') {
      // Rule 1: find a verified backup doctor, reassign, notify.
      const candidates = await base44.asServiceRole.entities.Doctor
        .filter({ status: 'active' }).catch(() => []) as any[];
      const considered = candidates
        .filter((d: any) => d.email !== (caseRecord.doctor_email || original_provider_id))
        .map((d: any) => ({
          partner_id: d.id, partner_name: d.full_name, partner_type: 'doctor',
          available: d.license_verified && ['verified', 'manually_approved'].includes(d.verification_status),
          cost_estimate_usd: 0,
          reason: d.license_verified ? 'verified active doctor' : 'not verified — skipped',
        }));

      const result = await findDoctorBackup(base44, caseRecord, caseRecord.doctor_email || original_provider_id);
      if (result?.success && result.doctor) {
        selectedBackup = result.doctor;
        selectedType = 'doctor';
        audit.push(auditEntry('BACKUP_DOCTOR_ASSIGNED', 'system', `Dr. ${result.doctor.full_name} reassigned.`));
      } else {
        humanEscalated = true;
        humanReason = 'No verified backup doctor available — escalated to human';
        timelinePreserved = false;
        audit.push(auditEntry('BACKUP_SEARCH_FAILED', 'system', humanReason));
      }
      await base44.asServiceRole.entities.CrisisReroute.update(reroute.id, { backup_options_searched: considered });
    } else if (crisis_type === 'DRIVER_NO_SHOW') {
      // Rule 3: dispatch a backup driver for the failed leg.
      const excludeId = original_provider_id || caseRecord.destination_driver_id || caseRecord.origin_driver_id || '';
      const result = await findDriverBackup(base44, caseRecord, driver_leg, excludeId, 'no_show');
      if (result?.success && result.driver) {
        selectedBackup = result.driver;
        selectedType = 'driver';
        audit.push(auditEntry('BACKUP_DRIVER_DISPATCHED', 'system', `${result.driver.agency_name || 'Driver'} dispatched for ${driver_leg} leg.`));
      } else {
        humanEscalated = true;
        humanReason = 'No backup driver available within 45 min — escalated to human';
        timelinePreserved = false;
        audit.push(auditEntry('BACKUP_SEARCH_FAILED', 'system', humanReason));
      }
    } else if (crisis_type === 'FLIGHT_CANCELLED') {
      // Rule 2: delegate to the existing disruption handler.
      try {
        await base44.asServiceRole.functions.invoke('handleFlightDisruption', {
          case_id, disruption_type: 'cancelled', internal_secret: Deno.env.get('CRON_SECRET'),
        });
        audit.push(auditEntry('FLIGHT_DISRUPTION_HANDLER_INVOKED', 'system', 'handleFlightDisruption rerouting trip + clinic.'));
      } catch (e) {
        audit.push(auditEntry('FLIGHT_DISRUPTION_HANDLER_FAILED', 'system', String(e)));
      }
    } else if (crisis_type === 'COMPANION_DISTRESS' || crisis_type === 'PROVIDER_CREDENTIAL_EXPIRED' || crisis_type === 'EMERGENCY') {
      humanEscalated = true;
      humanReason = humanReason || `${crisis_type} requires human review`;
      audit.push(auditEntry('HUMAN_ESCALATION_TRIGGERED', 'system', humanReason));
    } else {
      humanEscalated = true;
      humanReason = `Unknown crisis_type ${crisis_type} — escalated to human`;
      audit.push(auditEntry('UNKNOWN_CRISIS', 'system', humanReason));
    }

    // 4. Build the patient message — fast, transparent, solution-first.
    const intro = rule?.notification_template || 'Something came up with your booking. I\'ve already started fixing it.';
    let patientMessage = '';

    if (humanEscalated) {
      patientMessage = `${intro}

I'm working on a verified replacement right now and have escalated this to our care team — a coordinator will reach you within minutes. Your hotel and flight home stay the same. I'm not leaving this until you're taken care of.

Reply OK or tell me what you need.`;
    } else if (selectedBackup) {
      const detailLines: string[] = [];
      if (selectedType === 'doctor') {
        detailLines.push(`• Dr. ${selectedBackup.full_name || 'a verified specialist'}`);
        if (selectedBackup.specialty) detailLines.push(`• Specialty: ${selectedBackup.specialty}`);
        if (selectedBackup.verification_status === 'verified') detailLines.push('• License verified ✓');
        if (selectedBackup.years_experience) detailLines.push(`• ${selectedBackup.years_experience} yrs experience`);
        detailLines.push('• Same procedure, new doctor');
        detailLines.push('');
        detailLines.push(`I've sent Dr. ${selectedBackup.full_name || 'the doctor'} your case — you'll have the confirmed time within minutes.`);
      } else if (selectedType === 'driver') {
        detailLines.push(`• New driver: ${selectedBackup.agency_name || selectedBackup.contact_person || 'a verified driver'}`);
        detailLines.push('• Updated pickup details coming by SMS');
      }
      patientMessage = `${intro}

✅ NEW BOOKING LINED UP:
${detailLines.join('\n')}

Your driver, hotel, and flight home stay the same.

Reply OK or tell me if you want a different option.`;
    } else {
      patientMessage = `${intro}

I'm rerouting your trip now — your hotel and flight home stay the same. You'll have the updated details in the next message.

Reply OK or tell me what you need.`;
    }

    // 5. Notify the patient (SMS + email). The agent surfaces patientMessage in chat too.
    let patientNotifiedAt: string | null = null;
    if (caseRecord.client_phone) {
      const sms = await sendSms(caseRecord.client_phone, patientMessage);
      if (sms?.ok) { stakeholdersNotified.push('patient_sms'); patientNotifiedAt = new Date().toISOString(); }
    }
    if (caseRecord.client_email) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: BRAND, to: caseRecord.client_email,
          subject: 'I\'ve already handled this — update on your booking | Morales',
          body: linkOnlyEmail({
            from: 'handleCrisisReroute/patient',
            title: 'I\'ve already handled this.',
            line: patientMessage,
            ctaLabel: 'Open Your Trip',
            ctaUrl: `${APP_URL}/dashboard`,
          }),
        });
        stakeholdersNotified.push('patient_email');
        patientNotifiedAt = patientNotifiedAt || new Date().toISOString();
      } catch (_) {}
    }

    // 6. Notify the other stakeholders — reuse the entities already on the case.
    const stakeTasks: Promise<unknown>[] = [];

    // Driver — updated pickup.
    if (caseRecord.destination_driver_id || caseRecord.origin_driver_id) {
      const driverId = caseRecord.destination_driver_id || caseRecord.origin_driver_id;
      stakeTasks.push(
        base44.asServiceRole.functions.invoke('sendDriverAlert', {
          case_id, driver_id: driverId, internal_secret: Deno.env.get('CRON_SECRET'),
          message: `Schedule update for ${caseRecord.client_name}: the procedure provider changed. Pickup time may shift — check your portal.`,
        }).then(() => stakeholdersNotified.push('driver')).catch(() => {})
      );
    }

    // Travel agency — itinerary note.
    if (caseRecord.travel_vendor_id) {
      stakeTasks.push(
        base44.asServiceRole.entities.TravelAgency.get(caseRecord.travel_vendor_id)
          .then((agency: any) => agency?.email ? base44.asServiceRole.integrations.Core.SendEmail({
            from_name: BRAND, to: agency.email,
            subject: 'Schedule update affects a trip you support | Morales',
            body: linkOnlyEmail({
              from: 'handleCrisisReroute/travel',
              title: 'A provider change affects a trip you are supporting.',
              line: 'The procedure provider for this trip changed. The flight, hotel, and transfer legs are unchanged. Open your portal for current details.',
              ctaLabel: 'Open Your Portal',
              ctaUrl: `${APP_URL}/portal/travel`,
            }),
          }) : null)
          .then(() => stakeholdersNotified.push('travel_agency'))
          .catch(() => {})
      );
    }

    // Companion — updated itinerary.
    if (caseRecord.companion_email) {
      stakeTasks.push(
        base44.asServiceRole.integrations.Core.SendEmail({
          from_name: BRAND, to: caseRecord.companion_email,
          subject: 'Itinerary update for your trip | Morales',
          body: linkOnlyEmail({
            from: 'handleCrisisReroute/companion',
            title: 'The provider for this trip changed.',
            line: 'The procedure provider was replaced; everything else stays the same. Open your dashboard for the current itinerary.',
            ctaLabel: 'Open Companion Dashboard',
            ctaUrl: `${APP_URL}/companion-dashboard`,
          }),
        }).then(() => stakeholdersNotified.push('companion')).catch(() => {})
      );
    }

    // Admin — always. Email + SMS if escalated.
    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    if (adminEmail) {
      stakeTasks.push(
        base44.asServiceRole.integrations.Core.SendEmail({
          from_name: BRAND, to: adminEmail,
          subject: `${humanEscalated ? '🚨' : 'ℹ️'} Crisis reroute ${humanEscalated ? 'escalated' : 'resolved'} — ${escapeHtml(caseRecord.client_name || 'patient')}`,
          body: linkOnlyEmail({
            from: 'handleCrisisReroute/admin',
            title: `Crisis reroute: ${crisis_type}${humanEscalated ? ' (human escalation)' : ' (auto-resolved)'}`,
            line: `Patient: ${escapeHtml(caseRecord.client_name || 'Unknown')} | Case: ${escapeHtml(String(caseRecord.id).slice(-8))}. ${humanReason || 'Backup assigned and patient notified.'} Open the admin console for the full audit trail.`,
            ctaLabel: 'Open Admin Console',
            ctaUrl: `${APP_URL}/admin`,
          }),
        }).then(() => stakeholdersNotified.push('admin')).catch(() => {})
      );
    }
    if (humanEscalated) {
      const adminPhone = Deno.env.get('ADMIN_PHONE');
      if (adminPhone) {
        stakeTasks.push(
          sendSms(adminPhone, `CRISIS ${crisis_type} — ${caseRecord.client_name || 'patient'} (case ${String(caseRecord.id).slice(-8)}). ${humanReason}. Check admin console.`)
            .then(() => stakeholdersNotified.push('admin_sms')).catch(() => {})
        );
      }
    }

    await Promise.allSettled(stakeTasks);

    audit.push(auditEntry('PATIENT_NOTIFIED', 'system', `Message sent (${stakeholdersNotified.filter(s => s.startsWith('patient')).join(', ') || 'none'}).`));
    audit.push(auditEntry('STAKEHOLDERS_NOTIFIED', 'system', stakeholdersNotified.join(', ') || 'none'));

    // 7. Finalize the CrisisReroute record.
    const resolvedAt = new Date();
    const resolutionSeconds = Math.round((resolvedAt.getTime() - detectedAt.getTime()) / 1000);
    const allStakeholders = stakeholdersNotified.length > 0;

    await base44.asServiceRole.entities.CrisisReroute.update(reroute.id, {
      selected_backup_id: selectedBackup?.id || '',
      selected_backup_name: selectedBackup?.full_name || selectedBackup?.agency_name || selectedBackup?.contact_person || '',
      selected_backup_type: selectedType,
      selected_backup_cost_usd: selectedCost,
      cost_difference_usd: costDifference(selectedCost, caseRecord.treatment_cost || 0),
      patient_notified_at: patientNotifiedAt,
      patient_message: patientMessage,
      all_stakeholders_notified: allStakeholders,
      stakeholders_notified: stakeholdersNotified,
      timeline_preserved: timelinePreserved,
      resolution_time_seconds: resolutionSeconds,
      human_escalated: humanEscalated,
      human_escalated_reason: humanReason,
      status: humanEscalated ? 'human_escalated' : 'resolved',
      audit_log: audit,
    });

    // Mark the case in-flux so existing dashboards reflect it.
    try {
      await base44.asServiceRole.entities.CaseRecord.update(case_id, {
        case_priority: humanEscalated ? 'Critical' : (caseRecord.case_priority === 'Normal' ? 'Urgent' : caseRecord.case_priority),
        fallback_state: {
          in_flux: humanEscalated,
          in_flux_triggered_at: detectedAt.toISOString(),
          resolved_at: humanEscalated ? null : resolvedAt.toISOString(),
          primary_partner_type: original_provider_type || (crisis_type === 'DRIVER_NO_SHOW' ? 'taxi_service' : 'doctor'),
          primary_partner_name: original_provider_name || caseRecord.doctor_selected || '',
          escalation_reason: crisis_type,
          human_intervention_required: humanEscalated,
          audit_trail: audit,
        },
      });
    } catch (_) {}

    return Response.json({
      success: true,
      crisis_reroute_id: reroute.id,
      status: humanEscalated ? 'human_escalated' : 'resolved',
      human_escalated: humanEscalated,
      human_reason: humanReason,
      resolution_time_seconds: resolutionSeconds,
      selected_backup: selectedBackup ? {
        id: selectedBackup.id,
        name: selectedBackup.full_name || selectedBackup.agency_name || selectedBackup.contact_person,
        type: selectedType,
      } : null,
      patient_message: patientMessage,
      stakeholders_notified: stakeholdersNotified,
      timeline_preserved: timelinePreserved,
    });
  } catch (error) {
    console.error('[handleCrisisReroute]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});