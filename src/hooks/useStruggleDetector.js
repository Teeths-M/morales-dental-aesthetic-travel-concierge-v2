/**
 * useStruggleDetector — deterministic, no-AI, no-network detection of
 * someone stuck on a field or a form, so the caller can offer help before
 * they give up. Two signals only, both computed locally:
 *
 *   idle       — the watched value hasn't become valid within `idleMs` of
 *                the caller starting to interact with it
 *   retry_fail — `failureCount` (caller-tracked) reached `failureThreshold`
 *
 * This hook only detects and reports via `onStruggle(reason)` — it never
 * decides what to show or say. That's the caller's job (see
 * struggleHint.js's `emitStruggleHint`, listened to by MCareOrb). Each
 * reason fires at most once per mount, so it never nags on every render.
 *
 * The actual decisions are pure functions (`shouldArmIdleTimer`,
 * `shouldFireRetryFail`) so they're unit-testable without rendering a
 * component — this codebase's Vitest suite tests pure logic, not React
 * trees (no @testing-library/react installed). The hook itself is a thin
 * effect wrapper around them.
 */
import { useEffect, useRef } from 'react';

/** Should the idle timer be (re)armed right now? Pure — no timers here. */
export function shouldArmIdleTimer({ active, isValid, alreadyFired }) {
  return Boolean(active) && !isValid && !alreadyFired;
}

/** Has the retry-fail threshold just been crossed? Pure. */
export function shouldFireRetryFail({ active, failureCount, failureThreshold, alreadyFired }) {
  return Boolean(active) && !alreadyFired && failureCount >= failureThreshold;
}

export function useStruggleDetector({
  active = true,
  value,
  isValid = false,
  failureCount = 0,
  idleMs = 35000,
  failureThreshold = 3,
  onStruggle,
}) {
  const idleFiredRef = useRef(false);
  const failFiredRef = useRef(false);
  const timerRef = useRef(null);

  // Idle: (re)start the timer whenever the value changes while still
  // invalid. A valid value clears the timer — no struggle to report.
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!shouldArmIdleTimer({ active, isValid, alreadyFired: idleFiredRef.current })) return undefined;

    timerRef.current = setTimeout(() => {
      idleFiredRef.current = true;
      onStruggle?.('idle');
    }, idleMs);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [active, value, isValid, idleMs]);

  // Retry-fail: fires once, the first time the threshold is crossed.
  useEffect(() => {
    if (shouldFireRetryFail({ active, failureCount, failureThreshold, alreadyFired: failFiredRef.current })) {
      failFiredRef.current = true;
      onStruggle?.('retry_fail');
    }
  }, [active, failureCount, failureThreshold]);
}
