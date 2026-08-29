// @ts-nocheck — pre-existing arithmetic/symbol type gaps, matches sibling mcare components
/**
 * LivingOrb — M-Safe's visual presence. The robot itself is a real
 * photorealistic 3D-render image (`RobotAvatarImage.jsx`, Portia's own
 * generated asset — `public/robot-avatar.png`), not a drawing — a glossy
 * white spherical shell, a black reflective visor, two glowing amber eyes,
 * a gold visor rim, and a gold "M" earpiece badge. This file owns
 * everything around that: a state-driven concentric ring halo (orbits
 * continuously, see the 2026-08-23 note below — never pulses in place),
 * parallax tilt, the flash ring, the notify dot, and a size≥80-only
 * atmosphere (base glow + a gold particle trail). A `state` prop swaps the
 * animation config, never the DOM shape, across eight honest states:
 *
 * - idle:           very subtle breathing (the core) plus a slow head
 *                    roll and a slow ring orbit — nothing is happening.
 * - listening:      a fast ring orbit while the mic is actually recording
 *                    (Conversational Mode) — wired to the real listening
 *                    signal, not simulated.
 * - thinking:       a faster ring orbit plus the real face-level
 *                    "thinking" overlay (RobotAvatarImage.jsx — the M
 *                    badge glowing red, a restless eye-glance, a faster
 *                    head roll) — the agent is composing a reply, no tool
 *                    call yet.
 * - tool_executing: the same ring motif, faster and brighter — a real
 *                    backend tool call is in flight right now (wired to
 *                    MCareOrb's `runningTool`, the tool's own real status
 *                    field). Never shown without a real tool call actually
 *                    running.
 * - speaking:       a brighter, faster ring orbit for a short honest
 *                    window right after a new assistant message lands —
 *                    tied to a real state transition, never a fabricated
 *                    audio-reactive claim (no real TTS signal exists to
 *                    honestly react to).
 * - acting:         deliberate, layered background work — more rings,
 *                    slower orbit cadence, brighter glow, plus a small
 *                    persistent gold notification point. Wired to
 *                    hasUnseenJourneyEvent in MCareOrb — a real
 *                    JourneyEvent a backend function just wrote — never a
 *                    fabricated animation.
 * - alert:          a controlled amber ring orbit around the same shell
 *                    shape — an active Safe-T4life safety block exists in
 *                    the current conversation. Never a different icon,
 *                    never fast/panicked spinning.
 * - offline:        a deliberately muted, slow ring orbit — wired to
 *                    MCareOrb's real `isOnline` (navigator.onLine) signal.
 *                    Same orb shape, never an error icon.
 *
 * 2026-08-23: the ring halo used to pulse (grow + fade in place, scale/
 * opacity keyframed). Portia found it read as a generic "loading"
 * pulse and asked for the rings to genuinely move around him instead,
 * with the head itself rolling rather than the small idle wobble it had.
 * The ring block below now orbits continuously (reusing `Atmosphere`'s
 * own already-proven rotate-forever technique) — flattened into ellipses
 * (a perfect circle at a fixed size looks identical at any rotation
 * angle, so rotating one would be invisible), alternating spin direction
 * per ring, sized concentrically outward per index. `RobotAvatarImage.jsx`
 * gained a matching `robotHeadRoll` keyframe (±12°, deliberately short of
 * a full 360° — see that file's own comment for why) replacing the old
 * small idle/thinking wobbles.
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
 * side-badge geometry as an inline SVG (`RobotAvatar.jsx`) once Portia
 * supplied a reference image directly — that WebGL scene was retired the
 * same round for producing unverifiable, repeated defects. The SVG lasted
 * two rounds before Portia supplied the actual generated image asset
 * (`public/robot-avatar.png`) and asked for the real render, not a drawn
 * approximation — `RobotAvatarImage.jsx` renders that now, at every size —
 * 28px/44px/104px/220px all show the same real image, just scaled.
 * `RobotAvatar.jsx` (the SVG) is kept only as a defensive fallback if the
 * image file is ever missing, not as the primary design anymore. `Shell`
 * below is a thin wrapper around `RobotAvatarImage`, keeping this file's
 * own state-driven halo/tilt/atmosphere machinery unchanged.
 * useBlinkState.js itself is untouched — LivingMOrb.jsx (the homepage
 * hero orb, a deliberately separate component) uses RobotAvatarImage too,
 * but without this file's own ring/tilt system (matches its own narrower,
 * presentational-only scope).
 *
 * 2026-08-23, "alive AI agent" round (+ same-day hardening pass): a new
 * `activityState` — one of 'idle' / 'listening' / 'thinking' / 'speaking'
 * — is derived here from the real `state` prop (still the full 8-value
 * orbState above, untouched) plus a new `inputFocused` prop, or forced by
 * an `activityOverride` (MCareOrb.jsx's dev-only test buttons), and
 * handed to `Shell`/RobotAvatarImage.jsx to drive its own live-activity
 * overlays (visor dots, an eye-glow pulse, a waveform, head tilt — see
 * that file's doc comment for the visual design, including a 2026-08-23
 * fix where a separate set of 3 particles used to orbit OUTSIDE the whole
 * shell and was removed after Portia flagged it directly). This is a pure
 * mapping of already-real signals, not a second
 * independent computation: speaking/thinking/tool_executing/listening map
 * straight across, and a plain `idle` only reads as `listening` when the
 * caller also reports the chat input has real DOM focus — "the user is
 * about to
 * type" is itself a real, honest signal, not a fabricated one.
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import RobotAvatarImage from '@/components/mcare/RobotAvatarImage';

const GOLD = '#D4AF37';
const AMBER = '#D97706';

// ringOrbitDuration: seconds for one full 360° orbit of the ring halo
// below (see the render block) — added 2026-08-23 when the rings stopped
// pulsing (grow+fade in place) and started continuously orbiting instead,
// per Portia's own direct request. Deliberately NOT reusing `duration`
// for this — that field was hand-tuned for pulse *cadence* (0.9-3.6s),
// and a full 360° every 0.9s would look like a spinning fan blade, not a
// calm orbit. These values preserve the same relative "calmer states
// move slower" ordering `duration` already implied, rescaled to a speed
// that actually reads as an orbit.
const STATE_CONFIG = {
  // idle: bumped to ringCount 3 / ringOpacity 0.22 earlier the same day
  // (2026-08-29) in response to the rings reading as sparse/incomplete at
  // any frozen moment — but a closer side-by-side against a cleaner
  // reference crop showed that overshot: the reference's idle halo is a
  // soft, barely-there ambient glow, not crisp, wide crossing gold lines.
  // Dialed back down toward "very subtle" (matching this state's own
  // top-of-file description) — ringCount back to 2, ringOpacity lower than
  // even the original 0.18, and a slightly slower orbit for a calmer read.
  // The ring shapes' own hug-tightness (the w/h formula below) is untouched
  // — this correction is about brightness/density, not position/size.
  idle:           { ringCount: 2, duration: 3.6, ringOrbitDuration: 20, ringOpacity: 0.12, coreScale: [1, 1.025, 1], glowAlpha: '45', color: GOLD },
  listening:      { ringCount: 3, duration: 1.1, ringOrbitDuration: 8,  ringOpacity: 0.36, coreScale: [1, 1.1, 1],   glowAlpha: '55', color: GOLD },
  // thinking / tool_executing: the same ring cadence at two speeds/
  // intensities — thinking is the agent composing a reply, no tool call
  // yet; tool_executing is a real, currently-running backend call (see
  // MCareOrb.jsx's `runningTool`). Faster + brighter reads as "doing
  // something real right now" without needing a different icon shape —
  // the real active_label text next to the orb does the rest of the work.
  // (The face-level "thinking" overlay — the M badge's red glow, and the
  // head roll's own faster duration — is driven by `activityState`
  // below, which collapses both of these into one look; only the ring
  // orbit speed/brightness still tells them apart.)
  thinking:       { ringCount: 2, duration: 2.4, ringOrbitDuration: 9,  ringOpacity: 0.26, coreScale: [1, 1.04, 1],  glowAlpha: '55', color: GOLD },
  tool_executing: { ringCount: 3, duration: 1.5, ringOrbitDuration: 6,  ringOpacity: 0.34, coreScale: [1, 1.06, 1],  glowAlpha: '65', color: GOLD },
  speaking:       { ringCount: 3, duration: 0.9, ringOrbitDuration: 5,  ringOpacity: 0.38, coreScale: [1, 1.12, 1],  glowAlpha: '55', color: GOLD },
  acting:         { ringCount: 4, duration: 2.6, ringOrbitDuration: 11, ringOpacity: 0.32, coreScale: [1, 1.04, 1],  glowAlpha: '72', color: GOLD, notifyDot: true },
  alert:          { ringCount: 2, duration: 2.0, ringOrbitDuration: 10, ringOpacity: 0.34, coreScale: [1, 1.035, 1], glowAlpha: '60', color: AMBER },
  offline:        { ringCount: 1, duration: 2.8, ringOrbitDuration: 24, ringOpacity: 0.12, coreScale: [1, 1.015, 1], glowAlpha: '22', color: GOLD },
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

// Thin wrapper around the real robot — kept as its own function so both
// call sites below (animated + reduced-motion) stay simple, and so a future
// visual change only ever touches RobotAvatarImage.jsx itself, never this
// file's state/tilt/atmosphere logic. RobotAvatarImage.jsx renders Portia's
// real photorealistic robot image (a genuine alpha-transparent cutout at
// src/assets/m-safe-robot-transparent.webp), falling back to the inline-SVG
// RobotAvatar only if that file is ever missing. `naturalAspect` passes
// through unchanged — see RobotAvatarImage's own doc comment.
function Shell({ size, glowAlpha, color, activityState = 'idle', animated = true, naturalAspect = false, amplitude = null, gazeOverride = null, blinkTrigger = 0 }) {
  return <RobotAvatarImage size={size} color={color} glowAlpha={glowAlpha} activityState={activityState} animated={animated} naturalAspect={naturalAspect} amplitude={amplitude} gazeOverride={gazeOverride} blinkTrigger={blinkTrigger} />;
}

// Restrained atmosphere for the large (header) instance only — a soft
// state-tinted glow beneath the orb (a "landing pad," with two thin
// concentric ring outlines echoing the reference image's visible rings),
// plus a short comet-trail arc of independently-fading gold particles.
// Never rendered below size 80 so the small launcher/typing instances stay
// clean.
function Atmosphere({ color, animated, activityState = 'idle' }) {
  // The hologram spins noticeably faster while thinking — a real,
  // visible "the system is working harder" signal, distinct from the
  // face-level M-badge glow. Every other state keeps the normal slow
  // spin. Still deliberately independent of the per-orbState ring ORBIT
  // speed (`ringOrbitDuration`) in STATE_CONFIG above (e.g. `listening`'s
  // own fast 8s orbit for real active mic capture stays exactly as
  // tuned).
  const fast = activityState === 'thinking';
  const ringADuration = fast ? 6 : 26;
  const ringBDuration = fast ? 8 : 32;
  return (
    <>
      {/* Hologram platform — a wide soft base glow plus three concentric
          ring outlines. 2026-08-29: brightened/sharpened again — a real
          screenshot comparison against the reference image showed this
          reading as a faint background wash rather than a distinct stand
          the robot visibly rests on, so the glow is less blurred and every
          ring's border alpha and the innermost "stand" ring's own weight
          are bumped up, closer to the reference's clearly-separated base. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', width: '150%', height: '38%', bottom: '-12%', left: '-25%',
          borderRadius: '50%', background: `radial-gradient(ellipse at center, ${color}66, transparent 72%)`,
          filter: 'blur(5px)', zIndex: -1, pointerEvents: 'none',
        }}
      />
      {/* 2026-08-29 clip fix (same mechanism as the ring halo above): these
          two rings rotate a flattened ellipse, whose true bounding box can
          reach far past its own resting footprint at ~90/270deg — unclipped,
          that swept straight down past the shell into whatever renders
          right after LivingOrb in normal flow (the capability pills/status
          pill below it), reading as a detached gold "trailing line." Each
          ring now lives inside its own fixed, non-rotating clip box sized
          to its resting width/height/position; the ring still rotates
          freely inside it, just can't escape past that footprint anymore. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', width: '124%', height: '30%', bottom: '-8%', left: '-12%',
          overflow: 'hidden', zIndex: -1, pointerEvents: 'none',
        }}
      >
        <motion.div
          style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1.5px solid ${color}9e`, filter: 'blur(1px)' }}
          animate={animated ? { rotate: 360 } : undefined}
          transition={animated ? { duration: ringADuration, repeat: Infinity, ease: 'linear' } : undefined}
        />
      </div>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', width: '104%', height: '23%', bottom: '-3%', left: '-2%',
          overflow: 'hidden', zIndex: -1, pointerEvents: 'none',
        }}
      >
        <motion.div
          style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1.5px solid ${color}80` }}
          animate={animated ? { rotate: -360 } : undefined}
          transition={animated ? { duration: ringBDuration, repeat: Infinity, ease: 'linear' } : undefined}
        />
      </div>
      {/* The innermost, static ring — the one that reads most literally as
          "a stand he's resting on," since it sits closest to the robot's
          own base and never moves. Flattened slightly wider/shorter and
          given real weight (was a barely-visible 1px/27%-alpha hairline). */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', width: '88%', height: '14%', bottom: '3%', left: '6%',
          borderRadius: '50%', border: `1.5px solid ${color}75`, zIndex: -1, pointerEvents: 'none',
        }}
      />
      {/* Gold particles — fading in/out as before, now also drifting
          slightly upward on the same cycle ("rising" past the shell). */}
      {animated && PARTICLE_POSITIONS.map((p, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          style={{ position: 'absolute', top: p.top, left: p.left, width: 3, height: 3, borderRadius: '50%', background: GOLD, pointerEvents: 'none' }}
          animate={{ opacity: [0.12, 0.55, 0.12], y: [4, -8, 4] }}
          transition={{ duration: 2.4 + i * 0.3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
        />
      ))}
    </>
  );
}

export default function LivingOrb({ state = 'idle', size = 44, flashToken = 0, naturalAspect = false, inputFocused = false, activityOverride = null, amplitude = null, gazeOverride = null, blinkTrigger = 0 }) {
  // Four-value face-activity state for RobotAvatarImage.jsx's own overlays
  // (visor-dots/waveform/tilt/eye-glow) — a pure mapping of the real
  // 8-value `state` above, plus one additive real signal (`inputFocused`,
  // only consulted when nothing more urgent is already happening). See
  // this file's top doc comment for the full reasoning.
  //
  // `activityOverride` (MCareOrb.jsx's dev-only Idle/Listen/Think/Speak
  // test buttons) wins outright when set — a real, on-demand way to force
  // and verify each state without needing to catch a narrow live-agent
  // window (e.g. "speaking" only lasts a couple seconds after a reply
  // lands). `null`/unset falls straight through to the real mapping below,
  // completely unchanged.
  const activityState = activityOverride || (
    state === 'speaking' ? 'speaking'
    : (state === 'thinking' || state === 'tool_executing') ? 'thinking'
    : state === 'listening' ? 'listening'
    : (inputFocused && state === 'idle') ? 'listening'
    : 'idle'
  );

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
        {size >= 80 && <Atmosphere color={cfgStatic.color} animated={false} activityState={activityState} />}
        <Shell size={size} glowAlpha={cfgStatic.glowAlpha} color={cfgStatic.color} activityState={activityState} animated={false} naturalAspect={naturalAspect} amplitude={amplitude} gazeOverride={gazeOverride} blinkTrigger={blinkTrigger} />
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
      {size >= 80 && <Atmosphere color={cfg.color} animated activityState={activityState} />}

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

      {/* Concentric ring halo — orbits continuously instead of pulsing
          (grow+fade in place). Flattened into ellipses (a perfect circle
          at a fixed size looks identical at any rotation angle, so a
          circle would never visibly move) — same technique Atmosphere's
          own rings already use below. Alternating spin direction per
          index and a per-index size/duration stagger, matching
          Atmosphere's own "rings move differently, not in lockstep"
          choice. Real opacity, no more animating toward 0.
          2026-08-29 clip fix: a rotated ellipse's true bounding box swings
          between its own width and height as it spins — at ~90/270deg its
          vertical reach becomes its resting horizontal half-width, which
          (unclipped) escaped upward into the empty padding above the
          robot's head as faint stray bar segments. Each ring now lives
          inside its own fixed, non-rotating clip box sized to its resting
          footprint — the ring below still rotates freely, but anything
          that would have swept outside that footprint is cleanly clipped
          instead of escaping into neighboring UI. */}
      {Array.from({ length: cfg.ringCount }).map((_, i) => {
        // 2026-08-29: tightened from 100+i*14 / 42+i*6 — the reference
        // image's own rings trace close around the sphere's actual
        // silhouette, not a wide sprawl well outside it. Smaller base +
        // slower per-ring growth keeps even 3 rings (idle, above) hugging
        // the robot rather than fanning outward.
        const w = 92 + i * 10;
        const h = 40 + i * 5;
        return (
          <div
            key={i}
            aria-hidden="true"
            style={{
              position: 'absolute', top: '50%', left: '50%',
              width: `${w}%`, height: `${h}%`, marginLeft: `-${w / 2}%`, marginTop: `-${h / 2}%`,
              overflow: 'hidden', pointerEvents: 'none',
            }}
          >
            <motion.div
              data-testid="ring-orbit"
              style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1px solid ${cfg.color}`, opacity: cfg.ringOpacity }}
              animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
              transition={{ duration: cfg.ringOrbitDuration + i * 2, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        );
      })}

      <motion.div
        aria-hidden="true"
        style={{ position: 'absolute', width: '100%', height: '100%' }}
        animate={{ scale: cfg.coreScale }}
        transition={{ duration: cfg.duration, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Shell size={size} glowAlpha={cfg.glowAlpha} color={cfg.color} activityState={activityState} naturalAspect={naturalAspect} amplitude={amplitude} gazeOverride={gazeOverride} blinkTrigger={blinkTrigger} />
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