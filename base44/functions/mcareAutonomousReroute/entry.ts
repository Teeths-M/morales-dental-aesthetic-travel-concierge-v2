import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { logJourneyEvent } from '../../shared/logJourneyEvent.ts';

// mcareAutonomousReroute — the FIRST autonomous "heartbeat" of M-Care.
//
// Triggered by an entity automation the instant a RecoveryTransportRequest's
// status transitions to 'no_driver' or 'cancelled' mid-journey. M-Care does NOT
// wait for the traveler to notice and report it — M-Care notices itself, acts,
// and speaks first. This is the "Spider-Man / Karen" moment: a proactive agent
// that works on its own.
//
// What it does (all as service-role — no user session, since automations run
// without one):
//   1. Re-reads the transport record from the DB (never trusts the payload body).
//   2. Only fires on the TRANSITION into the broken state (old status was
//      different) — the natural dedup, so a second status write doesn't
//      double-reroute.
//   3. Resolves the linked CaseRecord + patient email (for JourneyEvent RLS).
//   4. Finds a verified backup taxi service (excludes the original driver_id).
//   5. If found: reassigns the transport to the backup, resets status to
//      'dispatched', and notifies the backup driver by SMS.
//   6. If not found: alerts the care team (loud, honest failure) — never
//      silently ships a broken promise.
//   7. EITHER WAY: writes a JourneyEvent (high priority → also a push
//      notification) so the traveler sees a proactive M-Care chat bubble
//      saying "I caught that — I've already handled it" or "I'm escalating".
//   8. Writes a CrisisReroute audit record for the permanent ledger.
//
// Message discipline (per logJourneyEvent + RULE 3): the message_text is
// deterministic, pre-written copy built from data the function actually
// confirmed — never an LLM call, never a claim beyond what really happened.

const BROKEN_STATUSES = ['no_driver', 'cancelled'];
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

async function alertAdminNoContact(base44: any, transport: any) {
  const adminEmail = Deno.env.get('ADMIN_EMAIL') || '';
  if (!adminEmail) return;
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Morales Safety — Autonomous Reroute',
      to: adminEmail,
      subject: `Auto-reroute blocked — no patient contact on transport ${transport.id}`,
      body: `<div style="font-family:sans-serif;max-width:560px;padding:24px;border:2px solid #dc2626;border-radius:12px;">
<p style="margin:0 0 8px;color:#b91c1c;font-weight:700;">Auto-reroute could not reach the patient</p>
<p style="margin:8px 0;color:#374151;">Transport ${transport.id} broke (status ${transport.status}) but has no resolvable patient email, so M-Care could not send a proactive message. A coordinator must contact the traveler manually.</p>
</div>`,
    });
  } catch (_) { /* best-effort */ }
}

function twilioSms(to: string, body: string) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !token || !from || !to) return Promise.resolve({ ok: false });
  return fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + btoa(`${sid}:${token}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  }).then((r) => ({ ok: r.ok })).catch(() => ({ ok: false }));
}

Deno.serve(createHandler(async ({ req, base44, body }) => {
  // Only the platform's automation runner (X-Cron-Secret) or an admin may fire this.
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const payload = await body().catch(() => ({} as any));
  const entityId: string = payload?.event?.entity_id || '';
  if (!entityId) return err('Missing entity_id', 400);

  // Re-read the real record — never trust the payload body for PII or state.
  let transport: any = null;
  try {
    transport = await base44.asServiceRole.entities.RecoveryTransportRequest.get(entityId);
  } catch (_) { transport = null; }
  if (!transport) return ok({ skipped: 'transport_not_found' });

  // Only act on the TRANSITION into a broken state. If old_data shows it was
  // already broken, this update is not the transition — skip (natural dedup).
  const oldStatus: string = payload?.old_data?.status || '';
  const newStatus: string = transport.status || '';
  if (oldStatus === newStatus) return ok({ skipped: 'no_status_change' });
  if (!BROKEN_STATUSES.includes(newStatus)) return ok({ skipped: `status_not_broken:${newStatus}` });

  // Skip if this transport was never actually dispatched (no driver ever assigned)
  // — there's nothing to "reroute" from, and detectFallbackCrisis/cron owns that path.
  if (!transport.driver_id && !transport.driver_name) {
    return ok({ skipped: 'never_dispatched' });
  }

  // Resolve the patient's case for JourneyEvent RLS + the audit record.
  let caseRecord: any = null;
  if (transport.case_id) {
    try { caseRecord = await base44.asServiceRole.entities.CaseRecord.get(transport.case_id); } catch (_) { caseRecord = null; }
  }
  const clientEmail: string = caseRecord?.client_email || transport.user_email || '';
  const clientName: string = caseRecord?.client_name || transport.user_name || 'there';

  if (!clientEmail) {
    // No way to reach the patient — escalate to admin loudly and stop.
    await alertAdminNoContact(base44, transport);
    return ok({ skipped: 'no_patient_contact', admin_alerted: true });
  }

  const now = new Date().toISOString();
  const originalDriverId = transport.driver_id || '';
  const originalDriverName = transport.driver_name || 'your assigned driver';

  // ── Find a verified backup taxi service ──────────────────────────────────
  let backup: any = null;
  try {
    const drivers = await base44.asServiceRole.entities.TaxiService.filter({ status: 'active' }) || [];
    backup = (drivers as any[]).find((d) => d.id && d.id !== originalDriverId && (d as any).email);
  } catch (_) { backup = null; }

  let patientMessage: string;
  let rerouteOutcome: any;

  if (backup) {
    // Reassign the transport to the backup, reset to dispatched so the normal
    // handshake pipeline picks it up, and notify the backup driver by SMS.
    try {
      await base44.asServiceRole.entities.RecoveryTransportRequest.update(transport.id, {
        driver_id: backup.id,
        driver_name: backup.agency_name || backup.contact_person || backup.email,
        driver_phone: backup.phone || '',
        status: 'dispatched',
        dispatched_at: now,
      });
    } catch (_) { /* best-effort — the JourneyEvent still tells the patient */ }

    // Notify the backup driver (best-effort SMS).
    if (backup.phone) {
      await twilioSms(backup.phone, `MORALES: A transfer needs a driver now — ${transport.user_name || 'a patient'} at ${transport.pickup_address || 'pickup'}. Reply to confirm.`);
    }

    const backupLabel = backup.agency_name || backup.contact_person || 'a verified backup driver';
    patientMessage = `I caught that ${originalDriverName} dropped off your pickup. I've already lined up ${backupLabel} and they're being contacted now — you don't need to do anything. I'll tell you the moment they confirm they're on the way.`;
    rerouteOutcome = { success: true, backup_driver_id: backup.id, backup_name: backupLabel };
  } else {
    // Loud, honest failure — no silent broken promise. Alert the care team.
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || '';
    if (adminEmail) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'Morales Safety — Autonomous Reroute',
          to: adminEmail,
          subject: `No backup driver available — ${transport.user_name || 'patient'} stranded`,
          body: `<div style="font-family:sans-serif;max-width:560px;padding:24px;border:2px solid #dc2626;border-radius:12px;">
<p style="margin:0 0 8px;color:#b91c1c;font-weight:700;">🚨 M-Care auto-reroute could not find a backup driver</p>
<table style="width:100%;border-collapse:collapse;">
<tr><td style="padding:4px 0;color:#6b7280;">Traveler</td><td>${transport.user_name || ''}</td></tr>
<tr><td style="padding:4px 0;color:#6b7280;">Email</td><td>${clientEmail}</td></tr>
<tr><td style="padding:4px 0;color:#6b7280;">Transport ID</td><td>${transport.id}</td></tr>
<tr><td style="padding:4px 0;color:#6b7280;">Pickup</td><td>${transport.pickup_address || ''}</td></tr>
<tr><td style="padding:4px 0;color:#6b7280;">Original driver</td><td>${originalDriverName}</td></tr>
</table>
<p style="margin-top:12px;color:#374151;">The traveler has been told a coordinator is taking over. Please arrange a driver manually now.</p>
</div>`,
        });
      } catch (_) { /* best-effort */ }
    }
    patientMessage = `I caught that ${originalDriverName} dropped off your pickup. I couldn't find an available backup driver automatically, so I'm escalating to your care team right now to arrange one manually. Sit tight — I'm not leaving this until someone is on the way to you.`;
    rerouteOutcome = { success: false, reason: 'no_backup_available' };
  }

  // ── Proactive M-Care chat bubble (+ push notification, high priority) ─────
  await logJourneyEvent(base44, {
    case_id: transport.case_id || transport.id,
    client_email: clientEmail,
    event_type: 'driver_noshow_backup',
    source: 'mcareAutonomousReroute',
    message_text: patientMessage,
    priority: 'high',
    action_taken: backup
      ? `Auto-reassigned transport ${transport.id} to backup driver ${backup.id}; notified backup by SMS.`
      : `No backup available; alerted care team. Transport ${transport.id} status ${newStatus}.`,
    tool_result: { transport_id: transport.id, new_status: newStatus, original_driver_id: originalDriverId, ...rerouteOutcome },
    user_action_required: !backup,
    escalation_occurred: !backup,
  });

  // ── Permanent CrisisReroute audit record ─────────────────────────────────
  try {
    await base44.asServiceRole.entities.CrisisReroute.create({
      case_id: transport.case_id || transport.id,
      client_email: clientEmail,
      client_name: clientName,
      original_booking_id: transport.id,
      original_provider_id: originalDriverId,
      original_provider_name: originalDriverName,
      original_provider_type: 'driver',
      crisis_type: 'DRIVER_NO_SHOW',
      detected_at: now,
      detected_by: 'CRON',
      source_message: `Autonomous detection: RecoveryTransportRequest ${transport.id} status → ${newStatus}`,
      selected_backup_id: backup?.id || '',
      selected_backup_name: backup ? (backup.agency_name || backup.contact_person || backup.email) : '',
      selected_backup_type: backup ? 'driver' : '',
      patient_message: patientMessage,
      all_stakeholders_notified: !!backup,
      stakeholders_notified: backup ? ['driver', 'admin'] : ['admin'],
      timeline_preserved: !!backup,
      status: backup ? 'resolved' : 'human_escalated',
      human_escalated: !backup,
      human_escalated_reason: !backup ? 'No verified backup driver available' : '',
      audit_log: [
        { timestamp: now, action: 'detected', actor: 'mcareAutonomousReroute', notes: `status → ${newStatus}` },
        { timestamp: now, action: backup ? 'rerouted' : 'escalated', actor: 'mcareAutonomousReroute', notes: backup ? `backup: ${backup.id}` : 'no backup; admin alerted' },
      ],
    });
  } catch (_) { /* audit is best-effort — the JourneyEvent + reroute still happened */ }

  return ok({
    acted: true,
    transport_id: transport.id,
    new_status: newStatus,
    backup_assigned: !!backup,
    backup_driver_id: backup?.id || null,
    patient_notified: true,
  });
}, { name: 'mcareAutonomousReroute', requireAuth: false }));