/**
 * welcomeHomeSafe
 *
 * Fires when the patient has returned home after their procedure.
 * Triggered by admin/concierge confirming home arrival, or by the
 * automated journey pipeline when flight arrival time has passed.
 *
 * What it does:
 *   1. Sends a personal "you made it home" email to the patient
 *   2. SMS to guardian/emergency contact confirming safe arrival
 *   3. Transitions case status → HOME_SAFE
 *   4. Reminds patient that M is still watching through recovery
 *   5. Logs to AuditLog
 */

import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { computePrevHash } from '../_shared/auditHashChain.ts';

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
  }).catch(e => console.warn('[welcomeHomeSafe] SMS failed:', e.message));
}

function buildPatientEmail(name: string, nextCheckinHours: number): string {
  const firstName = name?.split(' ')[0] || name || 'there';
  return `
Dear ${firstName},

You made it home.

That took courage — travelling abroad, trusting a new team, going through a procedure far from everything familiar. You did it. And we were with you every step of the way.

M is still with you.

Your recovery is being monitored. Our team will check in with you every ${nextCheckinHours} hours. If you feel anything concerning before your next check-in — pain, swelling, unusual symptoms — do not wait. Open the Morales app and tap Secure Line. We respond immediately, day or night.

What to expect over the next days:
  • Gentle check-in messages from your care team
  • If you miss a check-in, we will follow up — this is not optional
  • Your doctor's notes and aftercare instructions are in your case file
  • If your pain level reaches 8 or above at any point, escalate immediately

You went further than most people ever will to take care of yourself. That matters.

Rest. Heal. We are here.

— Your Morales Care Team

───────────────────────────────────
Need help right now? Open the app → Secure Line
Case reference available in your client portal
`.trim();
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const { case_id } = await body<{ case_id: string }>();

  if (!case_id) return err('case_id is required');

  const caseRecord = await base44.asServiceRole.entities.CaseRecord
    .get(case_id)
    .catch(() => null);

  if (!caseRecord) return err('Case not found', 404);

  const allowedPriorStatuses = ['RECOVERY_PHASE_7_DAY', 'POST_PROCEDURE', 'IN_FLIGHT_HOME'];
  if (!allowedPriorStatuses.includes(caseRecord.status)) {
    return err(
      `Cannot send home-safe greeting from status "${caseRecord.status}". Expected one of: ${allowedPriorStatuses.join(', ')}`,
      409,
    );
  }

  const now = new Date().toISOString();
  const patientName  = caseRecord.client_name  || caseRecord.client_email || 'Patient';
  const patientEmail = caseRecord.client_email  || '';
  const guardianPhone = caseRecord.guardian_phone
    || caseRecord.emergency_contact?.phone
    || null;
  const guardianEmail = caseRecord.guardian_email
    || caseRecord.emergency_contact?.email
    || null;
  const guardianName  = caseRecord.emergency_contact?.name || 'Emergency Contact';

  // Infer check-in interval from active RecoverySession for the reminder text
  const sessions = await base44.asServiceRole.entities.RecoverySession
    .filter({ case_id, is_active: true })
    .catch(() => []);
  const activeSession = (sessions || [])[0] || null;
  const nextCheckinHours = activeSession?.checkin_interval_hours || 8;

  // ── 1. Patient email ──────────────────────────────────────────────────────────
  if (patientEmail) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Morales Care Team',
      to: patientEmail,
      subject: `${patientName.split(' ')[0]}, you made it home. M is still with you.`,
      body: buildPatientEmail(patientName, nextCheckinHours),
    }).catch(e => console.error('[welcomeHomeSafe] patient email failed:', e?.message));
  }

  // ── 2. Guardian SMS ───────────────────────────────────────────────────────────
  const firstName = patientName.split(' ')[0];
  if (guardianPhone) {
    await sendSms(
      guardianPhone,
      `Morales: ${firstName} has arrived home safely. Recovery monitoring continues. Your Morales care team is watching. — Morales Concierge`,
    );
  }

  // ── 3. Guardian email (if no phone or as supplement) ─────────────────────────
  if (guardianEmail) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Morales Care Team',
      to: guardianEmail,
      subject: `${firstName} is home safe`,
      body: `Dear ${guardianName},\n\n${firstName} has arrived home safely after their procedure.\n\nMorales recovery monitoring remains active. If we detect anything concerning, you will be the first to know.\n\nThank you for being their support through this journey.\n\n— Morales Care Team`,
    }).catch(e => console.error('[welcomeHomeSafe] guardian email failed:', e?.message));
  }

  // ── 4. Case status → HOME_SAFE ────────────────────────────────────────────────
  const updatedTimeline = [
    ...(caseRecord.timeline_log || []),
    {
      timestamp: now,
      action: 'home_safe_confirmed',
      details: `Patient confirmed home safe. Welcome home greeting sent${guardianPhone ? ' + guardian SMS' : ''}${guardianEmail ? ' + guardian email' : ''}. Recovery monitoring active.`,
      performed_by: 'system:welcomeHomeSafe',
      non_repudiable: true,
    },
  ];

  await base44.asServiceRole.entities.CaseRecord.update(case_id, {
    status: 'HOME_SAFE',
    home_safe_confirmed_at: now,
    timeline_log: updatedTimeline,
  }).catch(e => console.error('[welcomeHomeSafe] case update failed:', e?.message));

  // ── 5. AuditLog ───────────────────────────────────────────────────────────────
  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'home_safe_confirmed',
    resource_type: 'case_record',
    resource_id: case_id,
    actor_id: 'system',
    actor_name: 'welcomeHomeSafe',
    case_id,
    details: {
      patient_name: patientName,
      patient_email: patientEmail,
      guardian_sms_sent: !!guardianPhone,
      guardian_email_sent: !!guardianEmail,
      recovery_session_active: !!activeSession,
      next_checkin_hours: nextCheckinHours,
    },
    sensitive: false,
    timestamp: now,
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  return ok({
    success: true,
    case_id,
    patient_email: patientEmail,
    guardian_sms_sent: !!guardianPhone,
    guardian_email_sent: !!guardianEmail,
    new_status: 'HOME_SAFE',
    home_safe_confirmed_at: now,
    recovery_monitoring_active: !!activeSession,
  });

}, { name: 'welcomeHomeSafe', requireAuth: true, allowedRoles: ['admin', 'platform_admin'] }));
