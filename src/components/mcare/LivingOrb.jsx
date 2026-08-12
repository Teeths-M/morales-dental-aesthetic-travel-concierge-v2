// @ts-nocheck — pre-existing arithmetic/symbol type gaps, matches sibling mcare components
/**
 * LivingOrb — M-Care's visual presence (Phase 6). Replaces the static
 * gold-glow logo image with a CSS + framer-motion "liquid glass" orb that
 * actually looks alive, the way Siri's orb does — without a new dependency.
 * framer-motion (already used for concentric-ring effects in
 * BeatingHeartTracker.jsx / HeartRingAnimation.jsx) drives layered,
 * staggered rings around a glass core; a `state` prop swaps the animation
 * config, never the DOM shape, between four honest states:
 *
 * - idle:      slow breathing — nothing is happening, matches index.css's
 *              existing m-breathe cadence.
 * - listening: tighter, faster pulse while VoiceInputButton is actually
 *              recording — wired to its real recording state, not simulated.
 * - thinking:  a rotating gold sweep across the core — replaces the old
 *              flat three-dot pulse for exactly the states that already set
 *              `thinking` true in MCareOrb.jsx.
 * - speaking:  a brighter, quicker ripple for a short honest window right
 *              after a new assistant message lands — approximates "M is
 *              replying" the same way the app's thinkingStatus narration is
 *              honest: tied to a real state transition, never a fabricated
 *              audio-reactive claim (there's no real TTS signal to react to).
 *
 * Respects prefers-reduced-motion — falls back to today's static glow.
 *
 * flashToken (Conversational Mode) is a one-shot addition on top of the four
 * looping states above, not a fifth STATE_CONFIG entry — it's a brief ring
 * pulse confirming a real barge-in just happened (the user's own voice
 * stopped M-Care mid-reply), never a looping/ambient effect. Any change to
 * flashToken (an incrementing counter, not a boolean) replays it via a React
 * key remount, so two barge-ins in a row each get their own flash even if
 * the previous one hasn't finished fading.
 *
 * 2026-08-12: swapped the inner mark from /mcare-logo.png (a gold M inside a
 * blue globe/network graphic) to /morales-m-mark.png — the same gold M glyph
 * the homepage's LivingMOrb (src/components/home/LivingMOrb.jsx) uses — plus
 * two small eye-dots, so M-Care's own orb visually matches the hero's living
 * M instead of looking like a different mark. Eye-tracking behavior is
 * shared via src/lib/useLivingEyes.js rather than duplicated. The four
 * STATE_CONFIG ring/glow behaviors below are untouched — those are real,
 * wired to actual voice/tool state, not cosmetic.
 */
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useLivingEyes } from '@/lib/useLivingEyes';

const GOLD = '#D4AF37';

const STATE_CONFIG = {
  idle:      { ringCount: 2, duration: 3.5, ringScale: 1.32, ringOpacity: 0.20, coreScale: [1, 1.03, 1], sweep: false },
  listening: { ringCount: 3, duration: 1.1, ringScale: 1.6,  ringOpacity: 0.36, coreScale: [1, 1.1, 1],  sweep: false },
  thinking:  { ringCount: 3, duration: 1.7, ringScale: 1.45, ringOpacity: 0.30, coreScale: [1, 1.05, 1], sweep: true },
  speaking:  { ringCount: 3, duration: 0.9, ringScale: 1.5,  ringOpacity: 0.38, coreScale: [1, 1.12, 1], sweep: false },
};

export default function LivingOrb({ state = 'idle', size = 44, flashToken = 0 }) {
  const orbRef = useRef(null);
  const eyeLRef = useRef(null);
  const eyeRRef = useRef(null);

  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useLivingEyes({ orbRef, eyeLRef, eyeRRef, reducedMotion });

  if (reducedMotion) {
    return (
      <div style={{ width: size, height: size, position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/morales-m-mark.png" alt="M-Care" style={{ width: size * 0.72, height: size * 0.72, objectFit: 'contain', filter: `drop-shadow(0 0 6px ${GOLD}66)` }} />
      </div>
    );
  }

  const cfg = STATE_CONFIG[state] || STATE_CONFIG.idle;

  return (
    <div ref={orbRef} style={{ width: size, height: size, position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          boxShadow: `0 0 ${Math.round(size * 0.5)}px ${GOLD}55, inset 0 1px 0 rgba(255,255,255,0.14)`,
        }}
        animate={{ scale: cfg.coreScale }}
        transition={{ duration: cfg.duration, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Embossed M watermark — matches the homepage's LivingMOrb */}
      <img src="/morales-m-mark.png" alt="M-Care" style={{ width: size * 0.7, height: size * 0.7, position: 'relative', zIndex: 1, opacity: 0.4 }} />

      {/* Eyes — two small independently-tracked dots, same treatment as LivingMOrb */}
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
    </div>
  );
}
