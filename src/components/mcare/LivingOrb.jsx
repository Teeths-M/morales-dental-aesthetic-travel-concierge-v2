// @ts-nocheck — pre-existing arithmetic/symbol type gaps, matches sibling mcare components
/**
 * LivingOrb — M-Safe's visual presence. CSS + framer-motion, no new
 * dependency, no static "face" image — a pearl-metallic shell around a
 * dark glass core, a gold M badge, and a gold energy-ring halo that
 * brightens per state. A `state` prop swaps the animation config, never
 * the DOM shape, across eight honest states:
 *
 * - idle:           very subtle breathing — nothing is happening.
 * - listening:      tight, fast pulse while the mic is actually recording
 *                    (Conversational Mode) — wired to the real listening
 *                    signal, not simulated.
 * - thinking:       a slightly brighter glow plus three small gold points
 *                    drifting around the ring — the agent is composing a
 *                    reply, no tool call yet. Deliberately not a spinning
 *                    sweep (reads as a generic loading spinner) — three
 *                    discrete pulsing points instead.
 * - tool_executing: the same three-point motif, faster and brighter — a
 *                    real backend tool call is in flight right now (wired
 *                    to MCareOrb's `runningTool`, the tool's own real
 *                    status field). Never shown without a real tool call
 *                    actually running.
 * - speaking:       a brighter, quicker ripple for a short honest window
 *                    right after a new assistant message lands — tied to
 *                    a real state transition, never a fabricated
 *                    audio-reactive claim (no real TTS signal exists to
 *                    honestly react to).
 * - acting:         deliberate, layered background work — more rings,
 *                    slower cadence, brighter glow, plus a small
 *                    persistent gold notification point. Wired to
 *                    hasUnseenJourneyEvent in MCareOrb — a real
 *                    JourneyEvent a backend function just wrote — never a
 *                    fabricated animation.
 * - alert:          a controlled amber ring around the same shell shape —
 *                    an active Safe-T4life safety block exists in the
 *                    current conversation. Never a different icon, never
 *                    fast/panicked pulsing.
 * - offline:        a deliberately muted, restrained ring — wired to
 *                    MCareOrb's real `isOnline` (navigator.onLine) signal.
 *                    Same orb shape, never an error icon.
 *
 * Respects prefers-reduced-motion — falls back to a fully static version
 * of the same shell/badge/halo, no rings, no dots, no tilt.
 *
 * flashToken (Conversational Mode) is a one-shot addition on top of the
 * looping states above — a brief gold ring pulse confirming a real
 * barge-in just happened. An incrementing counter, not a boolean, so it
 * replays via a React key remount on every change.
 *
 * Desktop-only pointer-tilt parallax (a few restrained degrees of
 * rotateX/rotateY, springing back on mouse-leave) is gated behind
 * `(hover: hover) and (pointer: fine)` so it's inert on touch devices —
 * mobile device-motion/gyroscope parallax is a deliberate, separate,
 * device-tested follow-up, not built here.
 *
 * 2026-08-23: the face (blink/wink gold eyes) shipped 2026-08-12 is
 * removed again, this time for good — explicitly no eyes, no mouth, no
 * face anywhere on this orb. The dark glass-core/gold palette carries
 * over; the M mark is back, but as a small floating badge (not a
 * face-filling watermark, the approach already tried and reversed once).
 * useBlinkState.js itself is untouched — LivingMOrb.jsx (the homepage
 * hero orb, a deliberately separate component) still uses it.
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const GOLD = '#D4AF37';
const AMBER = '#D97706';

const STATE_CONFIG = {
  idle:           { ringCount: 2, duration: 3.6, ringScale: 1.28, ringOpacity: 0.18, coreScale: [1, 1.025, 1], glowAlpha: '45', color: GOLD },
  listening:      { ringCount: 3, duration: 1.1, ringScale: 1.6,  ringOpacity: 0.36, coreScale: [1, 1.1, 1],   glowAlpha: '55', color: GOLD },
  // thinking / tool_executing: the same "small orbital points" motif at two
  // speeds/intensities — thinking is the agent composing a reply, no tool
  // call yet; tool_executing is a real, currently-running backend call
  // (see MCareOrb.jsx's `runningTool`). Faster + brighter reads as "doing
  // something real right now" without needing a different icon shape —
  // the real active_label text next to the orb does the rest of the work.
  thinking:       { ringCount: 2, duration: 2.4, ringScale: 1.4,  ringOpacity: 0.26, coreScale: [1, 1.04, 1],  glowAlpha: '55', color: GOLD, dots: 3, dotOrbitDuration: 2.6 },
  tool_executing: { ringCount: 3, duration: 1.5, ringScale: 1.42, ringOpacity: 0.34, coreScale: [1, 1.06, 1],  glowAlpha: '65', color: GOLD, dots: 3, dotOrbitDuration: 1.5 },
  speaking:       { ringCount: 3, duration: 0.9, ringScale: 1.5,  ringOpacity: 0.38, coreScale: [1, 1.12, 1],  glowAlpha: '55', color: GOLD },
  acting:         { ringCount: 4, duration: 2.6, ringScale: 1.5,  ringOpacity: 0.32, coreScale: [1, 1.04, 1],  glowAlpha: '72', color: GOLD, notifyDot: true },
  alert:          { ringCount: 2, duration: 2.0, ringScale: 1.34, ringOpacity: 0.34, coreScale: [1, 1.035, 1], glowAlpha: '60', color: AMBER },
  offline:        { ringCount: 1, duration: 2.8, ringScale: 1.12, ringOpacity: 0.12, coreScale: [1, 1.015, 1], glowAlpha: '22', color: GOLD },
};

// Pearl-metallic shell + dark glass core, shared by both the animated and
// prefers-reduced-motion branches so the two never visually drift apart.
function Shell({ size, glowAlpha, color }) {
  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', width: '100%', height: '100%', borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.96), rgba(232,227,217,0.55) 42%, rgba(198,193,183,0.32) 72%, rgba(176,171,161,0.22) 100%)',
          border: '1px solid rgba(255,255,255,0.5)',
          boxShadow: `0 0 ${Math.round(size * 0.5)}px ${color}${glowAlpha}, inset 0 1px 1px rgba(255,255,255,0.6)`,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', width: '68%', height: '68%', top: '16%', left: '16%', borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 32%, rgba(48,56,70,0.92), rgba(8,12,18,0.97) 75%)',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.16), inset 0 -3px 8px rgba(0,0,0,0.45)',
        }}
      />
      <img
        src="/morales-m-mark.png"
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position: 'absolute', width: '38%', height: '38%', bottom: '-4%', left: '-4%',
          borderRadius: '50%', padding: '9%', boxSizing: 'border-box', objectFit: 'contain',
          background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.97), rgba(233,224,203,0.9))',
          border: `1px solid ${GOLD}88`,
          boxShadow: '0 2px 5px rgba(0,0,0,0.4), 0 0 7px rgba(212,175,55,0.4)',
        }}
      />
    </>
  );
}

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

  const [canTilt] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  );
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const handleMouseMove = (e) => {
    if (!canTilt || reducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: py * -10, ry: px * 10 });
  };
  const handleMouseLeave = () => setTilt({ rx: 0, ry: 0 });

  if (reducedMotion) {
    return (
      <div style={{ width: size, height: size, position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Shell size={size} glowAlpha={STATE_CONFIG[state]?.glowAlpha || STATE_CONFIG.idle.glowAlpha} color={STATE_CONFIG[state]?.color || GOLD} />
      </div>
    );
  }

  const cfg = STATE_CONFIG[state] || STATE_CONFIG.idle;
  const dotRadius = size * 0.42;
  const dotSize = size * 0.09;

  return (
    <motion.div
      style={{ width: size, height: size, position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: 500 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ rotateX: tilt.rx, rotateY: tilt.ry }}
      transition={{ type: 'spring', stiffness: 160, damping: 16 }}
    >
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
          style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1px solid ${cfg.color}` }}
          animate={{ scale: [1, cfg.ringScale, 1], opacity: [cfg.ringOpacity, 0, cfg.ringOpacity] }}
          transition={{ duration: cfg.duration, repeat: Infinity, ease: 'easeInOut', delay: i * (cfg.duration / cfg.ringCount / 1.4) }}
        />
      ))}

      {cfg.dots > 0 && (
        <motion.div
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          animate={{ rotate: 360 }}
          transition={{ duration: cfg.dotOrbitDuration, repeat: Infinity, ease: 'linear' }}
        >
          {Array.from({ length: cfg.dots }).map((_, i) => {
            const angle = (360 / cfg.dots) * i;
            return (
              <motion.span
                key={i}
                style={{
                  position: 'absolute', top: '50%', left: '50%', width: dotSize, height: dotSize,
                  marginTop: -dotSize / 2, marginLeft: -dotSize / 2, borderRadius: '50%',
                  background: cfg.color, boxShadow: `0 0 4px ${cfg.color}`,
                  transform: `rotate(${angle}deg) translate(${dotRadius}px) rotate(-${angle}deg)`,
                }}
                animate={{ opacity: [0.35, 1, 0.35] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
              />
            );
          })}
        </motion.div>
      )}

      <motion.div
        aria-hidden="true"
        style={{ position: 'absolute', width: '100%', height: '100%' }}
        animate={{ scale: cfg.coreScale }}
        transition={{ duration: cfg.duration, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Shell size={size} glowAlpha={cfg.glowAlpha} color={cfg.color} />
      </motion.div>

      {cfg.notifyDot && (
        <motion.span
          aria-hidden="true"
          style={{ position: 'absolute', top: '2%', right: '2%', width: size * 0.14, height: size * 0.14, borderRadius: '50%', background: GOLD, border: '2px solid rgba(10,20,28,0.9)', zIndex: 3 }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </motion.div>
  );
}
