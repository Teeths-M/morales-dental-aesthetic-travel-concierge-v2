/**
 * travelAgencySignupGraph — signing up as a travel agency entirely through
 * M-Care's chat panel. Second partner-signup graph on this engine (after
 * doctorSignupGraph.js) — same shape, same graph-agnostic flowEngine.js,
 * deliberately a SEPARATE file rather than a shared abstraction with the
 * doctor graph: two instances of a pattern isn't enough to justify forcing
 * a common one yet, and this file needs two input types (MULTI_SELECT,
 * BOOLEAN) the doctor graph never has, so a shared INPUT_TYPES enum would
 * have to grow anyway. Field names match what submitTravelAgencySignup()
 * sends to TravelAgency.create() directly, same "no translation step"
 * discipline as the doctor graph.
 */

export const TRAVEL_AGENCY_INPUT_TYPES = {
  TEXT: 'text',
  EMAIL: 'email',
  PHONE: 'phone',
  SELECT: 'select',
  MULTI_SELECT: 'multi_select',
  BOOLEAN: 'boolean',
  FILE_UPLOAD: 'file_upload',
};

// Sentinel for "skipped this optional step" — same reasoning as
// doctorSignupGraph.js's SKIPPED (flowEngine treats an empty string as
// "not yet answered," which would re-ask an optional step forever).
export const SKIPPED = '__skipped__';

export const REGION_OPTIONS = [
  { value: 'Caribbean', label: 'Caribbean' },
  { value: 'North America', label: 'North America' },
  { value: 'Central America', label: 'Central America' },
  { value: 'South America', label: 'South America' },
  { value: 'Europe', label: 'Europe' },
  { value: 'Middle East', label: 'Middle East' },
  { value: 'Asia', label: 'Asia' },
  { value: 'Africa', label: 'Africa' },
];

export const SERVICE_OPTIONS = [
  { value: 'flights', label: '✈️ Flights' },
  { value: 'hotels', label: '🏨 Hotels' },
  { value: 'transfers', label: '🚗 Airport Transfers' },
  { value: 'clinic', label: '🏥 Clinic Coordination' },
];

export const PAYOUT_OPTIONS = [
  { value: 'stripe', label: '💳 Stripe' },
  { value: 'paypal', label: '🅿️ PayPal' },
  { value: 'wipay', label: '💰 WiPay' },
];

/** @type {Array<object>} */
export const TRAVEL_AGENCY_SIGNUP_GRAPH = [
  {
    id: 'agency_name',
    targetFields: ['agency_name'],
    question: "What's your travel agency's name?",
    deterministicReason: 'shown on your public partner profile',
    inputType: TRAVEL_AGENCY_INPUT_TYPES.TEXT,
  },
  {
    id: 'contact_person',
    targetFields: ['contact_person'],
    question: "Who's the main contact person we should reach for this account?",
    deterministicReason: 'used for verification and day-to-day coordination',
    inputType: TRAVEL_AGENCY_INPUT_TYPES.TEXT,
  },
  {
    id: 'email',
    targetFields: ['email'],
    question: "What's the best email for your agency account?",
    deterministicReason: 'this is how we reach you about verification and new quote requests',
    inputType: TRAVEL_AGENCY_INPUT_TYPES.EMAIL,
  },
  {
    id: 'phone',
    targetFields: ['phone'],
    question: 'And a phone number?',
    deterministicReason: 'used for the fraud/verification check and urgent coordination',
    inputType: TRAVEL_AGENCY_INPUT_TYPES.PHONE,
  },
  {
    id: 'headquarters_country',
    targetFields: ['headquarters_country'],
    question: 'Which country is your agency headquartered in?',
    deterministicReason: 'shown on your profile and used for regional matching',
    inputType: TRAVEL_AGENCY_INPUT_TYPES.TEXT,
  },
  {
    id: 'headquarters_city',
    targetFields: ['headquarters_city'],
    question: 'And which city?',
    deterministicReason: 'shown on your public profile',
    inputType: TRAVEL_AGENCY_INPUT_TYPES.TEXT,
  },
  {
    id: 'service_regions',
    targetFields: ['service_regions'],
    question: 'Which regions do you serve? Pick as many as apply.',
    deterministicReason: 'we only ever match you with trips headed to a region you actually cover',
    inputType: TRAVEL_AGENCY_INPUT_TYPES.MULTI_SELECT,
    options: REGION_OPTIONS,
  },
  {
    id: 'services_offered',
    targetFields: ['services_offered'],
    question: 'What can you book for a patient? Pick as many as apply.',
    deterministicReason: 'so a case only ever gets routed to you for something you actually offer',
    inputType: TRAVEL_AGENCY_INPUT_TYPES.MULTI_SELECT,
    options: SERVICE_OPTIONS,
  },
  {
    id: 'emergency_support_available',
    targetFields: ['emergency_support_available'],
    question: 'Do you offer 24/7 emergency support during a trip?',
    deterministicReason: 'shown to patients as a real trust signal, not assumed',
    inputType: TRAVEL_AGENCY_INPUT_TYPES.BOOLEAN,
  },
  {
    id: 'payout_method',
    targetFields: ['payout_method'],
    question: 'How would you like to get paid?',
    deterministicReason: 'so we can set up payouts correctly from the start',
    inputType: TRAVEL_AGENCY_INPUT_TYPES.SELECT,
    options: PAYOUT_OPTIONS,
  },
  {
    id: 'payout_account',
    targetFields: ['payout_account'],
    question: 'What account should payouts go to — a bank account for Stripe, or your email for PayPal/WiPay?',
    deterministicReason: 'required to actually route your payouts',
    inputType: TRAVEL_AGENCY_INPUT_TYPES.TEXT,
  },
  {
    // Not a persisted field — submitTravelAgencySignup() never reads this.
    // It exists purely so signup cannot complete without it, matching the
    // classic form's own submit button staying disabled until checked.
    // mustBeTrue: an explicit "no" must never silently count as answered.
    id: 'legal_confirmed',
    targetFields: ['legal_confirmed'],
    question: 'Last thing — can you confirm you can legally provide travel services in the regions you selected?',
    deterministicReason: 'a required legal confirmation, same as the standard signup form',
    inputType: TRAVEL_AGENCY_INPUT_TYPES.BOOLEAN,
    mustBeTrue: true,
  },
  {
    // Last step, deliberately, same reasoning as doctorSignupGraph.js:
    // everything above is fine to collect from a guest, but nothing gets
    // written until a real session exists.
    id: 'business_license',
    targetFields: ['business_license_url'],
    question: 'Want to upload your business license now? Optional — you can also add it later from your dashboard.',
    deterministicReason: 'speeds up your verification, but never blocks you from signing up',
    inputType: TRAVEL_AGENCY_INPUT_TYPES.FILE_UPLOAD,
    requiresAuth: true,
    optional: true,
  },
];

export function getTravelAgencySignupStepById(stepId) {
  return TRAVEL_AGENCY_SIGNUP_GRAPH.find((s) => s.id === stepId) || null;
}
