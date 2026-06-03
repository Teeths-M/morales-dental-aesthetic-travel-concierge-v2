import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (!data || !data.id) {
      return Response.json({ error: 'No doctor data' }, { status: 400 });
    }

    const doctor = data;

    // Check if doctor already has a partner record in Portal Hub
    const existingPartners = await base44.asServiceRole.entities.Partner.filter({ 
      type: 'doctor',
      name: doctor.full_name
    });

    if (existingPartners.length === 0) {
      // Create a Partner record for this doctor in Portal Hub
      await base44.asServiceRole.entities.Partner.create({
        type: 'doctor',
        name: doctor.full_name,
        email: doctor.email,
        phone: doctor.phone,
        notes: `${doctor.clinic_name || 'Clinic'} - ${doctor.clinic_country}`,
      });
    }

    return Response.json({ 
      success: true,
      message: `Doctor ${doctor.full_name} synced to Portal Hub`,
      doctor_id: doctor.id
    });
  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});