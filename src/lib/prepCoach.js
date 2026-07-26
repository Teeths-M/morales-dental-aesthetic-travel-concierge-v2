import { PAYMENT_STATUS, DOCTOR_CONFIRMATION_STATUS, CASE_STATUS } from '@/lib/constants';

const PAID_STATUSES = [PAYMENT_STATUS.P25_PAID, PAYMENT_STATUS.P50_PAID, PAYMENT_STATUS.PAID_IN_FULL];

// Once the procedure is actually underway, prep is over — this card is for
// the runway before it, not during/after.
const PROCEDURE_STARTED_STATUSES = new Set([
  CASE_STATUS.PROCEDURE_IN_PROGRESS,
  CASE_STATUS.SURGICAL_EXECUTION,
  CASE_STATUS.RECOVERY_PHASE_7,
  CASE_STATUS.RECOVERY,
  CASE_STATUS.COMPLETED,
]);

/**
 * True once the doctor has confirmed the procedure AND a payment has landed
 * AND a procedure_date exists AND the procedure hasn't started yet. Kept in
 * its own dependency-free module (no React/base44) so both ProcedurePrepCoach
 * and Dashboard.jsx (which hides the old generic checklist once this is true)
 * share one gate, and it's cleanly unit-testable without pulling in the
 * base44 client (which touches `window` at import time).
 */
export function isPrepCoachActive(caseRecord) {
  return !!caseRecord
    && caseRecord.doctor_confirmation_status === DOCTOR_CONFIRMATION_STATUS.CONFIRMED
    && PAID_STATUSES.includes(caseRecord.payment_status)
    && !!caseRecord.procedure_date
    && !PROCEDURE_STARTED_STATUSES.has(caseRecord.status);
}

/**
 * Deterministic fallback narration — used when the AI call fails, is
 * offline, or the system is paused. Never invents a checklist item; only
 * states the day-count and remaining-item count in plain language.
 */
export function offlineMessage(daysLeft, incompleteCount, totalCount) {
  if (totalCount === 0) return "Your preparation checklist is on its way — check back shortly.";
  if (incompleteCount === 0) {
    return daysLeft > 0
      ? `Every step is complete. ${daysLeft === 1 ? '1 day' : `${daysLeft} days`} to go — you're ready.`
      : "Every step is complete. Today's the day.";
  }
  const when = daysLeft <= 0 ? 'today' : daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`;
  const stepWord = incompleteCount === 1 ? 'step' : 'steps';
  return `Your procedure is ${when}. You still have ${incompleteCount} of ${totalCount} ${stepWord} left — let's get those done.`;
}
