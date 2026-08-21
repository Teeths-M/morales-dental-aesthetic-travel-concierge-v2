// confirmMedication — the only place a Medication record's confirmation,
// edit, rejection, discontinuation, or info-request is ever actually
// recorded. Role-gated by action: patient_confirm is the patient's own
// self-attestation that a reported medication is accurate; doctor_confirm/
// edit/reject/discontinue/request_info are doctor-only, and doctor_confirm
// is the one real resolution point for a status:'requires_review' flag.
// Every action appends a history entry and is audit-logged — nothing here
// is ever silently overwritten.

import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields, z } from '../../shared/validate.ts';
import { logJourneyEvent } from '../../shared/logJourneyEvent.ts';

const ACTIONS = ['patient_confirm', 'doctor_confirm', 'edit', 'reject', 'discontinue', 'request_info'] as const;
const PATIENT_ACTIONS = new Set(['patient_confirm']);
const DOCTOR_ACTIONS = new Set(['doctor_confirm', 'edit', 'reject', 'discontinue', 'request_info']);

const EditFields = strictObject({
  normalized_name: Fields.optionalText(200).optional(),
  strength: Fields.optionalText(100).optional(),
  dosage: Fields.optionalText(200).optional(),
  route: Fields.optionalText(100).optional(),
  frequency: Fields.optionalText(200).optional(),
  indication: Fields.optionalText(300).optional(),
  start_date: Fields.optionalText(20).optional(),
  end_date: Fields.optionalText(20).optional(),
});

const bodySchema = strictObject({
  medication_id: Fields.shortText(100),
  action: z.enum(ACTIONS),
  edits: EditFields.optional(),
  note: Fields.optionalText(500).optional(),
});

function isFuture(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime()) && d.getTime() > Date.now();
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { medication_id, action, edits, note } = await body<{
    medication_id: string; action: typeof ACTIONS[number]; edits?: Record<string, string>; note?: string;
  }>();

  const med = await base44.asServiceRole.entities.Medication.get(medication_id).catch(() => null);
  if (!med) return err('Medication not found', 404);

  const isAdmin = user!.role === 'admin' || user!.role === 'platform_admin';
  const isPatient = med.patient_email === user!.email;
  const isDoctor = !!med.doctor_email && med.doctor_email === user!.email;

  if (PATIENT_ACTIONS.has(action) && !isAdmin && !isPatient) {
    return err('Only the patient this medication belongs to can do that.', 403);
  }
  if (DOCTOR_ACTIONS.has(action) && !isAdmin && !isDoctor) {
    return err("Only this case's assigned doctor can do that.", 403);
  }
  if ((action === 'reject' || action === 'discontinue') && !note) {
    return err('A note explaining why is required for this action.');
  }

  const now = new Date().toISOString();
  const update: Record<string, any> = {};
  const historyEntry: Record<string, any> = {
    change_type: action,
    changed_by_email: user!.email,
    changed_at: now,
  };
  if (note) historyEntry.note = note;

  if (action === 'patient_confirm') {
    update.patient_confirmed = true;
    if (med.status === 'reported') update.status = 'active';
    // A flagged (requires_review) record stays flagged — only a doctor
    // resolves a real flag, patient confirmation just means "yes, that's
    // what I meant."
  } else if (action === 'doctor_confirm') {
    update.doctor_confirmed = true;
    update.last_reviewed_at = now;
    if (med.status === 'requires_review' || med.status === 'reported') {
      update.status = isFuture(med.start_date) ? 'planned' : 'active';
    }
  } else if (action === 'edit') {
    if (!edits || Object.keys(edits).length === 0) return err('edits is required for the edit action');
    historyEntry.previous_values = Object.fromEntries(
      Object.keys(edits).map((k) => [k, (med as Record<string, any>)[k] ?? '']),
    );
    Object.assign(update, edits);
    update.last_reviewed_at = now;
  } else if (action === 'reject') {
    update.status = 'discontinued';
    update.last_reviewed_at = now;
  } else if (action === 'discontinue') {
    update.status = 'discontinued';
    update.end_date = now.slice(0, 10);
    update.last_reviewed_at = now;
  } else if (action === 'request_info') {
    update.last_reviewed_at = now;
  }

  update.history = [...(med.history || []), historyEntry];
  await base44.asServiceRole.entities.Medication.update(medication_id, update);

  if (action === 'request_info') {
    await logJourneyEvent(base44, {
      case_id: med.case_id,
      client_email: med.patient_email,
      event_type: 'medication_review_required',
      source: 'confirmMedication',
      message_text: `Your doctor has a question about ${med.normalized_name}${note ? `: "${note}"` : ' — check your medication details for more.'}`,
      priority: 'medium',
      action_taken: `Doctor requested more information on Medication ${medication_id}`,
      tool_result: { medication_id },
      user_action_required: true,
    }).catch(() => {});
  } else if (action === 'doctor_confirm') {
    await logJourneyEvent(base44, {
      case_id: med.case_id,
      client_email: med.patient_email,
      event_type: 'medication_confirmed',
      source: 'confirmMedication',
      message_text: `Your doctor confirmed ${med.normalized_name} — it's on your active medication list.`,
      priority: 'low',
      action_taken: `Doctor confirmed Medication ${medication_id}`,
      tool_result: { medication_id },
    }).catch(() => {});
  }

  await base44.functions.invoke('logAuditEvent', {
    event_type: action === 'discontinue' || action === 'reject' ? 'medication_discontinued' : 'medication_confirmed',
    resource_type: 'Medication',
    resource_id: medication_id,
    resource_name: med.normalized_name,
    case_id: med.case_id,
    details: { action, note: note || '' },
  }).catch(() => {});

  return ok({ medication_id, action, status: update.status || med.status });
}, { name: 'confirmMedication', requireAuth: true, bodySchema }));
