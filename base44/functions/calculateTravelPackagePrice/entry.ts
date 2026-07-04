import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      origin_city, destination_city, departure_date, return_date,
      travelers_count = 1, travel_class = 'economy',
      hotel_star_rating = 4, hotel_room_type = 'deluxe',
      transfer_type = 'standard',
      companion_required = false, companion_type, companion_days = 0
    } = await req.json();

    // Calculate days
    const start = new Date(departure_date);
    const end = new Date(return_date);
    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    // Flight pricing (simplified - in production use Amadeus/Sabre API)
    const flightBaseRates = {
      economy: 600,
      premium_economy: 1200,
      business: 2500,
      first: 5000
    };
    const flight_cost = flightBaseRates[travel_class] * travelers_count * 2; // round trip

    // Hotel pricing per night
    const hotelBaseRates = {
      3: { standard: 80, deluxe: 120, suite: 200, penthouse: 400 },
      4: { standard: 150, deluxe: 250, suite: 400, penthouse: 800 },
      5: { standard: 300, deluxe: 500, suite: 900, penthouse: 2000 }
    };
    const hotel_nightly_rate = hotelBaseRates[hotel_star_rating]?.[hotel_room_type] || 200;
    const hotel_cost = hotel_nightly_rate * nights * travelers_count;

    // Transfer pricing (airport pickup + dropoff)
    const transferRates = {
      standard: 50,
      luxury: 120,
      vip: 250
    };
    const transfer_cost = transferRates[transfer_type] * 2 * travelers_count;

    // Companion pricing
    let companion_cost = 0;
    if (companion_required) {
      const companionDailyRates = {
        tour_guide: 150,
        care_companion: 200,
        luxury_concierge: 400
      };
      companion_cost = (companionDailyRates[companion_type] || 200) * companion_days;
    }

    const base_cost = flight_cost + hotel_cost + transfer_cost + companion_cost;

    return Response.json({
      flight_cost,
      hotel_cost,
      transfer_cost,
      companion_cost,
      base_cost,
      nights,
      pricing_breakdown: {
        flights: `${travel_class.charAt(0).toUpperCase() + travel_class.slice(1)} class for ${travelers_count} travelers`,
        hotel: `${hotel_star_rating}-star ${hotel_room_type} for ${nights} nights`,
        transfer: `${transfer_type.charAt(0).toUpperCase() + transfer_type.slice(1)} transfers`,
        companion: companion_required ? `${companion_days} days with ${companion_type.replace('_', ' ')}` : 'Not required'
      }
    });

  } catch (error) {
    console.error('[calculateTravelPackagePrice] Error:', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});