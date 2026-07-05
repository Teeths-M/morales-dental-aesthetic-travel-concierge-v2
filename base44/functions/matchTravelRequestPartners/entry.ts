import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { travelRequestId } = await req.json();
    if (!travelRequestId) {
      return Response.json({ error: 'TravelRequest ID required' }, { status: 400 });
    }

    // Fetch the travel request
    const travelRequest = await base44.asServiceRole.entities.TravelRequest.get(travelRequestId);
    if (!travelRequest) {
      return Response.json({ error: 'TravelRequest not found' }, { status: 404 });
    }

    // Only match if not already assigned
    if (travelRequest.travel_agency_id) {
      return Response.json({ 
        status: 'ALREADY_ASSIGNED', 
        travel_agency_id: travelRequest.travel_agency_id,
        message: 'Partners already assigned' 
      });
    }

    // Match Travel Agency based on destination
    const destinationCountry = travelRequest.destination_country;
    const destinationCity = travelRequest.destination_city;

    // NOTE: .filter() defaults to a 50-record limit when none is given. service_regions
    // holds broad free-text region names that don't map cleanly to a server-side filter,
    // so matching stays in JS for correctness — but the limit is raised explicitly so
    // the candidate pool isn't silently truncated to an arbitrary first-50 window.
    const travelAgencies = await base44.asServiceRole.entities.TravelAgency.filter({
      status: 'active',
      verification_status: 'verified'
    }, '-created_date', 1000);

    // Filter agencies that serve the destination
    const matchedAgencies = travelAgencies.filter(agency => {
      const regions = agency.service_regions || [];
      return regions.some(region => 
        region.toLowerCase().includes(destinationCountry.toLowerCase()) ||
        region.toLowerCase().includes(destinationCity.toLowerCase())
      );
    });

    // Sort by rating (highest first)
    matchedAgencies.sort((a, b) => (b.rating || 5.0) - (a.rating || 5.0));

    let assignedAgency = null;
    if (matchedAgencies.length > 0) {
      assignedAgency = matchedAgencies[0];
    } else if (travelAgencies.length > 0) {
      // Fallback: assign any active agency if no regional match
      assignedAgency = travelAgencies[0];
    }

    // Match Taxi Service (Chauffeur) based on destination city.
    // Try an exact server-side country match first — scopes the fetch to this one
    // destination instead of every active driver worldwide. Falls back to the original
    // broader fetch + JS substring match (unchanged) if that finds nothing, so a casing
    // or partial-match case (e.g. "New York City" containing "New York") is never missed.
    let matchedTaxis = await base44.asServiceRole.entities.TaxiService.filter({
      status: 'active',
      verification_status: 'verified',
      operating_country: destinationCountry,
    }, '-created_date', 500);

    if (matchedTaxis.length === 0) {
      const taxiServices = await base44.asServiceRole.entities.TaxiService.filter({
        status: 'active',
        verification_status: 'verified'
      }, '-created_date', 1000);
      matchedTaxis = taxiServices.filter(taxi =>
        taxi.operating_city?.toLowerCase().includes(destinationCity.toLowerCase()) ||
        taxi.operating_country?.toLowerCase().includes(destinationCountry.toLowerCase())
      );
    }

    matchedTaxis.sort((a, b) => (b.quality_score || 5.0) - (a.quality_score || 5.0));

    let assignedTaxi = null;
    if (matchedTaxis.length > 0) {
      assignedTaxi = matchedTaxis[0];
    }

    // Update the TravelRequest with assigned partners
    const updateData = {};
    if (assignedAgency) {
      updateData.travel_agency_id = assignedAgency.id;
      updateData.package_status = 'pricing_requested';
    }
    if (assignedTaxi) {
      updateData.chauffeur_id = assignedTaxi.id;
    }

    await base44.asServiceRole.entities.TravelRequest.update(travelRequestId, updateData);

    // Notify assigned agency
    if (assignedAgency) {
      const portalToken = `travel_${travelRequestId}_${crypto.randomUUID().replace(/-/g, '').slice(0, 32)}`;
      const portalUrl = `${(Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '')}/portal/travel?token=${portalToken}`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: assignedAgency.email,
        subject: `New Travel Request - ${travelRequest.user_name}`,
        body: `
          <h2>New Travel Coordination Request</h2>
          <p>Dear ${assignedAgency.agency_name || 'Travel Partner'},</p>
          <p>You have been matched with a new travel request:</p>
          <ul>
            <li><strong>Client:</strong> ${travelRequest.user_name}</li>
            <li><strong>From:</strong> ${travelRequest.origin_city}, ${travelRequest.origin_country}</li>
            <li><strong>Destination:</strong> ${travelRequest.destination_city}, ${travelRequest.destination_country}</li>
            <li><strong>Departure:</strong> ${travelRequest.departure_date}</li>
            <li><strong>Return:</strong> ${travelRequest.return_date || 'One-way'}</li>
            <li><strong>Travelers:</strong> ${travelRequest.travelers_count}</li>
            <li><strong>Class:</strong> ${travelRequest.travel_class}</li>
            <li><strong>Hotel Required:</strong> ${travelRequest.hotel_required ? 'Yes' : 'No'}</li>
            <li><strong>Transfer Required:</strong> ${travelRequest.transfer_required ? 'Yes' : 'No'}</li>
          </ul>
          <p>Please prepare a quote for this travel package.</p>
          <a href="${portalUrl}" style="display:inline-block;padding:12px 24px;background-color:#059669;color:white;text-decoration:none;border-radius:6px;margin:16px 0;">View Request Details</a>
          <p>Best regards,<br/>Morales Travel Concierge</p>
        `
      });
    }

    return Response.json({
      status: 'PARTNERS_ASSIGNED',
      travel_agency: assignedAgency ? {
        id: assignedAgency.id,
        name: assignedAgency.agency_name,
        email: assignedAgency.email,
        rating: assignedAgency.rating
      } : null,
      taxi_service: assignedTaxi ? {
        id: assignedTaxi.id,
        name: assignedTaxi.agency_name,
        email: assignedTaxi.email,
        quality_score: assignedTaxi.quality_score
      } : null,
      message: 'Partners matched and notified successfully'
    });

  } catch (error) {
    console.error('[matchTravelRequestPartners]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});