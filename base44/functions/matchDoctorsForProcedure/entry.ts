import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { procedure_interest, client_email, client_id } = await req.json();

    if (!procedure_interest) {
      return Response.json({ error: 'Procedure interest required' }, { status: 400 });
    }

    // Search for doctors who offer this procedure
    const allDoctors = await base44.entities.Doctor.filter({ status: 'active' });
    
    // Get doctor procedures
    const doctorProcedures = await base44.entities.DoctorSpecialty.filter({});
    
    // Match doctors to procedure
    const matchedDoctors = allDoctors.filter(doctor => {
      const specialties = doctorProcedures.filter(dp => dp.doctor_id === doctor.id);
      return specialties.some(sp => 
        sp.procedure_name?.toLowerCase().includes(procedure_interest.toLowerCase())
      );
    });

    // If no doctors found, trigger email outreach
    if (matchedDoctors.length === 0) {
      // Find doctors with related specialties
      const relatedSpecialties = await base44.entities.DoctorSpecialty.filter({});
      
      // Get unique doctor emails to notify
      const doctorsToNotify = new Set();
      relatedSpecialties.forEach(spec => {
        if (spec.specialty && !doctorsToNotify.has(spec.doctor_email)) {
          doctorsToNotify.add(spec.doctor_email);
        }
      });

      // Send outreach emails
      const emailPromises = Array.from(doctorsToNotify).map(async (doctorEmail) => {
        try {
          await base44.integrations.Core.SendEmail({
            to: doctorEmail,
            subject: `New Client Interested in ${procedure_interest}`,
            body: `Hi Doctor,

A new client (${client_email}) has registered and is interested in: ${procedure_interest}

Do you offer this procedure? If yes, you can add it to your profile to be matched with this client.

Add procedures here: ${Deno.env.get('APP_URL') || 'https://app.base44.com'}/doctor-dashboard

Thank you,
SAFE-T 4LIFE™ Team`
          });
          
          // Log the outreach
          await base44.entities.DoctorProcedureOutreach.create({
            procedure_name: procedure_interest,
            client_email: client_email,
            doctor_email: doctorEmail,
            email_sent_at: new Date().toISOString(),
            status: 'pending'
          }).catch(() => {}); // Ignore if entity doesn't exist yet
          
        } catch (e) {
          console.error('Failed to send outreach email:', e.message);
        }
      });

      await Promise.all(emailPromises);

      return Response.json({
        matched_doctors: [],
        outreach_sent: true,
        message: `No doctors found for ${procedure_interest}. We've notified our network and will update you when a specialist joins.`
      });
    }

    // Return matched doctors
    return Response.json({
      matched_doctors: matchedDoctors.map(doc => ({
        id: doc.id,
        name: doc.full_name,
        clinic_country: doc.clinic_country,
        clinic_city: doc.clinic_city,
        rating: doc.rating,
        years_experience: doc.years_experience,
        photo_url: doc.photo_url
      })),
      outreach_sent: false,
      message: `Found ${matchedDoctors.length} specialist(s) for ${procedure_interest}`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});