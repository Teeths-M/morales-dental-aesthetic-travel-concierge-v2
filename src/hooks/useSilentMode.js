import { useState, useEffect, useRef, useCallback } from 'react';

const SHAKE_THRESHOLD  = 18;   // acceleration delta to count as a shake
const SHAKE_WINDOW_MS  = 1500; // 3 shakes must happen within this window
const STRIKE_WINDOW_MS = 400;  // minimum ms between counted strikes

export function useSilentMode({ onActivate = null, onCancel = null } = {}) {
  const [active,  setActive]  = useState(false);
  const [strikes, setStrikes] = useState(0);

  const lastShake  = useRef(0);
  const strikeTimes = useRef([]);
  const lastAccel  = useRef({ x: 0, y: 0, z: 0 });
  const activeRef  = useRef(false);
  activeRef.current = active;

  const activate = useCallback(() => {
    setActive(true);
    strikeTimes.current = [];
    setStrikes(0);
    onActivate?.();
  }, [onActivate]);

  const cancel = useCallback(() => {
    setActive(false);
    onCancel?.();
  }, [onCancel]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleMotion = (e) => {
      if (activeRef.current) return; // already active — ignore shakes

      const acc = e.accelerationIncludingGravity || e.acceleration;
      if (!acc) return;

      const { x = 0, y = 0, z = 0 } = acc;
      const prev = lastAccel.current;
      const delta = Math.abs(x - prev.x) + Math.abs(y - prev.y) + Math.abs(z - prev.z);
      lastAccel.current = { x, y, z };

      const now = Date.now();
      if (delta > SHAKE_THRESHOLD && now - lastShake.current > STRIKE_WINDOW_MS) {
        lastShake.current = now;

        // Keep only strikes within the window
        strikeTimes.current = [...strikeTimes.current, now].filter(
          t => now - t <= SHAKE_WINDOW_MS
        );
        setStrikes(strikeTimes.current.length);

        if (strikeTimes.current.length >= 3) {
          activate();
        }
      }
    };

    window.addEventListener('devicemotion', handleMotion, { passive: true });
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [activate]);

  return { active, strikes, activate, cancel };
}
