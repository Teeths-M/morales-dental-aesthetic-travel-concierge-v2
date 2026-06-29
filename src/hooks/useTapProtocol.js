import { useState, useEffect, useRef, useCallback } from 'react';

const TAP_WINDOW_MS = 1000; // all taps must land within 1 second
const TAP_GAP_MS   = 80;   // minimum ms between taps (debounce)

export function useTapProtocol({ onDoubleTab, onTripleTap } = {}) {
  const [tapCount, setTapCount]   = useState(0);
  const [lastMode, setLastMode]   = useState(null); // 'check' | 'emergency'
  const tapTimes  = useRef([]);
  const lastTap   = useRef(0);
  const timerRef  = useRef(null);

  const registerTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < TAP_GAP_MS) return; // debounce
    lastTap.current = now;

    // Keep only taps within the window
    tapTimes.current = [...tapTimes.current, now].filter(t => now - t <= TAP_WINDOW_MS);
    const count = tapTimes.current.length;
    setTapCount(count);

    clearTimeout(timerRef.current);

    if (count >= 3) {
      tapTimes.current = [];
      setTapCount(0);
      setLastMode('emergency');
      onTripleTap?.();
    } else {
      // Wait for more taps — fire double after window expires
      timerRef.current = setTimeout(() => {
        const final = tapTimes.current.length;
        tapTimes.current = [];
        setTapCount(0);
        if (final === 2) {
          setLastMode('check');
          onDoubleTab?.();
        }
      }, TAP_WINDOW_MS);
    }
  }, [onDoubleTab, onTripleTap]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { tapCount, lastMode, registerTap };
}
