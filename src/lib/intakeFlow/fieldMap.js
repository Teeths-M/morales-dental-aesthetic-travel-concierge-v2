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
import { UNSPECIFIED, isMinorAge } from './questionGraph';
import { DATA_CONSENT_VERSION } from '@/components/consent/DataProcessingConsent';

/** Resolves the "recommend one for me" sentinel back down to empty. */
function resolved(value) {
  return value === UNSPECIFIED ? '' : value || '';
}

/**
 * @param {object} answers — the ConversationSession's flat field_id -> value map
 * @param {object} [verification] - per-channel OTP outcome from
 *   ContactVerificationStep ({ email_verified, phone_verified }); absent or
 *   false means the coordinator confirms that channel manually.
 * @returns {object} a payload shape-identical to what Booking.jsx produces
 */
export function buildConsultationPayload(answers, verification = {}) {
  return {
    email_verified: !!verification.email_verified,
    phone_verified: !!verification.phone_verified,
    patient_name: answers.patient_name || '',
    email: answers.email || '',
    phone: answers.phone || '',
    procedure_interest: answers.procedure_interest || 'other',
    // The full set, not just the first. The intake explicitly invites more than
    // one ("You can choose more than one") and the safety engine scores all of
    // them, but only procedure_interest was ever persisted — so a patient who
    // asked for three procedures produced a record naming one. The doctor
    // reviewing that case, and any quote built from it, were both working from
    // an incomplete picture of what was actually requested.
    selected_procedures: Array.isArray(answers.selected_procedures) && answers.selected_procedures.length
      ? answers.selected_procedures
      : (answers.procedure_interest ? [answers.procedure_interest] : []),
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
    // Safety-critical medical history — mirrors the /booking wizard's fields so
    // both flows hand the reviewing doctor the same complete picture.
    takes_medications: !!answers.takes_medications,
    medication_types: answers.medication_types || [],
    medication_notes: answers.medication_notes || '',
    anesthesia_complications: !!answers.anesthesia_complications,
    anesthesia_complication_types: answers.anesthesia_complication_types || [],
    had_surgery: !!answers.had_surgery,
    previous_procedures: answers.previous_procedures || '',
    previous_procedures_notes: answers.previous_procedures_notes || '',
    has_companion: !!answers.has_companion,
    // Recovery-meal preference (not clinical, not a safety input) — flows into
    // the companion/hotel meal brief. Defaults to 'none' so an untouched intake
    // still writes a valid enum value, matching the entity default.
    dietary_restrictions: answers.dietary_restrictions || 'none',
    preferred_date: answers.preferred_date || '',
    // Drives the 6-month sentinel and the visa lead-time warning. Typed by the
    // patient — deliberately never OCR'd from an uploaded passport image, see
    // the note at the top of components/booking/PassportVaultSection.jsx.
    passport_expiry_date: answers.passport_expiry_date || '',
    duration_of_stay: answers.duration_of_stay || '',
    clinical_boundary_acknowledged: !!answers.clinical_boundary_acknowledged,
    clinical_boundary_acknowledged_at: answers.clinical_boundary_acknowledged
      ? new Date().toISOString()
      : undefined,
    // Data-processing consent (compliance audit trail) — the client agreed to M
    // sharing limited information with its subprocessors to coordinate care.
    data_processing_consent: !!answers.data_processing_consent,
    data_processing_consent_at: answers.data_processing_consent
      ? (answers.data_processing_consent_at || new Date().toISOString())
      : undefined,
    data_processing_consent_version: answers.data_processing_consent
      ? DATA_CONSENT_VERSION
      : undefined,
    // Under-18: guardian is recorded as the emergency contact, the record is
    // flagged, and the case goes straight to admin review — no minor's journey
    // is ever auto-processed (M Principle). Derived from age here, not from a
    // client-side flag, so it can't be skipped by jumping steps.
    ...(isMinorAge(answers.age) ? {
      guardian_required: true,
      guardian_name: answers.guardian_name || '',
      guardian_contact: answers.guardian_contact || '',
      emergency_contact_name: answers.guardian_name || '',
      emergency_contact_number: answers.guardian_contact || '',
      status: 'Admin-Review',
      risk_level: 'high',
    } : {}),
  };
}
