import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields, z } from '../../shared/validate.ts';
import { reviseAndUpdate } from '../../shared/reviseAndUpdate.ts';
import { logJourneyEvent } from '../../shared/logJourneyEvent.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';

/**
 * submitConsultationPlan — the doctor's real, written post-call plan, feeding
 * Decision Room's "clinician's written plan / included / excluded" section.
 * Ownership-checked (only the doctor on this exact booking, or an admin).
 */

const bodySchema = strictObject({
  virtual_consultation_id: Fields.shortText(100),
  summary: Fields.shortText(4000),
  included: z.array(Fields.shortText(300)).max(30).optional().default([]),
  excluded: z.array(Fields.shortText(300)).max(30).optional().default([]),
});

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { virtual_consultation_id, summary, included, excluded } = await body<{
    virtual_consultation_id: string; summary: string; included: string[]; excluded: string[];
  }>();

  const vc = await base44.asServiceRole.entities.VirtualConsultation.get(virtual_consultation_id).catch(() => null);
  if (!vc) return err('Consultation not found', 404);

  const isOwner = user!.email === vc.doctor_email;
  const isAdmin = ['admin', 'platform_admin'].includes(user!.role);
  if (!isOwner && !isAdmin) return err('Forbidden', 403);

  const nowISO = new Date().toISOString();
  await reviseAndUpdate(base44, 'VirtualConsultation', virtual_consultation_id, {
    doctor_plan_summary: summary,
    doctor_plan_included: included,
    doctor_plan_excluded: excluded,
    doctor_plan_submitted_at: nowISO,
  }, { actor: user!.email, reason: 'Doctor submitted post-consultation plan' });

  if (vc.case_id && vc.client_email) {
    await logJourneyEvent(base44, {
      case_id: vc.case_id,
      client_email: vc.client_email,
      event_type: 'virtual_consultation_decision_recorded',
      source: 'submitConsultationPlan',
      message_text: 'Your doctor has shared a written plan from your consultation. It\'s ready to review in your Decision Room.',
      priority: 'medium',
      action_taken: 'Doctor submitted a written post-consultation plan',
      tool_result: { virtual_consultation_id },
    });
  }

  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'virtual_consultation_plan_submitted',
    actor_id: user!.id, actor_role: user!.role || 'user', actor_name: user!.full_name || '', actor_email: user!.email || '',
    resource_type: 'VirtualConsultation', resource_id: virtual_consultation_id, case_id: vc.case_id || null,
    sensitive: true, timestamp: nowISO,
    details: { included_count: included.length, excluded_count: excluded.length },
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  return ok({ virtual_consultation_id, submitted_at: nowISO });
}, { name: 'submitConsultationPlan', requireAuth: true, allowedRoles: ['doctor', 'local_doctor', 'admin', 'platform_admin'], bodySchema }));
