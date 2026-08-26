import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields, z } from '../../shared/validate.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';

/**
 * reportConsultationConcern — the "report concern" button. Ownership derived
 * server-side, never from the body. Deliberately does NOT synchronously
 * suspend the doctor's booking eligibility — only sweepProviderBookingEligibility's
 * deterministic threshold check can do that, so one report can't be
 * weaponized into an instant suspension.
 */

const bodySchema = strictObject({
  doctor_id: Fields.shortText(100),
  virtual_consultation_id: Fields.shortText(100).optional().default(''),
  category: z.enum(['conduct', 'safety', 'billing', 'identity_mismatch', 'no_show', 'technical', 'other']),
  description: Fields.shortText(3000),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional().default('low'),
});

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { doctor_id, virtual_consultation_id, category, description, severity } = await body<{
    doctor_id: string; virtual_consultation_id?: string; category: string; description: string; severity: string;
  }>();

  const doctor = await base44.asServiceRole.entities.Doctor.get(doctor_id).catch(() => null);
  if (!doctor) return err('Provider not found', 404);

  let caseId: string | null = null;
  if (virtual_consultation_id) {
    const vc = await base44.asServiceRole.entities.VirtualConsultation.get(virtual_consultation_id).catch(() => null);
    if (vc && (vc.client_email === user!.email || vc.doctor_email === user!.email || ['admin', 'platform_admin'].includes(user!.role))) {
      caseId = vc.case_id || null;
    }
  }

  const nowISO = new Date().toISOString();
  const report = await base44.asServiceRole.entities.ProviderConcernReport.create({
    doctor_id,
    doctor_email: doctor.email,
    reported_by_email: user!.email,
    case_id: caseId || '',
    virtual_consultation_id: virtual_consultation_id || '',
    category,
    description,
    severity,
    status: 'submitted',
    created_at: nowISO,
  });

  const adminEmail = Deno.env.get('ADMIN_EMAIL');
  if (adminEmail) {
    const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Morales Medical Travel Safety', to: adminEmail,
      subject: `[${severity.toUpperCase()}] A concern was reported about a provider | Morales`,
      body: `<h2>Provider concern report</h2><p><strong>Category:</strong> ${category}</p><p><strong>Severity:</strong> ${severity}</p><p>A report has been filed and needs review.</p><p><a href="${appUrl}/admin">Open Admin Console</a></p>`,
    }).catch(() => {});
  }

  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'provider_concern_reported',
    actor_id: user!.id, actor_role: user!.role || 'user', actor_name: user!.full_name || '', actor_email: user!.email || '',
    resource_type: 'ProviderConcernReport', resource_id: report.id, case_id: caseId,
    sensitive: true, timestamp: nowISO,
    details: { doctor_id, category, severity },
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  return ok({ report_id: report.id, status: 'submitted' });
}, { name: 'reportConsultationConcern', requireAuth: true, bodySchema }));
