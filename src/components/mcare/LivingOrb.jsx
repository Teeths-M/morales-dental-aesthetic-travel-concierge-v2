// @ts-nocheck — pre-existing arithmetic/symbol type gaps, matches sibling mcare components
/**
 * LivingOrb — M-Safe's visual presence. CSS + framer-motion, no new
 * dependency, no static "face" image — a pearl-metallic shell around a
 * dark glass core, a gold M emblem integrated into the core itself, and a
 * gold energy-ring halo that brightens per state. A `state` prop swaps
 * the animation config, never the DOM shape, across eight honest states:
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
 * state-tinted base glow beneath it and a handful of restrained,
 * independently-fading gold particles in the halo — both omitted under
 * reduced motion (the base glow stays, static; particles don't).
 *
 * 2026-08-23, three passes: the face (blink/wink gold eyes) shipped
 * 2026-08-12 is removed for good — no eyes, no mouth, no face anywhere on
 * this orb. The M mark first came back as a floating badge overlapping
 * the shell; Portia's explicit correction — "the logo belongs INSIDE the
 * system," not a sticker — moved it to be centered and backlit inside the
 * dark core itself, the same asset, no new image generated either time.
 * useBlinkState.js itself is untouched — LivingMOrb.jsx (the homepage
 * hero orb, a deliberately separate component) still uses it.
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import RoboOrb3D from '@/components/mcare/RoboOrb3D';

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

// Fixed positions (percent of the orb's own box) scattered around the halo
// zone, roughly ringing the shell — used only for the restrained particle
// accent at size >= 80. A handful of static positions, not a particle
// system: each dot independently fades in/out on its own slow timer.
const PARTICLE_POSITIONS = [
  { top: '0%', left: '48%' },
  { top: '22%', left: '96%' },
  { top: '78%', left: '92%' },
  { top: '96%', left: '58%' },
  { top: '70%', left: '2%' },
  { top: '14%', left: '6%' },
];

// Pearl-metallic shell + dark glass core with the M emblem integrated
// into the core itself, shared by both the animated and
// prefers-reduced-motion branches so the two never visually drift apart.
//
// 2026-08-23 fixes: (1) the shell's gradient used semi-transparent rgba()
// stops fading toward 0 alpha at the edge — over this app's dark
// backgrounds that blended into gray instead of reading as an opaque
// pearl sphere (confirmed against a live screenshot). Opaque hex stops
// fix that for good. (2) the M mark used to be a small badge floating at
// the shell's bottom-left edge, its own circular background/border — per
// Portia's explicit correction ("the logo belongs INSIDE the system, not
// a sticker"), it's now centered inside the dark core, backlit by a soft
// glow that tints with the orb's current state color.
function Shell({ size, glowAlpha, color }) {
  return (
    <>
      {/* Outer pearl-metallic shell — fully opaque, never blends with the background */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', width: '100%', height: '100%', borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 24%, #ffffff 0%, #f5f1e8 38%, #d9d3c4 68%, #b8b2a0 100%)',
          boxShadow: `0 0 ${Math.round(size * 0.5)}px ${color}${glowAlpha}, inset 0 1px 1px rgba(255,255,255,0.9)`,
        }}
      />
      {/* Thin rim-light ring — light catching the edge of the sphere */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', width: '100%', height: '100%', borderRadius: '50%',
          border: '1.5px solid rgba(255,255,255,0.85)', boxShadow: '0 0 6px rgba(255,255,255,0.55)',
        }}
      />
      {/* Specular highlight — a distinct glossy pop, not baked into the base gradient */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', width: '30%', height: '20%', top: '13%', left: '19%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.95), rgba(255,255,255,0) 72%)',
          filter: 'blur(1px)',
        }}
      />
      {/* Dark glass core — inset to 60%/20% so the pearl rim stays clearly
          visible. A flex container so the M emblem below sits centered
          inside it, not floating off to one side. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', width: '60%', height: '60%', top: '20%', left: '20%', borderRadius: '50%',
          background: 'radial-gradient(circle at 32% 28%, rgba(56,64,82,0.95), rgba(6,10,16,0.98) 78%)',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.16), inset 0 -3px 8px rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}
      >
        {/* Soft backlight glow behind the M — tints with the current state
            color (e.g. amber during `alert`), the same signal driving the
            halo rings, so the emblem itself reads as part of the system's
            live state, not a static sticker. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', width: '72%', height: '72%', borderRadius: '50%',
            background: `radial-gradient(circle, ${color}55, transparent 70%)`,
            filter: 'blur(2px)',
          }}
        />
        {/* One small, asymmetric gloss highlight — deliberately a single
            off-center shape, never a symmetric pair, so it reads as glossy
            glass, not eyes. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', width: '28%', height: '13%', top: '18%', left: '20%', borderRadius: '50%',
            background: 'rgba(255,255,255,0.20)', filter: 'blur(2px)',
          }}
        />
        <img
          src="/morales-m-mark.png"
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            position: 'relative', width: '46%', height: '46%', objectFit: 'contain',
            filter: `drop-shadow(0 0 4px ${color}cc)`, opacity: 0.96,
          }}
        />
      </div>
    </>
  );
}

// Restrained atmosphere for the large (header) instance only — a soft
// state-tinted glow beneath the orb and a handful of independently-fading
// gold particles in the halo. Never rendered below size 80 so the small
// launcher/typing instances stay clean.
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

  // Hero-size instances render the real 4D Three.js robotic head — the small
  // 28px/44px chat instances stay on the lightweight CSS orb below.
  if (size >= 80) {
    return <RoboOrb3D state={state} size={size} flashToken={flashToken} />;
  }

  if (reducedMotion) {
    const cfgStatic = STATE_CONFIG[state] || STATE_CONFIG.idle;
    return (
      <div style={{ width: size, height: size, position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {size >= 80 && <Atmosphere color={cfgStatic.color} animated={false} />}
        <Shell size={size} glowAlpha={cfgStatic.glowAlpha} color={cfgStatic.color} />
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