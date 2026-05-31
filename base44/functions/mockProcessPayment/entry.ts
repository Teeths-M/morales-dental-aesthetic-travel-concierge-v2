import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Allow admin or test mode
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { case_id, deposit_option } = await req.json();
    
    if (!case_id || !deposit_option) {
      return Response.json({ error: 'case_id and deposit_option are required' }, { status: 400 });
    }

    // Get case record
    const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id);
    
    if (!caseRecord) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    // Update payment status (MOCK - no actual payment processing)
    await base44.asServiceRole.entities.CaseRecord.update(case_id, {
      deposit_option: deposit_option,
      payment_status: deposit_option === 'Full' ? 'Paid In Full' : deposit_option === '50%' ? '50% Paid' : '25% Paid',
      status: 'Travel-Coordination',
      timeline_log: [
        ...(caseRecord.timeline_log || []),
        {
          timestamp: new Date().toISOString(),
          action: 'mock_payment_received',
          details: `MOCK: Deposit payment received: ${deposit_option}`
        }
      ]
    });

    const appUrl = 'https://sentinel-dental-care.base44.app';
    
    // 1. Notify Travel Agency
    if (caseRecord.travel_vendor_id) {
      const travelAgency = await base44.asServiceRole.entities.TravelAgency.get(caseRecord.travel_vendor_id);
      if (travelAgency) {
        const portalUrl = `${appUrl}/portal/travel?token=${caseRecord.proposal_token}&case_id=${caseRecord.id}`;
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: travelAgency.email,
          subject: `[MOCK TEST] Payment Confirmed - Book Travel for ${caseRecord.client_name}`,
          body: `
            <h2>🧪 MOCK TEST - Travel Booking Request</h2>
            <p>Dear ${travelAgency.agency_name || 'Travel Partner'},</p>
            <p><strong style="color: #dc2626;">This is a TEST email. No action required.</strong></p>
            <p>Payment confirmed for patient <strong>${caseRecord.client_name}</strong>.</p>
            <p><strong>Procedure:</strong> ${(caseRecord.procedures || []).join(', ')}</p>
            <p><strong>Destination:</strong> ${caseRecord.procedure_country}</p>
            <p><strong>Flight Budget:</strong> $${caseRecord.flight_cost}</p>
            <p><strong>Hotel Budget:</strong> $${caseRecord.hotel_cost}</p>
            <a href="${portalUrl}" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Access Travel Portal
            </a>
          `
        });
      }
    }

    // 2. Notify Origin Driver
    if (caseRecord.origin_driver_id) {
      const originDriver = await base44.asServiceRole.entities.TaxiService.get(caseRecord.origin_driver_id);
      if (originDriver) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: originDriver.email,
          subject: `[MOCK TEST] Payment Confirmed - Pickup for ${caseRecord.client_name}`,
          body: `
            <h2>🧪 MOCK TEST - Transfer Booking Confirmed</h2>
            <p>Dear ${originDriver.company_name || originDriver.driver_name},</p>
            <p><strong style="color: #dc2626;">This is a TEST email. No action required.</strong></p>
            <p>Payment confirmed for patient <strong>${caseRecord.client_name}</strong>.</p>
            <p><strong>Pickup Location:</strong> ${caseRecord.client_pickup_address || 'Client Home'}</p>
            <p><strong>Payment:</strong> $${caseRecord.pickup_cost}</p>
          `
        });
      }
    }

    // 3. Notify Destination Driver
    if (caseRecord.destination_driver_id) {
      const destDriver = await base44.asServiceRole.entities.TaxiService.get(caseRecord.destination_driver_id);
      if (destDriver) {
        const portalUrl = `${appUrl}/portal/transfer?token=${caseRecord.proposal_token}&case_id=${caseRecord.id}`;
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: destDriver.email,
          subject: `[MOCK TEST] Payment Confirmed - Transfer for ${caseRecord.client_name}`,
          body: `
            <h2>🧪 MOCK TEST - Destination Transfer Confirmed</h2>
            <p>Dear ${destDriver.company_name || destDriver.driver_name},</p>
            <p><strong style="color: #dc2626;">This is a TEST email. No action required.</strong></p>
            <p>Payment confirmed for patient <strong>${caseRecord.client_name}</strong>.</p>
            <p><strong>Payment:</strong> $${caseRecord.dropoff_cost + caseRecord.local_transfer_cost}</p>
            <a href="${portalUrl}" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Access Transfer Portal
            </a>
          `
        });
      }
    }

    // 4. Notify Doctor
    if (caseRecord.doctor_email) {
      const doctorPortalUrl = `${appUrl}/portal/doctor/${caseRecord.doctor_portal_token || caseRecord.proposal_token}`;
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: caseRecord.doctor_email,
        subject: `[MOCK TEST] Payment Confirmed - Procedure for ${caseRecord.client_name}`,
        body: `
          <h2>🧪 MOCK TEST - Procedure Booking Confirmed</h2>
          <p>Dear ${caseRecord.doctor_selected || 'Doctor'},</p>
          <p><strong style="color: #dc2626;">This is a TEST email. No action required.</strong></p>
          <p>Payment confirmed for patient <strong>${caseRecord.client_name}</strong>.</p>
          <p><strong>Procedure:</strong> ${(caseRecord.procedures || []).join(', ')}</p>
          <p><strong>Treatment Cost:</strong> $${caseRecord.treatment_cost}</p>
          <a href="${doctorPortalUrl}" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Access Doctor Portal
          </a>
        `
      });
    }

    // 5. Send confirmation to patient
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: caseRecord.client_email,
      subject: `[MOCK TEST] Payment Confirmed - Your Medical Travel Journey`,
      body: `
        <h2>🧪 MOCK TEST - Payment Confirmed!</h2>
        <p>Dear ${caseRecord.client_name},</p>
        <p><strong style="color: #dc2626;">This is a TEST email. No payment was actually processed.</strong></p>
        <p>Your mock payment of <strong>${deposit_option}</strong> has been processed.</p>
        <p><strong>Total Package:</strong> $${caseRecord.final_package_price}</p>
        <p>All partner notifications have been triggered for testing purposes.</p>
        <p>Best regards,<br/>IQ200 Medical Travel Team (TEST MODE)</p>
      `
    });

    return Response.json({ 
      success: true, 
      case_id: caseRecord.id,
      message: 'MOCK payment processed successfully - all emails sent',
      notifications_sent: {
        travel_agency: !!caseRecord.travel_vendor_id,
        origin_driver: !!caseRecord.origin_driver_id,
        destination_driver: !!caseRecord.destination_driver_id,
        doctor: !!caseRecord.doctor_email,
        patient: true
      }
    });

  } catch (error) {
    console.error('mockProcessPayment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});