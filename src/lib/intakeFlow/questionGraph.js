/**
 * questionGraph — ordered, deterministic question definitions for the
 * conversational patient intake (Phase 1, Medical Patient persona only).
 *
 * This is the single source of truth for "what do we ask, in what order,
 * and why." The LLM (base44/functions/intakeConversationTurn) never decides
 * order or whether to ask — it only rephrases `deterministicReason` and
 * parses free-text answers into `targetFields`. Field names match
 * `base44/entities/Consultation.jsonc` directly so the final submission
 * payload needs no translation.
 */

// Sentinel for "no preference" answers (e.g. destination country). Deliberately
// non-empty — flowEngine treats an empty string as "not yet answered," which
// would make a genuine "recommend one for me" answer loop forever.
export const UNSPECIFIED = '__unspecified__';

export const INPUT_TYPES = {
  TEXT: 'text',
  EMAIL: 'email',
  PHONE: 'phone',
  SELECT: 'select',
  MULTI_SELECT: 'multi_select',
  BOOLEAN: 'boolean',
  DATE: 'date',
  REVIEW: 'review',
};

export const PROCEDURE_OPTIONS = [
  { value: 'dental_implants', label: 'Dental Implants' },
  { value: 'all_on_4', label: 'All-on-4 / All-on-6' },
  { value: 'porcelain_veneers', label: 'Porcelain Veneers' },
  { value: 'smile_makeover', label: 'Smile Makeover' },
  { value: 'rhinoplasty', label: 'Rhinoplasty' },
  { value: 'breast_surgery', label: 'Breast Augmentation / Reduction / Lift' },
  { value: 'liposuction', label: 'Liposuction' },
  { value: 'tummy_tuck', label: 'Abdominoplasty (Tummy Tuck)' },
  { value: 'facelift', label: 'Facelift' },
  { value: 'other', label: 'Something else' },
];

/**
 * @typedef {Object} QuestionStep
 * @property {string} id
 * @property {string[]} targetFields — Consultation field(s) this step fills
 * @property {string} question — static copy (M1); LLM-narrated from here in M2
 * @property {string} deterministicReason — pre-authored "why we ask" copy, never generated
 * @property {string} inputType
 * @property {Array<{value:string,label:string}>} [options] - static choices, known synchronously
 * @property {string} [optionsSource] - key into a dynamicOptions map for choices fetched live (e.g. destination countries)
 * @property {(answers: object) => boolean} [skipIf] - true means skip this step
 * @property {boolean} [requiresAuth] - gates this step behind sign-in (medical history onward)
 */

/** @type {QuestionStep[]} */
export const QUESTION_GRAPH = [
  {
    id: 'patient_name',
    targetFields: ['patient_name'],
    question: "First, what's your name?",
    deterministicReason: 'so your care team knows who they\'re looking after',
    inputType: INPUT_TYPES.TEXT,
  },
  {
    id: 'email',
    targetFields: ['email'],
    question: 'And the best email to reach you at?',
    deterministicReason: "so we can send your journey updates and never lose your place",
    inputType: INPUT_TYPES.EMAIL,
  },
  {
    id: 'phone',
    targetFields: ['phone'],
    question: 'A phone number, in case we need to reach you quickly?',
    deterministicReason: 'so your coordinator can reach you directly if anything needs your attention',
    inputType: INPUT_TYPES.PHONE,
  },
  {
    id: 'procedure_interest',
    targetFields: ['procedure_interest', 'selected_procedures'],
    question: 'What would you like to improve or treat? You can choose more than one.',
    deterministicReason: 'so we can begin matching you with the right specialists — and check that everything you choose can be safely combined',
    inputType: INPUT_TYPES.MULTI_SELECT,
    options: PROCEDURE_OPTIONS,
  },
  {
    id: 'destination_country',
    targetFields: ['destination_country', 'procedure_country'],
    question: 'Do you have a destination in mind, or would you like a recommendation?',
    deterministicReason: 'so we can find doctors licensed in your destination',
    inputType: INPUT_TYPES.SELECT,
    // Populated live from verified, active doctors (useDestinationCountries) —
    // every option shown is guaranteed to have a real doctor behind it.
    optionsSource: 'destinationCountries',
  },

  // ── Auth gate: everything from here on is medical, so we ask for an
  //    account first — the same point payment already gates behind today.
  {
    id: 'age',
    targetFields: ['age'],
    question: 'What is your age?',
    deterministicReason: 'so your doctor can plan safely around your age group',
    inputType: INPUT_TYPES.TEXT,
    requiresAuth: true,
  },
  {
    id: 'gender',
    targetFields: ['gender'],
    question: 'How do you identify?',
    deterministicReason: 'a detail your doctor uses to plan your procedure correctly',
    inputType: INPUT_TYPES.TEXT,
    requiresAuth: true,
  },
  {
    id: 'nationality',
    targetFields: ['nationality', 'client_country'],
    question: "What's your home country?",
    deterministicReason: 'so we can check visa and travel requirements ahead of time',
    inputType: INPUT_TYPES.TEXT,
    requiresAuth: true,
  },
  {
    id: 'medical_conditions_other',
    targetFields: ['medical_conditions_other'],
    question: 'Do you have any medical conditions your doctor should know about?',
    deterministicReason: 'so your doctor can prepare the safest possible plan for you',
    inputType: INPUT_TYPES.TEXT,
    requiresAuth: true,
  },
  {
    id: 'allergy_details',
    targetFields: ['allergy_details'],
    question: 'Any allergies — medications, foods, or otherwise?',
    deterministicReason: 'so nothing is prescribed or served that could harm you',
    inputType: INPUT_TYPES.TEXT,
    requiresAuth: true,
  },
  {
    id: 'has_companion',
    targetFields: ['has_companion'],
    question: 'Will someone be travelling with you?',
    deterministicReason: 'so we can plan for one traveller or more from the start',
    inputType: INPUT_TYPES.BOOLEAN,
    requiresAuth: true,
  },
  {
    id: 'preferred_date',
    targetFields: ['preferred_date'],
    question: 'When would you like to travel?',
    deterministicReason: "so we can check your doctor's and destination's availability",
    inputType: INPUT_TYPES.DATE,
    requiresAuth: true,
  },
  {
    id: 'duration_of_stay',
    targetFields: ['duration_of_stay'],
    question: 'How long can you stay for recovery?',
    deterministicReason: 'so your recovery plan and accommodation match your schedule',
    inputType: INPUT_TYPES.TEXT,
    requiresAuth: true,
  },
  {
    id: 'clinical_boundary_acknowledged',
    targetFields: ['clinical_boundary_acknowledged'],
    question: "One last thing — please confirm you understand Morales coordinates your care but doesn't diagnose or prescribe. Your doctor makes every clinical decision.",
    deterministicReason: 'a clear boundary we hold with every patient, always',
    inputType: INPUT_TYPES.BOOLEAN,
    requiresAuth: true,
  },
  {
    id: 'final_review',
    targetFields: [],
    question: "Here's everything I've gathered — take a look before I send it to your care team.",
    deterministicReason: 'so nothing goes to your care team without your review',
    inputType: INPUT_TYPES.REVIEW,
    requiresAuth: true,
  },
];

export function getStepById(stepId) {
  return QUESTION_GRAPH.find((s) => s.id === stepId) || null;
}
