// ── VirtualConsultation state machine ────────────────────────────────────────
// Mirrors base44/shared/bookingState.ts's shape exactly, applied to
// VirtualConsultation.status instead of CaseRecord.status. No sibling test
// file (tests/bookingState.test.js) exists in this repo to mirror — this is
// the first test file for this class of state machine here.

export const VC_STATUS = {
  REQUESTED: 'requested',
  CONFIRMED: 'confirmed',
  DEVICE_CHECK_COMPLETE: 'device_check_complete',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
  SUSPENDED: 'suspended',
} as const;

export type VcStatus = (typeof VC_STATUS)[keyof typeof VC_STATUS];

// A mid-flight eligibility flip (sweepProviderBookingEligibility) can move a
// consultation to SUSPENDED from either of the two pre-call states. There is
// no routine outgoing edge FROM suspended — only an explicit re-confirmation
// (clearProviderBookingSuspension clears the doctor's own suspension; a
// separately re-run bookVirtualConsultation-style re-confirm would move a
// suspended consultation forward, not a bare status write).
const ALLOWED_TRANSITIONS: Record<string, VcStatus[]> = {
  [VC_STATUS.REQUESTED]: [VC_STATUS.CONFIRMED],
  [VC_STATUS.CONFIRMED]: [VC_STATUS.DEVICE_CHECK_COMPLETE, VC_STATUS.IN_PROGRESS, VC_STATUS.SUSPENDED],
  [VC_STATUS.DEVICE_CHECK_COMPLETE]: [VC_STATUS.IN_PROGRESS, VC_STATUS.SUSPENDED],
  [VC_STATUS.IN_PROGRESS]: [VC_STATUS.COMPLETED],
  [VC_STATUS.COMPLETED]: [],
  [VC_STATUS.CANCELLED]: [],
  [VC_STATUS.NO_SHOW]: [],
  [VC_STATUS.SUSPENDED]: [],
};

const TERMINAL: VcStatus[] = [VC_STATUS.COMPLETED, VC_STATUS.CANCELLED, VC_STATUS.NO_SHOW];

export function isTerminal(state: string): boolean {
  return TERMINAL.includes(state as VcStatus);
}

/**
 * canTransition — same rules as bookingState.ts's canTransition:
 *  - a no-op (from === to) is always allowed
 *  - a terminal state allows no further transition
 *  - any non-terminal, non-suspended state may always move to CANCELLED
 *  - otherwise the transition must be listed in ALLOWED_TRANSITIONS[from]
 */
export function canTransition(from: string, to: string): boolean {
  if (from === to) return true;
  if (isTerminal(from)) return false;
  if (to === VC_STATUS.CANCELLED) return true;
  return (ALLOWED_TRANSITIONS[from] || []).includes(to as VcStatus);
}

export function assertTransition(from: string, to: string): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal virtual consultation transition: "${from}" -> "${to}"`);
  }
}

/**
 * guardedStatusUpdate — the one safe way to advance a VirtualConsultation's
 * status. Reads current status, asserts the transition is legal, then writes.
 */
export async function guardedStatusUpdate(
  base44: any,
  virtualConsultationId: string,
  to: VcStatus,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const current = await base44.asServiceRole.entities.VirtualConsultation.get(virtualConsultationId);
  if (!current) throw new Error(`VirtualConsultation not found: ${virtualConsultationId}`);
  assertTransition(current.status, to);
  await base44.asServiceRole.entities.VirtualConsultation.update(virtualConsultationId, {
    ...extra,
    status: to,
    updated_at: new Date().toISOString(),
  });
}
