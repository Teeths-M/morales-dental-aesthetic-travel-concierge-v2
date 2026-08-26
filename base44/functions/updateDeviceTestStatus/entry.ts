import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields } from '../../shared/validate.ts';
import { canTransition } from '../../shared/virtualConsultationState.ts';

/**
 * updateDeviceTestStatus — records that the CALLER (role derived server-side,
 * never from the body) completed their own camera/mic device check.
 */

const bodySchema = strictObject({ virtual_consultation_id: Fields.shortText(100) });

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { virtual_consultation_id } = await body<{ virtual_consultation_id: string }>();

  const vc = await base44.asServiceRole.entities.VirtualConsultation.get(virtual_consultation_id).catch(() => null);
  if (!vc) return err('Consultation not found', 404);

  const isPatient = user!.email === vc.client_email;
  const isDoctor = user!.email === vc.doctor_email;
  if (!isPatient && !isDoctor) return err('Forbidden', 403);

  const nowISO = new Date().toISOString();
  const patch: Record<string, unknown> = isPatient
    ? { device_test_completed_by_patient_at: nowISO }
    : { device_test_completed_by_doctor_at: nowISO };

  await base44.asServiceRole.entities.VirtualConsultation.update(virtual_consultation_id, {
    ...patch,
    updated_at: nowISO,
    ...(canTransition(vc.status, 'device_check_complete') ? { status: 'device_check_complete' } : {}),
  });

  return ok({ virtual_consultation_id, role: isPatient ? 'patient' : 'doctor' });
}, { name: 'updateDeviceTestStatus', requireAuth: true, bodySchema }));
