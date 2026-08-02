/**
 * questionGraph — travel-only conversational booking (no medical procedure).
 * Same pattern as src/lib/intakeFlow/questionGraph.js, driven by the same
 * graph-agnostic src/lib/intakeFlow/flowEngine.js. Field names match
 * base44/entities/TravelRequest.jsonc directly. Identity (name/email/phone)
 * isn't asked here — createTravelRequest populates it from the authenticated
 * session, not from form fields, so this flow has nothing sensitive to
 * collect before sign-in and can stay guest-friendly through preferences.
 */
import { INPUT_TYPES } from '@/lib/intakeFlow/questionGraph';

export const TRAVEL_CLASS_OPTIONS = [
  { value: 'economy', label: 'Economy' },
  { value: 'premium_economy', label: 'Premium Economy' },
  { value: 'business', label: 'Business' },
  { value: 'first', label: 'First Class' },
];

export const HOTEL_STAR_OPTIONS = [
  { value: '3', label: '3-star' },
  { value: '4', label: '4-star' },
  { value: '5', label: '5-star' },
];

export const HOTEL_ROOM_OPTIONS = [
  { value: 'standard', label: 'Standard Room' },
  { value: 'deluxe', label: 'Deluxe Room' },
  { value: 'suite', label: 'Suite' },
  { value: 'penthouse', label: 'Penthouse' },
];

export const TRANSFER_TYPE_OPTIONS = [
  { value: 'standard', label: 'Standard Vehicle' },
  { value: 'luxury', label: 'Luxury Vehicle' },
  { value: 'vip', label: 'VIP / Security Escort' },
];

export const COMPANION_TYPE_OPTIONS = [
  { value: 'tour_guide', label: 'Local Tour Guide' },
  { value: 'care_companion', label: 'Care Companion' },
  { value: 'luxury_concierge', label: 'Personal Concierge' },
];

export const TRAVELERS_COUNT_OPTIONS = [
  { value: '1', label: 'Just me' },
  { value: '2', label: '2 travelers' },
  { value: '3', label: '3 travelers' },
  { value: '4', label: '4 travelers' },
  { value: '5', label: '5 or more' },
];

/** @type {import('@/lib/intakeFlow/questionGraph').QuestionStep[]} */
export const TRAVEL_QUESTION_GRAPH = [
  {
    // Destination is a COUNTRY picked from a searchable list — never free text.
    // TravelIntake feeds `travelPartnerCountries` real verified-partner countries
    // when we have them, and falls back to the full served-country list otherwise,
    // so there is always a real list to choose from. City is not asked here; the
    // coordinator confirms the exact city with the traveler.
    //
    // NOTE: the id is travel-specific on purpose. translateStep localizes by
    // `intake.steps.<id>.q`, and the MEDICAL flow already owns the id
    // 'destination_country' with medical copy ("...doctors licensed..."). A shared
    // id would make this travel question inherit that medical wording, so we use a
    // distinct id and keep writing the answer to the destination_country field.
    id: 'travel_destination_country',
    targetFields: ['destination_country'],
    question: 'Which country are you traveling to?',
    deterministicReason: 'so we can match you with a verified local travel and transfer partner in the right country',
    inputType: INPUT_TYPES.SELECT,
    optionsSource: 'travelPartnerCountries',
    searchFirst: true,
  },
  {
    // Origin can be ANY country (a traveler comes from anywhere), so this uses the
    // full 195-country list — not the served/partner destination list. Searchable,
    // and the coordinator confirms the exact origin city, same as the destination step.
    id: 'origin_country',
    targetFields: ['origin_country'],
    question: "And where are you traveling from?",
    deterministicReason: 'so we can plan your outbound flight and pickup',
    inputType: INPUT_TYPES.SELECT,
    optionsSource: 'allCountries',
    searchFirst: true,
  },
  {
    // Destination and origin (both just above) are the only two inputs this
    // check needs — the earliest honest point to run it, rather than never
    // running it at all (this travel-only flow had no visa check before).
    // Rendered directly by TravelIntake.jsx (VisaReadinessStep), never
    // through QuestionCard's normal switch — same pattern as final_review.
    id: 'visa_readiness_check',
    targetFields: ['visa_readiness_acknowledged'],
    question: "Let's check your travel requirements",
    deterministicReason: 'so a visa that takes weeks is never a surprise later',
    inputType: INPUT_TYPES.VISA_READINESS,
  },
  {
    id: 'departure_date',
    targetFields: ['departure_date'],
    question: 'When would you like to depart?',
    deterministicReason: "so we can check availability for that date",
    inputType: INPUT_TYPES.DATE,
  },
  {
    id: 'return_date',
    targetFields: ['return_date'],
    question: 'And your return date?',
    deterministicReason: 'so your full itinerary is booked round-trip',
    inputType: INPUT_TYPES.DATE,
    // The calendar disables any day before the already-collected departure
    // date (QuestionCard.jsx reads this via `answers[minDateField]`).
    minDateField: 'departure_date',
  },
  {
    id: 'travelers_count',
    targetFields: ['travelers_count'],
    question: 'How many travelers?',
    deterministicReason: 'so every seat, room, and transfer is sized correctly',
    inputType: INPUT_TYPES.SELECT,
    options: TRAVELERS_COUNT_OPTIONS,
  },
  {
    id: 'travel_class',
    targetFields: ['travel_class'],
    question: 'What travel class would you prefer?',
    deterministicReason: 'so we quote the right fare',
    inputType: INPUT_TYPES.SELECT,
    options: TRAVEL_CLASS_OPTIONS,
  },

  // ── Auth gate: preferences from here on are saved to your account, so we
  //    ask for sign-in before going further — same boundary the medical
  //    intake uses before its own more personal questions.
  {
    id: 'hotel_required',
    targetFields: ['hotel_required'],
    question: 'Would you like us to arrange your hotel?',
    deterministicReason: 'so we know whether to include accommodation in your package',
    inputType: INPUT_TYPES.BOOLEAN,
    requiresAuth: true,
  },
  {
    id: 'hotel_star_rating',
    targetFields: ['hotel_star_rating'],
    question: 'What hotel standard would you like?',
    deterministicReason: 'so we shortlist the right properties',
    inputType: INPUT_TYPES.SELECT,
    options: HOTEL_STAR_OPTIONS,
    requiresAuth: true,
    skipIf: (answers) => answers.hotel_required === false,
  },
  {
    id: 'hotel_room_type',
    targetFields: ['hotel_room_type'],
    question: 'What room type?',
    deterministicReason: 'so your reservation matches what you need',
    inputType: INPUT_TYPES.SELECT,
    options: HOTEL_ROOM_OPTIONS,
    requiresAuth: true,
    skipIf: (answers) => answers.hotel_required === false,
  },
  {
    id: 'transfer_required',
    targetFields: ['transfer_required'],
    question: 'Would you like ground transfers arranged?',
    deterministicReason: 'so a verified local driver is ready when you land',
    inputType: INPUT_TYPES.BOOLEAN,
    requiresAuth: true,
  },
  {
    id: 'transfer_type',
    targetFields: ['transfer_type'],
    question: 'What kind of vehicle?',
    deterministicReason: 'so the right driver and vehicle are matched to your trip',
    inputType: INPUT_TYPES.SELECT,
    options: TRANSFER_TYPE_OPTIONS,
    requiresAuth: true,
    skipIf: (answers) => answers.transfer_required === false,
  },
  {
    id: 'companion_required',
    targetFields: ['companion_required'],
    question: 'Would you like a companion for any part of your trip?',
    deterministicReason: 'a local guide, care companion, or personal concierge, if helpful',
    inputType: INPUT_TYPES.BOOLEAN,
    requiresAuth: true,
  },
  {
    id: 'companion_type',
    targetFields: ['companion_type'],
    question: 'What kind of companion?',
    deterministicReason: 'so we match the right person to what you need',
    inputType: INPUT_TYPES.SELECT,
    options: COMPANION_TYPE_OPTIONS,
    requiresAuth: true,
    skipIf: (answers) => answers.companion_required === false,
  },
  {
    id: 'companion_days',
    targetFields: ['companion_days'],
    question: 'For how many days?',
    deterministicReason: 'so their availability and cost are quoted accurately',
    inputType: INPUT_TYPES.TEXT,
    requiresAuth: true,
    skipIf: (answers) => answers.companion_required === false,
  },
  {
    id: 'final_review',
    targetFields: [],
    question: "Here's your travel request — take a look before I send it off.",
    deterministicReason: 'so nothing is booked without your review',
    inputType: INPUT_TYPES.REVIEW,
    requiresAuth: true,
  },
];

export function getTravelStepById(stepId) {
  return TRAVEL_QUESTION_GRAPH.find((s) => s.id === stepId) || null;
}
