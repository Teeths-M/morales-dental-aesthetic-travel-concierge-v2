import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields } from '../../shared/validate.ts';
import { createMeetingToken } from '../../shared/dailyVideoAdapter.ts';
import { guardedStatusUpdate, canTransition } from '../../shared/virtualConsultationState.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';

/**
 * joinVirtualConsultation — mints a fresh, never-persisted Daily meeting
 * token scoped to the real caller's role. Ownership-checked: only the
 * patient or the doctor on this exact booking may join.
 */

const bodySchema = strictObject({ virtual_consultation_id: Fields.shortText(100) });

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { virtual_consultation_id } = await body<{ virtual_consultation_id: string }>();

  const vc = await base44.asServiceRole.entities.VirtualConsultation.get(virtual_consultation_id).catch(() => null);
  if (!vc) return err('Consultation not found', 404);

  const isPatient = user!.email === vc.client_email;
  const isDoctor = user!.email === vc.doctor_email;
  const isAdmin = ['admin', 'platform_admin'].includes(user!.role);
  if (!isPatient && !isDoctor && !isAdmin) return err('Forbidden', 403);

  if (!vc.video_configured || !vc.video_room_name) {
    return ok({
      supported: false,
      message: 'Live video isn\'t active for this consultation yet — please check back or contact your care team.',
    });
  }

  const token = await createMeetingToken(vc.video_room_name, {
    isOwner: isDoctor || isAdmin,
    userName: isDoctor ? (vc.doctor_name || 'Doctor') : (vc.client_name || 'Patient'),
  });

  if (!token.supported) {
    return ok({ supported: false, message: token.message });
  }

  if (canTransition(vc.status, 'in_progress')) {
    await guardedStatusUpdate(base44, virtual_consultation_id, 'in_progress').catch(() => {});
  }

  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'virtual_consultation_joined',
    actor_id: user!.id, actor_role: user!.role || 'user', actor_name: user!.full_name || '', actor_email: user!.email || '',
    resource_type: 'VirtualConsultation', resource_id: virtual_consultation_id, case_id: vc.case_id || null,
    sensitive: false, timestamp: new Date().toISOString(),
    details: { role: isDoctor ? 'doctor' : 'patient' },
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  return ok({
    supported: true,
    room_url: vc.video_room_url,
    token: token.token,
    expires_at: token.expires_at,
  });
}, { name: 'joinVirtualConsultation', requireAuth: true, bodySchema }));
