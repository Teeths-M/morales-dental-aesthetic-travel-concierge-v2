// LivingMOrb — the hero's "living agent" presence (buildathon polish, per
// Portia's Living-M-Orb spec). A separate component from M-Care's own
// src/components/mcare/LivingOrb.jsx on purpose: that one is wired to real
// chat state (listening/thinking/speaking); this one is the site's general
// brand mark living in the marketing hero, with no chat state to reflect —
// genuinely different contexts, not worth merging into one component. Both
// now render the same /morales-m-mark.png glyph and share their eye-tracking
// behavior via src/lib/useLivingEyes.js, so the two "living M" surfaces move
// identically without duplicating the requestAnimationFrame logic twice.
//
// Behavior (deliberately scoped to what's cheap and honest — no fabricated
// "AI thinking" claims, this is presentational only):
// - Idle: soft breathing glow + eyes drift slowly left/right on their own,
//   biased slightly rightward — an honest, cheap stand-in for "glancing
//   toward" whatever sits to its right (the live journey card), without
//   needing per-element position math.
// - Cursor nearby: eyes smoothly track the mouse within a generous radius.
// - Wakes up ~300ms after mount (fade + scale in) instead of appearing
//   fully-formed — a real "the page just loaded" moment, not a fake one.
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
import { useLivingEyes } from '@/lib/useLivingEyes';

const GOLD = BRAND.gold;

export default function LivingMOrb({ size = 64 }) {
  const orbRef = useRef(null);
  const eyeLRef = useRef(null);
  const eyeRRef = useRef(null);

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

  useLivingEyes({ orbRef, eyeLRef, eyeRRef, reducedMotion });

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
