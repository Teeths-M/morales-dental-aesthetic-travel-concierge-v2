import { describe, it, expect } from 'vitest';
import { computeSignalTransition } from '../src/hooks/useSignalDelta';

describe('computeSignalTransition', () => {
  it('reports baseline with no prior reading — never claims "no new signals" without a real prior comparison', () => {
    const result = computeSignalTransition(null, 3, 0);
    expect(result.status).toBe('baseline');
    expect(result.deltaTotal).toBe(0);
    expect(result.deltaUnresolved).toBe(0);
  });

  it('reports quiet when both numbers are unchanged since the last real reading', () => {
    const result = computeSignalTransition({ total: 5, unresolvedCriticalOrHigh: 0 }, 5, 0);
    expect(result.status).toBe('quiet');
    expect(result.deltaTotal).toBe(0);
    expect(result.deltaUnresolved).toBe(0);
  });

  it('reports signal when total genuinely increased', () => {
    const result = computeSignalTransition({ total: 5, unresolvedCriticalOrHigh: 0 }, 6, 0);
    expect(result.status).toBe('signal');
    expect(result.deltaTotal).toBe(1);
    expect(result.deltaUnresolved).toBe(0);
  });

  it('reports signal when unresolved-critical-or-high genuinely increased, even if total did not move', () => {
    const result = computeSignalTransition({ total: 5, unresolvedCriticalOrHigh: 0 }, 5, 1);
    expect(result.status).toBe('signal');
    expect(result.deltaUnresolved).toBe(1);
  });

  it('reports quiet (not a negative "signal") when a number decreased — a resolved incident is not treated as new activity', () => {
    const result = computeSignalTransition({ total: 5, unresolvedCriticalOrHigh: 2 }, 5, 1);
    expect(result.status).toBe('quiet');
    expect(result.deltaUnresolved).toBe(-1);
  });

  it('reports signal when both numbers move in the same real poll', () => {
    const result = computeSignalTransition({ total: 5, unresolvedCriticalOrHigh: 0 }, 7, 2);
    expect(result.status).toBe('signal');
    expect(result.deltaTotal).toBe(2);
    expect(result.deltaUnresolved).toBe(2);
  });
});
