import { createHandler } from '../_shared/createHandler.ts';

Deno.serve(createHandler(async ({ base44, user, body }) => {
    const body = await body();
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
}, { name: 'deleteTaxiServiceCompletely', allowedRoles: ['admin', 'platform_admin'] }));
