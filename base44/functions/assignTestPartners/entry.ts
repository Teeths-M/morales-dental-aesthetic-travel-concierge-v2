import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { case_id } = await req.json();
    
    if (!case_id) {
      return Response.json({ error: 'case_id is required' }, { status: 400 });
    }

    // Get case record
    const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id);
    
    if (!caseRecord) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    // Assign test partners (all pointing to theonmorales@gmail.com)
    
    // 1. Assign Doctor (Dr. Rossanna)
    const doctor = await base44.asServiceRole.entities.Doctor.get('6a089ebd30ed7291f5d2146c');
    if (!doctor) {
      return Response.json({ error: 'Test doctor not found' }, { status: 404 });
    }

    // 2. Assign Travel Agency
    const travelAgency = await base44.asServiceRole.entities.TravelAgency.get('6a1b2b3c713fbaf2b4c708ea');
    if (!travelAgency) {
      return Response.json({ error: 'Test travel agency not found' }, { status: 404 });
    }

    // 3. Assign Origin Driver (Costa Rica - for pickup)
    const originDriver = await base44.asServiceRole.entities.TaxiService.get('6a1b2b3c3e4d0927932219af');
    if (!originDriver) {
      return Response.json({ error: 'Test origin driver not found' }, { status: 404 });
    }

    // 4. Assign Destination Driver (Thailand - for destination transfers)
    const destDriver = await base44.asServiceRole.entities.TaxiService.get('6a1b2b3c3e4d0927932219b0');
    if (!destDriver) {
      return Response.json({ error: 'Test destination driver not found' }, { status: 404 });
    }

    // Update case with all partner assignments
    await base44.asServiceRole.entities.CaseRecord.update(case_id, {
      doctor_selected: doctor.full_name,
      doctor_email: doctor.email,
      doctor_portal_token: `doc_${case_id}`,
      travel_vendor_id: travelAgency.id,
      origin_driver_id: originDriver.id,
      destination_driver_id: destDriver.id,
      client_pickup_address: '123 Main Street, Denver, CO 80202',
      hotel_name: 'Caribbean Luxury Resort & Spa',
      hotel_address: 'Playa del Carmen, Quintana Roo, Mexico',
      flight_details: 'UA 1234 - Denver (DEN) to Cancun (CUN) - June 15, 2026, 10:30 AM',
      timeline_log: [
        ...(caseRecord.timeline_log || []),
        {
          timestamp: new Date().toISOString(),
          action: 'partners_assigned',
          details: 'All partners assigned for testing: Doctor, Travel Agency, Origin Driver, Destination Driver'
        }
      ]
    });

    return Response.json({ 
      success: true, 
      case_id: caseRecord.id,
      message: 'All test partners assigned successfully',
      partners_assigned: {
        doctor: doctor.full_name,
        doctor_email: doctor.email,
        travel_agency: travelAgency.agency_name,
        travel_agency_email: travelAgency.email,
        origin_driver: originDriver.company_name,
        origin_driver_email: originDriver.email,
        destination_driver: destDriver.company_name,
        destination_driver_email: destDriver.email
      }
    });

  } catch (error) {
    console.error('assignTestPartners error:', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});