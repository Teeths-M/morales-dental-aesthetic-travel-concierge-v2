import { describe, it, expect } from 'vitest';
import { VC_STATUS, canTransition, assertTransition, isTerminal } from '../base44/shared/virtualConsultationState.ts';

describe('virtualConsultationState', () => {
  it('allows a no-op transition (same state to itself)', () => {
    expect(canTransition(VC_STATUS.CONFIRMED, VC_STATUS.CONFIRMED)).toBe(true);
  });

  it('walks the real happy path', () => {
    expect(canTransition(VC_STATUS.REQUESTED, VC_STATUS.CONFIRMED)).toBe(true);
    expect(canTransition(VC_STATUS.CONFIRMED, VC_STATUS.DEVICE_CHECK_COMPLETE)).toBe(true);
    expect(canTransition(VC_STATUS.CONFIRMED, VC_STATUS.IN_PROGRESS)).toBe(true);
    expect(canTransition(VC_STATUS.DEVICE_CHECK_COMPLETE, VC_STATUS.IN_PROGRESS)).toBe(true);
    expect(canTransition(VC_STATUS.IN_PROGRESS, VC_STATUS.COMPLETED)).toBe(true);
  });

  it('allows a mid-flight eligibility flip to SUSPENDED from either pre-call state', () => {
    expect(canTransition(VC_STATUS.CONFIRMED, VC_STATUS.SUSPENDED)).toBe(true);
    expect(canTransition(VC_STATUS.DEVICE_CHECK_COMPLETE, VC_STATUS.SUSPENDED)).toBe(true);
  });

  it('allows cancellation from any non-terminal state', () => {
    expect(canTransition(VC_STATUS.REQUESTED, VC_STATUS.CANCELLED)).toBe(true);
    expect(canTransition(VC_STATUS.CONFIRMED, VC_STATUS.CANCELLED)).toBe(true);
    expect(canTransition(VC_STATUS.IN_PROGRESS, VC_STATUS.CANCELLED)).toBe(true);
  });

  it('rejects an illegal skip-ahead transition', () => {
    expect(canTransition(VC_STATUS.REQUESTED, VC_STATUS.IN_PROGRESS)).toBe(false);
    expect(canTransition(VC_STATUS.REQUESTED, VC_STATUS.COMPLETED)).toBe(false);
  });

  it('marks COMPLETED, CANCELLED, and NO_SHOW as terminal — no further transition allowed', () => {
    expect(isTerminal(VC_STATUS.COMPLETED)).toBe(true);
    expect(isTerminal(VC_STATUS.CANCELLED)).toBe(true);
    expect(isTerminal(VC_STATUS.NO_SHOW)).toBe(true);
    expect(canTransition(VC_STATUS.COMPLETED, VC_STATUS.IN_PROGRESS)).toBe(false);
    expect(canTransition(VC_STATUS.CANCELLED, VC_STATUS.CONFIRMED)).toBe(false);
  });

  it('has no routine outgoing edge from SUSPENDED', () => {
    expect(canTransition(VC_STATUS.SUSPENDED, VC_STATUS.CONFIRMED)).toBe(false);
    expect(canTransition(VC_STATUS.SUSPENDED, VC_STATUS.IN_PROGRESS)).toBe(false);
    // Cancellation is still allowed even from a suspended state.
    expect(canTransition(VC_STATUS.SUSPENDED, VC_STATUS.CANCELLED)).toBe(true);
  });

  it('assertTransition throws a descriptive error on an illegal jump', () => {
    expect(() => assertTransition(VC_STATUS.REQUESTED, VC_STATUS.COMPLETED)).toThrow(
      /Illegal virtual consultation transition/,
    );
  });

  it('assertTransition does not throw on a legal transition', () => {
    expect(() => assertTransition(VC_STATUS.CONFIRMED, VC_STATUS.IN_PROGRESS)).not.toThrow();
  });
});
