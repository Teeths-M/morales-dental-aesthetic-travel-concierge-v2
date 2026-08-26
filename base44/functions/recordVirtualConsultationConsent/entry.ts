import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields, z } from '../../shared/validate.ts';
import { reviseAndUpdate } from '../../shared/reviseAndUpdate.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';

/**
 * recordVirtualConsultationConsent — the ONE place any of the 4 typed
 * consents on a VirtualConsultation is ever recorded. One function, four
 * hardcoded field-name branches (never a caller-supplied field name), so a
 * request for one consent type can never cross-write a different one —
 * recording_consent in particular must never be settable by a request that
 * named a different consent_type.
 */

const bodySchema = strictObject({
  virtual_consultation_id: Fields.shortText(100),
  consent_type: z.enum(['telehealth', 'ai_notes', 'translation_captions', 'recording']),
  granted: z.boolean(),
});

const FIELD_MAP: Record<string, { flag: string; at: string; version?: string }> = {
  telehealth: { flag: 'telehealth_consent', at: 'telehealth_consent_at', version: 'telehealth_consent_version' },
  ai_notes: { flag: 'ai_notes_consent', at: 'ai_notes_consent_at' },
  translation_captions: { flag: 'translation_captions_consent', at: 'translation_captions_consent_at' },
  recording: { flag: 'recording_consent', at: 'recording_consent_at' },
};

const CONSENT_VERSION = '1.0';

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { virtual_consultation_id, consent_type, granted } = await body<{
    virtual_consultation_id: string; consent_type: string; granted: boolean;
  }>();

  const vc = await base44.asServiceRole.entities.VirtualConsultation.get(virtual_consultation_id).catch(() => null);
  if (!vc) return err('Consultation not found', 404);

  const isPatient = user!.email === vc.client_email;
  const isDoctor = user!.email === vc.doctor_email;
  if (!isPatient && !isDoctor && !['admin', 'platform_admin'].includes(user!.role)) return err('Forbidden', 403);

  const mapping = FIELD_MAP[consent_type];
  if (!mapping) return err('Unknown consent_type', 400);

  const nowISO = new Date().toISOString();
  const patch: Record<string, unknown> = {
    [mapping.flag]: granted,
    [mapping.at]: granted ? nowISO : '',
  };
  if (mapping.version) patch[mapping.version] = granted ? CONSENT_VERSION : '';

  await reviseAndUpdate(base44, 'VirtualConsultation', virtual_consultation_id, patch, {
    actor: user!.email, reason: `${consent_type} consent ${granted ? 'granted' : 'withdrawn'}`,
  });

  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'virtual_consultation_consent_recorded',
    actor_id: user!.id, actor_role: user!.role || 'user', actor_name: user!.full_name || '', actor_email: user!.email || '',
    resource_type: 'VirtualConsultation', resource_id: virtual_consultation_id, case_id: vc.case_id || null,
    sensitive: true, timestamp: nowISO,
    details: { consent_type, granted },
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  return ok({ virtual_consultation_id, consent_type, granted });
}, { name: 'recordVirtualConsultationConsent', requireAuth: true, bodySchema }));
