/**
 * doctorSignupGraph — ordered, deterministic question definitions for
 * signing up as a doctor entirely through M-Care's chat panel.
 *
 * Same shape and same engine as src/lib/intakeFlow/questionGraph.js — this
 * repo's flowEngine.js is graph-agnostic by design (it already drives both
 * the medical-patient graph and the travel-only graph), so this file is
 * data, not a new engine. The LLM (intakeConversationTurn, called with
 * persona: 'doctor_signup') only parses free text into targetFields and
 * narrates — it never decides order, and it can never set a verification or
 * trust field, because nothing here targets one. Field names match what
 * submitDoctorSignup() actually sends to Doctor.create() directly, so no
 * translation step is needed between "what M-Care collected" and "what gets
 * submitted."
 */

export const DOCTOR_SIGNUP_INPUT_TYPES = {
  TEXT: 'text',
  EMAIL: 'email',
  PHONE: 'phone',
  SELECT: 'select',
  FILE_UPLOAD: 'file_upload',
};

// Sentinel for "skipped this optional step" — deliberately non-empty, same
// reasoning as questionGraph.js's UNSPECIFIED: flowEngine treats an empty
// string as "not yet answered," which would re-ask the license upload
// forever if a doctor chooses to skip it. submitDoctorSignup() strips this
// back out before writing to Doctor.create().
export const SKIPPED = '__skipped__';

export const SPECIALTY_OPTIONS = [
  { value: 'Dental', label: '🦷 Dental' },
  { value: 'Aesthetic / Cosmetic Surgery', label: '✨ Aesthetic / Cosmetic Surgery' },
  { value: 'Orthopedics', label: '🦴 Orthopedics' },
  { value: 'Ophthalmology', label: '👁️ Ophthalmology' },
  { value: 'Other', label: '📝 Other' },
];

/** @type {Array<object>} */
export const DOCTOR_SIGNUP_GRAPH = [
  {
    id: 'full_name',
    targetFields: ['full_name'],
    question: "What's your full name?",
    deterministicReason: 'so patients and your dashboard show your real name',
    inputType: DOCTOR_SIGNUP_INPUT_TYPES.TEXT,
  },
  {
    id: 'email',
    targetFields: ['email'],
    question: "What's the best email for your doctor account?",
    deterministicReason: 'this is how we reach you about verification and new patients',
    inputType: DOCTOR_SIGNUP_INPUT_TYPES.EMAIL,
  },
  {
    id: 'phone',
    targetFields: ['phone'],
    question: 'And a phone number?',
    deterministicReason: 'used for the fraud/verification check and urgent coordination',
    inputType: DOCTOR_SIGNUP_INPUT_TYPES.PHONE,
  },
  {
    id: 'clinic_country',
    targetFields: ['clinic_country'],
    question: 'Which country is your clinic in?',
    deterministicReason: 'patients search by destination country, so this is how they find you',
    inputType: DOCTOR_SIGNUP_INPUT_TYPES.TEXT,
  },
  {
    id: 'clinic_city',
    targetFields: ['clinic_city'],
    question: 'And which city?',
    deterministicReason: 'shown on your public profile so patients know exactly where to travel to',
    inputType: DOCTOR_SIGNUP_INPUT_TYPES.TEXT,
  },
  {
    id: 'specialty',
    targetFields: ['specialties'],
    question: "What's your specialty?",
    deterministicReason: 'so we only ever match you with patients looking for what you actually do',
    inputType: DOCTOR_SIGNUP_INPUT_TYPES.SELECT,
    options: SPECIALTY_OPTIONS,
  },
  {
    id: 'years_experience',
    targetFields: ['years_experience'],
    question: 'How many years have you been practicing?',
    deterministicReason: 'shown on your profile — patients weigh this when choosing a doctor',
    inputType: DOCTOR_SIGNUP_INPUT_TYPES.TEXT,
  },
  {
    id: 'license_number',
    targetFields: ['license_number'],
    question: "What's your medical license number?",
    deterministicReason: 'used for the government registry check during verification',
    inputType: DOCTOR_SIGNUP_INPUT_TYPES.TEXT,
  },
  {
    // Last step, deliberately: everything above is fine to collect from a
    // guest (matches the classic form's own field order), but nothing gets
    // written until a real session exists — flowEngine returns an
    // 'auth_gate' the moment it hits a requiresAuth step, so M-Care shows
    // the sign-in prompt right here, at the natural "let's finish this up"
    // beat, not before.
    id: 'license_document',
    targetFields: ['license_url'],
    question: 'Want to upload your license now? Optional — you can also add it later from your dashboard.',
    deterministicReason: 'speeds up your verification, but never blocks you from signing up',
    inputType: DOCTOR_SIGNUP_INPUT_TYPES.FILE_UPLOAD,
    requiresAuth: true,
    optional: true,
  },
];

export function getDoctorSignupStepById(stepId) {
  return DOCTOR_SIGNUP_GRAPH.find((s) => s.id === stepId) || null;
}
