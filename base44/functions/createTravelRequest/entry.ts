import { createHandler, err } from '../../shared/createHandler.ts';
import { renderEmail } from '../../shared/emailTemplate.ts';
import { z, strictObject, Fields } from '../../shared/validate.ts';

// Enums mirror base44/entities/TravelRequest.jsonc exactly. departure_date/
// return_date are left as length-capped strings, not a strict date format —
// the current code never validated their format either, and this repo's
// intake flow's exact date format hasn't been confirmed here.
const CreateTravelRequestSchema = strictObject({
  origin_city: Fields.shortText(100),
  origin_country: z.string().trim().max(100).optional(),
  destination_city: Fields.shortText(100),
  destination_country: z.string().trim().max(100).optional(),
  departure_date: Fields.shortText(30),
  return_date: z.string().trim().max(30).optional(),
  passport_expiry_date: z.string().trim().max(30).optional(),
  travelers_count: Fields.boundedInt(1, 20).optional().default(1),
  travel_class: z.enum(['economy', 'premium_economy', 'business', 'first']).optional().default('economy'),
  hotel_required: z.boolean().optional().default(true),
  hotel_star_rating: Fields.boundedInt(3, 5).optional().default(4),
  hotel_room_type: z.enum(['standard', 'deluxe', 'suite', 'penthouse']).optional().default('deluxe'),
  transfer_required: z.boolean().optional().default(true),
  transfer_type: z.enum(['standard', 'luxury', 'vip']).optional().default('standard'),
  companion_required: z.boolean().optional().default(false),
  companion_type: z.enum(['tour_guide', 'care_companion', 'luxury_concierge']).optional(),
  companion_days: Fields.boundedInt(0, 365).optional().default(0),
  special_requests: z.string().max(2000).optional().default(''),
});

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

Deno.serve(createHandler(async ({ base44, user, body }) => {
    const { 
      origin_city, origin_country, destination_city, destination_country,
      departure_date, return_date, passport_expiry_date, travelers_count = 1, travel_class = 'economy',
      hotel_required = true, hotel_star_rating = 4, hotel_room_type = 'deluxe',
      transfer_required = true, transfer_type = 'standard',
      companion_required = false, companion_type, companion_days = 0,
      special_requests
    } = await body();

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
      passport_expiry_date,
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

    // Calculate preliminary pricing.
    // FIX: this previously ran with no error handling — any failure here
    // (the nested invoke rejecting, or a malformed pricing.data) bubbled to
    // createHandler's outer catch as a bare 500, leaving the TravelRequest
    // row already created but never priced, and the caller got the same
    // generic "internal error" as every other failure mode. Wrapped so a
    // pricing failure is at least identifiable as such (never leaking
    // error.message, per SEC-10) instead of indistinguishable noise.
    let pricing;
    try {
      pricing = await base44.functions.invoke('calculateTravelPackagePrice', {
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
      if (typeof pricing?.data?.base_cost !== 'number' || !isFinite(pricing.data.base_cost)) {
        throw new Error('calculateTravelPackagePrice returned no usable base_cost');
      }
    } catch (error) {
      console.error('[createTravelRequest] pricing calculation failed:', error.message);
      return err('We could not calculate pricing for this trip — please check your dates and try again.', 502);
    }

    // Update with pricing
    const markup = 0.25; // 25% platform markup
    const base_cost = pricing.data.base_cost;
    const total_package_price = base_cost * (1 + markup);
    const profit = total_package_price - base_cost;
    const deposit_amount = total_package_price * 0.25; // 25% deposit

    try {
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
    } catch (error) {
      console.error('[createTravelRequest] saving calculated pricing failed:', error.message);
      return err('Your trip was created but pricing could not be saved — please contact us directly.', 502);
    }

    // Client confirmation — real quote, not a placeholder. BUG FIX: this
    // previously called 'sendTravelQuoteEmail' with {travel_request_id,
    // recipient_email, ...}, but that function actually expects
    // {consultation_id, taxi_service_id, ...} (a different, medical-flow
    // notification) and would reject every call with a 400 for a missing
    // consultation_id — silently dropping this confirmation every time.
    const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      subject: `Your Travel Package Quote — ${request_token}`,
      body: renderEmail({
        appUrl,
        eyebrow: 'Travel Package Quote',
        title: `${user.full_name || 'Traveler'}, your quote is ready`,
        intro: `From ${origin_city} to ${destination_city}, departing ${departure_date}. We're now matching you with a verified travel partner.`,
        rows: [
          ['Reference', request_token],
          ['Travelers', String(travelers_count)],
          ['Total Package', `$${total_package_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
          ['Deposit Due', `$${deposit_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
        ],
        ctaText: 'View My Travel Request',
        ctaUrl: `${appUrl}/travel-services`,
      }),
    }).catch((e) => console.warn('[createTravelRequest] confirmation email failed (non-blocking):', e.message));

    // BUG FIX: matchTravelRequestPartners existed and correctly assigns +
    // notifies a real TravelAgency/TaxiService, but nothing anywhere in the
    // app ever called it — every TravelRequest sat unassigned indefinitely.
    // Non-blocking: partner assignment failing must not fail the booking.
    await base44.functions.invoke('matchTravelRequestPartners', {
      travelRequestId: travelRequest.id,
    }).catch((e) => console.warn('[createTravelRequest] partner matching failed (non-blocking):', e.message));

    return Response.json({
      success: true, 
      request_token,
      travel_request_id: travelRequest.id,
      total_package_price,
      deposit_amount
    });
}, { name: 'createTravelRequest', bodySchema: CreateTravelRequestSchema }));
