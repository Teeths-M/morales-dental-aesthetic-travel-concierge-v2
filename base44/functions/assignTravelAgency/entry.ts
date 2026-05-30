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

    const caseRecord = await base44.entities.Case.get(caseId);
    
    if (!caseRecord) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    // Check if doctor has confirmed
    if (caseRecord.doctor_confirmation_status !== 'Confirmed') {
      return Response.json({ 
        error: 'Doctor has not confirmed yet',
        doctor_status: caseRecord.doctor_confirmation_status 
      }, { status: 400 });
    }

    // Find travel agencies in client's country or region
    const travelAgencies = await base44.entities.TravelAgency.filter({
      status: 'active'
    });

    if (travelAgencies.length === 0) {
      await base44.entities.Case.update(caseId, {
        status: 'Admin-Review',
        admin_notes: 'No travel agencies available for booking'
      });

      return Response.json({
        status: 'NO_TRAVEL_AGENCIES',
        message: 'No travel agencies available. Admin review required.'
      });
    }

    // Select first available agency (implement smarter matching later)
    const selectedAgency = travelAgencies[0];

    // Generate portal token
    const portalToken = `travel_${caseId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Update case
    await base44.entities.Case.update(caseId, {
      travel_vendor_id: selectedAgency.id,
      status: 'Vendor-Pending'
    });

    // Send email to travel agency
    const portalUrl = `${Deno.env.get('APP_URL') || 'http://localhost:5173'}/portal/travel/${portalToken}`;
    
    await base44.integrations.Core.SendEmail({
      to: selectedAgency.email,
      subject: `Travel Coordination Request - ${caseRecord.client_name}`,
      body: `
        <h2>Travel Coordination Request</h2>
        <p>Dear ${selectedAgency.agency_name || 'Travel Partner'},</p>
        
        <p>You have a new travel coordination request:</p>
        <ul>
          <li><strong>Patient:</strong> ${caseRecord.client_name}</li>
          <li><strong>From:</strong> ${caseRecord.client_country}</li>
          <li><strong>To:</strong> ${caseRecord.procedure_country}</li>
          <li><strong>Procedure Date:</strong> TBD (based on doctor availability)</li>
          <li><strong>Recovery Days:</strong> ${caseRecord.recovery_days || 'TBD'}</li>
        </ul>
        
        <p>Please provide quotes for:</p>
        <ul>
          <li>Round-trip flights</li>
          <li>Hotel accommodation (procedure + recovery period)</li>
          <li>Airport transfers</li>
        </ul>
        
        <a href="${portalUrl}" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Submit Travel Quote
        </a>
        
        <p>Please respond within 24 hours.</p>
        
        <p>Best regards,<br/>IQ200 Medical Travel Coordination</p>
      `
    });

    return Response.json({
      status: 'TRAVEL_ASSIGNED',
      agency_email: selectedAgency.email,
      agency_name: selectedAgency.agency_name,
      portal_url: portalUrl,
      message: 'Travel agency assigned and notified successfully'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});