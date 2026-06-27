/**
 * useActivityDetection — Layer 3: Battery-Safe Activity Engine (Silent Guardian)
 *
 * Board constraints applied:
 *  - ONLY activates when enabled (active journey + app visible + guardian opted in)
 *  - 3-Strike debounce: shake MUST co-occur with (no GPS movement + no screen interaction)
 *    for 5 continuous minutes before the "Did you fall?" prompt fires
 *  - Never triggers on a bumpy bus ride (single short shake = ignored)
 *  - Web reality: DeviceMotionEvent only works while app is in foreground
 *  - Cleans up all event listeners on unmount
 *
 * Returns:
 *   strikeCount       — 0-3 (3 = prompt fires)
 *   showFallPrompt    — boolean: show "Are you okay?" dialog
 *   dismissFallPrompt — function: user tapped "I'm fine"
 *   queuedSOS         — boolean: prompt timed out (60s), SOS queued
 *   clearQueuedSOS    — function: cancel the queued SOS
 */
import { useState, useEffect, useRef, useCallback } from 'react';

const SHAKE_THRESHOLD   = 15;    // m/s² — ignore gentle movement
const SHAKE_WINDOW_MS   = 30_000; // shaking must persist 30s to register
const STRIKE_WINDOW_MS  = 5 * 60_000; // 5 min of co-occurrence for 3rd strike
const PROMPT_TIMEOUT_MS = 60_000; // 60s to respond before SOS queues

export function useActivityDetection({ enabled = false, hasGPSMoved = true }) {
  const [strikeCount,    setStrikeCount]    = useState(0);
  const [showFallPrompt, setShowFallPrompt] = useState(false);
  const [queuedSOS,      setQueuedSOS]      = useState(false);

  const shakeStartRef       = useRef(null);   // when continuous shaking began
  const lastInteractionRef  = useRef(Date.now());
  const strikeTimerRef      = useRef(null);
  const promptTimerRef      = useRef(null);
  const isShakingRef        = useRef(false);

  // Track user screen interaction (touches, clicks = not distress)
  useEffect(() => {
    function onInteraction() { lastInteractionRef.current = Date.now(); }
    document.addEventListener('touchstart', onInteraction, { passive: true });
    document.addEventListener('click',      onInteraction, { passive: true });
    document.addEventListener('keydown',    onInteraction, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onInteraction);
      document.removeEventListener('click',      onInteraction);
      document.removeEventListener('keydown',    onInteraction);
    };
  }, []);

  // Strike evaluator — runs when shaking starts
  function evaluateStrike() {
    const now = Date.now();
    const msSinceInteraction = now - lastInteractionRef.current;
    const hasGPSMovement     = hasGPSMoved;

    // 3-Strike rule: shake + no GPS move + no screen interaction (5 min)
    const screenInactive = msSinceInteraction > STRIKE_WINDOW_MS;
    const gpsInactive    = !hasGPSMovement;

    if (screenInactive && gpsInactive) {
      setStrikeCount(s => {
        const next = s + 1;
        if (next >= 3) {
          // All 3 strikes — fire the gentle prompt
          setShowFallPrompt(true);
          // 60s timeout before queuing SOS
          promptTimerRef.current = setTimeout(() => {
            setShowFallPrompt(false);
            setQueuedSOS(true);
          }, PROMPT_TIMEOUT_MS);
        }
        return next;
      });
    } else if (screenInactive || gpsInactive) {
      // Partial match — one strike
      setStrikeCount(s => Math.min(s + 1, 2));
    }
    // Both active = no strike (bumpy bus, running, hiking)
  }

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    if (!window.DeviceMotionEvent) return; // not supported (desktop)

    function onMotion(e) {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;

      const magnitude = Math.sqrt(
        (acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2
      );

      if (magnitude > SHAKE_THRESHOLD) {
        if (!isShakingRef.current) {
          isShakingRef.current = true;
          shakeStartRef.current = Date.now();
        }
        // Check if shaking has persisted long enough
        const shakingFor = Date.now() - (shakeStartRef.current || Date.now());
        if (shakingFor >= SHAKE_WINDOW_MS && !strikeTimerRef.current) {
          // Sustained shake — evaluate strike
          strikeTimerRef.current = setTimeout(() => {
            evaluateStrike();
            strikeTimerRef.current = null;
            isShakingRef.current   = false;
            shakeStartRef.current  = null;
          }, 500);
        }
      } else {
        // Movement stopped
        if (isShakingRef.current) {
          isShakingRef.current  = false;
          shakeStartRef.current = null;
          clearTimeout(strikeTimerRef.current);
          strikeTimerRef.current = null;
        }
      }
    }

    window.addEventListener('devicemotion', onMotion, { passive: true });
    return () => {
      window.removeEventListener('devicemotion', onMotion);
      clearTimeout(strikeTimerRef.current);
      clearTimeout(promptTimerRef.current);
    };
  }, [enabled, hasGPSMoved]);

  const dismissFallPrompt = useCallback(() => {
    clearTimeout(promptTimerRef.current);
    setShowFallPrompt(false);
    setStrikeCount(0);
    setQueuedSOS(false);
    lastInteractionRef.current = Date.now();
  }, []);

  const clearQueuedSOS = useCallback(() => {
    setQueuedSOS(false);
    setStrikeCount(0);
  }, []);

  return { strikeCount, showFallPrompt, queuedSOS, dismissFallPrompt, clearQueuedSOS };
}
