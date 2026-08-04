import { linkOnlyEmail } from './notify.ts';
import { escapeHtml } from './emailTemplate.ts';

const BRAND = 'Morales Medical Travel Safety';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

/**
 * findCompanionBackup — the single real implementation behind every
 * "this companion dropped the case" path: 24h silence
 * (checkPartnerSLABreaches) and an explicit cancel-after-confirming
 * (respondToCompanionJob) both call this. Unlike the pre-existing SLA
 * branch it replaces, this creates a real `offered` CompanionAssignment
 * for the backup — the previous version only emailed a generic
 * "check your dashboard" link with nothing specific for the companion to
 * accept.
 */
export async function findCompanionBackup(
  base44: any,
  caseRecord: Record<string, any>,
  excludeCompanionId?: string,
) {
  const companions = await base44.asServiceRole.entities.Companion.filter({
    status: 'active', verification_status: 'verified', is_available: true,
  }).catch(() => []);
  const backup = (companions as any[]).find((cp: any) => cp.id !== excludeCompanionId);

  if (!backup?.email) {
    await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, {
      companion_requirement_status: 'companion_required_pending',
    }).catch(() => {});
    return { success: false };
  }

  const patientFirstName = (caseRecord.client_name || 'Your patient').split(' ')[0];

  const assignment = await base44.asServiceRole.entities.CompanionAssignment.create({
    case_id: caseRecord.id,
    companion_id: backup.id,
    companion_name: backup.full_name,
    companion_email: backup.email,
    patient_id: caseRecord.client_id || caseRecord.id,
    patient_name: caseRecord.client_name || '',
    patient_first_name: patientFirstName,
    destination_country: caseRecord.procedure_country || '',
    hotel_name: caseRecord.hotel_name || '',
    departure_date: caseRecord.departure_date || '',
    arrival_date: caseRecord.departure_date || '',
    package_fee: caseRecord.companion_cost || 650,
    status: 'offered',
  }).catch(() => null);

  await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, {
    sla_breached_companion: true,
    companion_requirement_status: 'pending',
  }).catch(() => {});

  await base44.asServiceRole.integrations.Core.SendEmail({
    from_name: BRAND,
    to: backup.email,
    subject: `Urgent: a care assignment needs an answer | ${BRAND}`,
    body: linkOnlyEmail({
      from: 'findCompanionBackup',
      title: 'Urgent: a care assignment needs an answer.',
      line: 'A recovery support assignment needs an answer urgently — the companion first assigned did not respond in time or is no longer available. Open your dashboard to review and accept it.',
      ctaLabel: 'Open Companion Dashboard',
      ctaUrl: `${APP_URL}/companion-dashboard`,
    }),
  }).catch(() => {});

  const adminEmail = Deno.env.get('ADMIN_EMAIL');
  if (adminEmail) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND,
      to: adminEmail,
      subject: `A companion assignment was automatically backed up | ${BRAND}`,
      body: linkOnlyEmail({
        from: 'findCompanionBackup/admin',
        title: 'A companion dropped a case and a backup was offered automatically.',
        line: 'A companion did not respond in time or cancelled after confirming, and a backup has been offered the assignment automatically. Open the admin console for the case detail.',
        ctaLabel: 'Open Admin Console',
        ctaUrl: `${APP_URL}/admin/cases`,
      }),
    }).catch(() => {});
  }

  return { success: true, companion: backup, assignment };
}
