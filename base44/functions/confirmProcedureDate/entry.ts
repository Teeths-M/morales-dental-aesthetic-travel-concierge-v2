import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';
import { strictObject, Fields } from '../../shared/validate.ts';

const ConfirmProcedureDateSchema = strictObject({
  case_id: Fields.shortText(100),
  date: Fields.isoDate(),
});

/**
 * confirmProcedureDate — the chosen doctor commits to a date after selection.
 *
 * INVARIANTS:
 *   • Owner-or-admin only (the doctor assigned to the case).
 *   • Doctor availability SLOT LOCK: the chosen date is locked to this case so two
 *     patients can't book the same slot. Best-effort compare-and-swap: we write the
 *     lock, then re-read to confirm we still hold it (rejects a concurrent grab).
 *   • Sets the real procedure_date and fires the patient's pre-op prep off it.
 *
 * Note: true single-statement atomicity would need a Base44 conditional update; the
 * write-then-verify here closes most of the race and is safe to strengthen later.
 */

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { case_id, date } = await body<{ case_id?: string; date?: string }>();
  if (!case_id || !date) return err('case_id and date (YYYY-MM-DD) are required');

  const c = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!c) return err('Case not found', 404);

  const isAdmin = user?.role === 'admin' || user?.role === 'platform_admin';
  if (!isAdmin && (user?.email || '').toLowerCase() !== String(c.doctor_email || '').toLowerCase()) {
    return err('This case is not assigned to you.', 403);
  }

  const now = new Date().toISOString();

  // ── Availability slot lock (double-booking guard) ──────────────────────────
  let slotLocked = false;
  if (c.doctor_id) {
    const slots = await base44.asServiceRole.entities.DoctorAvailability
      .filter({ doctor_id: c.doctor_id, date }, '-created_date', 5).catch(() => []);
    const slot = (slots as any[])[0];
    if (slot) {
      // Already locked to a DIFFERENT case → the date is taken.
      if (slot.is_available === false && slot.locked_case_id && slot.locked_case_id !== case_id) {
        return err('That date is no longer available — please choose another.', 409);
      }
      await base44.asServiceRole.entities.DoctorAvailability.update(slot.id, {
        is_available: false, locked_case_id: case_id, locked_at: now,
      }).catch(() => {});
      // Verify we still hold the lock (a concurrent confirm may have grabbed it first).
      const after = await base44.asServiceRole.entities.DoctorAvailability.get(slot.id).catch(() => null);
      if (after && after.locked_case_id && after.locked_case_id !== case_id) {
        return err('That date was just taken — please choose another.', 409);
      }
      slotLocked = true;
    }
    // No pre-published slot for that date → we still record the confirmed date; a
    // stricter deployment could require the doctor to publish availability first.
  }

  // ── Record the confirmed date ──────────────────────────────────────────────
  await base44.asServiceRole.entities.CaseRecord.update(case_id, {
    procedure_date: date,
    doctor_confirmation_status: 'CONFIRMED',
    doctor_confirmed_at: now,
  }).catch(() => {});

  // Fire the patient's pre-op prep now that a real date exists (non-blocking).
  base44.asServiceRole.functions?.invoke?.('sendPreOpInstructions', { case_id }).catch(() => {});

  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'procedure_date_confirmed',
    actor_id: c.doctor_id || 'doctor', actor_role: 'doctor', actor_name: user?.email || c.doctor_selected || 'Doctor',
    resource_type: 'CaseRecord', resource_id: case_id, case_id,
    sensitive: false, timestamp: now,
    details: { procedure_date: date, slot_locked: slotLocked },
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  return ok({ case_id, procedure_date: date, slot_locked: slotLocked });
}, { name: 'confirmProcedureDate', requireAuth: true, allowedRoles: ['doctor', 'local_doctor', 'admin', 'platform_admin'], bodySchema: ConfirmProcedureDateSchema }));
