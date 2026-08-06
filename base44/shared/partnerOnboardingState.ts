// ── Partner onboarding state machine ─────────────────────────────────────────
// Mirrors base44/shared/bookingState.ts's shape (canTransition/assertTransition/
// guardedStatusUpdate) for partner-entity `status` transitions instead of
// CaseRecord's booking state — same discipline: an illegal jump (e.g. skipping
// verification straight to `active`) becomes structurally impossible instead of
// relying on every call site remembering to check first.
//
// Scoped to TaxiService for now (Transport Partner Platform — Foundation).
// Parameterized by entityName rather than hardcoded like bookingState.ts,
// since — unlike CaseRecord, which only ever has one caller pattern — this is
// meant to extend to other partner entities (Doctor already has its own
// separate, more elaborate pipeline; TravelAgency/Companion/SecurityAgency
// don't yet, and are explicitly out of scope for this pass).
//
// PENDING_SETUP exists in the type/enum for a future post-verification
// setup-checklist step (fleet/zone/pricing config) that has no real content
// behind it yet — it is deliberately NOT a mandatory hop in the transition
// map below. Adding a mandatory step with nothing real behind it would be
// exactly the kind of fake completeness this platform's own principles
// (never claim a task is complete until the system has verified it) rule out.

export const PARTNER_STATE = {
  PENDING_VERIFICATION: 'pending_verification',
  VERIFYING: 'verifying',
  PENDING_SETUP: 'pending_setup',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  REJECTED: 'rejected',
  INACTIVE: 'inactive',
} as const;

export type PartnerOnboardingState = (typeof PARTNER_STATE)[keyof typeof PARTNER_STATE];

const TERMINAL: PartnerOnboardingState[] = [PARTNER_STATE.REJECTED];

const ALLOWED_TRANSITIONS: Record<string, PartnerOnboardingState[]> = {
  [PARTNER_STATE.PENDING_VERIFICATION]: [PARTNER_STATE.VERIFYING, PARTNER_STATE.REJECTED],
  [PARTNER_STATE.VERIFYING]:            [PARTNER_STATE.PENDING_SETUP, PARTNER_STATE.ACTIVE, PARTNER_STATE.REJECTED],
  [PARTNER_STATE.PENDING_SETUP]:        [PARTNER_STATE.ACTIVE],
  [PARTNER_STATE.ACTIVE]:               [PARTNER_STATE.SUSPENDED, PARTNER_STATE.INACTIVE],
  [PARTNER_STATE.SUSPENDED]:            [PARTNER_STATE.ACTIVE, PARTNER_STATE.REJECTED],
  [PARTNER_STATE.INACTIVE]:             [PARTNER_STATE.ACTIVE],
  [PARTNER_STATE.REJECTED]:             [],
};

export function isTerminal(state: string): boolean {
  return TERMINAL.includes(state as PartnerOnboardingState);
}

/**
 * canTransition — is moving from `from` to `to` legal?
 * A no-op (from === to) is allowed (idempotent re-writes). Terminal states
 * (REJECTED) allow no further transition. Otherwise the transition must be
 * explicitly listed in ALLOWED_TRANSITIONS[from] — nothing is permitted by
 * default.
 */
export function canTransition(from: string, to: string): boolean {
  if (from === to) return true;
  if (isTerminal(from)) return false;
  return (ALLOWED_TRANSITIONS[from] || []).includes(to as PartnerOnboardingState);
}

/** Throws a descriptive error when a transition is illegal. */
export function assertTransition(from: string, to: string): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal partner onboarding transition: "${from}" -> "${to}"`);
  }
}

/**
 * guardedPartnerStatusUpdate — the one safe way to advance a partner
 * entity's status. Reads the current status, asserts the transition is
 * legal, then writes. Extra fields to persist alongside the status change
 * go in `extra`.
 */
export async function guardedPartnerStatusUpdate(
  base44: any,
  entityName: string,
  partnerId: string,
  to: PartnerOnboardingState,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const entity = base44.asServiceRole.entities[entityName];
  const current = await entity.get(partnerId);
  if (!current) throw new Error(`${entityName} not found: ${partnerId}`);
  assertTransition(current.status, to);
  await entity.update(partnerId, { ...extra, status: to });
}
