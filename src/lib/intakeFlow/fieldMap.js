/**
 * fieldMap — translates the conversational `answers` bag into the exact
 * payload shape `Consultation.create()` expects. Because `questionGraph.js`
 * already targets `Consultation` field names directly, this is intentionally
 * a thin pass-through today — it exists as the one place that shape lives,
 * so a future conversational field id that *doesn't* map 1:1 (e.g. splitting
 * "improve or treat" into more than one Consultation field) only needs to
 * change here, not at every call site. Used by ConciergeIntake.jsx's final
 * submission handler to build the Consultation.create() payload.
 */
import { UNSPECIFIED } from './questionGraph';

/** Resolves the "recommend one for me" sentinel back down to empty. */
function resolved(value) {
  return value === UNSPECIFIED ? '' : value || '';
}

/**
 * @param {object} answers — the ConversationSession's flat field_id -> value map
 * @returns {object} a payload shape-identical to what Booking.jsx produces
 */
export function buildConsultationPayload(answers) {
  return {
    patient_name: answers.patient_name || '',
    email: answers.email || '',
    phone: answers.phone || '',
    procedure_interest: answers.procedure_interest || 'other',
    destination_country: resolved(answers.destination_country),
    procedure_country: resolved(answers.procedure_country) || resolved(answers.destination_country),
    preferred_doctor_id: resolved(answers.preferred_doctor_id),
    preferred_doctor_name: resolved(answers.preferred_doctor_name),
    age: answers.age || '',
    gender: answers.gender || '',
    nationality: answers.nationality || '',
    client_country: answers.client_country || answers.nationality || '',
    medical_conditions: answers.medical_conditions || [],
    medical_conditions_other: answers.medical_conditions_other || '',
    allergies: answers.allergies || [],
    allergy_details: answers.allergy_details || '',
    has_companion: !!answers.has_companion,
    preferred_date: answers.preferred_date || '',
    duration_of_stay: answers.duration_of_stay || '',
    clinical_boundary_acknowledged: !!answers.clinical_boundary_acknowledged,
    clinical_boundary_acknowledged_at: answers.clinical_boundary_acknowledged
      ? new Date().toISOString()
      : undefined,
  };
}
