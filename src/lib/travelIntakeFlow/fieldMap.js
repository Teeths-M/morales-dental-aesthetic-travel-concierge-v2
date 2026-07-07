/**
 * fieldMap — translates the travel-intake `answers` bag into the exact
 * payload shape `createTravelRequest` expects. Mirrors
 * src/lib/intakeFlow/fieldMap.js's role for the medical flow.
 */

/**
 * @param {object} answers
 * @returns {object} payload for base44.functions.invoke('createTravelRequest', payload)
 */
export function buildTravelRequestPayload(answers) {
  const travelersCount = parseInt(answers.travelers_count, 10);
  const hotelStarRating = parseInt(answers.hotel_star_rating, 10);
  const companionDays = parseInt(answers.companion_days, 10);

  return {
    origin_city: answers.origin_city || '',
    destination_city: answers.destination_city || '',
    destination_country: answers.destination_country || '',
    departure_date: answers.departure_date || '',
    return_date: answers.return_date || '',
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
