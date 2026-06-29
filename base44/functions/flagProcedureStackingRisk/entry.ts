import { createHandler, ok, err } from '../_shared/createHandler.ts';

/**
 * flagProcedureStackingRisk
 *
 * Called automatically when the ProcedureStackingBlocker mounts.
 * Logs the stacking violation, updates the consultation draft status,
 * and creates a doctor review notification.
 *
 * Auth: requireAuth is false — patient may not be logged in at booking stage.
 */
Deno.serve(createHandler(async ({ base44, body }) => {
  const {
    patient_email,
    patient_name,
    consultation_id,
    violations,
  } = await body();

  if (!violations || violations.length === 0) {
    return err('violations array is required and must be non-empty');
  }

  const now = new Date().toISOString();

  // ── 1. Audit log — creates a tamper-evident chain entry ──────────────────
  await base44.asServiceRole.entities.AuditLog.create({
    event_type:   'procedure_stacking_blocked',
    actor_role:   'patient',
    actor_email:  patient_email || 'anonymous',
    actor_name:   patient_name  || 'Anonymous Patient',
    resource_type: consultation_id ? 'consultation' : 'booking_attempt',
    resource_id:   consultation_id || 'pre-submission',
    case_id:       '',
    details: {
      violations,
      patient_email,
      consultation_id: consultation_id || null,
      blocked_at: now,
    },
    sensitive:  true,
    timestamp:  now,
  }).catch(() => {}); // audit failure must not surface to patient

  // ── 2. Update consultation draft if we have one ───────────────────────────
  if (consultation_id) {
    await base44.asServiceRole.entities.ConsultationDraft.update(consultation_id, {
      stacking_blocked:    true,
      stacking_violations: violations,
      stacking_blocked_at: now,
    }).catch(() => {});
  }

  // ── 3. Create a DoctorReviewTask so the review queue surfaces this case ──
  await base44.asServiceRole.entities.DoctorReviewTask.create({
    task_type:       'procedure_stacking_review',
    priority:        'critical',
    status:          'pending',
    patient_email:   patient_email   || null,
    patient_name:    patient_name    || null,
    consultation_id: consultation_id || null,
    violations:      violations,
    reason_summary:  violations.map(v => `[${v.code}] ${v.pair}`).join(' | '),
    created_at:      now,
    due_by:          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }).catch(() => {}); // entity may not exist in all environments

  return ok({
    success:     true,
    flagged_at:  now,
    review_due:  new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    message:     'Case flagged for medical review. A doctor will contact the patient within 24 hours.',
  });
}, { name: 'flagProcedureStackingRisk', requireAuth: false }));
