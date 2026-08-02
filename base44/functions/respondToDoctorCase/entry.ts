import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { z, strictObject, Fields } from '../../shared/validate.ts';

const RespondToDoctorCaseSchema = strictObject({
  workflow_id: Fields.shortText(100),
  decision: z.enum(['confirmed', 'unavailable']),
});

// Same doctor-lookup pattern as getDoctorCases: resolve the caller's own
// Doctor record by their authenticated email, then confirm the WorkflowEvent
// is actually assigned to that doctor before writing — never trust a
// caller-supplied workflow id alone for a write.
Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { workflow_id, decision } = await body();
  if (!workflow_id || (decision !== 'confirmed' && decision !== 'unavailable')) {
    return err('workflow_id and a valid decision are required');
  }

  const doctors = await base44.asServiceRole.entities.Doctor.filter({ email: user.email });
  if (!doctors.length) return err('Doctor not found', 404);
  const doctor = doctors[0];

  const workflow = await base44.asServiceRole.entities.WorkflowEvent.get(workflow_id);
  if (!workflow || workflow.assigned_doctor_id !== doctor.id) {
    return err('Not assigned to this case', 403);
  }

  await base44.asServiceRole.entities.WorkflowEvent.update(workflow_id, decision === 'confirmed' ? {
    doctor_status: 'confirmed',
    doctor_confirmed_date: new Date().toISOString(),
    last_update_summary: 'Doctor confirmed availability.',
  } : {
    doctor_status: 'unavailable',
    last_update_summary: 'Doctor marked as unavailable.',
  });

  return ok({ success: true });
}, { name: 'respondToDoctorCase', requireAuth: true, allowedRoles: ['doctor'], bodySchema: RespondToDoctorCaseSchema }));
