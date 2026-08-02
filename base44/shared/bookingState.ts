// ── Canonical booking state machine ──────────────────────────────────────────
// The single source of truth for CaseRecord.status transitions. Every writer that
// advances a booking should go through assertTransition/guardedStatusUpdate so an
// illegal jump can never happen.
//
// WHY THIS EXISTS: iq200Pipeline once had a bug where a proposal step silently
// overwrote an `Admin-Review` safety hold back to `Proposal-Sent`, letting a flagged
// high-risk case proceed before any human cleared it. A guarded state machine makes
// that class of bug structurally impossible: `Admin-Review` is a HOLD that can only
// be left by an explicit clear into a small set of resume states — never by a routine
// downstream write.
//
// Mirror of the CASE_STATUS values in src/lib/constants.js (kept in sync by hand —
// the frontend uses the constants for display; this module enforces the transitions
// server-side, where status is actually written).

export const BOOKING = {
  SUBMITTED: 'Submitted',
  SAFE_T_REVIEWED: 'Safe-T-Reviewed',
  AWAITING_QUOTES: 'Awaiting-Quotes',
  QUOTES_IN: 'Quotes-In',
  DOCTOR_PENDING: 'Doctor-Pending',
  VENDOR_PENDING: 'Vendor-Pending',
  ADMIN_REVIEW: 'Admin-Review',
  PROPOSAL_SENT: 'Proposal-Sent',
  DEPOSIT_PAID: 'Deposit-Paid',
  TRAVEL_COORDINATION: 'Travel-Coordination',
  READY_FOR_TRAVEL: 'Ready-For-Travel',
  PROCEDURE_IN_PROGRESS: 'Procedure-In-Progress',
  RECOVERY: 'Recovery',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
} as const;

export type BookingState = (typeof BOOKING)[keyof typeof BOOKING];

// The safety hold. Only an explicit clear (an admin action) may leave it, and only
// into the resume states below — never a routine downstream transition.
export const HOLD_STATE: BookingState = BOOKING.ADMIN_REVIEW;

// States a case can resume into once an admin EXPLICITLY clears the hold. Reaching
// these from ADMIN_REVIEW is possible ONLY through clearHold() — never a routine write.
const HOLD_RESUME: BookingState[] = [
  BOOKING.AWAITING_QUOTES,
  BOOKING.DOCTOR_PENDING,
  BOOKING.PROPOSAL_SENT,
  BOOKING.CANCELLED,
];

// Allowed forward transitions. A booking may also be sent to ADMIN_REVIEW (a safety
// hold) or CANCELLED from any non-terminal state — see canTransition below — so those
// edges are intentionally omitted from this map to keep it readable.
// NOTE: ADMIN_REVIEW has NO routine outgoing edges here on purpose: a held case can
// only be moved by the explicit clearHold() action, so no downstream step can silently
// resume a safety hold.
const ALLOWED_TRANSITIONS: Record<string, BookingState[]> = {
  [BOOKING.SUBMITTED]:            [BOOKING.SAFE_T_REVIEWED],
  [BOOKING.SAFE_T_REVIEWED]:      [BOOKING.AWAITING_QUOTES],
  [BOOKING.AWAITING_QUOTES]:      [BOOKING.QUOTES_IN],
  [BOOKING.QUOTES_IN]:            [BOOKING.DOCTOR_PENDING, BOOKING.AWAITING_QUOTES],
  [BOOKING.DOCTOR_PENDING]:       [BOOKING.VENDOR_PENDING, BOOKING.PROPOSAL_SENT],
  [BOOKING.VENDOR_PENDING]:       [BOOKING.PROPOSAL_SENT],
  [BOOKING.PROPOSAL_SENT]:        [BOOKING.DEPOSIT_PAID],
  [BOOKING.DEPOSIT_PAID]:         [BOOKING.TRAVEL_COORDINATION],
  [BOOKING.TRAVEL_COORDINATION]:  [BOOKING.READY_FOR_TRAVEL],
  [BOOKING.READY_FOR_TRAVEL]:     [BOOKING.PROCEDURE_IN_PROGRESS],
  [BOOKING.PROCEDURE_IN_PROGRESS]:[BOOKING.RECOVERY],
  [BOOKING.RECOVERY]:             [BOOKING.COMPLETED],
  [BOOKING.ADMIN_REVIEW]:         [],
  [BOOKING.COMPLETED]:            [],
  [BOOKING.CANCELLED]:            [],
};

const TERMINAL: BookingState[] = [BOOKING.COMPLETED, BOOKING.CANCELLED];

export function isTerminal(state: string): boolean {
  return TERMINAL.includes(state as BookingState);
}

/**
 * canTransition — is moving from `from` to `to` legal?
 *
 * Rules:
 *  • A no-op (from === to) is allowed (idempotent re-writes).
 *  • From any NON-terminal, non-hold state you may always move to ADMIN_REVIEW
 *    (raise a safety hold) or CANCELLED (patient/admin cancellation) — safety and
 *    cancellation can interrupt the flow at any point.
 *  • A case in ADMIN_REVIEW cannot be moved by ANY routine transition — it is a hold.
 *    Only the explicit clearHold() action can resume it. This is the invariant that
 *    prevents a downstream step from silently un-holding a flagged case.
 *  • Otherwise the transition must be in ALLOWED_TRANSITIONS[from].
 *  • Terminal states (Completed/Cancelled) allow no further transition.
 */
export function canTransition(from: string, to: string): boolean {
  if (from === to) return true;
  if (isTerminal(from)) return false;
  // A safety hold is sticky: no routine transition may leave it (use clearHold()).
  if (from === HOLD_STATE) return false;
  // Any active state may be interrupted by a safety hold or a cancellation.
  if (to === HOLD_STATE || to === BOOKING.CANCELLED) return true;
  return (ALLOWED_TRANSITIONS[from] || []).includes(to as BookingState);
}

/** Throws a descriptive error when a transition is illegal. */
export function assertTransition(from: string, to: string): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal booking transition: "${from}" -> "${to}"`);
  }
}

/** True only for an explicit hold-clear: from ADMIN_REVIEW into a resume state. */
export function canClearHold(to: string): boolean {
  return HOLD_RESUME.includes(to as BookingState);
}

/**
 * guardedStatusUpdate — the one safe way to advance a case's status.
 * Reads the current status, asserts the transition is legal, then writes.
 * Extra fields to persist alongside the status change go in `extra`.
 */
export async function guardedStatusUpdate(
  base44: any,
  caseId: string,
  to: BookingState,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const current = await base44.asServiceRole.entities.CaseRecord.get(caseId);
  if (!current) throw new Error(`Case not found: ${caseId}`);
  assertTransition(current.status, to);
  await base44.asServiceRole.entities.CaseRecord.update(caseId, { ...extra, status: to });
}

/**
 * clearHold — the ONLY way to resume a case out of ADMIN_REVIEW. Callers are
 * admin-gated actions that have genuinely reviewed the hold. Refuses if the case
 * isn't actually held or the resume target isn't a valid resume state.
 */
export async function clearHold(
  base44: any,
  caseId: string,
  to: BookingState,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const current = await base44.asServiceRole.entities.CaseRecord.get(caseId);
  if (!current) throw new Error(`Case not found: ${caseId}`);
  if (current.status !== HOLD_STATE) {
    throw new Error(`clearHold called on a case that is not held (status="${current.status}")`);
  }
  if (!canClearHold(to)) {
    throw new Error(`Cannot clear hold into "${to}" — not a valid resume state`);
  }
  await base44.asServiceRole.entities.CaseRecord.update(caseId, { ...extra, status: to });
}
