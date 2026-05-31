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

      // AUTO-GENERATE PROPOSAL TOKEN (clean alphanumeric only - no timestamps or random hashes)
      const proposalToken = `prop_${caseRecord.id}`;
      await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, {
        proposal_token: proposalToken,
        proposal_sent_at: new Date().toISOString(),
        status: 'Proposal-Sent'
      });

      const appUrl = 'https://sentinel-dental-care.base44.app';
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

      const markupPct = payload?.markup_percentage || caseRecord.markup_percentage || 0.35;

      // Update with approved markup
      await base44.entities.CaseRecord.update(case_id, {
        markup_percentage: markupPct,
        final_package_price: caseRecord.base_cost * (1 + markupPct),
        profit: caseRecord.base_cost * markupPct,
        status: 'Proposal-Sent'
      });

      // Generate proposal token (clean alphanumeric only - no timestamps or random hashes)
      const proposalToken = `prop_${case_id}`;
      
      await base44.entities.CaseRecord.update(case_id, {
        proposal_token: proposalToken,
        proposal_sent_at: new Date().toISOString(),
        final_package_price: caseRecord.base_cost * (1 + markupPct),
        profit: caseRecord.base_cost * markupPct
      });

      // Send proposal email to client with absolute URL - route to payment checkout (HARDCODED)
      const appUrl = 'https://sentinel-dental-care.base44.app';
      const checkoutUrl = `${appUrl}/portal-hub/checkout/${case_id}`;
      
      await base44.integrations.Core.SendEmail({
        to: caseRecord.client_email,
        subject: `Your Personalized Medical Travel Package — MORALES Concierge`,
        body: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
              .wrapper { background: #F9F9F9; padding: 32px 16px; }
              .container { max-width: 580px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
              .header { background: #0F3A20; padding: 40px 32px; text-align: center; border-bottom: 3px solid #C5A059; }
              .brand { font-size: 18px; font-weight: 600; color: #FFFFFF; letter-spacing: 1px; margin: 0; }
              .subtext { font-size: 12px; color: #C5A059; letter-spacing: 2px; text-transform: uppercase; margin: 6px 0 0; }
              .content { padding: 40px 32px; }
              .greeting { font-size: 16px; color: #1F2937; margin: 0 0 24px; line-height: 1.6; }
              .hero-card { background: linear-gradient(135deg, rgba(15,58,32,0.08), rgba(197,160,89,0.08)); border: 1px solid rgba(197,160,89,0.3); border-radius: 8px; padding: 28px 24px; margin: 24px 0; text-align: center; }
              .price { font-size: 42px; font-weight: 700; color: #0F3A20; margin: 0; line-height: 1.2; }
              .price-label { font-size: 13px; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; margin: 8px 0 0; }
              .section-title { font-size: 14px; font-weight: 600; color: #0F3A20; text-transform: uppercase; letter-spacing: 1px; margin: 32px 0 16px; }
              .package-item { display: flex; align-items: flex-start; padding: 12px 0; border-bottom: 1px solid #E5E7EB; font-size: 14px; color: #374151; line-height: 1.6; }
              .package-item:last-child { border-bottom: none; }
              .package-icon { font-size: 20px; margin-right: 12px; flex-shrink: 0; }
              .cta-container { text-align: center; margin: 32px 0; }
              .cta-button { display: inline-block; background: #0F3A20; color: #FFFFFF; text-decoration: none; padding: 16px 48px; border-radius: 999px; font-size: 14px; font-weight: 600; letter-spacing: 0.5px; transition: all 0.3s ease; border: 2px solid #0F3A20; }
              .cta-button:hover { background: transparent; color: #0F3A20; }
              .footer { padding: 24px 32px; background: #F9F9F9; border-top: 1px solid #E5E7EB; font-size: 12px; color: #6B7280; line-height: 1.6; }
              .footer-text { margin: 0 0 8px; }
              @media (max-width: 600px) {
                .wrapper { padding: 16px 8px; }
                .container { border-radius: 8px; }
                .header { padding: 28px 20px; }
                .content { padding: 24px 20px; }
                .hero-card { padding: 20px 16px; }
                .price { font-size: 36px; }
                .cta-button { padding: 14px 32px; font-size: 13px; }
              }
            </style>
          </head>
          <body>
            <div class="wrapper">
              <div class="container">
                <!-- Header -->
                <div class="header">
                  <p class="brand">MORALES</p>
                  <p class="subtext">Dental & Aesthetic Travel Concierge</p>
                </div>

                <!-- Content -->
                <div class="content">
                  <p class="greeting">Dear ${caseRecord.client_name},</p>
                  <p style="font-size: 15px; color: #4B5563; margin: 0 0 24px; line-height: 1.6;">Your complete medical travel package is ready for review. This personalized itinerary includes everything you need for a seamless, luxury medical tourism experience.</p>

                  <!-- Hero Card -->
                  <div class="hero-card">
                    <p class="price-label">Total Package Investment</p>
                    <p class="price">$${caseRecord.final_package_price.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                  </div>

                  <!-- Package Details -->
                  <p class="section-title">What's Included</p>
                  <div style="margin-bottom: 24px;">
                    <div class="package-item">
                      <span class="package-icon">🦷</span>
                      <span>Medical procedure with board-certified specialist in ${caseRecord.procedure_country}</span>
                    </div>
                    <div class="package-item">
                      <span class="package-icon">✈️</span>
                      <span>Hand-selected round-trip flights with premium comfort seating</span>
                    </div>
                    <div class="package-item">
                      <span class="package-icon">🏨</span>
                      <span>Luxury hotel accommodations near your treatment facility</span>
                    </div>
                    <div class="package-item">
                      <span class="package-icon">🚘</span>
                      <span>Private airport transfers and clinic transportation throughout your stay</span>
                    </div>
                  </div>

                  <!-- CTA -->
                  <div class="cta-container">
                    <a href="${checkoutUrl}" class="cta-button">Review & Accept Proposal</a>
                  </div>

                  <p style="font-size: 13px; color: #6B7280; text-align: center; margin: 20px 0; font-style: italic;">Please review and confirm your package within 7 days to secure your dates.</p>
                </div>

                <!-- Footer -->
                <div class="footer">
                  <p class="footer-text"><strong style="color: #1F2937;">Next Steps:</strong> Upon acceptance, our concierge team will coordinate all logistics including doctor confirmations, travel itineraries, and pre-procedure requirements.</p>
                  <p class="footer-text">Questions? Contact us at <strong style="color: #0F3A20;">concierge@morales-dental.com</strong></p>
                  <p class="footer-text" style="margin-top: 16px; border-top: 1px solid #E5E7EB; padding-top: 16px;">Best regards,<br><strong>MORALES Medical Travel Concierge Team</strong></p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `
      });

      return Response.json({ 
        status: 'PROPOSAL_SENT', 
        checkout_url: checkoutUrl,
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

      // AUTO-TRIGGER: Notify all partners (HARDCODED)
      const appUrl = 'https://sentinel-dental-care.base44.app';
      
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