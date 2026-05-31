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

    const caseRecord = await base44.entities.CaseRecord.get(caseId);
    
    if (!caseRecord) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    // Find taxi services in both origin and destination countries
    const originDrivers = await base44.entities.TaxiService.filter({
      operating_country: caseRecord.client_country,
      status: 'active'
    });

    const destDrivers = await base44.entities.TaxiService.filter({
      operating_country: caseRecord.procedure_country,
      status: 'active'
    });

    if (originDrivers.length === 0 || destDrivers.length === 0) {
      await base44.entities.CaseRecord.update(caseId, {
        status: 'Admin-Review',
        admin_notes: 'Chauffeur service unavailable in origin or destination'
      });

      return Response.json({
        status: 'NO_DRIVERS',
        message: 'Chauffeur services not available. Admin review required.'
      });
    }

    const originDriver = originDrivers[0];
    const destDriver = destDrivers[0];

    // Generate portal tokens
    const originToken = `driver_origin_${caseId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const destToken = `driver_dest_${caseId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Update case
    await base44.entities.CaseRecord.update(caseId, {
      origin_driver_id: originDriver.id,
      destination_driver_id: destDriver.id,
      transfer_status: 'SUBMITTED'
    });

    // Send emails to both drivers
    const originPortalUrl = `${Deno.env.get('APP_URL') || 'http://localhost:5173'}/portal/transfer/${originToken}`;
    const destPortalUrl = `${Deno.env.get('APP_URL') || 'http://localhost:5173'}/portal/transfer/${destToken}`;

    // Origin driver email
    await base44.integrations.Core.SendEmail({
      to: originDriver.email,
      subject: `Pickup Service Request - ${caseRecord.client_name}`,
      body: `
        <h2>Chauffeur Service Request - Origin</h2>
        <p>Dear ${originDriver.driver_name || originDriver.company_name},</p>
        
        <p>You have a new pickup service request:</p>
        <ul>
          <li><strong>Passenger:</strong> ${caseRecord.client_name}</li>
          <li><strong>Pickup Location:</strong> ${caseRecord.client_country} (Home to Airport)</li>
          <li><strong>Service:</strong> Medical travel pickup</li>
        </ul>
        
        <p>Please provide your quote for:</p>
        <ul>
          <li>Home to Airport (departure)</li>
          <li>Airport to Home (return)</li>
        </ul>
        
        <a href="${originPortalUrl}" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Submit Quote
        </a>
        
        <p>Best regards,<br/>IQ200 Medical Travel Coordination</p>
      `
    });

    // Destination driver email
    await base44.integrations.Core.SendEmail({
      to: destDriver.email,
      subject: `Transfer Service Request - ${caseRecord.client_name}`,
      body: `
        <h2>Chauffeur Service Request - Destination</h2>
        <p>Dear ${destDriver.driver_name || destDriver.company_name},</p>
        
        <p>You have a new transfer service request:</p>
        <ul>
          <li><strong>Passenger:</strong> ${caseRecord.client_name}</li>
          <li><strong>Location:</strong> ${caseRecord.procedure_country}</li>
          <li><strong>Services Needed:</strong>
            <ul>
              <li>Airport to Hotel (arrival)</li>
              <li>Hotel to Clinic (procedure day)</li>
              <li>Clinic to Hotel (post-procedure)</li>
              <li>Hotel to Airport (departure)</li>
            </ul>
          </li>
        </ul>
        
        <a href="${destPortalUrl}" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Submit Quote
        </a>
        
        <p>Best regards,<br/>IQ200 Medical Travel Coordination</p>
      `
    });

    return Response.json({
      status: 'DRIVERS_ASSIGNED',
      origin_driver: originDriver.email,
      destination_driver: destDriver.email,
      message: 'Chauffeur services assigned and notified successfully'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});