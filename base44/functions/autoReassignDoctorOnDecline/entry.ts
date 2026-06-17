import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { workflow_id, declined_doctor_id } = await req.json();

    // Get the workflow event
    const workflow = await base44.asServiceRole.entities.WorkflowEvent.get(workflow_id);
    if (!workflow) {
      return Response.json({ error: 'Workflow not found' }, { status: 404 });
    }

    const consultation = await base44.asServiceRole.entities.Consultation.get(workflow.consultation_id);
    if (!consultation) {
      return Response.json({ error: 'Consultation not found' }, { status: 404 });
    }

    // Find next available doctor (exclude declined doctor)
    const allDoctors = await base44.asServiceRole.entities.Doctor.filter({ status: 'active' });
    const availableDoctors = allDoctors.filter(d => d.id !== declined_doctor_id);

    if (availableDoctors.length === 0) {
      return Response.json({ 
        error: 'No available doctors to assign',
        status: 'needs_admin_intervention'
      }, { status: 400 });
    }

    // Select first available doctor (could be enhanced with specialty matching, location, etc.)
    const nextDoctor = availableDoctors[0];

    // Update workflow event with new doctor
    await base44.asServiceRole.entities.WorkflowEvent.update(workflow_id, {
      assigned_doctor_id: nextDoctor.id,
      doctor_status: 'pending',
      doctor_notes: `Auto-reassigned on ${new Date().toISOString()} after previous doctor declined`,
      last_update_summary: `Case automatically reassigned to ${nextDoctor.full_name}`,
    });

    // Generate new portal link for the new doctor
    await base44.functions.invoke('generateDoctorPortalLink', {
      workflow_id: workflow_id,
      doctor_id: nextDoctor.id,
      consultation_id: consultation.id,
    });

    // BUG-R7-04 FIX: hardcoded admin email — use ADMIN_EMAIL env var
    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    if (adminEmail) await base44.asServiceRole.integrations.Core.SendEmail({
      to: adminEmail,
      subject: `Case Auto-Reassigned: ${consultation.patient_name}`,
      body: `
        <h2>Automatic Doctor Reassignment</h2>
        <p><strong>Patient:</strong> ${consultation.patient_name}</p>
        <p><strong>Procedure:</strong> ${consultation.procedure_interest}</p>
        <p><strong>Previous Doctor:</strong> Declined (ID: ${declined_doctor_id})</p>
        <p><strong>New Doctor:</strong> ${nextDoctor.full_name} (${nextDoctor.clinic_city}, ${nextDoctor.clinic_country})</p>
        <p><strong>Status:</strong> Portal link sent to new doctor</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      `,
    });

    return Response.json({
      success: true,
      message: 'Case auto-reassigned',
      new_doctor_id: nextDoctor.id,
      new_doctor_name: nextDoctor.full_name
    });
  } catch (error) {
    console.error('[autoReassignDoctorOnDecline]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});