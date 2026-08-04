import { linkOnlyEmail } from './notify.ts';
import { escapeHtml } from './emailTemplate.ts';
import { pickBestDoctor } from './pickBestDoctor.ts';

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

  return { success: true, doctor: nextDoctor };
}
