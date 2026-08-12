// useLivingEyes — the eye-tracking behavior shared between the homepage's
// LivingMOrb (src/components/home/LivingMOrb.jsx) and M-Care's own LivingOrb
// (src/components/mcare/LivingOrb.jsx), extracted so both "living M" surfaces
// move identically instead of silently drifting apart over time. A single
// requestAnimationFrame loop owns eye position at all times, blending
// smoothly between idle sine-wave drift (biased slightly rightward — an
// honest, cheap "glancing toward something" cue, cheaper than real per-element
// position math) and cursor-tracking based on recent mouse activity, so the
// two behaviors hand off cleanly instead of fighting over the DOM.
//
// Pure DOM-effect hook, no render output — the caller owns the actual eye
// elements and just hands over refs. No-ops entirely when reducedMotion is
// true, matching every other prefers-reduced-motion guard in this app.
import { useEffect, useRef } from 'react';

const EYE_MAX_OFFSET = 3.4; // px — how far an eye can shift off-center
const IDLE_DRIFT_PERIOD_MS = 5200;
const IDLE_BIAS_X = 1.1; // px — idle drift centers slightly rightward
const TRACK_TIMEOUT_MS = 2600; // no mousemove for this long → back to idle drift
const REACT_RADIUS = 460; // px — cursor further than this doesn't pull the eyes

export function useLivingEyes({ orbRef, eyeLRef, eyeRRef, reducedMotion }) {
  const rafRef = useRef(null);
  const currentRef = useRef({ x: 0, y: 0 });
  const lastMouseMoveRef = useRef(0);
  const mousePosRef = useRef(null);
  const startRef = useRef(typeof performance !== 'undefined' ? performance.now() : 0);

  useEffect(() => {
    if (reducedMotion) return undefined;

    const onMove = (e) => {
      lastMouseMoveRef.current = performance.now();
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', onMove, { passive: true });

    const tick = () => {
      const el = orbRef.current;
      if (!el) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const now = performance.now();
      const trackingActive = mousePosRef.current && (now - lastMouseMoveRef.current) < TRACK_TIMEOUT_MS;

      let targetX;
      let targetY;
      if (trackingActive) {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = mousePosRef.current.x - cx;
        const dy = mousePosRef.current.y - cy;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist <= REACT_RADIUS) {
          targetX = (dx / dist) * EYE_MAX_OFFSET;
          targetY = (dy / dist) * EYE_MAX_OFFSET * 0.55; // reads calmer than full vertical travel
        } else {
          targetX = IDLE_BIAS_X;
          targetY = 0;
        }
      } else {
        const elapsed = now - startRef.current;
        targetX = IDLE_BIAS_X + Math.sin((elapsed / IDLE_DRIFT_PERIOD_MS) * Math.PI * 2) * EYE_MAX_OFFSET * 0.85;
        targetY = Math.sin((elapsed / (IDLE_DRIFT_PERIOD_MS * 1.7)) * Math.PI * 2) * 0.8;
      }

      const cur = currentRef.current;
      cur.x += (targetX - cur.x) * 0.08;
      cur.y += (targetY - cur.y) * 0.08;
      const transform = `translate(${cur.x.toFixed(2)}px, ${cur.y.toFixed(2)}px)`;
      if (eyeLRef.current) eyeLRef.current.style.transform = transform;
      if (eyeRRef.current) eyeRRef.current.style.transform = transform;

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion, orbRef, eyeLRef, eyeRRef]);
}
