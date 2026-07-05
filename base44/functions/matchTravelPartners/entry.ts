import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { travel_request_id } = await req.json();
    if (!travel_request_id) {
      return Response.json({ error: 'travel_request_id required' }, { status: 400 });
    }

    // Fetch the travel request
    const travelRequest = await base44.entities.TravelRequest.get(travel_request_id);
    if (!travelRequest) {
      return Response.json({ error: 'Travel request not found' }, { status: 404 });
    }

    // Verify ownership
    if (travelRequest.user_id !== user.id && user.role !== 'admin' && user.role !== 'platform_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const startTime = Date.now();
    const matches = { travel_agency: null, chauffeur: null };

    // MATCH TRAVEL AGENCY
    // Filter by destination country and verified status.
    // NOTE: .filter() defaults to a 50-record limit when none is given — with only
    // status+verification_status server-side, agencies serving OTHER regions could
    // fill that first-50 window and push out real matches for this destination.
    // service_regions holds broad free-text region names ("Caribbean", "Europe", etc.)
    // that don't map cleanly to a server-side exact/regex filter, so scope stays in
    // JS for correctness — but raise the limit so the pool isn't silently truncated.
    const allAgencies = await base44.entities.TravelAgency.filter({
      status: 'active',
      verification_status: 'verified'
    }, '-created_date', 1000);

    // Find agencies that serve the destination country
    const matchingAgencies = allAgencies.filter(agency => {
      const servesDestination = agency.service_regions?.some(region => 
        region.toLowerCase().includes(travelRequest.destination_country.toLowerCase()) ||
        region.toLowerCase().includes(travelRequest.destination_city.toLowerCase())
      );
      return servesDestination;
    });

    if (matchingAgencies.length > 0) {
      // Simple round-robin: pick the first available (can be enhanced with load balancing)
      matches.travel_agency = matchingAgencies[0];
      
      // Assign to the travel request
      await base44.entities.TravelRequest.update(travel_request_id, {
        travel_agency_id: matchingAgencies[0].id,
        package_status: 'pricing_requested'
      });
    }

    // MATCH CHAUFFEUR (TAXI SERVICE)
    if (travelRequest.transfer_required) {
      // Try an exact server-side country match first — scopes the fetch to this one
      // destination instead of every active driver worldwide, which matters at
      // 200k-concurrent-booking scale. Base44's filter is exact-match with no confirmed
      // case-insensitive option, and the original code deliberately lowercased before
      // comparing (implying casing wasn't guaranteed to line up) — so an empty result
      // here falls back to the original broader fetch + JS case-insensitive match rather
      // than risk silently missing real matches over a casing mismatch.
      let matchingTaxis = await base44.entities.TaxiService.filter({
        status: 'active',
        verification_status: 'verified',
        is_online: true,
        operating_country: travelRequest.destination_country,
      }, '-created_date', 500);

      if (matchingTaxis.length === 0) {
        const allTaxiServices = await base44.entities.TaxiService.filter({
          status: 'active',
          verification_status: 'verified',
          is_online: true,
        }, '-created_date', 1000);
        matchingTaxis = allTaxiServices.filter(taxi =>
          taxi.operating_city?.toLowerCase() === travelRequest.destination_city.toLowerCase() ||
          taxi.operating_country?.toLowerCase() === travelRequest.destination_country.toLowerCase()
        );
      }

      if (matchingTaxis.length > 0) {
        matches.chauffeur = matchingTaxis[0];
        
        await base44.entities.TravelRequest.update(travel_request_id, {
          chauffeur_id: matchingTaxis[0].id
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[matchTravelPartners] Matched in ${duration}ms`, {
      travel_agency: matches.travel_agency?.agency_name,
      chauffeur: matches.chauffeur?.agency_name
    });

    return Response.json({
      success: true,
      matched_partners: matches,
      message: matches.travel_agency || matches.chauffeur 
        ? 'Partners matched successfully' 
        : 'No matching partners found for this destination'
    });

  } catch (error) {
    console.error('[matchTravelPartners] Error:', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});