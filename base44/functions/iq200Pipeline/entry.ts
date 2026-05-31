import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { action, consultation_id, case_id, payload } = await req.json();

    // CREATE: Ingest consultation into IQ200 pipeline
    if (action === 'create') {
      const consultation = await base44.entities.Consultation.get(consultation_id);
      
      if (!consultation) {
        return Response.json({ error: 'Consultation not found' }, { status: 404 });
      }

      // Create CaseRecord
      const caseRecord = await base44.entities.CaseRecord.create({
        consultation_id: consultation.id,
        client_name: consultation.patient_name,
        client_email: consultation.email,
        client_phone: consultation.phone,
        client_country: consultation.client_country,
        emergency_contact: consultation.emergency_contact_name,
        procedure_country: consultation.destination_country,
        procedures: [consultation.procedure_interest],
        consultation_summary: consultation.notes || 'No summary provided',
        medications: consultation.takes_medications ? consultation.medication_types?.join(', ') : 'None',
        allergies: consultation.allergies?.join(', ') || 'None',
        smoking_status: consultation.lifestyle_habits?.includes('Smoking'),
        alcohol_use: consultation.lifestyle_habits?.includes('Alcohol') ? 'Moderate' : 'None',
        medical_conditions: consultation.medical_conditions?.join(', ') || 'None',
        anesthesia_history: consultation.anesthesia_complications ? 'Previous complications' : 'No complications',
        mental_health_notes: consultation.emotional_notes || 'N/A',
        pregnancy_status: consultation.pregnancy_status === 'Yes',
        exercise_level: consultation.activity_level || 'Moderate',
        status: 'Submitted',
        safe_t_result: 'PENDING',
        timeline_log: [{
          timestamp: new Date().toISOString(),
          action: 'created',
          details: 'Case created from consultation'
        }]
      });

      // AUTO-ASSIGN: Dr Rossanna for dental procedures in Venezuela
      const DENTAL_PROCEDURES = ['dental_implants', 'all_on_4', 'porcelain_veneers', 'smile_makeover', 'bone_regeneration', 'teeth_whitening'];
      const isDentalProcedure = DENTAL_PROCEDURES.includes(consultation.procedure_interest);
      const isVenezuela = (consultation.destination_country || '').toLowerCase().includes('venezuela') || 
                          (consultation.procedure_country || '').toLowerCase().includes('venezuela');

      if (isDentalProcedure || isVenezuela) {
        await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, {
          doctor_selected: 'Dr Rossanna',
          doctor_email: 'rosedentalspa@gmail.com',
          clinic_selected: 'Dental Spa Margarita',
          procedure_country: 'Venezuela',
          treatment_cost: 20,
          status: 'Doctor-Pending',
          doctor_confirmation_status: 'PENDING',
          doctor_notified_at: new Date().toISOString(),
          timeline_log: [
            ...(caseRecord.timeline_log || []),
            {
              timestamp: new Date().toISOString(),
              action: 'auto_assigned',
              details: 'Dr Rossanna automatically assigned — Dental Spa Margarita, Venezuela'
            }
          ]
        });
      }

      // Trigger SAFE-T4LIFE scan
      try {
        await base44.functions.invoke('safeT4LifeScan', { caseId: caseRecord.id });
      } catch (scanError) {
        console.error('SAFE-T scan failed:', scanError);
      }

      return Response.json({ 
        status: 'CREATED', 
        case_id: caseRecord.id,
        doctor_auto_assigned: isDentalProcedure || isVenezuela,
        message: isDentalProcedure || isVenezuela
          ? 'Case created, Dr Rossanna auto-assigned, SAFE-T review initiated'
          : 'Case created and SAFE-T review initiated'
      });
    }

    // ADMIN_APPROVE_PROPOSAL: Send proposal to client
    if (action === 'admin_approve_proposal') {
      const caseRecord = await base44.entities.CaseRecord.get(case_id);
      
      if (!caseRecord) {
        return Response.json({ error: 'Case not found' }, { status: 404 });
      }

      // Update with approved markup
      await base44.entities.CaseRecord.update(case_id, {
        markup_percentage: payload.markup_percentage,
        final_package_price: caseRecord.base_cost * (1 + payload.markup_percentage),
        profit: caseRecord.base_cost * payload.markup_percentage,
        status: 'Proposal-Sent'
      });

      // Generate proposal token
      const proposalToken = `prop_${case_id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      await base44.entities.CaseRecord.update(case_id, {
        proposal_token: proposalToken,
        proposal_sent_at: new Date().toISOString()
      });

      // Send proposal email to client
      const proposalUrl = `${Deno.env.get('APP_URL') || 'http://localhost:5173'}/portal/proposal/${proposalToken}`;
      
      await base44.integrations.Core.SendEmail({
        to: caseRecord.client_email,
        subject: `Your IQ200 Medical Travel Package Proposal`,
        body: `
          <h2>Your Personalized Medical Travel Package</h2>
          <p>Dear ${caseRecord.client_name},</p>
          
          <p>Your complete medical travel package is ready for review:</p>
          <ul>
            <li><strong>Procedure:</strong> ${caseRecord.procedures.join(', ')}</li>
            <li><strong>Destination:</strong> ${caseRecord.procedure_country}</li>
            <li><strong>Total Package Price:</strong> $${caseRecord.final_package_price.toFixed(2)}</li>
          </ul>
          
          <p>Your package includes:</p>
          <ul>
            <li>Medical procedure with certified doctor</li>
            <li>Round-trip flights</li>
            <li>Hotel accommodation</li>
            <li>All airport and clinic transfers</li>
          </ul>
          
          <a href="${proposalUrl}" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Review & Accept Proposal
          </a>
          
          <p>Please review and accept within 7 days.</p>
          
          <p>Best regards,<br/>IQ200 Medical Travel Team</p>
        `
      });

      return Response.json({ 
        status: 'PROPOSAL_SENT', 
        proposal_url: proposalUrl,
        message: 'Proposal sent to client successfully' 
      });
    }

    // ADMIN_ESCALATE: Manual stage override
    if (action === 'admin_escalate') {
      const caseRecord = await base44.entities.CaseRecord.get(case_id);
      
      if (!caseRecord) {
        return Response.json({ error: 'Case not found' }, { status: 404 });
      }

      const newStatus = payload.new_status;
      const notes = payload.notes || 'Manual escalation';

      // Update status
      await base44.entities.CaseRecord.update(case_id, {
        status: newStatus,
        admin_notes: notes
      });

      // Add to timeline
      const timelineEntry = {
        timestamp: new Date().toISOString(),
        action: 'admin_escalation',
        status_before: caseRecord.status,
        status_after: newStatus,
        notes: notes
      };

      const updatedTimeline = caseRecord.timeline_log ? [...caseRecord.timeline_log, timelineEntry] : [timelineEntry];
      await base44.entities.CaseRecord.update(case_id, {
        timeline_log: updatedTimeline
      });

      return Response.json({ 
        status: 'ESCALATED', 
        new_status: newStatus,
        message: 'Case escalated successfully' 
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});