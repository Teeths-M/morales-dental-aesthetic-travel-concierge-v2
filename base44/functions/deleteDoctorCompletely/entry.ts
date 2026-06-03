import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const doctor_id = body.doctor_id || body.event?.entity_id || body.data?.id || body.old_data?.id;
    const isDeleteAutomation = body.event?.type === 'delete' && body.event?.entity_name === 'Doctor';

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
  } catch (error) {
    console.error('Error deleting doctor:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});