// useBlinkState — a small, honest "alive" cue shared by LivingOrb (M-Care's
// chat/panel/floating-button avatar) and LivingMOrb (the homepage hero), so
// both read as the same friendly, playful AI presence rather than two
// independent implementations drifting apart. Fires an occasional blink
// (both eyes), and a rarer wink (one eye only, for personality), on a
// randomized interval so it never reads as a mechanical loop. No-ops (stays
// 'open' the whole time) under prefers-reduced-motion, same as every other
// motion effect in this app.
//
// Returns one of: 'open' | 'blink' | 'wink-left' | 'wink-right'
import { useEffect, useRef, useState } from 'react';

const MIN_INTERVAL_MS = 3200;
const MAX_INTERVAL_MS = 6800;
const BLINK_DURATION_MS = 160;
const WINK_CHANCE = 0.22; // most cycles are a plain blink; winks are the occasional, playful exception

export function useBlinkState(reducedMotion) {
  const [blinkState, setBlinkState] = useState('open');
  const openTimerRef = useRef(null);
  const nextTimerRef = useRef(null);

  useEffect(() => {
    if (reducedMotion) {
      setBlinkState('open');
      return undefined;
    }

    let cancelled = false;

    const scheduleNext = () => {
      const delay = MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
      nextTimerRef.current = setTimeout(() => {
        if (cancelled) return;
        const isWink = Math.random() < WINK_CHANCE;
        setBlinkState(isWink ? (Math.random() < 0.5 ? 'wink-left' : 'wink-right') : 'blink');
        openTimerRef.current = setTimeout(() => {
          if (cancelled) return;
          setBlinkState('open');
          scheduleNext();
        }, BLINK_DURATION_MS);
      }, delay);
    };
    scheduleNext();

    return () => {
      cancelled = true;
      clearTimeout(nextTimerRef.current);
      clearTimeout(openTimerRef.current);
    };
  }, [reducedMotion]);

  return blinkState;
}
