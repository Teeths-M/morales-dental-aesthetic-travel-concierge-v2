import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, consultation_id, case_id, payload } = await req.json();

    // GET_CASE: Retrieve case by proposal token (no auth required - public link)
    if (action === 'get_case') {
      const { token, type } = payload;
      
      if (!token) {
        return Response.json({ error: 'No token provided' }, { status: 400 });
      }

      // Find case by proposal token
      const cases = await base44.asServiceRole.entities.CaseRecord.filter({ proposal_token: token });
      
      if (!cases || cases.length === 0) {
        return Response.json({ case: null, error: 'Proposal not found' }, { status: 404 });
      }

      const caseRecord = cases[0];
      return Response.json({ case: caseRecord });
    }

    // All other actions require admin authentication
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // CREATE: Ingest consultation into IQ200 pipeline
    if (action === 'create') {
      const { token, type } = payload;
      
      if (!token) {
        return Response.json({ error: 'No token provided' }, { status: 400 });
      }

      // Find case by proposal token
      const cases = await base44.asServiceRole.entities.CaseRecord.filter({ proposal_token: token });
      
      if (!cases || cases.length === 0) {
        return Response.json({ case: null, error: 'Proposal not found' }, { status: 404 });
      }

      const caseRecord = cases[0];
      return Response.json({ case: caseRecord });
    }

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

      // AUTO-GENERATE PROPOSAL TOKEN
      const proposalToken = `prop_${caseRecord.id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, {
        proposal_token: proposalToken,
        proposal_sent_at: new Date().toISOString(),
        status: 'Proposal-Sent'
      });

      const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';
      const proposalUrl = `${appUrl}/portal/proposal/${proposalToken}`;

      return Response.json({ 
        status: 'CREATED', 
        case_id: caseRecord.id,
        proposal_token: proposalToken,
        proposal_url: proposalUrl,
        doctor_auto_assigned: isDentalProcedure || isVenezuela,
        message: isDentalProcedure || isVenezuela
          ? 'Case created, Dr Rossanna auto-assigned, SAFE-T review initiated, proposal generated'
          : 'Case created, SAFE-T review initiated, proposal generated'
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

    // PROCESS_PAYMENT: Handle deposit payment and trigger partner notifications
    if (action === 'process_payment') {
      const { token, deposit_option } = payload;
      
      if (!token) {
        return Response.json({ error: 'No token provided' }, { status: 400 });
      }

      // Find case by proposal token
      const cases = await base44.asServiceRole.entities.CaseRecord.filter({ proposal_token: token });
      
      if (!cases || cases.length === 0) {
        return Response.json({ success: false, error: 'Proposal not found' }, { status: 404 });
      }

      const caseRecord = cases[0];

      // Update payment status
      await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, {
        deposit_option: deposit_option,
        payment_status: deposit_option === 'Full' ? 'Paid In Full' : deposit_option === '50%' ? '50% Paid' : '25% Paid',
        status: 'Travel-Coordination',
        timeline_log: [
          ...(caseRecord.timeline_log || []),
          {
            timestamp: new Date().toISOString(),
            action: 'payment_received',
            details: `Deposit payment received: ${deposit_option}`
          }
        ]
      });

      // AUTO-TRIGGER: Notify all partners
      const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';
      
      // 1. Notify Travel Agency (if assigned)
      if (caseRecord.travel_vendor_id) {
        const travelAgency = await base44.asServiceRole.entities.TravelAgency.get(caseRecord.travel_vendor_id);
        if (travelAgency) {
          const portalUrl = `${appUrl}/portal/travel?token=${caseRecord.proposal_token}&case_id=${caseRecord.id}`;
          await base44.integrations.Core.SendEmail({
            to: travelAgency.email,
            subject: `Payment Confirmed - Book Travel for ${caseRecord.client_name}`,
            body: `
              <h2>Travel Booking Request</h2>
              <p>Dear ${travelAgency.agency_name || 'Travel Partner'},</p>
              <p>Payment has been confirmed for patient <strong>${caseRecord.client_name}</strong>.</p>
              <p><strong>Procedure:</strong> ${(caseRecord.procedures || []).join(', ')}</p>
              <p><strong>Destination:</strong> ${caseRecord.procedure_country}</p>
              <p><strong>Flight Budget:</strong> $${caseRecord.flight_cost}</p>
              <p><strong>Hotel Budget:</strong> $${caseRecord.hotel_cost}</p>
              <p><strong>Flight Details:</strong> ${caseRecord.flight_details || 'TBD'}</p>
              <p><strong>Hotel:</strong> ${caseRecord.hotel_name || 'TBD'}</p>
              <a href="${portalUrl}" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                Access Travel Portal
              </a>
              <p>Please proceed with booking flights and hotel accommodation.</p>
            `
          });
        }
      }

      // 2. Notify Origin Driver (if assigned)
      if (caseRecord.origin_driver_id) {
        const originDriver = await base44.asServiceRole.entities.TaxiService.get(caseRecord.origin_driver_id);
        if (originDriver) {
          await base44.integrations.Core.SendEmail({
            to: originDriver.email,
            subject: `Payment Confirmed - Pickup Booking for ${caseRecord.client_name}`,
            body: `
              <h2>Transfer Booking Confirmed</h2>
              <p>Dear ${originDriver.company_name || originDriver.driver_name},</p>
              <p>Payment confirmed for patient <strong>${caseRecord.client_name}</strong>.</p>
              <p><strong>Pickup Location:</strong> ${caseRecord.client_pickup_address || 'Client Home'}</p>
              <p><strong>Destination:</strong> Local Airport</p>
              <p><strong>Payment:</strong> $${caseRecord.pickup_cost}</p>
              <p>Please confirm the pickup date and time.</p>
            `
          });
        }
      }

      // 3. Notify Destination Driver (if assigned)
      if (caseRecord.destination_driver_id) {
        const destDriver = await base44.asServiceRole.entities.TaxiService.get(caseRecord.destination_driver_id);
        if (destDriver) {
          const portalUrl = `${appUrl}/portal/transfer?token=${caseRecord.proposal_token}&case_id=${caseRecord.id}`;
          await base44.integrations.Core.SendEmail({
            to: destDriver.email,
            subject: `Payment Confirmed - Transfer Booking for ${caseRecord.client_name}`,
            body: `
              <h2>Destination Transfer Confirmed</h2>
              <p>Dear ${destDriver.company_name || destDriver.driver_name},</p>
              <p>Payment confirmed for patient <strong>${caseRecord.client_name}</strong>.</p>
              <p><strong>Pickup:</strong> Airport in ${caseRecord.procedure_country}</p>
              <p><strong>Drop-off:</strong> Hotel/Clinic</p>
              <p><strong>Payment:</strong> $${caseRecord.dropoff_cost + caseRecord.local_transfer_cost}</p>
              <a href="${portalUrl}" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                Access Transfer Portal
              </a>
              <p>Please confirm transfer dates.</p>
            `
          });
        }
      }

      // 4. Notify Doctor
      if (caseRecord.doctor_email) {
        const doctorPortalUrl = `${appUrl}/portal/doctor/${caseRecord.doctor_portal_token || caseRecord.proposal_token}`;
        await base44.integrations.Core.SendEmail({
          to: caseRecord.doctor_email,
          subject: `Payment Confirmed - Procedure Booking for ${caseRecord.client_name}`,
          body: `
            <h2>Procedure Booking Confirmed</h2>
            <p>Dear ${caseRecord.doctor_selected || 'Doctor'},</p>
            <p>Payment has been confirmed for patient <strong>${caseRecord.client_name}</strong>.</p>
            <p><strong>Procedure:</strong> ${(caseRecord.procedures || []).join(', ')}</p>
            <p><strong>Treatment Cost:</strong> $${caseRecord.treatment_cost}</p>
            <a href="${doctorPortalUrl}" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Access Doctor Portal
            </a>
            <p>Please confirm the procedure date.</p>
          `
        });
      }

      // 5. Send final confirmation to patient
      await base44.integrations.Core.SendEmail({
        to: caseRecord.client_email,
        subject: `Payment Confirmed - Your Medical Travel Journey Begins!`,
        body: `
          <h2>Payment Confirmed! 🎉</h2>
          <p>Dear ${caseRecord.client_name},</p>
          <p>Your payment of <strong>${deposit_option}</strong> has been successfully processed.</p>
          <p><strong>What happens next:</strong></p>
          <ul>
            <li>✈️ Travel agency will book your flights and hotel</li>
            <li>🚗 Drivers will coordinate airport transfers</li>
            <li>🩺 Doctor will confirm your procedure date</li>
          </ul>
          <p>You will receive separate emails with all confirmed details shortly.</p>
          <p><strong>Total Package:</strong> $${caseRecord.final_package_price}</p>
          <p><strong>Remaining Balance:</strong> $${caseRecord.amount_remaining || 0}</p>
          <p>Track your journey status anytime through your portal.</p>
          <p>Best regards,<br/>IQ200 Medical Travel Team</p>
        `
      });

      return Response.json({ 
        success: true, 
        case_id: caseRecord.id,
        notifications_sent: {
          travel_agency: !!caseRecord.travel_vendor_id,
          origin_driver: !!caseRecord.origin_driver_id,
          destination_driver: !!caseRecord.destination_driver_id,
          doctor: !!caseRecord.doctor_email,
          patient: true
        }
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