import { useRef, useState, useEffect } from 'react';

/**
 * computeSignalTransition — the pure comparison at the heart of
 * useSignalDelta, pulled out so it's directly unit-testable without
 * rendering a hook (tests/useSignalDelta.test.js). `prev` is either `null`
 * (nothing seen yet this session) or the last `{total, unresolvedCriticalOrHigh}`
 * reading. Returns the next `{status, deltaTotal, deltaUnresolved}`.
 */
export function computeSignalTransition(prev, total, unresolvedCriticalOrHigh) {
  if (!prev) {
    return { status: 'baseline', deltaTotal: 0, deltaUnresolved: 0 };
  }
  const deltaTotal = total - prev.total;
  const deltaUnresolved = unresolvedCriticalOrHigh - prev.unresolvedCriticalOrHigh;
  const status = (deltaTotal > 0 || deltaUnresolved > 0) ? 'signal' : 'quiet';
  return { status, deltaTotal, deltaUnresolved };
}

/**
 * useSignalDelta — the honest substitute for a scheduler "run #600 -> #601"
 * counter, which does not exist anywhere in this codebase (confirmed by
 * grep for run_number/scan_number/sequence_number — zero hits). Instead of
 * fabricating a run number, this compares the two real numbers
 * getSystemHealthSummary already exposes (total incidents, unresolved
 * critical/high) across polls and reports only what genuinely changed.
 *
 * `generatedAt` (the real, always-fresh `new Date().toISOString()` the
 * function stamps on every single invocation, even when the underlying
 * counts haven't moved) is passed in specifically as the effect's real
 * "a new poll actually completed" signal — comparing only on
 * [total, unresolvedCriticalOrHigh] would make React skip the effect
 * entirely on a poll that returns identical numbers (the common case), so
 * the state would freeze on 'baseline' forever and this could never reach
 * the honest steady-state 'quiet' ("NO NEW SIGNALS") the feature's spec
 * explicitly wants as the default read.
 *
 * Three real states (see computeSignalTransition above for the exact rule):
 * - 'baseline': the very first reading this session — nothing to compare
 *   against yet, so this NEVER claims "no new signals" without an actual
 *   prior reading to compare to.
 * - 'signal': either number went UP since the last real reading (a real
 *   incident was logged, or one moved from resolved back to unresolved).
 * - 'quiet': a real poll completed and the numbers are the same or lower
 *   than the last reading — the honest "NO NEW SIGNALS" case.
 *
 * A decrease (incident resolved) is deliberately folded into 'quiet', not a
 * distinct 4th state — this feature's job is "did something new happen,"
 * not a full incident-resolution tracker (that's what /admin/data-freshness
 * and the admin incident queues are for).
 */
export default function useSignalDelta(total, unresolvedCriticalOrHigh, generatedAt) {
  const prevRef = useRef(null);
  const [state, setState] = useState({ status: 'baseline', deltaTotal: 0, deltaUnresolved: 0 });

  useEffect(() => {
    if (typeof total !== 'number' || typeof unresolvedCriticalOrHigh !== 'number' || !generatedAt) return;

    const next = computeSignalTransition(prevRef.current, total, unresolvedCriticalOrHigh);
    prevRef.current = { total, unresolvedCriticalOrHigh };
    setState(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- generatedAt is
    // the real "a new poll happened" trigger; total/unresolvedCriticalOrHigh
    // are read from prevRef/closure inside, not needed as separate deps.
  }, [generatedAt]);

  return state;
}
