// LivingMOrb — the hero's "living agent" presence (buildathon polish, per
// Portia's Living-M-Orb spec). A separate component from M-Care's own
// src/components/mcare/LivingOrb.jsx on purpose: that one is scoped to
// M-Care's chat icon (uses /mcare-logo.png, wired to real chat state like
// listening/thinking/speaking); this one is the site's general brand mark
// (/morales-m-mark.png) living in the marketing hero, with no chat state to
// reflect — two genuinely different contexts, not worth forcing into one
// shared abstraction yet.
//
// Behavior (deliberately scoped to what's cheap and honest — no fabricated
// "AI thinking" claims, this is presentational only):
// - Idle: soft breathing glow (same visual language as LivingOrb.jsx) + eyes
//   drift slowly left/right on their own, biased slightly rightward — an
//   honest, cheap stand-in for "glancing toward" whatever sits to its right
//   (the live journey card), without needing per-element position math.
// - Cursor nearby: eyes smoothly track the mouse within a generous radius.
// - Wakes up ~300ms after mount (fade + scale in) instead of appearing
//   fully-formed — a real "the page just loaded" moment, not a fake one.
// - A single requestAnimationFrame loop owns eye position at all times,
//   blending smoothly between the idle sine-wave drift and cursor-tracking
//   based on recent mouse activity, so the two behaviors hand off cleanly
//   instead of fighting over the DOM.
//
// Not built this pass (kept out deliberately, not silently dropped): a
// click-engagement pulse on "Start Your Journey" — that link navigates via
// React Router immediately, so a ~1s pulse would never actually be seen
// without adding an artificial navigation delay, which wasn't asked for; a
// status dot; mobile touch-follow (mobile gets the idle drift for free,
// since no mousemove ever fires there — exactly what a touch device should
// do per the spec).
//
// Respects prefers-reduced-motion — falls back to a fully static glowing
// mark with fixed eyes, same pattern as LivingOrb.jsx.
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BRAND } from '@/lib/brandTokens';

const GOLD = BRAND.gold;
const EYE_MAX_OFFSET = 3.4; // px — how far an eye can shift off-center
const IDLE_DRIFT_PERIOD_MS = 5200;
const IDLE_BIAS_X = 1.1; // px — idle drift centers slightly rightward
const TRACK_TIMEOUT_MS = 2600; // no mousemove for this long → back to idle drift
const REACT_RADIUS = 460; // px — cursor further than this doesn't pull the eyes

export default function LivingMOrb({ size = 64 }) {
  const orbRef = useRef(null);
  const eyeLRef = useRef(null);
  const eyeRRef = useRef(null);
  const rafRef = useRef(null);
  const currentRef = useRef({ x: 0, y: 0 });
  const lastMouseMoveRef = useRef(0);
  const mousePosRef = useRef(null);
  const startRef = useRef(typeof performance !== 'undefined' ? performance.now() : 0);

  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [awake, setAwake] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setAwake(true), 300);
    return () => clearTimeout(t);
  }, []);

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
  }, [reducedMotion]);

  if (reducedMotion) {
    return (
      <div style={{ width: size, height: size, position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img
          src="/morales-m-mark.png"
          alt="Morales"
          style={{ width: size * 0.72, height: size * 0.72, objectFit: 'contain', filter: `drop-shadow(0 0 10px ${GOLD}70)` }}
        />
      </div>
    );
  }

  return (
    <motion.div
      ref={orbRef}
      initial={{ opacity: 0, scale: 0.82 }}
      animate={awake ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.82 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{ width: size, height: size, position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      aria-hidden="true"
    >
      {/* Breathing outer rings — same visual language as M-Care's LivingOrb */}
      {[0, 1].map((i) => (
        <motion.div
          key={i}
          style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1px solid ${GOLD}` }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.22, 0, 0.22] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: i * 1.3 }}
        />
      ))}

      {/* Glass core */}
      <motion.div
        style={{
          position: 'absolute', width: '100%', height: '100%', borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 32%, rgba(255,255,255,0.20), rgba(10,20,28,0.92))',
          backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow: `0 0 ${Math.round(size * 0.55)}px ${GOLD}4d, inset 0 1px 0 rgba(255,255,255,0.14)`,
        }}
        animate={{ scale: [1, 1.035, 1] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Embossed M watermark */}
      <img
        src="/morales-m-mark.png"
        alt="Morales"
        style={{ width: size * 0.7, height: size * 0.7, objectFit: 'contain', position: 'relative', zIndex: 1, opacity: 0.4 }}
      />

      {/* Eyes — two small independently-tracked dots */}
      <div style={{ position: 'absolute', top: '38%', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: size * 0.16, zIndex: 2 }}>
        <span
          ref={eyeLRef}
          style={{
            width: size * 0.09, height: size * 0.09, borderRadius: '50%',
            background: `radial-gradient(circle at 35% 30%, #fff, ${GOLD})`,
            boxShadow: `0 0 4px ${GOLD}aa`, display: 'block',
          }}
        />
        <span
          ref={eyeRRef}
          style={{
            width: size * 0.09, height: size * 0.09, borderRadius: '50%',
            background: `radial-gradient(circle at 35% 30%, #fff, ${GOLD})`,
            boxShadow: `0 0 4px ${GOLD}aa`, display: 'block',
          }}
        />
      </div>
    </motion.div>
  );
}
