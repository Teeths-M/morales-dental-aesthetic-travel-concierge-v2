import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { caseId } = await req.json();
    
    if (!caseId) {
      return Response.json({ error: 'Case ID required' }, { status: 400 });
    }

    // Fetch the case
    const caseRecord = await base44.entities.Case.get(caseId);
    
    if (!caseRecord) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    // Check if SAFE-T passed
    if (caseRecord.safe_t_result !== 'PASSED') {
      return Response.json({ 
        error: 'Cannot assign doctor - SAFE-T review not passed',
        safe_t_result: caseRecord.safe_t_result 
      }, { status: 400 });
    }

    // Find doctors in the procedure country
    const doctors = await base44.entities.Doctor.filter({
      clinic_country: caseRecord.procedure_country,
      status: 'active'
    });

    if (doctors.length === 0) {
      // No doctors available - escalate to admin
      await base44.entities.Case.update(caseId, {
        status: 'Admin-Review',
        admin_notes: `No doctors available in ${caseRecord.procedure_country} for procedure: ${caseRecord.procedures.join(', ')}`
      });

      return Response.json({
        status: 'NO_DOCTORS',
        message: `No doctors found in ${caseRecord.procedure_country}. Admin review required.`
      });
    }

    // Select first available doctor (could implement smarter matching later)
    const selectedDoctor = doctors[0];

    // Generate secure token for doctor portal access
    const portalToken = `doc_${caseId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Update case with doctor assignment
    await base44.entities.Case.update(caseId, {
      status: 'Doctor-Pending',
      doctor_email: selectedDoctor.email,
      doctor_portal_token: portalToken,
      doctor_selected: selectedDoctor.full_name,
      clinic_selected: selectedDoctor.clinic_name || 'Clinic'
    });

    // Send email to doctor with portal link
    const portalUrl = `${Deno.env.get('APP_URL') || 'http://localhost:5173'}/portal/doctor/${portalToken}`;
    
    await base44.integrations.Core.SendEmail({
      to: selectedDoctor.email,
      subject: `New Patient Consultation Request - ${caseRecord.client_name}`,
      body: `
        <h2>New Patient Consultation Request</h2>
        <p>Dear Dr. ${selectedDoctor.full_name},</p>
        
        <p>You have a new patient consultation request:</p>
        <ul>
          <li><strong>Patient:</strong> ${caseRecord.client_name}</li>
          <li><strong>Procedure:</strong> ${caseRecord.procedures.join(', ')}</li>
          <li><strong>Country:</strong> ${caseRecord.procedure_country}</li>
        </ul>
        
        <p>Please review the case and provide:</p>
        <ul>
          <li>Treatment cost estimate</li>
          <li>Treatment duration (days)</li>
          <li>Recovery time (days)</li>
          <li>Available dates</li>
        </ul>
        
        <a href="${portalUrl}" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Review Case & Provide Quote
        </a>
        
        <p>Please respond within 48 hours.</p>
        
        <p>Best regards,<br/>IQ200 Medical Travel Coordination</p>
      `
    });

    return Response.json({
      status: 'DOCTOR_ASSIGNED',
      doctor_email: selectedDoctor.email,
      doctor_name: selectedDoctor.full_name,
      portal_url: portalUrl,
      message: 'Doctor assigned and notified successfully'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});