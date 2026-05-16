import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
      partner_type: 'doctor',
      reference_id: doctor.id 
    });

    if (existingPartners.length === 0) {
      // Create a Partner record for this doctor in Portal Hub
      await base44.asServiceRole.entities.Partner.create({
        partner_type: 'doctor',
        reference_id: doctor.id,
        name: doctor.full_name,
        email: doctor.email,
        phone: doctor.phone,
        country: doctor.clinic_country,
        clinic_name: doctor.clinic_name,
        status: 'active',
        notes: `Synced from Doctor signup — ${doctor.clinic_name || 'Clinic'}`,
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