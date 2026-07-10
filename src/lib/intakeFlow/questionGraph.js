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

import { NATIONALITIES } from '@/lib/nationalities';

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
  DOCTOR_PICK: 'doctor_pick',
  CONDITIONS_PICK: 'conditions_pick',
  ALLERGIES_PICK: 'allergies_pick',
  MEDICAL_PICK: 'medical_pick',
};

// Pill option sets for the safety-critical medical-history steps — mirror the
// detailed /booking wizard's sections so both flows capture identical fields.
export const MEDICATION_OPTIONS = [
  { label: 'Blood Thinners',      icon: '🩸' },
  { label: 'Hormones',            icon: '⚗️' },
  { label: 'Diabetes Medication', icon: '💉' },
  { label: 'Vitamins',            icon: '🌿' },
  { label: 'Herbal Supplements',  icon: '🍵' },
  { label: 'Other',               icon: '📝' },
  { label: 'None',                icon: '🚫' },
];

export const ANESTHESIA_COMPLICATION_OPTIONS = [
  { label: 'Allergic reactions',     icon: '⚠️' },
  { label: 'Breathing difficulties', icon: '🫁' },
  { label: 'Nausea / Vomiting',      icon: '🤢' },
  { label: 'Excessive bleeding',     icon: '🩸' },
  { label: 'Other',                  icon: '📝' },
  { label: 'Never had a problem',    icon: '✅' },
];

export const PRIOR_SURGERY_OPTIONS = [
  { label: 'Appendectomy',      icon: '🔪' },
  { label: 'C-Section',         icon: '👶' },
  { label: 'Gallbladder',       icon: '🫀' },
  { label: 'Hernia Repair',     icon: '🏥' },
  { label: 'Joint Replacement', icon: '🦴' },
  { label: 'Cosmetic Surgery',  icon: '✨' },
  { label: 'Dental Surgery',    icon: '🦷' },
  { label: 'Other',             icon: '📝' },
  { label: 'No prior surgeries', icon: '🚫' },
];

/**
 * True only when age parses to a real number under 18. Unparseable ages
 * ("forty-five", blank) return false — an adult with a typo must never be
 * routed into the guardian flow; the guardian requirement re-derives
 * server-side from the stored age at review anyway.
 */
export function isMinorAge(age) {
  const n = Number(String(age ?? '').trim());
  return Number.isFinite(n) && n > 0 && n < 18;
}

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not', label: 'Prefer not to say' },
];

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
 * @property {Object} [medicalPick] - config for a MEDICAL_PICK step (pills + None + optional notes → Consultation medical fields)
 * @property {string} [optionsSource] - key into a dynamicOptions map for choices fetched live (e.g. destination countries)
 * @property {string} [recommendationUnit] - noun shown alongside a dynamic option's real count, e.g. "verified doctors"
 * @property {boolean} [allowUnspecified] - shows an "I'm not sure — recommend one for me" fallback below a free-text (TEXT/EMAIL/PHONE) input, committing the UNSPECIFIED sentinel instead of trapping the user into a dead-end LLM parse loop
 * @property {boolean} [searchFirst] - for a SELECT step: renders an always-visible fuzzy-searchable flat list instead of the ranked-recommendation-cards layout — for large enumerable option sets with no real ranking signal (e.g. nationality), where featuring a "top 5" would be dishonest
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
    // Asked second, before any verification or medical questions — if a
    // guardian needs to be involved, that has to be known before anything
    // else is planned (M Principle: never plan care for a minor alone).
    id: 'age',
    targetFields: ['age'],
    question: 'And how old are you?',
    deterministicReason: 'so we can shape the journey correctly from the very start — and bring in a parent or guardian if you are under 18',
    inputType: INPUT_TYPES.TEXT,
  },
  {
    id: 'guardian_name',
    targetFields: ['guardian_name'],
    question: "Because you're under 18, a parent or guardian will be part of every step of this journey. What's their full name?",
    deterministicReason: 'we never plan care for anyone under 18 without a guardian involved — they approve every decision alongside you',
    inputType: INPUT_TYPES.TEXT,
    skipIf: (a) => !isMinorAge(a.age),
  },
  {
    id: 'guardian_contact',
    targetFields: ['guardian_contact'],
    question: 'And the best phone number or email to reach them?',
    deterministicReason: 'so your care team can include your guardian directly in every confirmation and consent step',
    inputType: INPUT_TYPES.TEXT,
    skipIf: (a) => !isMinorAge(a.age),
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
    recommendationUnit: 'verified doctors',
  },

  // ── Contact details come AFTER procedures + destination on purpose: by now
  //    the background-search checklist is alive with real value (doctors
  //    found, cost estimates), so sharing an email is receiving that work —
  //    not paying a toll to a form (value-before-ask).
  {
    id: 'email',
    targetFields: ['email'],
    question: "Where should I send what I'm finding for you?",
    deterministicReason: "so the doctors, prices, and plan I'm putting together reach your inbox — and you never lose your place",
    inputType: INPUT_TYPES.EMAIL,
  },
  {
    id: 'phone',
    targetFields: ['phone'],
    question: 'A phone number, in case we need to reach you quickly?',
    deterministicReason: 'so your coordinator can reach you directly if anything needs your attention',
    inputType: INPUT_TYPES.PHONE,
  },

  // ── Auth gate: everything from here on is medical, so we ask for an
  //    account first — the same point payment already gates behind today.
  {
    id: 'doctor_selection',
    targetFields: ['preferred_doctor_id', 'preferred_doctor_name'],
    question: 'Based on your procedure and destination, here are your matched doctors.',
    deterministicReason: 'so you can choose who cares for you, or let your care team recommend the best match',
    inputType: INPUT_TYPES.DOCTOR_PICK,
    requiresAuth: true,
  },
  {
    id: 'gender',
    targetFields: ['gender'],
    question: 'How do you identify?',
    deterministicReason: 'a detail your doctor uses to plan your procedure correctly',
    inputType: INPUT_TYPES.SELECT,
    options: GENDER_OPTIONS,
    requiresAuth: true,
  },
  {
    id: 'nationality',
    targetFields: ['nationality', 'client_country'],
    question: "What's your home country?",
    deterministicReason: 'so we can check visa and travel requirements ahead of time',
    inputType: INPUT_TYPES.SELECT,
    options: NATIONALITIES.map((n) => ({ value: n, label: n })),
    searchFirst: true,
    requiresAuth: true,
  },
  {
    id: 'medical_conditions_other',
    targetFields: ['medical_conditions'],
    question: 'Do you have any medical conditions your doctor should know about?',
    deterministicReason: 'so your doctor can prepare the safest possible plan for you',
    inputType: INPUT_TYPES.CONDITIONS_PICK,
    requiresAuth: true,
  },
  {
    id: 'allergy_details',
    targetFields: ['allergies'],
    question: 'Any allergies — medications, foods, or otherwise?',
    deterministicReason: 'so nothing is prescribed or served that could harm you',
    inputType: INPUT_TYPES.ALLERGIES_PICK,
    requiresAuth: true,
  },
  {
    // Current medications — the wizard captures this; the conversation used to
    // skip it. Blood thinners, hormones, and supplements directly affect
    // bleeding, anesthesia, and recovery, so a surgeon must know.
    id: 'medications',
    // Only the always-written fields gate "answered" — the optional notes are
    // still saved when provided, but must not be required (empty = never
    // answered = infinite loop, see isStepAlreadyAnswered).
    targetFields: ['takes_medications', 'medication_types'],
    question: 'Are you taking any medications or supplements right now?',
    deterministicReason: 'some medications and supplements change how surgery, anesthesia, and healing go — your doctor needs the full picture',
    inputType: INPUT_TYPES.MEDICAL_PICK,
    requiresAuth: true,
    medicalPick: {
      options: MEDICATION_OPTIONS,
      noneLabel: 'None',
      flagField: 'takes_medications',
      arrayField: 'medication_types',
      notesField: 'medication_notes',
      notesLabel: 'Please list them — names and doses if you know them.',
      notesPlaceholder: 'e.g. Aspirin 81mg daily, vitamin D…',
    },
  },
  {
    // Prior anesthesia reactions — a past bad reaction (e.g. malignant
    // hyperthermia, airway trouble) can be life-threatening and changes the
    // anesthetic plan entirely. The conversation never asked before.
    id: 'anesthesia_history',
    targetFields: ['anesthesia_complications', 'anesthesia_complication_types'],
    question: 'Have you ever had a bad reaction to anesthesia?',
    deterministicReason: 'a previous reaction tells your anesthesiologist exactly how to keep you safe this time',
    inputType: INPUT_TYPES.MEDICAL_PICK,
    requiresAuth: true,
    medicalPick: {
      options: ANESTHESIA_COMPLICATION_OPTIONS,
      noneLabel: 'Never had a problem',
      flagField: 'anesthesia_complications',
      arrayField: 'anesthesia_complication_types',
    },
  },
  {
    // Surgical history — scar tissue, healing history, and past complications
    // shape how this procedure is planned. Captured as the primary procedure
    // plus a free-text note for timing/complications the doctor reviews.
    id: 'surgery_history',
    // Only had_surgery always gets written (previous_procedures is '' when the
    // answer is "no surgeries", notes are optional) — so gate on it alone.
    targetFields: ['had_surgery'],
    question: 'Have you had surgery before?',
    deterministicReason: 'past operations affect healing and planning — even ones that went perfectly',
    inputType: INPUT_TYPES.MEDICAL_PICK,
    requiresAuth: true,
    medicalPick: {
      options: PRIOR_SURGERY_OPTIONS,
      noneLabel: 'No prior surgeries',
      flagField: 'had_surgery',
      // No arrayField: the pills are surgery TYPES, not complications. The
      // first pick is stored as previous_procedures (matching the wizard),
      // and timing/complications are captured in the free-text note the
      // reviewing doctor reads.
      primaryField: 'previous_procedures',
      notesField: 'previous_procedures_notes',
      notesLabel: 'Roughly when, and did anything go wrong (bleeding, infection, slow healing)?',
      notesPlaceholder: 'e.g. Gallbladder 2019, no problems; C-section 2015…',
    },
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
