import { createHandler } from '../../shared/createHandler.ts';

Deno.serve(createHandler(async ({ base44, user, body }) => {
    // `const body = await body()` shadowed the destructured `body` parameter —
    // a SyntaxError ("Identifier 'body' has already been declared"), so this
    // file could never even parse, let alone run. Renamed the local.
    const payload = await body();
    const doctor_id = payload.doctor_id || payload.event?.entity_id || payload.data?.id || payload.old_data?.id;
    const isDeleteAutomation = payload.event?.type === 'delete' && payload.event?.entity_name === 'Doctor';

    if (!doctor_id) {
      return Response.json({ error: 'doctor_id is required' }, { status: 400 });
    }

    // Delete all DoctorSpecialty records for this doctor
    const specialties = await base44.asServiceRole.entities.DoctorSpecialty.filter({ doctor_id });
    for (const spec of specialties || []) {
      await base44.asServiceRole.entities.DoctorSpecialty.delete(spec.id);
    }

    // Delete all DoctorPricing records for this doctor
    const pricings = await base44.asServiceRole.entities.DoctorPricing.filter({ doctor_id });
    for (const pricing of pricings || []) {
      await base44.asServiceRole.entities.DoctorPricing.delete(pricing.id);
    }

    // Manual calls delete the Doctor record; delete automations run after the Doctor is already deleted.
    if (!isDeleteAutomation) {
      await base44.asServiceRole.entities.Doctor.delete(doctor_id);
    }

    return Response.json({ 
      success: true, 
      message: `Doctor ${doctor_id} and related records cleaned up successfully` 
    });
}, { name: 'deleteDoctorCompletely', allowedRoles: ['admin', 'platform_admin'] }));
