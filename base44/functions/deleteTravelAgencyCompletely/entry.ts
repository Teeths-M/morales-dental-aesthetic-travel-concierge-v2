import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { agency_id } = body;

    if (!agency_id) {
      return Response.json({ error: 'agency_id is required' }, { status: 400 });
    }

    // Delete all PartnerMatch records for this agency
    const matches = await base44.asServiceRole.entities.PartnerMatch.filter({ partner_id: agency_id, partner_type: 'travel_agency' });
    for (const match of matches || []) {
      await base44.asServiceRole.entities.PartnerMatch.delete(match.id);
    }

    // Delete all QuoteRequest records for this agency
    const quotes = await base44.asServiceRole.entities.QuoteRequest.filter({ partner_id: agency_id });
    for (const quote of quotes || []) {
      await base44.asServiceRole.entities.QuoteRequest.delete(quote.id);
    }

    // Delete the TravelAgency record itself
    await base44.asServiceRole.entities.TravelAgency.delete(agency_id);

    return Response.json({ 
      success: true, 
      message: `Travel Agency ${agency_id} and all related records deleted successfully` 
    });
  } catch (error) {
    console.error('Error deleting travel agency:', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});