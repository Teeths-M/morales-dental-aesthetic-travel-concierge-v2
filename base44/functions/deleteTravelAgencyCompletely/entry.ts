import { createHandler } from '../_shared/createHandler.ts';

Deno.serve(createHandler(async ({ base44, user, body }) => {
    // `const body = await body()` shadowed the destructured `body` parameter —
    // a SyntaxError ("Identifier 'body' has already been declared"), so this
    // file could never even parse, let alone run. Renamed the local.
    const payload = await body();
    const { agency_id } = payload;

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
}, { name: 'deleteTravelAgencyCompletely', allowedRoles: ['admin', 'platform_admin'] }));
