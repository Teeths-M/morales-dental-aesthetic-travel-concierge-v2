import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only return the doctor profile that matches the current user's email
    const doctors = await base44.entities.Doctor.filter({ email: user.email });
    
    if (doctors.length === 0) {
      return Response.json({ 
        doctor: null, 
        message: 'No doctor profile found for this account' 
      });
    }

    // Get specialties for this doctor
    const doctorId = doctors[0].id;
    const specialties = await base44.entities.DoctorSpecialty.filter({ doctor_id: doctorId });
    
    // Get pricing for this doctor
    const pricing = await base44.entities.DoctorPricing.filter({ doctor_id: doctorId });

    return Response.json({
      doctor: doctors[0],
      specialties: specialties || [],
      pricing: pricing || []
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});