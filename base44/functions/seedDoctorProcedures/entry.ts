import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get all doctors
    const doctors = await base44.asServiceRole.entities.Doctor.list();
    
    // Get all master procedures
    const procedures = await base44.asServiceRole.entities.MasterProcedure.list();

    if (procedures.length === 0) {
      return Response.json({ error: 'No master procedures found. Run seedMasterProcedures first.' }, { status: 400 });
    }

    const results = [];

    // For each doctor, assign their first 5 procedures
    for (const doctor of doctors) {
      const assignedProcs = [];
      
      for (let i = 0; i < Math.min(5, procedures.length); i++) {
        const proc = procedures[i];
        
        const specialty = await base44.asServiceRole.entities.DoctorSpecialty.create({
          doctor_id: doctor.id,
          procedure_id: proc.id,
          procedure_name: proc.en_name,
          category: proc.category,
          cpt_code: proc.cpt_code || '',
          expertise_level: 'intermediate',
          is_featured: i === 0 // Mark first procedure as featured
        });
        
        assignedProcs.push({
          procedure_id: proc.id,
          procedure_name: proc.en_name,
          specialty_id: specialty.id
        });
      }

      results.push({
        doctor_id: doctor.id,
        doctor_name: doctor.full_name,
        procedures_assigned: assignedProcs.length,
        details: assignedProcs
      });
    }

    return Response.json({ 
      status: 'success',
      message: `Seeded ${results.length} doctors with procedures`,
      results 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});