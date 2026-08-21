// reportMedication — a patient (or M-Care on their behalf, mid-chat) reports
// a medication in their own words. Normalizes, reconciles against on-file
// data, creates an unverified Medication record, and nudges the patient to
// confirm. Never creates a confirmed/active record by itself — that's
// confirmMedication's job, and only a real human action gets there.

import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields } from '../../shared/validate.ts';
import { createMedicationFromText } from '../../shared/createMedicationFromText.ts';

const bodySchema = strictObject({
  case_id: Fields.shortText(100),
  raw_text: Fields.shortText(1000),
});

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { case_id, raw_text } = await body<{ case_id: string; raw_text: string }>();

  const isAdmin = user!.role === 'admin' || user!.role === 'platform_admin';
  const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!caseRecord) return err('Case not found', 404);
  if (!isAdmin && caseRecord.client_email !== user!.email) {
    return err('You can only report medications for your own case.', 403);
  }

  const result = await createMedicationFromText(base44, {
    case_id,
    patient_email: caseRecord.client_email,
    doctor_email: caseRecord.doctor_email || '',
    raw_text,
    source_type: 'patient',
    source_record_id: '',
    reported_by_email: user!.email,
    reported_by_note: 'Reported by patient via M-Care chat',
    allergy_text: caseRecord.allergies,
  });

  if (!result) {
    return err("I couldn't identify a specific medication name from that — could you say the name again?");
  }

  await base44.functions.invoke('logAuditEvent', {
    event_type: 'medication_reported',
    resource_type: 'Medication',
    resource_id: result.medication.id,
    resource_name: result.extracted.normalized_name,
    case_id,
    details: { flags: result.flags, confidence: result.extracted.confidence },
  }).catch(() => {});

  return ok({
    medication_id: result.medication.id,
    normalized_name: result.medication.normalized_name,
    strength: result.medication.strength,
    dosage: result.medication.dosage,
    frequency: result.medication.frequency,
    status: result.medication.status,
    flags: result.flags,
    confidence: result.extracted.confidence,
  });
}, { name: 'reportMedication', requireAuth: true, bodySchema, rateLimit: { max: 20, windowSeconds: 300 } }));
