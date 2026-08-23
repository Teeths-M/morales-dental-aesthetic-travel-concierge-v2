// LivingMOrb — the hero's "living agent" presence. A separate component
// from M-Care's own src/components/mcare/LivingOrb.jsx on purpose: that one
// is wired to real chat state (listening/thinking/speaking) with its own
// halo-ring/tilt/atmosphere system; this one is the site's general brand
// mark living in the marketing hero, with no chat state to reflect — a
// much narrower, presentational-only scope, not worth merging into one
// component. Both render the same robot (RobotAvatarImage.jsx, Portia's
// own real generated 3D-render photo) so the two "living M" surfaces read
// as one identity.
//
// 2026-08-23, twice: first RobotAvatar.jsx (inline SVG) replaced
// RoboOrb3D.jsx (a Three.js scene, retired after three straight rounds of
// un-verifiable-from-this-checkout WebGL tuning each produced a real visual
// defect) — deterministic SVG markup instead of a lighting/bloom pipeline.
// Two rounds later, Portia supplied the actual generated image asset
// (public/robot-avatar.png) and asked for the real render instead of a
// drawn approximation — RobotAvatarImage.jsx renders that now, falling
// back to the SVG only if the image file is ever missing.
//
// Behavior (deliberately scoped to what's cheap and honest — no fabricated
// "AI thinking" claims, this is presentational only): RobotAvatar's own
// built-in eye-glow pulse (when not reduced-motion) is enough "alive" cue
// for this component's narrow scope, and wakes up ~300ms after mount (fade
// + scale in) instead of appearing fully-formed.
//
// Respects prefers-reduced-motion — RobotAvatar's own `animated` prop
// falls back to a fully static render, same pattern as LivingOrb.jsx.
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BRAND } from '@/lib/brandTokens';
import RobotAvatarImage from '@/components/mcare/RobotAvatarImage';

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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.82 }}
      animate={awake ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.82 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{ width: size, height: size, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      aria-hidden="true"
    >
      <RobotAvatarImage size={size} color={GOLD} glowAlpha="45" animated={!reducedMotion} />
    </motion.div>
  );
}