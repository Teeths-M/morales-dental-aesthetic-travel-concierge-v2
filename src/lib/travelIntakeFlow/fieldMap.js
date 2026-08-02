/**
 * fieldMap — translates the travel-intake `answers` bag into the exact
 * payload shape `createTravelRequest` expects. Mirrors
 * src/lib/intakeFlow/fieldMap.js's role for the medical flow.
 */
import { UNSPECIFIED } from '@/lib/intakeFlow/questionGraph';

/** Resolves the "recommend one for me" sentinel back down to empty. */
function resolved(value) {
  return value === UNSPECIFIED ? '' : value || '';
}

/**
 * destination_city is a required field on TravelRequest — unlike
 * destination_country, it can't resolve down to an empty string or the
 * create call would fail validation. Resolves to an honest placeholder the
 * coordinator recognizes as "pick this," not a blank/missing value.
 */
function resolvedCity(value) {
  return value === UNSPECIFIED || !value ? 'Recommend for me' : value;
}

/**
 * @param {object} answers
 * @returns {object} payload for base44.functions.invoke('createTravelRequest', payload)
 */
export function buildTravelRequestPayload(answers) {
  const travelersCount = parseInt(answers.travelers_count, 10);
  const hotelStarRating = parseInt(answers.hotel_star_rating, 10);
  const companionDays = parseInt(answers.companion_days, 10);

  return {
    // Origin is now a COUNTRY (searchable, full 195). origin_city is a required field
    // on TravelRequest, so it resolves to the coordinator-confirms placeholder (same
    // pattern as destination_city) rather than an empty string that fails validation.
    origin_country: resolved(answers.origin_country),
    origin_city: resolvedCity(answers.origin_city),
    destination_city: resolvedCity(answers.destination_city),
    destination_country: resolved(answers.destination_country),
    departure_date: answers.departure_date || '',
    return_date: answers.return_date || '',
    passport_expiry_date: answers.passport_expiry_date || '',
    travelers_count: Number.isFinite(travelersCount) ? travelersCount : 1,
    travel_class: answers.travel_class || 'economy',
    hotel_required: answers.hotel_required !== false,
    hotel_star_rating: Number.isFinite(hotelStarRating) ? hotelStarRating : 4,
    hotel_room_type: answers.hotel_room_type || 'deluxe',
    transfer_required: answers.transfer_required !== false,
    transfer_type: answers.transfer_type || 'standard',
    companion_required: !!answers.companion_required,
    companion_type: answers.companion_type,
    companion_days: Number.isFinite(companionDays) ? companionDays : 0,
  };
}
