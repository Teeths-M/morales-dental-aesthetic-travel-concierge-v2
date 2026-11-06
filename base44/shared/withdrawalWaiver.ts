/**
 * withdrawalWaiver — server copy of src/lib/withdrawalWaiver.js.
 *
 * A checkout that the waiver policy lists must arrive with the box ticked for
 * the current wording. The server refuses it otherwise, so the record of
 * consent can't be skipped by calling the function directly. When it's ticked,
 * the version and time go into the Stripe session's metadata and the payment
 * record, which is the evidence if the customer later disputes the charge.
 *
 * tests/withdrawalWaiver.test.js fails if this file and the browser copy ever
 * hold different values.
 */
export const WITHDRAWAL_WAIVER_FLOWS: string[] = ["package_payment", "consultation_fee", "slot_hold_deposit"];
export const WITHDRAWAL_WAIVER_TEXT: string = "I ask Morales to start arranging my booking right away. Where I have a legal 14-day right to cancel this purchase (for example under EU or UK consumer law), I understand that I lose it once the service has been fully provided, and that if I cancel before then I may have to pay for the part already provided.";
export const WITHDRAWAL_WAIVER_VERSION = 'wv-995ca0ff29';

export type WaiverFlow = 'package_payment' | 'consultation_fee' | 'slot_hold_deposit';

export function requiresWithdrawalWaiver(flow: WaiverFlow): boolean {
  return WITHDRAWAL_WAIVER_FLOWS.includes(flow);
}

export type WaiverCheck =
  | { ok: true; metadata: Record<string, string> }
  | { ok: false; error: string };

export function checkWithdrawalWaiver(
  flow: WaiverFlow,
  waiver: { accepted?: boolean; version?: string } | undefined,
  now: Date = new Date(),
): WaiverCheck {
  if (!requiresWithdrawalWaiver(flow)) return { ok: true, metadata: {} };
  if (!waiver || waiver.accepted !== true) {
    return { ok: false, error: 'Please tick the box about starting your booking right away.' };
  }
  if (waiver.version !== WITHDRAWAL_WAIVER_VERSION) {
    return { ok: false, error: 'This page is out of date. Please reload it and tick the box again.' };
  }
  return {
    ok: true,
    metadata: {
      withdrawal_waiver_version: WITHDRAWAL_WAIVER_VERSION,
      withdrawal_waiver_accepted_at: now.toISOString(),
    },
  };
}
