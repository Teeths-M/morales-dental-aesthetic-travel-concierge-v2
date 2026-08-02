import { createHandler } from '../../shared/createHandler.ts';

Deno.serve(createHandler(async ({ base44, user, body }) => {
    // SECURITY: Only doctors may access this endpoint
    if (user.role !== 'doctor') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Look up the doctor record by the authenticated user's email — never trust a
    // caller-supplied doctor_id. This guarantees doctors only see their own cases.
    const doctors = await base44.asServiceRole.entities.Doctor.filter({ email: user.email });
    if (!doctors.length) return Response.json({ error: 'Doctor not found' }, { status: 404 });

    const doctor = doctors[0];

    // Filter cases to only those explicitly assigned to this doctor
    const workflows = await base44.asServiceRole.entities.WorkflowEvent.filter({
      assigned_doctor_id: doctor.id,
    });

    const consultationResults = await Promise.allSettled(
      workflows.map(wf => base44.asServiceRole.entities.Consultation.get(wf.consultation_id))
    );

    const consultations = consultationResults
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);

    return Response.json({ doctor, consultations, workflows });
}, { name: 'getDoctorCases' }));
