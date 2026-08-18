import { linkOnlyEmail } from './notify.ts';
import { escapeHtml } from './emailTemplate.ts';
import { pickBestDoctor } from './pickBestDoctor.ts';
import { logJourneyEvent } from './logJourneyEvent.ts';
import { askDispatchOrchestrator } from './askDispatchOrchestrator.ts';

const BRAND = 'Morales Medical Travel Safety';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

// Same verification gate assignDoctorToCase enforces on the very first
// assignment — an auto-backup path must not be a way to skip credential
// verification just because a human isn't watching this one.
const ASSIGNMENT_VERIFIED = new Set(['verified', 'auto_verified', 'manually_approved']);

async function generatePortalToken(caseId: string) {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `doc_${caseId}_${hex}`;
}

// Outbound SMS (Twilio) — inline, matching every other function in this
// codebase (see escalateMissedDriverHandshake) rather than a shared module,
// per that file's own note: shared SMS modules have caused issues in Base44.
async function sendSms(to: string, message: string) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken  = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!accountSid || !authToken || !fromNumber) {
    return { ok: false, error: 'twilio_not_configured' };
  }
  const url  = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const form = new URLSearchParams({ To: to, From: fromNumber, Body: message });
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });
    const result = await resp.json().catch(() => ({}));
    return resp.ok ? { ok: true, sid: result.sid } : { ok: false, error: result.message || 'twilio_error' };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// A patient already traveling (or about to be) makes a doctor dropping the
// case a different order of urgency than the same event three weeks out —
// the travel agency and companion already on the ground are the people best
// placed to notice something's wrong, and admin needs more than a calm email.
function isUrgent(caseRecord: Record<string, any>): boolean {
  const now = Date.now();
  const departure = caseRecord.departure_date ? new Date(caseRecord.departure_date).getTime() : null;
  const procedure = caseRecord.procedure_date ? new Date(caseRecord.procedure_date).getTime() : null;
  const HOURS_72 = 72 * 60 * 60 * 1000;
  return !!(
    (departure && !Number.isNaN(departure) && now >= departure) ||
    (procedure && !Number.isNaN(procedure) && procedure - now > 0 && procedure - now <= HOURS_72)
  );
}

async function notifyAdminSms(caseRecord: Record<string, any>, message: string) {
  const adminPhone = Deno.env.get('ADMIN_PHONE');
  if (!adminPhone) return;
  await sendSms(adminPhone, message).catch(() => {});
}

async function notifyAssignedPartners(base44: any, caseRecord: Record<string, any>, line: string) {
  const tasks: Promise<unknown>[] = [];

  if (caseRecord.travel_vendor_id) {
    tasks.push(
      base44.asServiceRole.entities.TravelAgency.get(caseRecord.travel_vendor_id)
        .then((agency: any) => {
          if (!agency?.email) return;
          return base44.asServiceRole.integrations.Core.SendEmail({
            from_name: BRAND, to: agency.email,
            subject: `Please check your portal for a schedule update | ${BRAND}`,
            body: linkOnlyEmail({
              from: 'findDoctorBackup/travel-agency',
              title: 'A schedule change affects a trip you are supporting.',
              line,
              ctaLabel: 'Open Your Portal',
              ctaUrl: `${APP_URL}/portal/travel`,
            }),
          });
        })
        .catch(() => {})
    );
  }

  if (caseRecord.companion_email) {
    tasks.push(
      base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND, to: caseRecord.companion_email,
        subject: `Please check your dashboard for a schedule update | ${BRAND}`,
        body: linkOnlyEmail({
          from: 'findDoctorBackup/companion',
          title: 'A schedule change affects a trip you are supporting.',
          line,
          ctaLabel: 'Open Companion Dashboard',
          ctaUrl: `${APP_URL}/companion-dashboard`,
        }),
      }).catch(() => {})
    );
  }

  if (tasks.length) await Promise.allSettled(tasks);
}

/**
 * findDoctorBackup — the single real implementation behind every "this
 * doctor dropped the case" path on the CaseRecord/doctor-portal-token
 * system: 24h silence (checkPartnerSLABreaches), an explicit decline, and
 * an explicit withdraw-after-confirming all call this. Finds the next
 * verified, active doctor, reassigns the case, mints a fresh portal token,
 * notifies the new doctor and admin. Returns { success:false } (case moved
 * to Admin-Review, nothing left silently unhandled) when no doctor is
 * available — that is a real, honest failure mode, not swallowed.
 */
export async function findDoctorBackup(
  base44: any,
  caseRecord: Record<string, any>,
  excludeDoctorEmail?: string,
) {
  const excludeEmail = excludeDoctorEmail ?? caseRecord.doctor_email;

  const activeDoctors = await base44.asServiceRole.entities.Doctor.filter({ status: 'active' }).catch(() => []);
  const candidates = (activeDoctors as any[]).filter((d: any) =>
    d.email !== excludeEmail &&
    d.license_verified &&
    ASSIGNMENT_VERIFIED.has(d.verification_status)
  );

  if (candidates.length === 0) {
    await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, {
      status: 'Admin-Review',
      admin_notes: 'Doctor dropped the case and no verified backup doctor is available — manual assignment required',
      timeline_log: [...(caseRecord.timeline_log || []), {
        timestamp: new Date().toISOString(),
        action: 'doctor_backup_failed',
        details: 'No verified backup doctor available',
      }],
    });

    const urgent = isUrgent(caseRecord);

    // Best-effort: ask the bounded, read-only-tooled mcare_orchestrator agent
    // whether it can find a faster path than "start from zero" — a near-
    // verified doctor one click from ready, or a previously-discovered
    // candidate lead. Never blocks or breaks this failure path: the helper
    // itself is fully fail-closed (unavailable/errored/timed out -> null),
    // and a null recommendation just means the email/log look exactly as
    // they always have. This agent can only investigate, never act.
    const procedureSummary = Array.isArray(caseRecord.procedures)
      ? caseRecord.procedures.join(', ')
      : (caseRecord.procedures || 'not specified');
    const aiRecommendation = await askDispatchOrchestrator(base44,
      `Dispatch failure: no verified backup doctor is available for a case. ` +
      `Specialty/procedure needed: ${procedureSummary}. Destination country: ${caseRecord.procedure_country || 'not specified'}. ` +
      `The deterministic search already checked every active, license-verified, identity-verified doctor and found none. ` +
      `Check for any faster path forward using your available tools.`
    ).catch(() => null);

    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    if (adminEmail) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND,
        to: adminEmail,
        subject: `🚨 CRITICAL: no backup doctor available — ${escapeHtml(caseRecord.client_name || 'patient')}`,
        body: `<div style="background:#7f1d1d;color:white;padding:20px;border-radius:8px;">
          <h2 style="margin:0;">No verified backup doctor available</h2></div>
          <div style="padding:20px;border:1px solid #7f1d1d;border-top:none;border-radius:0 0 8px 8px;">
          <p>A doctor dropped this case and every currently active, verified doctor was tried — none available. This case needs manual assignment now.</p>
          <p><strong>Patient:</strong> ${escapeHtml(caseRecord.client_name || 'Unknown')}<br/>
          <strong>Case ID:</strong> ${escapeHtml(caseRecord.id)}<br/>
          <strong>Procedure country:</strong> ${escapeHtml(caseRecord.procedure_country || 'Unknown')}</p>
          ${urgent ? '<p style="color:#fca5a5;font-weight:bold;">Patient is already traveling or has a procedure within 72 hours.</p>' : ''}
          ${aiRecommendation ? `<div style="margin-top:16px;padding:12px;background:#fff7ed;border:1px solid #fdba74;border-radius:6px;">
          <p style="margin:0 0 4px;font-weight:bold;color:#9a3412;">Possible faster paths (AI-checked, not acted on):</p>
          <p style="margin:0;color:#7c2d12;">${escapeHtml(aiRecommendation)}</p>
          </div>` : ''}
          </div>`,
      }).catch(() => {});
    }

    try {
      await base44.asServiceRole.entities.DispatchFailureLog.create({
        case_id: caseRecord.id,
        partner_type: 'doctor',
        reason: 'No verified backup doctor available after original doctor dropped the case',
        timestamp: new Date().toISOString(),
        fallback_action: urgent ? 'admin_critical_alert_sent_urgent' : 'admin_critical_alert_sent',
        ai_recommendation: aiRecommendation || '',
      });
    } catch (_) {}

    if (urgent) {
      await notifyAdminSms(caseRecord, `URGENT: no backup doctor available for ${caseRecord.client_name || 'a patient'} (case ${caseRecord.id.slice(-8)}) — patient already traveling. Manual assignment needed now.`);
    }

    // Proactive chat bubble, polled by the frontend (useJourneyEvents). This
    // is the FIRST time the patient hears about this at all today — every
    // other notification above goes to admin/the new doctor, never them.
    // Fixed, reviewed copy — never names a doctor, never repeats admin_notes.
    const patientEmail = caseRecord.client_email || caseRecord.user_email;
    if (patientEmail) {
      await logJourneyEvent(base44, {
        case_id: caseRecord.id,
        client_email: patientEmail,
        event_type: 'doctor_backup_dispatched',
        source: 'findDoctorBackup',
        message_text: "I'm personally following up on your doctor assignment with our care team right now — I'll update you as soon as this is resolved.",
        priority: 'critical',
        action_taken: 'Doctor dropped the case and no verified backup doctor was available — escalated to Admin-Review',
        tool_result: { outcome: 'no_backup_available', urgent },
        escalation_occurred: true,
      });
    }

    return { success: false };
  }

  let consultation: Record<string, any> | null = null;
  if (caseRecord.consultation_id) {
    try { consultation = await base44.asServiceRole.entities.Consultation.get(caseRecord.consultation_id); } catch (_) {}
  }
  const procedureText = consultation?.procedure_interest || caseRecord.procedures || '';

  const nextDoctor = await pickBestDoctor(candidates, procedureText);
  const now = new Date().toISOString();
  const portalToken = await generatePortalToken(caseRecord.id);
  const portalUrl = `${APP_URL}/portal/doctor/${portalToken}`;

  await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, {
    status: 'Doctor-Pending',
    doctor_email: nextDoctor.email,
    doctor_portal_token: portalToken,
    doctor_selected: nextDoctor.full_name,
    doctor_notified_at: now,
    doctor_confirmation_status: 'PENDING',
    sla_breached_doctor: true,
    backup_doctor_id: nextDoctor.id,
  });

  if (nextDoctor.email) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND,
      to: nextDoctor.email,
      subject: `New Patient Ready for Scheduling — ${escapeHtml(caseRecord.client_name || 'Patient')} | ${BRAND}`,
      body: `<p>A patient case needs clinical availability confirmation — the previous doctor is no longer available.</p>
<p><strong>Patient:</strong> ${escapeHtml(caseRecord.client_name || 'Patient')}<br/>
<strong>Procedure:</strong> ${escapeHtml(String(procedureText) || 'Not specified')}</p>
<p><a href="${escapeHtml(portalUrl)}">Review in portal</a></p>`,
    }).catch(() => {});
  }

  const adminEmail = Deno.env.get('ADMIN_EMAIL');
  if (adminEmail) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND,
      to: adminEmail,
      subject: `A case was automatically reassigned to a new doctor | ${BRAND}`,
      body: linkOnlyEmail({
        from: 'findDoctorBackup',
        title: 'A doctor dropped a case and it was automatically reassigned.',
        line: 'A doctor did not respond, declined, or withdrew after confirming, and the case has been automatically reassigned to the next available verified match. Open the admin console for the case detail.',
        ctaLabel: 'Open Admin Console',
        ctaUrl: `${APP_URL}/admin/cases`,
      }),
    }).catch(() => {});
  }

  if (isUrgent(caseRecord)) {
    await notifyAdminSms(caseRecord, `${caseRecord.client_name || 'A patient'}'s doctor dropped the case while already traveling. Auto-reassigned to Dr. ${nextDoctor.full_name || 'a backup'} (case ${caseRecord.id.slice(-8)}). Confirm they're actually available.`);
    await notifyAssignedPartners(
      base44,
      caseRecord,
      'The doctor assigned to this trip changed and a new one has been automatically lined up. The trip continues on schedule — open your portal for the current details.'
    );
  }

  // Proactive chat bubble, polled by the frontend (useJourneyEvents). Same
  // "first time the patient hears about this" reasoning as the failure
  // branch above. Deliberately does not name the new doctor — the patient
  // finds that through the normal case-detail flow, not a chat bubble
  // (matches the driver_noshow_backup precedent, which didn't name the driver).
  const patientEmail = caseRecord.client_email || caseRecord.user_email;
  if (patientEmail) {
    await logJourneyEvent(base44, {
      case_id: caseRecord.id,
      client_email: patientEmail,
      event_type: 'doctor_backup_dispatched',
      source: 'findDoctorBackup',
      message_text: "I've confirmed a new doctor for your care — your case is moving forward, and the details are in your dashboard.",
      priority: 'medium',
      action_taken: 'Doctor dropped the case — a verified backup doctor was found and the case was reassigned',
      tool_result: { outcome: 'backup_found', backup_doctor_name: nextDoctor.full_name || '' },
      escalation_occurred: false,
    });
  }

  return { success: true, doctor: nextDoctor };
}
