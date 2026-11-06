/**
 * disputePolicy — what the Stripe webhook does when a patient's bank disputes
 * a card payment (a chargeback).
 *
 * The bank pulls the disputed amount out of Morales's Stripe balance while the
 * dispute is open, plus a $15 fee, and another $15 if Morales contests and
 * loses. So when DISPUTE_FREEZES_ESCROW is on, that case's partner payouts that
 * haven't gone out yet are paused until the dispute is decided.
 *
 * A dispute never changes the patient's booking, their care, or any safety
 * service. A money dispute must not interrupt someone's treatment or travel.
 */
export const DISPUTE_FREEZES_ESCROW: boolean = true;

export type DisputeOutcome = 'won' | 'lost' | 'inquiry_closed' | 'other';

/**
 * Stripe's final status for a closed dispute. 'warning_closed' is an inquiry
 * (a "warning") that closed without ever becoming a chargeback, so no money
 * left the account.
 */
export function disputeOutcome(status: string): DisputeOutcome {
  if (status === 'won') return 'won';
  if (status === 'lost') return 'lost';
  if (status === 'warning_closed') return 'inquiry_closed';
  return 'other';
}

/** Paused payouts resume only once the money is safe again. */
export function shouldResumeEscrow(outcome: DisputeOutcome): boolean {
  return outcome === 'won' || outcome === 'inquiry_closed';
}

/** The payment-record status for a closed dispute. */
export function closedDisputeStatus(outcome: DisputeOutcome): 'dispute_won' | 'dispute_lost' | 'dispute_closed' {
  if (outcome === 'won') return 'dispute_won';
  if (outcome === 'lost') return 'dispute_lost';
  return 'dispute_closed';
}

/**
 * Marker written into a paused hold's notes, so closing a dispute resumes only
 * the holds that dispute paused. Holds paused for other reasons (a disputed
 * companion expense) share the 'disputed' status and must stay paused.
 */
export function pauseMarker(disputeId: string): string {
  return `[dispute ${disputeId}]`;
}
