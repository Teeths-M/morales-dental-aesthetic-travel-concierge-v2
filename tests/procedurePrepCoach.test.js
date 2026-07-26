import { describe, it, expect } from 'vitest';
import { isPrepCoachActive } from '../src/lib/prepCoach.js';

const baseCase = {
  doctor_confirmation_status: 'CONFIRMED',
  payment_status: '25% Paid',
  procedure_date: '2026-12-01',
  status: 'Deposit-Paid',
};

describe('ProcedurePrepCoach.isPrepCoachActive', () => {
  it('is active when confirmed, paid, dated and not yet in progress', () => {
    expect(isPrepCoachActive(baseCase)).toBe(true);
  });

  it('is inactive with no case record', () => {
    expect(isPrepCoachActive(null)).toBe(false);
    expect(isPrepCoachActive(undefined)).toBe(false);
  });

  it('is inactive when the doctor has not confirmed', () => {
    expect(isPrepCoachActive({ ...baseCase, doctor_confirmation_status: 'PENDING' })).toBe(false);
    expect(isPrepCoachActive({ ...baseCase, doctor_confirmation_status: 'DECLINED' })).toBe(false);
  });

  it('is inactive when no payment has landed', () => {
    expect(isPrepCoachActive({ ...baseCase, payment_status: 'Pending' })).toBe(false);
    expect(isPrepCoachActive({ ...baseCase, payment_status: 'Failed' })).toBe(false);
  });

  it('accepts every paid tier, not just one', () => {
    expect(isPrepCoachActive({ ...baseCase, payment_status: '25% Paid' })).toBe(true);
    expect(isPrepCoachActive({ ...baseCase, payment_status: '50% Paid' })).toBe(true);
    expect(isPrepCoachActive({ ...baseCase, payment_status: 'Paid In Full' })).toBe(true);
  });

  it('is inactive with no procedure_date set yet', () => {
    expect(isPrepCoachActive({ ...baseCase, procedure_date: null })).toBe(false);
  });

  it('is inactive once the procedure has actually started or finished', () => {
    expect(isPrepCoachActive({ ...baseCase, status: 'Procedure-In-Progress' })).toBe(false);
    expect(isPrepCoachActive({ ...baseCase, status: 'SURGICAL_EXECUTION_WINDOW' })).toBe(false);
    expect(isPrepCoachActive({ ...baseCase, status: 'RECOVERY_PHASE_7_DAY' })).toBe(false);
    expect(isPrepCoachActive({ ...baseCase, status: 'Recovery' })).toBe(false);
    expect(isPrepCoachActive({ ...baseCase, status: 'Completed' })).toBe(false);
  });

  it('is still active at every pre-procedure status', () => {
    for (const status of ['PMP-25', 'PMP-50', 'Deposit-Paid', 'Travel-Coordination', 'Ready-For-Travel']) {
      expect(isPrepCoachActive({ ...baseCase, status })).toBe(true);
    }
  });
});
