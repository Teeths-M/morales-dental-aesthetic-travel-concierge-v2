// LivingMOrb — the hero's "living agent" presence. A separate component
// from M-Care's own src/components/mcare/LivingOrb.jsx on purpose: that one
// is wired to real chat state (listening/thinking/speaking); this one is
// the site's general brand mark living in the marketing hero, with no chat
// state to reflect — genuinely different contexts, not worth merging into
// one component. Both share the same face (blinking/winking gold eyes on a
// dark glass orb, via src/lib/useBlinkState.js) so the two "living M"
// surfaces read as one identity.
//
// 2026-08-12, twice: first shipped with cursor-tracking eyes (removed same
// day — read as unsettling). Then shipped emblem-only, no eyes at all
// (matching LivingOrb.jsx's own reversal). Portia then explicitly asked for
// the opposite of that second version too — a playful, friendly face (eyes
// that blink/wink), no M glyph at all — so both orbs share that design now.
//
// Behavior (deliberately scoped to what's cheap and honest — no fabricated
// "AI thinking" claims, this is presentational only): soft breathing glow,
// occasional blink/wink via the shared hook, and wakes up ~300ms after
// mount (fade + scale in) instead of appearing fully-formed.
//
// Respects prefers-reduced-motion — falls back to a fully static orb with
// open (non-blinking) eyes, same pattern as LivingOrb.jsx.
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BRAND } from '@/lib/brandTokens';
import { useBlinkState } from '@/lib/useBlinkState';

const GOLD = BRAND.gold;

export default function LivingMOrb({ size = 64 }) {
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

  const blinkState = useBlinkState(reducedMotion);
  const eyeW = size * 0.16;
  const eyeH = size * 0.09;
  const leftShut = blinkState === 'blink' || blinkState === 'wink-left';
  const rightShut = blinkState === 'blink' || blinkState === 'wink-right';

  const eyes = (
    <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: size * 0.14, zIndex: 2 }}>
      <motion.span
        style={{ width: eyeW, height: eyeH, borderRadius: 999, background: GOLD, boxShadow: `0 0 4px ${GOLD}aa`, display: 'block', transformOrigin: 'center' }}
        animate={{ scaleY: leftShut ? 0.12 : 1 }}
        transition={{ duration: 0.11, ease: 'easeInOut' }}
      />
      <motion.span
        style={{ width: eyeW, height: eyeH, borderRadius: 999, background: GOLD, boxShadow: `0 0 4px ${GOLD}aa`, display: 'block', transformOrigin: 'center' }}
        animate={{ scaleY: rightShut ? 0.12 : 1 }}
        transition={{ duration: 0.11, ease: 'easeInOut' }}
      />
    </div>
  );

  if (reducedMotion) {
    return (
      <div style={{ width: size, height: size, position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            position: 'absolute', width: '100%', height: '100%', borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 32%, rgba(255,255,255,0.20), rgba(10,20,28,0.92))',
            border: '1px solid rgba(255,255,255,0.14)',
            boxShadow: `0 0 ${Math.round(size * 0.55)}px ${GOLD}4d, inset 0 1px 0 rgba(255,255,255,0.14)`,
          }}
        />
        {eyes}
      </div>
    );
  }

  return (
    <motion.div
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

      {eyes}
    </motion.div>
  );
}