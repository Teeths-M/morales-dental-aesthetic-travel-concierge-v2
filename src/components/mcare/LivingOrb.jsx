// @ts-nocheck — pre-existing arithmetic/symbol type gaps, matches sibling mcare components
/**
 * LivingOrb — M-Care's visual presence (Phase 6). Replaces the static
 * gold-glow logo image with a CSS + framer-motion "liquid glass" orb that
 * actually looks alive, the way Siri's orb does — without a new dependency.
 * framer-motion (already used for concentric-ring effects in
 * BeatingHeartTracker.jsx / HeartRingAnimation.jsx) drives layered,
 * staggered rings around a glass core; a `state` prop swaps the animation
 * config, never the DOM shape, between five honest states:
 *
 * - idle:      slow breathing — nothing is happening, matches index.css's
 *              existing m-breathe cadence.
 * - listening: tighter, fast pulse while VoiceInputButton is actually
 *              recording — wired to its real recording state, not simulated.
 * - thinking:  a rotating gold sweep across the core — replaces the old
 *              flat three-dot pulse for exactly the states that already set
 *              `thinking` true in MCareOrb.jsx.
 * - acting:    a slower, layered, brighter glow (no frantic sweep) shown
 *              the moment an autonomous backend action lands a JourneyEvent
 *              the user hasn't seen yet — M-Care did something on its own
 *              (rerouted a no-show driver, fired a milestone) and the orb
 *              confirms it without the user ever sending a message.
 * - speaking:  a brighter, quicker ripple for a short honest window right
 *              after a new assistant message lands — approximates "M is
 *              replying" the same way the app's thinkingStatus narration is
 *              honest: tied to a real state transition, never a fabricated
 *              audio-reactive claim (there's no real TTS signal to react to).
 * - error:     a deliberately muted, restrained ring — wired to MCareOrb's
 *              real `isOnline` (navigator.onLine) signal, not a fabricated
 *              status. Same orb shape, never a different icon.
 *
 * Respects prefers-reduced-motion — falls back to today's static glow.
 *
 * flashToken (Conversational Mode) is a one-shot addition on top of the
 * looping states above, not a STATE_CONFIG entry of its own — it's a brief
 * ring pulse confirming a real barge-in just happened (the user's own voice
 * stopped M-Care mid-reply), never a looping/ambient effect. Any change to
 * flashToken (an incrementing counter, not a boolean) replays it via a React
 * key remount, so two barge-ins in a row each get their own flash even if
 * the previous one hasn't finished fading.
 *
 * 2026-08-12, twice: first removed eye-dots added earlier the same day
 * (Portia's live test read them as a face). Then, looking at the resulting
 * emblem-only orb next to her original reference image, she explicitly
 * reversed that call — asked for a friendly, playful face (eyes that blink
 * and occasionally wink) with the M mark removed entirely, not the emblem.
 * Eyes are back, the M glyph is gone; the dark glass-core/gold palette is
 * kept (this app's brand language everywhere else), and blink/wink timing
 * comes from the shared src/lib/useBlinkState.js hook (also used by the
 * homepage's LivingMOrb) rather than duplicated per component. No mouth —
 * "talking" is read as the existing real `speaking` ring state below, not a
 * literal mouth shape.
 */
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useBlinkState } from '@/lib/useBlinkState';

const GOLD = '#D4AF37';

const STATE_CONFIG = {
  idle:      { ringCount: 2, duration: 3.5, ringScale: 1.32, ringOpacity: 0.20, coreScale: [1, 1.03, 1], sweep: false, glowAlpha: '55' },
  listening: { ringCount: 3, duration: 1.1, ringScale: 1.6,  ringOpacity: 0.36, coreScale: [1, 1.1, 1],  sweep: false, glowAlpha: '55' },
  thinking:  { ringCount: 3, duration: 1.7, ringScale: 1.45, ringOpacity: 0.30, coreScale: [1, 1.05, 1], sweep: true,  glowAlpha: '55' },
  speaking:  { ringCount: 3, duration: 0.9, ringScale: 1.5,  ringOpacity: 0.38, coreScale: [1, 1.12, 1], sweep: false, glowAlpha: '55' },
  // acting: deliberate, layered background work — NOT the frantic LLM
  // sweep of `thinking`. More rings, slower cadence, brighter glow, no
  // conic sweep: reads as "M-Care is steadily doing something on its own
  // in the background" (an autonomous reroute, a milestone it fired). Wired
  // to hasUnseenJourneyEvent in MCareOrb — a real JourneyEvent a backend
  // function just wrote — never a fabricated animation.
  acting:    { ringCount: 4, duration: 2.6, ringScale: 1.5,  ringOpacity: 0.32, coreScale: [1, 1.04, 1], sweep: false, glowAlpha: '72' },
  error:     { ringCount: 1, duration: 2.8, ringScale: 1.12, ringOpacity: 0.12, coreScale: [1, 1.015, 1], sweep: false, glowAlpha: '28' },
};

export default function LivingOrb({ state = 'idle', size = 44, flashToken = 0 }) {
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
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
            background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.22), rgba(10,20,28,0.9))',
            border: '1px solid rgba(255,255,255,0.14)',
            boxShadow: `0 0 ${Math.round(size * 0.5)}px ${GOLD}55, inset 0 1px 0 rgba(255,255,255,0.14)`,
          }}
        />
        {eyes}
      </div>
    );
  }

  const cfg = STATE_CONFIG[state] || STATE_CONFIG.idle;

  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {flashToken > 0 && (
        <motion.div
          key={flashToken}
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${GOLD}`, pointerEvents: 'none' }}
          initial={{ opacity: 0.9, scale: 1 }}
          animate={{ opacity: 0, scale: 1.9 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      )}
      {Array.from({ length: cfg.ringCount }).map((_, i) => (
        <motion.div
          key={i}
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1px solid ${GOLD}` }}
          animate={{ scale: [1, cfg.ringScale, 1], opacity: [cfg.ringOpacity, 0, cfg.ringOpacity] }}
          transition={{ duration: cfg.duration, repeat: Infinity, ease: 'easeInOut', delay: i * (cfg.duration / cfg.ringCount / 1.4) }}
        />
      ))}

      {cfg.sweep && (
        <motion.div
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `conic-gradient(from 0deg, transparent, ${GOLD}77, transparent 55%)`, mixBlendMode: 'screen', pointerEvents: 'none' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
        />
      )}

      <motion.div
        aria-hidden="true"
        style={{
          position: 'absolute', width: '100%', height: '100%', borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.22), rgba(10,20,28,0.9))',
          backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow: `0 0 ${Math.round(size * 0.5)}px ${GOLD}${cfg.glowAlpha}, inset 0 1px 0 rgba(255,255,255,0.14)`,
        }}
        animate={{ scale: cfg.coreScale }}
        transition={{ duration: cfg.duration, repeat: Infinity, ease: 'easeInOut' }}
      />

      {eyes}
    </div>
  );
}