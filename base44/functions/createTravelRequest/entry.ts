import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Sanitize text fields — strip HTML tags to prevent stored XSS
function sanitizeText(input: unknown, maxLen = 2000): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/javascript:/gi, '') // Strip JS protocol
    .trim()
    .slice(0, maxLen);
}

// Validate email format
function isValidEmail(email: unknown): boolean {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { 
      origin_city, origin_country, destination_city, destination_country,
      departure_date, return_date, travelers_count = 1, travel_class = 'economy',
      hotel_required = true, hotel_star_rating = 4, hotel_room_type = 'deluxe',
      transfer_required = true, transfer_type = 'standard',
      companion_required = false, companion_type, companion_days = 0,
      special_requests
    } = await req.json();

    // Input validation
    const requiredFields: Array<[string, unknown]> = [
      ['origin_city', origin_city],
      ['destination_city', destination_city],
      ['departure_date', departure_date],
    ];
    for (const [field, val] of requiredFields) {
      if (!val || typeof val !== 'string' || !val.trim()) {
        return Response.json({ error: `${field} is required` }, { status: 400 });
      }
    }

    if (user.email && !isValidEmail(user.email)) {
      return Response.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Sanitize text fields
    const sanitizedSpecialRequests = sanitizeText(special_requests);

    // Generate unique token
    const request_token = `TRAVEL_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create travel request
    const travelRequest = await base44.entities.TravelRequest.create({
      request_token,
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name,
      origin_city,
      origin_country,
      destination_city,
      destination_country,
      departure_date,
      return_date,
      travelers_count,
      travel_class,
      hotel_required,
      hotel_star_rating,
      hotel_room_type,
      transfer_required,
      transfer_type,
      companion_required,
      companion_type,
      companion_days,
      special_requests: sanitizedSpecialRequests,
      package_status: 'pricing_requested'
    });

    // Calculate preliminary pricing
    const pricing = await base44.functions.invoke('calculateTravelPackagePrice', {
      origin_city,
      destination_city,
      departure_date,
      return_date,
      travelers_count,
      travel_class,
      hotel_star_rating,
      hotel_room_type,
      transfer_type,
      companion_required,
      companion_type,
      companion_days
    });

    // Update with pricing
    const markup = 0.25; // 25% platform markup
    const base_cost = pricing.data.base_cost;
    const total_package_price = base_cost * (1 + markup);
    const profit = total_package_price - base_cost;
    const deposit_amount = total_package_price * 0.25; // 25% deposit

    await base44.entities.TravelRequest.update(travelRequest.id, {
      flight_cost: pricing.data.flight_cost,
      hotel_cost: pricing.data.hotel_cost,
      transfer_cost: pricing.data.transfer_cost,
      companion_cost: pricing.data.companion_cost,
      base_cost,
      markup_percentage: markup,
      total_package_price,
      profit,
      deposit_amount,
      amount_remaining: total_package_price - deposit_amount
    });

    // Send notification to admin/travel agency
    await base44.functions.invoke('sendTravelQuoteEmail', {
      travel_request_id: travelRequest.id,
      recipient_email: user.email,
      total_package_price,
      deposit_amount
    });

    return Response.json({ 
      success: true, 
      request_token,
      travel_request_id: travelRequest.id,
      total_package_price,
      deposit_amount
    });

  } catch (error) {
    console.error('[createTravelRequest] Error:', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});