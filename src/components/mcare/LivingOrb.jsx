// @ts-nocheck — pre-existing arithmetic/symbol type gaps, matches sibling mcare components
/**
 * LivingOrb — M-Safe's visual presence. The robot itself is real inline SVG
 * (`RobotAvatar.jsx`) — a pearl-metallic shell, a gold bezel framing a dark
 * visor, two glowing gold "eye" capsules, and a small gold "M" badge on the
 * shell. This file owns everything around that: state-driven halo rings,
 * parallax tilt, the flash ring, the notify dot, and a size≥80-only
 * atmosphere (base glow + a gold particle trail). A `state` prop swaps the
 * animation config, never the DOM shape, across eight honest states:
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
 * of the same shell/core/halo, no rings, no dots, no particles, no tilt.
 *
 * flashToken (Conversational Mode) is a one-shot addition on top of the
 * looping states above — a brief gold ring pulse confirming a real
 * barge-in just happened. An incrementing counter, not a boolean, so it
 * replays via a React key remount on every change.
 *
 * Parallax: desktop pointer-tilt (a few restrained degrees of
 * rotateX/rotateY, springing back on mouse-leave), gated behind
 * `(hover: hover) and (pointer: fine)`. A second, independent source
 * feeds the same tilt state from `deviceorientation` — strictly
 * best-effort: skipped entirely on iOS 13+ (which gates behind an
 * explicit permission dialog we never proactively trigger just for
 * opening a chat panel), calibrated from the first reading as a neutral
 * baseline rather than a hardcoded angle, and clamped to the same small
 * range as the pointer version.
 *
 * At size >= 80 (the header's hero instance only — not the 44px launcher
 * or the 28-32px typing/greeting instances) the orb also gets a soft
 * state-tinted base glow plus a couple of thin ring outlines beneath it (a
 * glowing "landing pad"), and a short arc of restrained, independently-
 * fading gold particles tracing a comet-trail sweep — both omitted under
 * reduced motion (the base glow stays, static; particles don't).
 *
 * 2026-08-23, real history worth keeping honest: the face (blink/wink gold
 * eyes) shipped 2026-08-12, was removed for a no-face design, came back as
 * a floating M badge, moved inside the core, tried a visor band, reverted
 * to faceless again once a real Three.js hero orb (RoboOrb3D.jsx) landed
 * with an explicit "FACELESS by design" stance, then got real two-eye/
 * side-badge geometry once Portia supplied the actual target reference
 * image directly. That WebGL scene is now retired — three straight rounds
 * of tuning it each produced a real, visible defect (a bare ring around a
 * blank disc, a uniform amber wash-out, then "looks like the sun"), and
 * this checkout has no way to render WebGL to catch any of that before
 * Portia did. `RobotAvatar.jsx` (real inline SVG, deterministic markup, no
 * rendering pipeline to get wrong unseen) now renders the robot at every
 * size — 28px/44px/104px all show the same real design, just scaled; fine
 * detail like the badge letter naturally recedes at 28px, which is
 * expected. `Shell` below is a thin wrapper around it, keeping this file's
 * own state-driven halo/tilt/atmosphere machinery unchanged.
 * useBlinkState.js itself is untouched — LivingMOrb.jsx (the homepage
 * hero orb, a deliberately separate component) uses RobotAvatar too, but
 * without this file's own ring/tilt system (matches its own narrower,
 * presentational-only scope).
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import RobotAvatar from '@/components/mcare/RobotAvatar';

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

// Fixed positions (percent of the orb's own box) tracing a short arc around
// the lower-left of the shell — a comet-trail sweep, matching the reference
// image's visible gold trail region, not a full-halo scatter. Used only for
// the restrained particle accent at size >= 80. A handful of static
// positions, not a particle system: each dot independently fades in/out on
// its own slow timer.
const PARTICLE_POSITIONS = [
  { top: '58%', left: '-6%' },
  { top: '74%', left: '2%' },
  { top: '88%', left: '16%' },
  { top: '96%', left: '34%' },
  { top: '98%', left: '54%' },
  { top: '92%', left: '72%' },
];

// Thin wrapper around the real robot (RobotAvatar.jsx, inline SVG) — kept
// as its own function so both call sites below (animated + reduced-motion)
// stay simple, and so a future visual change only ever touches
// RobotAvatar.jsx itself, never this file's state/tilt/atmosphere logic.
function Shell({ size, glowAlpha, color, dots = 0, animated = true }) {
  return <RobotAvatar size={size} color={color} glowAlpha={glowAlpha} dots={dots} animated={animated} />;
}

// Restrained atmosphere for the large (header) instance only — a soft
// state-tinted glow beneath the orb (a "landing pad," with two thin
// concentric ring outlines echoing the reference image's visible rings),
// plus a short comet-trail arc of independently-fading gold particles.
// Never rendered below size 80 so the small launcher/typing instances stay
// clean.
function Atmosphere({ color, animated }) {
  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', width: '130%', height: '34%', bottom: '-10%', left: '-15%',
          borderRadius: '50%', background: `radial-gradient(ellipse at center, ${color}33, transparent 72%)`,
          filter: 'blur(6px)', zIndex: -1, pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', width: '112%', height: '26%', bottom: '-6%', left: '-6%',
          borderRadius: '50%', border: `1px solid ${color}55`, filter: 'blur(1.5px)', zIndex: -1, pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', width: '96%', height: '20%', bottom: '-2%', left: '2%',
          borderRadius: '50%', border: `1px solid ${color}40`, filter: 'blur(1px)', zIndex: -1, pointerEvents: 'none',
        }}
      />
      {animated && PARTICLE_POSITIONS.map((p, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          style={{ position: 'absolute', top: p.top, left: p.left, width: 3, height: 3, borderRadius: '50%', background: GOLD, pointerEvents: 'none' }}
          animate={{ opacity: [0.12, 0.55, 0.12] }}
          transition={{ duration: 2.4 + i * 0.3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
        />
      ))}
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

  // Best-effort device-motion tilt — a second, independent source feeding
  // the same `tilt` state as the pointer handler above. Deliberately
  // skipped wherever a proactive permission prompt would be needed (iOS
  // 13+'s DeviceOrientationEvent.requestPermission gate) — never adds an
  // unprompted "Motion & Orientation Access" dialog just for opening a
  // chat panel. Calibrates from the first reading as a neutral baseline
  // (a phone's natural resting beta/gamma varies by how it's held) rather
  // than assuming a fixed angle.
  const baselineRef = useRef(null);
  useEffect(() => {
    if (reducedMotion || typeof window === 'undefined' || !window.DeviceOrientationEvent) return;
    if (typeof DeviceOrientationEvent.requestPermission === 'function') return;
    const handler = (e) => {
      const beta = typeof e.beta === 'number' ? e.beta : null;
      const gamma = typeof e.gamma === 'number' ? e.gamma : null;
      if (beta === null || gamma === null) return;
      if (!baselineRef.current) {
        baselineRef.current = { beta, gamma };
        return;
      }
      const clamp = (v, max) => Math.max(-max, Math.min(max, v));
      setTilt({
        rx: clamp((beta - baselineRef.current.beta) * -0.4, 8),
        ry: clamp((gamma - baselineRef.current.gamma) * 0.4, 8),
      });
    };
    window.addEventListener('deviceorientation', handler);
    return () => window.removeEventListener('deviceorientation', handler);
  }, [reducedMotion]);

  if (reducedMotion) {
    const cfgStatic = STATE_CONFIG[state] || STATE_CONFIG.idle;
    return (
      <div style={{ width: size, height: size, position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {size >= 80 && <Atmosphere color={cfgStatic.color} animated={false} />}
        <Shell size={size} glowAlpha={cfgStatic.glowAlpha} color={cfgStatic.color} animated={false} />
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
      {size >= 80 && <Atmosphere color={cfg.color} animated />}

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

      <motion.div
        aria-hidden="true"
        style={{ position: 'absolute', width: '100%', height: '100%' }}
        animate={{ scale: cfg.coreScale }}
        transition={{ duration: cfg.duration, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Shell size={size} glowAlpha={cfg.glowAlpha} color={cfg.color} dots={cfg.dots || 0} />
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