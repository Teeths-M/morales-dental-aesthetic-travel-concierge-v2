// createMedicationFromText.ts — the one real creation path for a
// patient-or-intake-reported medication: normalize -> reconcile -> create an
// unverified Medication record -> proactively nudge the patient to confirm.
//
// Used by reportMedication/entry.ts (a patient's own chat message) and the
// intake-seeding step in createCaseFromConsultation.ts (Consultation's own
// medication_notes) so both real ingestion sources share one implementation
// rather than drifting apart. Never sets patient_confirmed/doctor_confirmed
// true, never advances status past 'reported'/'requires_review' — only
// confirmMedication's own gated actions do that.

import { normalizeMedicationText } from './medicationNormalize.ts';
import { reconcileMedication } from './medicationReconciliation.ts';
import { logJourneyEvent } from './logJourneyEvent.ts';

export interface CreateMedicationInput {
  case_id: string;
  patient_email: string;
  doctor_email?: string | null;
  raw_text: string;
  source_type: 'patient' | 'doctor' | 'document' | 'prescription' | 'hospital' | 'system_observation';
  source_record_id?: string | null;
  reported_by_email: string;
  reported_by_note: string;
  allergy_text?: string | null;
  notify?: boolean;
}

export interface CreateMedicationResult {
  medication: any;
  flags: string[];
  extracted: { normalized_name: string; confidence: number };
}

export async function createMedicationFromText(
  base44: any,
  input: CreateMedicationInput,
): Promise<CreateMedicationResult | null> {
  const extraction = await normalizeMedicationText(base44, input.raw_text);
  if (!extraction.normalized_name) {
    // Nothing real to structure — never create a blank/guessed record.
    return null;
  }

  const now = new Date().toISOString();

  const existing = await base44.asServiceRole.entities.Medication
    .filter({ patient_email: input.patient_email }, '-created_date', 200)
    .catch(() => []);

  const { flags } = reconcileMedication(
    {
      normalized_name: extraction.normalized_name,
      generic_name: extraction.generic_name,
      brand_name: extraction.brand_name,
      dosage: extraction.dosage,
      frequency: extraction.frequency,
      confidence: extraction.confidence,
    },
    existing || [],
    input.allergy_text,
  );

  const status = flags.length > 0 ? 'requires_review' : 'reported';

  const history: any[] = [{
    change_type: 'created',
    changed_by_email: input.reported_by_email,
    changed_at: now,
    note: input.reported_by_note,
  }];
  if (flags.length > 0) {
    history.push({
      change_type: 'flagged',
      changed_by_email: 'system',
      changed_at: now,
      note: `Reconciliation flags: ${flags.join(', ')}`,
    });
  }

  const medication = await base44.asServiceRole.entities.Medication.create({
    patient_email: input.patient_email,
    case_id: input.case_id,
    doctor_email: input.doctor_email || '',
    normalized_name: extraction.normalized_name,
    brand_name: extraction.brand_name,
    generic_name: extraction.generic_name,
    rxcui: '',
    strength: extraction.strength,
    dosage: extraction.dosage,
    route: extraction.route,
    frequency: extraction.frequency,
    indication: extraction.indication,
    status,
    source_type: input.source_type,
    source_record_id: input.source_record_id || '',
    confidence: extraction.confidence,
    patient_confirmed: false,
    doctor_confirmed: false,
    flags,
    history,
    confirmation_nudge_sent: false,
    review_alert_sent: false,
  });

  // A real reconciliation flag always gets its own notification — it's a
  // distinct, medium-priority safety-adjacent signal (routes to a doctor's
  // review), not the routine "please confirm" nudge, so it fires regardless
  // of notify (a caller may suppress the routine nudge when it already has
  // its own way of telling the patient, e.g. the Care Room's confirm bubble,
  // but a real flag is never silently dropped).
  try {
    if (flags.length > 0) {
      await logJourneyEvent(base44, {
        case_id: input.case_id,
        client_email: input.patient_email,
        event_type: 'medication_review_required',
        source: 'createMedicationFromText',
        message_text: `I've noted ${extraction.normalized_name} and flagged it for your doctor to double check before it's added to your active list — nothing you need to do right now, they'll follow up.`,
        priority: 'medium',
        action_taken: `Created Medication ${medication.id} with flags: ${flags.join(', ')}`,
        tool_result: { medication_id: medication.id, flags },
        user_action_required: false,
      });
      await base44.asServiceRole.entities.Medication.update(medication.id, { review_alert_sent: true }).catch(() => {});
      // Best-effort audit note — requires a real user session, so this is a
      // no-op (caught, non-fatal) when called from a sessionless context
      // like intake seeding, matching this app's existing precedent for
      // logAuditEvent calls from cron-style callers.
      await base44.functions.invoke('logAuditEvent', {
        event_type: 'medication_flagged',
        resource_type: 'Medication',
        resource_id: medication.id,
        resource_name: extraction.normalized_name,
        case_id: input.case_id,
        details: { flags },
      }).catch(() => {});
    } else if (input.notify !== false) {
      await logJourneyEvent(base44, {
        case_id: input.case_id,
        client_email: input.patient_email,
        event_type: 'medication_confirmation_needed',
        source: 'createMedicationFromText',
        message_text: `I've noted ${extraction.normalized_name} — can you confirm the details are right?`,
        priority: 'low',
        action_taken: `Created Medication ${medication.id}, awaiting patient confirmation`,
        tool_result: { medication_id: medication.id },
        user_action_required: true,
      });
      await base44.asServiceRole.entities.Medication.update(medication.id, { confirmation_nudge_sent: true }).catch(() => {});
    }
  } catch (_) { /* non-fatal — the record itself already saved */ }

  return { medication, flags, extracted: { normalized_name: extraction.normalized_name, confidence: extraction.confidence } };
}
