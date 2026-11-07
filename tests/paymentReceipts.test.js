import { describe, it, expect } from 'vitest';
import {
  isPaidInFull,
  formatUsd,
  receiptKind,
  formatIssued,
  receiptDetails,
  receiptFileName,
} from '../src/lib/paymentReceipts';

// Built from a local date so the expected day holds in any time zone.
const ISSUED = new Date(2026, 9, 18, 12, 0, 0).toISOString();

const fullPayment = {
  receipt_number: 'REC-AB12CD34-LX9',
  case_ref: 'AB12CD34',
  procedures: 'Dental Implants',
  destination: 'Mexico',
  payment_type: 'full_pay',
  amount_paid: 2400,
  balance_remaining: 0,
  stripe_payment_id: 'pi_123',
  issued_at: ISSUED,
};

const deposit = {
  ...fullPayment,
  payment_type: 'terms',
  amount_paid: 1200,
  balance_remaining: 1200,
  next_due_date: 'November 1, 2026',
  stripe_payment_id: '',
};

describe('isPaidInFull', () => {
  it('is true for a full payment', () => {
    expect(isPaidInFull({ payment_type: 'full_pay', balance_remaining: 500 })).toBe(true);
  });
  it('is true when nothing is left to pay', () => {
    expect(isPaidInFull({ payment_type: 'terms', balance_remaining: 0 })).toBe(true);
  });
  it('is false for a deposit with a balance left', () => {
    expect(isPaidInFull(deposit)).toBe(false);
  });
  it('is false when the balance is missing, rather than guessing', () => {
    expect(isPaidInFull({ payment_type: 'terms' })).toBe(false);
  });
  it('handles a missing receipt', () => {
    expect(isPaidInFull(undefined)).toBe(false);
  });
});

describe('formatUsd', () => {
  it('prints dollars with cents and thousands separators', () => {
    expect(formatUsd(1234.5)).toBe('$1,234.50');
    expect(formatUsd('75')).toBe('$75.00');
  });
  it('prints nothing as $0.00', () => {
    expect(formatUsd(0)).toBe('$0.00');
    expect(formatUsd(undefined)).toBe('$0.00');
  });
});

describe('receiptKind', () => {
  it('uses the same words as the emailed receipt', () => {
    expect(receiptKind(fullPayment)).toBe('Paid in Full');
    expect(receiptKind(deposit)).toBe('50% Deposit');
  });
});

describe('formatIssued', () => {
  it('shows the day the receipt was issued', () => {
    expect(formatIssued(ISSUED)).toBe('Oct 18, 2026');
  });
  it('shows nothing for a missing or broken date', () => {
    expect(formatIssued(undefined)).toBe('');
    expect(formatIssued('not a date')).toBe('');
  });
});

describe('receiptDetails', () => {
  it('lists a full payment in the emailed order, with no balance line', () => {
    const rows = receiptDetails(fullPayment);
    expect(rows.map(([label]) => label)).toEqual([
      'Receipt No.', 'Case Reference', 'Procedure(s)', 'Destination', 'Issued',
      'Transaction ID', 'Amount Paid', 'Payment Type',
    ]);
    expect(Object.fromEntries(rows)['Amount Paid']).toBe('$2,400.00');
  });
  it('adds the balance and due date for a deposit, and leaves out an empty transaction ID', () => {
    const rows = Object.fromEntries(receiptDetails(deposit));
    expect(rows['Payment Type']).toBe('50% Deposit');
    expect(rows['Balance Remaining']).toBe('$1,200.00');
    expect(rows['Due By']).toBe('November 1, 2026');
    expect(rows).not.toHaveProperty('Transaction ID');
  });
  it('returns nothing for a missing receipt', () => {
    expect(receiptDetails(null)).toEqual([]);
  });
});

describe('receiptFileName', () => {
  it('names the file after the receipt number', () => {
    expect(receiptFileName(fullPayment)).toBe('Receipt_REC-AB12CD34-LX9.html');
  });
  it('keeps only safe characters', () => {
    expect(receiptFileName({ receipt_number: '../x y' })).toBe('Receipt_xy.html');
  });
  it('still gives a name when the number is missing', () => {
    expect(receiptFileName({})).toBe('Receipt_MCare.html');
  });
});
