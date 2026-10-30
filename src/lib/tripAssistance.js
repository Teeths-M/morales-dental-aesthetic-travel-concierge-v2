/**
 * tripAssistance — the client-side vocabulary of the trip assistance module.
 *
 * These are the SAME closed lists the backend enforces. The client may only
 * ever ask for a category that exists here, and the backend re-checks it: this
 * file decides what a screen can offer, not what is allowed. A category that is
 * not in this list is not renderable, so nobody composes a request the server
 * then has to guess at.
 */

export const TIER_META = {
  1: {
    label: 'Errand',
    short: 'Errand',
    note: 'One errand, one sentence. Written request or a human call.',
  },
  2: {
    label: 'Clinical-adjacent',
    short: 'Clinical',
    note: 'Written only. A named care-team member reads it. Nothing is said aloud.',
  },
  3: {
    label: 'Safety',
    short: 'Safety',
    note: 'Always a human. Never scripted, never automated.',
  },
};

/**
 * `fields` are the only inputs a script can carry. Everything a template can
 * say comes from one of these keys plus the trip record — there is no free-text
 * sentence path into a script, which is what keeps the ask bounded.
 */
export const CATEGORIES = [
  {
    key: 'front_desk_access',
    label: 'Front desk / room access',
    tier: 1,
    blurb: 'Locked out, key not working, need someone at the desk.',
    fields: [
      { key: 'room_number', label: 'Room number', required: true, maxLength: 12 },
      { key: 'detail', label: 'What is happening', required: true, maxLength: 160 },
    ],
  },
  {
    key: 'pharmacy_availability',
    label: 'Pharmacy availability',
    tier: 1,
    blurb: 'Is a pharmacy open nearby, and until when.',
    fields: [
      { key: 'place_name', label: 'Area or landmark', required: true, maxLength: 80 },
      { key: 'detail', label: 'Anything else (not said aloud)', required: false, maxLength: 160 },
    ],
  },
  {
    key: 'opening_hours',
    label: 'Opening hours',
    tier: 1,
    blurb: 'Whether a place is open today.',
    fields: [
      { key: 'place_name', label: 'Place', required: true, maxLength: 80 },
      { key: 'detail', label: 'What you need to know', required: false, maxLength: 160 },
    ],
  },
  {
    key: 'appointment_confirm',
    label: 'Confirm an appointment',
    tier: 1,
    blurb: 'Confirm the appointment still stands.',
    fields: [
      { key: 'detail', label: 'Which appointment', required: true, maxLength: 160 },
    ],
  },
  {
    key: 'appointment_change',
    label: 'Change an appointment',
    tier: 1,
    blurb: 'Move it to a different day or time.',
    fields: [
      { key: 'detail', label: 'Which appointment, and the change you want', required: true, maxLength: 160 },
    ],
  },
  {
    key: 'callback_request',
    label: 'Ask for a callback',
    tier: 1,
    blurb: 'Ask someone to call the traveller back.',
    fields: [
      { key: 'detail', label: 'What it is about', required: true, maxLength: 160 },
    ],
  },
  {
    key: 'medication_question',
    label: 'A medicine question',
    tier: 2,
    blurb: 'Written only. Nothing is spoken aloud.',
    fields: [
      { key: 'detail', label: 'What you need to know', required: true, maxLength: 300 },
    ],
  },
  {
    key: 'symptom_report',
    label: 'Report a symptom',
    tier: 2,
    blurb: 'Written only. Read by the care team.',
    fields: [
      { key: 'detail', label: 'What you are feeling', required: true, maxLength: 300 },
    ],
  },
  {
    key: 'wound_question',
    label: 'A wound question',
    tier: 2,
    blurb: 'Written only. Attach a photo if useful.',
    fields: [
      { key: 'detail', label: 'What you are seeing', required: true, maxLength: 300 },
    ],
  },
  {
    key: 'doctor_instruction',
    label: "I don't understand my doctor's instruction",
    tier: 2,
    blurb: 'Written only. The care team explains in writing.',
    fields: [
      { key: 'detail', label: "Which instruction", required: true, maxLength: 300 },
    ],
  },
  {
    key: 'police',
    label: 'Police needed',
    tier: 3,
    blurb: 'A human handles this. Your address is read first.',
    fields: [
      { key: 'detail', label: 'What is happening', required: true, maxLength: 300 },
    ],
  },
  {
    key: 'threat',
    label: 'I am being threatened',
    tier: 3,
    blurb: 'A human handles this now.',
    fields: [
      { key: 'detail', label: 'What is happening', required: true, maxLength: 300 },
    ],
  },
  {
    key: 'being_followed',
    label: 'I am being followed',
    tier: 3,
    blurb: 'A human handles this now.',
    fields: [
      { key: 'detail', label: 'What is happening', required: true, maxLength: 300 },
    ],
  },
  {
    key: 'medical_emergency',
    label: 'Medical emergency',
    tier: 3,
    blurb: 'A human handles this now.',
    fields: [
      { key: 'detail', label: 'What is happening', required: true, maxLength: 300 },
    ],
  },
];

export function categoryByKey(key) {
  return CATEGORIES.find((c) => c.key === key) || null;
}

export function categoriesForTier(tier) {
  return CATEGORIES.filter((c) => c.tier === tier);
}

/** Which ways of asking this category allows. */
export function modesForCategory(category) {
  if (!category) return [];
  if (category.tier === 1) return ['written', 'human_call'];
  if (category.tier === 2) return ['written'];
  return ['human_call'];
}

export const STATUS_LABEL = {
  draft: 'Draft',
  pending_approval: 'Waiting for your approval',
  approved: 'Approved',
  written_sent: 'Sent as a written request',
  in_progress: 'Care team working on it',
  agreed: 'Done — they agreed',
  not_agreed: 'They could not do it',
  escalated: 'With a human now',
  completed: 'Closed',
  cancelled: 'Cancelled',
};

export const ATTEMPT_LABEL = {
  not_started: 'No attempt yet',
  attempted: 'Tried, no connection',
  connected: 'Connected',
  no_answer: 'No answer',
  wrong_department: 'Wrong department',
  dropped: 'Line dropped',
};

export const AGREEMENT_LABEL = {
  unknown: 'Not agreed yet',
  agreed: 'Agreed',
  partial: 'Partly agreed',
  refused: 'Refused',
};

/** Statuses that still need something from somebody. */
export const OPEN_STATUSES = ['penoy', 'pending_approval', 'approved', 'written_sent', 'in_progress', 'escalated'];

export function isOpenRequest(request) {
  return ['pending_approval', 'approved', 'written_sent', 'in_progress', 'escalated'].includes(request.status);
}

export const RETENTION = {
  outcomesDays: 90,
  audioDays: 30,
};

/** The packet's fields, in the order a responder reads them. */
export const PACKET_FIELD_LIST = [
  { key: 'lodging_address', label: 'Lodging address' },
  { key: 'gate_code', label: 'Gate code' },
  { key: 'front_desk_number', label: 'Front desk' },
  { key: 'doctor_name', label: 'Doctor' },
  { key: 'clinic_name', label: 'Clinic' },
  { key: 'clinic_address', label: 'Clinic address' },
  { key: 'procedure_general', label: 'Procedure (general)' },
  { key: 'procedure_date', label: 'Procedure date' },
  { key: 'allergies', label: 'Allergies' },
  { key: 'current_medicines', label: 'Current medicines' },
  { key: 'language', label: 'Language' },
  { key: 'emergency_contact', label: 'Emergency contact' },
];

export const REQUIRED_PACKET_FIELDS = ['lodging_address', 'language', 'emergency_contact'];

/** Turn a stored packet row into labelled pairs, for the care-team view. */
export function packetPairsFromRow(packet) {
  return PACKET_FIELD_LIST.map((f) => {
    const value = String(packet?.[f.key] || '').trim();
    return {
      key: f.key,
      label: f.label,
      value,
      missing: REQUIRED_PACKET_FIELDS.includes(f.key) && !value,
    };
  });
}