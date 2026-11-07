import { format } from 'date-fns';

// Display helpers for the patient's own PaymentReceipt rows. They mirror the
// emailed receipt (sendPaymentReceipt's receiptHtml) so the app and the email
// always say the same thing.

/** Same rule as the emailed receipt: a full payment, or nothing left to pay. */
export function isPaidInFull(receipt) {
  return receipt?.payment_type === 'full_pay' || Number(receipt?.balance_remaining ?? NaN) === 0;
}

/** US dollars with cents, the way the emailed receipt prints them. */
export function formatUsd(amount) {
  const n = Number(amount || 0);
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function receiptKind(receipt) {
  return isPaidInFull(receipt) ? 'Paid in Full' : '50% Deposit';
}

export function formatIssued(iso) {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? format(d, 'MMM d, yyyy') : '';
}

/** The receipt's lines, in the emailed receipt's order. Empty ones are left out. */
export function receiptDetails(receipt) {
  if (!receipt) return [];
  const full = isPaidInFull(receipt);
  const rows = [
    ['Receipt No.', receipt.receipt_number],
    ['Case Reference', receipt.case_ref],
    ['Procedure(s)', receipt.procedures],
    ['Destination', receipt.destination],
    ['Issued', formatIssued(receipt.issued_at)],
    ['Transaction ID', receipt.stripe_payment_id],
    ['Amount Paid', formatUsd(receipt.amount_paid)],
    ['Payment Type', receiptKind(receipt)],
  ];
  if (!full && Number(receipt.balance_remaining) > 0) {
    rows.push(['Balance Remaining', formatUsd(receipt.balance_remaining)]);
    if (receipt.next_due_date) rows.push(['Due By', receipt.next_due_date]);
  }
  return rows.filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');
}

/** A safe file name for downloading the official copy. */
export function receiptFileName(receipt) {
  const number = String(receipt?.receipt_number || '').replace(/[^A-Za-z0-9_-]/g, '');
  return `Receipt_${number || 'MCare'}.html`;
}
