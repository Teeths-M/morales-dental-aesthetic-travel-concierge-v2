import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { service_id } = body;

    if (!service_id) {
      return Response.json({ error: 'service_id is required' }, { status: 400 });
    }

    // Delete all PartnerMatch records for this taxi service
    const matches = await base44.asServiceRole.entities.PartnerMatch.filter({ partner_id: service_id, partner_type: 'taxi_service' });
    for (const match of matches || []) {
      await base44.asServiceRole.entities.PartnerMatch.delete(match.id);
    }

    // Delete all TripLog records for this taxi service
    const trips = await base44.asServiceRole.entities.TripLog.filter({ taxi_service_id: service_id });
    for (const trip of trips || []) {
      await base44.asServiceRole.entities.TripLog.delete(trip.id);
    }

    // Delete the TaxiService record itself
    await base44.asServiceRole.entities.TaxiService.delete(service_id);

    return Response.json({ 
      success: true, 
      message: `Taxi Service ${service_id} and all related records deleted successfully` 
    });
  } catch (error) {
    console.error('Error deleting taxi service:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});