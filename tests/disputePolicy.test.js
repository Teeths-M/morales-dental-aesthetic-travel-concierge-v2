import { describe, it, expect } from 'vitest';
import {
  DISPUTE_FREEZES_ESCROW,
  disputeOutcome,
  shouldResumeEscrow,
  closedDisputeStatus,
  pauseMarker,
} from '../base44/shared/disputePolicy.ts';

describe('disputePolicy', () => {
  it('has a yes-or-no answer for pausing payouts', () => {
    expect(typeof DISPUTE_FREEZES_ESCROW).toBe('boolean');
  });

  it("maps Stripe's final statuses", () => {
    expect(disputeOutcome('won')).toBe('won');
    expect(disputeOutcome('lost')).toBe('lost');
    expect(disputeOutcome('warning_closed')).toBe('inquiry_closed');
    expect(disputeOutcome('under_review')).toBe('other');
    expect(disputeOutcome('')).toBe('other');
  });

  it('resumes paused payouts only when the money is safe', () => {
    expect(shouldResumeEscrow('won')).toBe(true);
    expect(shouldResumeEscrow('inquiry_closed')).toBe(true);
    expect(shouldResumeEscrow('lost')).toBe(false);
    expect(shouldResumeEscrow('other')).toBe(false);
  });

  it('gives each outcome its own payment-record status', () => {
    expect(closedDisputeStatus('won')).toBe('dispute_won');
    expect(closedDisputeStatus('lost')).toBe('dispute_lost');
    expect(closedDisputeStatus('inquiry_closed')).toBe('dispute_closed');
    expect(closedDisputeStatus('other')).toBe('dispute_closed');
  });

  it('tags a paused hold with the dispute that paused it', () => {
    expect(pauseMarker('dp_123')).toBe('[dispute dp_123]');
    expect(pauseMarker('dp_123')).not.toBe(pauseMarker('dp_1234'));
  });
});
