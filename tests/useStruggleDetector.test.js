import { describe, it, expect } from 'vitest';
import { shouldArmIdleTimer, shouldFireRetryFail } from '../src/hooks/useStruggleDetector.js';

describe('useStruggleDetector.shouldArmIdleTimer', () => {
  it('arms when active, invalid, and not already fired', () => {
    expect(shouldArmIdleTimer({ active: true, isValid: false, alreadyFired: false })).toBe(true);
  });

  it('does not arm once the value is valid', () => {
    expect(shouldArmIdleTimer({ active: true, isValid: true, alreadyFired: false })).toBe(false);
  });

  it('does not arm when inactive', () => {
    expect(shouldArmIdleTimer({ active: false, isValid: false, alreadyFired: false })).toBe(false);
  });

  it('does not re-arm after already firing once', () => {
    expect(shouldArmIdleTimer({ active: true, isValid: false, alreadyFired: true })).toBe(false);
  });
});

describe('useStruggleDetector.shouldFireRetryFail', () => {
  it('does not fire below the threshold', () => {
    expect(shouldFireRetryFail({ active: true, failureCount: 2, failureThreshold: 3, alreadyFired: false })).toBe(false);
  });

  it('fires once the threshold is reached', () => {
    expect(shouldFireRetryFail({ active: true, failureCount: 3, failureThreshold: 3, alreadyFired: false })).toBe(true);
  });

  it('fires past the threshold too', () => {
    expect(shouldFireRetryFail({ active: true, failureCount: 5, failureThreshold: 3, alreadyFired: false })).toBe(true);
  });

  it('never fires twice', () => {
    expect(shouldFireRetryFail({ active: true, failureCount: 5, failureThreshold: 3, alreadyFired: true })).toBe(false);
  });

  it('does not fire when inactive', () => {
    expect(shouldFireRetryFail({ active: false, failureCount: 5, failureThreshold: 3, alreadyFired: false })).toBe(false);
  });
});
