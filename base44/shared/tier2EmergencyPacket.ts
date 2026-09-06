/**
 * tier2EmergencyPacket — the one canonical packet-shaping function for a
 * Tier 2 (police/ambulance-shaped) emergency. Takes as input exactly what
 * the calling trigger (triggerSOS / escalateSoloCheckIn) already resolved —
 * identity, location, situation text — and never re-derives any of it.
 * Independently resolves the two fields no existing trigger computes:
 * preferred_language and consent-gated medical info, via the same
 * CaseRecord -> Consultation lookup and medical_history_share_consent gate
 * assignDoctorToCase already uses (see that file's own comment on why this
 * gate is never bypassed, even for an emergency).
 */

export interface Tier2PacketInput {
  case_id?: string | null;
  source_function: 'triggerSOS' | 'escalateSoloCheckIn';
  source_event_id?: string;
  trigger_type: string;
  patient_email: string;
  patient_name?: string;
  patient_phone?: string;
  latitude?: number | null;
  longitude?: number | null;
  location_label?: string;
  situation_description: string;
}

export async function buildTier2PacketFields(base44: any, input: Tier2PacketInput) {
  let caseRecord: any = null;
  if (input.case_id) {
    caseRecord = await base44.asServiceRole.entities.CaseRecord.get(input.case_id).catch(() => null);
  }
  if (!caseRecord && input.patient_email) {
    const cases = await base44.asServiceRole.entities.CaseRecord.filter(
      { client_email: input.patient_email }, '-created_date', 1,
    ).catch(() => []);
    caseRecord = cases[0] || null;
  }

  let consultation: any = null;
  if (caseRecord?.consultation_id) {
    consultation = await base44.asServiceRole.entities.Consultation.get(caseRecord.consultation_id).catch(() => null);
  }

  // SAME real gate assignDoctorToCase enforces before a doctor ever sees
  // medical history — never bypassed just because this is an emergency.
  const consentGiven = !!consultation?.medical_history_share_consent;
  let medicalInfoSummary = 'Not shared — patient has not consented to sharing medical history.';
  if (consentGiven) {
    const parts: string[] = [];
    if (consultation?.medical_conditions?.length) parts.push(`Conditions: ${consultation.medical_conditions.join(', ')}`);
    if (consultation?.medical_conditions_other) parts.push(consultation.medical_conditions_other);
    if (consultation?.allergies?.length) parts.push(`Allergies: ${consultation.allergies.join(', ')}`);
    if (consultation?.has_medication_allergies && consultation?.medication_allergies_details) parts.push(`Medication allergies: ${consultation.medication_allergies_details}`);
    if (consultation?.has_food_allergies && consultation?.food_allergies_details) parts.push(`Food allergies: ${consultation.food_allergies_details}`);
    medicalInfoSummary = parts.length ? parts.join(' | ') : 'Consented to share — no medical history on file.';
  }

  return {
    case_id: input.case_id || '',
    source_function: input.source_function,
    source_event_id: input.source_event_id || '',
    trigger_type: input.trigger_type,
    patient_email: input.patient_email,
    patient_name: input.patient_name || caseRecord?.client_name || 'Unknown Patient',
    patient_phone: input.patient_phone || caseRecord?.client_phone || '',
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    location_label: input.location_label || 'Unknown',
    situation_description: input.situation_description,
    preferred_language: consultation?.preferred_language || 'en',
    destination_country: caseRecord?.procedure_country || 'Unknown',
    medical_info_consent_given: consentGiven,
    medical_info_summary: medicalInfoSummary,
    status: 'packet_assembled' as const,
    assembled_at: new Date().toISOString(),
  };
}
