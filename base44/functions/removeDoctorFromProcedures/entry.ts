import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data } = await req.json();

    if (!data || !data.doctor_id) {
      return Response.json({ error: 'No doctor_id provided' }, { status: 400 });
    }

    // When a DoctorPricing is deleted, remove the associated DoctorSpecialty
    const specialties = await base44.asServiceRole.entities.DoctorSpecialty.filter({ 
      doctor_id: data.doctor_id
    });

    let deletedCount = 0;
    if (specialties.length > 0) {
      for (const specialty of specialties) {
        await base44.asServiceRole.entities.DoctorSpecialty.delete(specialty.id);
        deletedCount++;
      }
    }

    return Response.json({ 
      success: true,
      message: `Removed ${deletedCount} procedure(s) for doctor ${data.doctor_id}`
    });
  } catch (error) {
    console.error('Error removing doctor from procedures:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});