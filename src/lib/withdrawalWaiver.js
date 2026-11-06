/**
 * withdrawalWaiver — the EU/UK 14-day cancellation-right box at checkout.
 *
 * Under EU consumer law (and the UK's equivalent), many online service
 * purchases carry a 14-day right to cancel. If the customer wants the service
 * to start inside those 14 days, the seller needs an explicit request, plus the
 * customer's acknowledgment that the right ends once the service has been fully
 * provided. It has to be its own box, not part of accepting the terms.
 *
 * Which checkouts show it, and its exact words, are Portia's decisions (ideally
 * confirmed by a lawyer). EU law leaves healthcare and package travel out of
 * this right, so it may not apply to every payment here; the wording only
 * claims the right "where" it exists.
 *
 * base44/shared/withdrawalWaiver.ts holds the same values for the server,
 * which refuses a checkout that needs the box but didn't get it ticked.
 * tests/withdrawalWaiver.test.js fails if the two copies ever differ.
 */
export const WITHDRAWAL_WAIVER_FLOWS = ["package_payment", "consultation_fee", "slot_hold_deposit"];
export const WITHDRAWAL_WAIVER_TEXT = "I ask Morales to start arranging my booking right away. Where I have a legal 14-day right to cancel this purchase (for example under EU or UK consumer law), I understand that I lose it once the service has been fully provided, and that if I cancel before then I may have to pay for the part already provided.";
export const WITHDRAWAL_WAIVER_VERSION = 'wv-995ca0ff29';

/** True when this checkout must show the box: 'package_payment', 'consultation_fee', or 'slot_hold_deposit'. */
export function requiresWithdrawalWaiver(flow) {
  return WITHDRAWAL_WAIVER_FLOWS.includes(flow);
}

/** What a checkout sends: the acknowledgment when it's needed and ticked, otherwise nothing. */
export function buildWaiverPayload(flow, checked) {
  if (!requiresWithdrawalWaiver(flow) || !checked) return undefined;
  return { accepted: true, version: WITHDRAWAL_WAIVER_VERSION };
}
