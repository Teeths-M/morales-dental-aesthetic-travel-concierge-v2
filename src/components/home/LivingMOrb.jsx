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
import RoboOrb3D from '@/components/mcare/RoboOrb3D';

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

  // The 4D robotic-head Three.js orb handles its own eyes, glow, rings,
  // particles, and parallax tilt internally (including a reduced-motion
  // static fallback) — no separate blink/eyes markup needed here anymore.


  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.82 }}
      animate={awake ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.82 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{ width: size, height: size, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      aria-hidden="true"
    >
      <RoboOrb3D state="idle" size={size} flashToken={0} />
    </motion.div>
  );
}