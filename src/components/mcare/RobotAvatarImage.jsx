/**
 * RobotAvatarImage — the real photorealistic 3D robot render, replacing the
 * inline-SVG `RobotAvatar.jsx` this app used for the two rounds before this
 * one. Portia generated the source photo herself and supplied the file.
 *
 * This is the ONE place "which robot renders" is decided — LivingOrb.jsx's
 * `Shell` and the homepage's `LivingMOrb.jsx` both render through this
 * instead of `RobotAvatar` directly, so any future asset swap only ever
 * touches this file.
 *
 * 2026-08-23, real cutout round: `src/assets/m-safe-robot-transparent.webp`
 * is a genuine alpha-cutout of Portia's own source photo (flood-fill
 * background removal + feathered edge + connected-components cleanup — see
 * CLAUDE.md for the full technique). Real alpha extrema 0-255, not a flat
 * 255 like the raw screenshot. No CSS edge-mask needed — the transparency
 * is real.
 *
 * `naturalAspect` (default false): every existing small/UI-chrome instance
 * (the 56px floating button, 28px typing indicators, the old 104px header
 * slot) keeps the original square `size x size` box with `objectFit:
 * contain` — a tight circular UI slot, correct for those. The hero-scale
 * desktop robot column passes `naturalAspect` instead: width-constrained,
 * height auto, the image's real ~1.16:1 aspect ratio (349x301).
 *
 * `mix-blend-mode: screen` is deliberately NOT applied to the base image —
 * see the git history / CLAUDE.md for why (it's a fake-transparency
 * technique, and layering it on top of a real cutout would wash out the
 * white shell). It IS used below for the speaking-state eye-glow overlay
 * specifically, where the goal is to genuinely ADD light on top of the
 * real eyes, not fake transparency.
 *
 * `RobotAvatar` (the SVG) is kept as a real `onError` fallback only —
 * covers the asset being renamed/removed later, not "waiting for one."
 *
 * 2026-08-23, "alive AI agent" round + same-day hardening pass: Portia's
 * first version of these overlays was real but too subtle to read as
 * "working" — the old thinking dots were opacity 0.4 with no glow at a
 * few px across, which at a glance looks like nothing/black smudges
 * against the dark visor, not broken logic (the color prop *was* gold).
 * Rebuilt bold per her explicit spec, with hard constraints applied
 * everywhere below: z-index 10 (overlays must sit above the image),
 * opacity never drops below 0.8 at any point in an animation cycle, and
 * no dark/black overlay of any kind — which is why the old idle-blink
 * effect (dark capsules covering each eye) is gone; blink wasn't part of
 * this ask either, and it can't be redone without a dark cover.
 *
 * `activityState` (one of 'idle' / 'listening' / 'thinking' / 'speaking',
 * computed by LivingOrb.jsx from its own real `orbState` signals, or
 * forced by MCareOrb.jsx's dev-only test buttons — see that file) drives:
 *
 * - idle: one combined float+tilt keyframe on the whole shell (8px over
 *   3s, ±2deg in the same cycle — CSS can only animate one `transform`
 *   per element, so both live in one keyframe, never two separate
 *   animations fighting over the same property).
 * - listening: a 3-bar gold/cyan equalizer near the left earpiece/M-badge,
 *   height-bouncing (opacity fixed at 1 — only height moves, so the
 *   "never below 0.8" rule is automatic here). Stated plainly: this is a
 *   stylized ambient cue, not a real microphone-amplitude visualizer —
 *   "listening" also fires from plain text-input focus with no mic
 *   involved at all (see MCareOrb.jsx), so a literal audio-reactive claim
 *   would be dishonest in that case. Matches the same principle "speaking"
 *   already follows.
 * - thinking: three large bright-gold dots centered on the visor, below
 *   the real eye line (so they never sit on top of the photo's own amber
 *   eyes), doing a genuine up/down wave (translateY, not just a scale
 *   pulse) with a real 180ms stagger per dot — plus a brighter 3-particle
 *   orbit and a visibly faster head-tilt. The hologram rings
 *   (LivingOrb.jsx's Atmosphere) also spin faster specifically for this
 *   state — a real, visible "the system is working harder" signal, not
 *   just a face-level change.
 * - speaking: two distinct things. A genuine "eyes pulse brighter" effect
 *   — an additive glow (mix-blend-mode: screen) positioned exactly over
 *   each real eye, pulsing scale/opacity — adds light on top of the real
 *   eye glow rather than covering anything, so it stays compliant with
 *   "no dark overlay." Plus a 5-bar waveform positioned genuinely beneath
 *   the visor (on the chin/lower shell, below the visor's own bottom
 *   edge), reading as clearly distinct from thinking's on-visor dots.
 *   Same "no real TTS signal to honestly react to" principle as before —
 *   this is an honest "a reply is being delivered" cue, not a fabricated
 *   audio waveform.
 *
 * Eye/visor/badge anchor percentages come from RobotAvatar.jsx's own real,
 * already-calibrated SVG geometry (built directly from this same photo),
 * not a fresh guess. Every animation lives in real CSS `@keyframes` in the
 * `<style>` block below, gated by a `data-activity-state` attribute — one
 * file, easy to retune. Float/tilt/orbit are pure decoration and are
 * fully skipped when `animated` is false (prefers-reduced-motion, or any
 * caller wanting a static frame); the visor-dot/waveform/listening-bar/
 * eye-glow shapes still render, just without motion.
 */
import React, { useState } from 'react';
import RobotAvatar from './RobotAvatar';
import robotSrc from '@/assets/m-safe-robot-transparent.webp';

// Bold, literal colors for the activity overlays — deliberately not the
// app's standard muted GOLD (#D4AF37, still used for the base drop-shadow
// glow below), since that's very likely why the first pass read as too
// dark to register as "gold" at a glance.
const BRIGHT_GOLD = '#FFD24A';
const CYAN = '#22D3EE';

export default function RobotAvatarImage({ size = 104, color = '#D4AF37', glowAlpha = '45', activityState = 'idle', animated = true, naturalAspect = false }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (imgFailed) {
    return <RobotAvatar size={size} color={color} glowAlpha={glowAlpha} dots={activityState === 'thinking' ? 3 : 0} animated={animated} />;
  }

  const glowFilter = `drop-shadow(0 0 ${Math.round(size * 0.22)}px ${color}${glowAlpha}) drop-shadow(0 8px 16px rgba(0,0,0,0.45))`;
  const showFaceOverlays = size >= 80;
  const cssActivityState = animated ? activityState : 'static';

  return (
    <div
      aria-hidden="true"
      className="robotAvatarWrap robot-wrapper"
      data-activity-state={showFaceOverlays ? cssActivityState : 'static'}
      style={naturalAspect
        ? { position: 'relative', width: `min(${size}px, 100%)`, flexShrink: 0 }
        : { width: size, height: size, position: 'relative', flexShrink: 0 }}
    >
      <div className="robotAvatarFloat">
        <img
          src={robotSrc}
          alt=""
          draggable={false}
          onError={() => setImgFailed(true)}
          style={naturalAspect
            ? { width: '100%', height: 'auto', objectFit: 'contain', display: 'block', filter: glowFilter }
            : { width: '100%', height: '100%', objectFit: 'contain', display: 'block', filter: glowFilter }}
        />

        {showFaceOverlays && (
          <>
            {/* Thinking: three large dots on the visor, below the eye line */}
            {activityState === 'thinking' && (
              <div className="robotDotRow" data-testid="robot-dots">
                {[0, 1, 2].map(i => (
                  <span key={i} className="robotDot" style={{ animationDelay: `${i * 180}ms` }} />
                ))}
              </div>
            )}

            {/* Thinking: three particles orbiting the shell */}
            {activityState === 'thinking' && (
              <div className="robotOrbitWrap" data-testid="robot-orbit">
                <span className="robotOrbitDot robotOrbitDotA" />
                <span className="robotOrbitDot robotOrbitDotB" />
                <span className="robotOrbitDot robotOrbitDotC" />
              </div>
            )}

            {/* Speaking: eyes pulse brighter (additive glow, never a cover) */}
            {activityState === 'speaking' && (
              <div data-testid="robot-eyeglow">
                <span className="robotEyeGlow" style={{ left: '38%' }} />
                <span className="robotEyeGlow" style={{ left: '53%' }} />
              </div>
            )}

            {/* Speaking: a 5-bar waveform beneath the visor */}
            {activityState === 'speaking' && (
              <div className="robotWaveRow" data-testid="robot-wave">
                {[0, 1, 2, 3, 4].map(i => (
                  <span key={i} className="robotWaveBar" style={{ animationDelay: `${i * 90}ms` }} />
                ))}
              </div>
            )}

            {/* Listening: a gold/cyan equalizer near the left earpiece/M-badge */}
            {activityState === 'listening' && (
              <div className="robotListenRow" data-testid="robot-listen">
                {[0, 1, 2].map(i => (
                  <span key={i} className={`robotListenBar ${i % 2 === 0 ? 'robotListenBarGold' : 'robotListenBarCyan'}`} style={{ animationDelay: `${i * 120}ms` }} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .robotAvatarFloat { position: relative; width: 100%; height: 100%; }

        /* Idle: one combined keyframe — float + tilt share the same
           transform property, so they must live in one animation, not two. */
        [data-activity-state="idle"] .robotAvatarFloat {
          animation: robotIdleFloatTilt 3s ease-in-out infinite;
        }
        @keyframes robotIdleFloatTilt {
          0%   { transform: translateY(0px) rotate(0deg); }
          25%  { transform: translateY(-4px) rotate(-2deg); }
          50%  { transform: translateY(-8px) rotate(0deg); }
          75%  { transform: translateY(-4px) rotate(2deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }

        /* Thinking: a faster, more pronounced tilt than idle's float */
        [data-activity-state="thinking"] .robotAvatarFloat {
          animation: robotThinkTilt 1.8s ease-in-out infinite;
          transform-origin: 50% 88%;
        }
        @keyframes robotThinkTilt {
          0%, 100% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(3deg) scale(1.015); }
        }

        /* Thinking: three large, bright dots waving up/down on the visor */
        .robotDotRow {
          position: absolute; top: 57%; left: 34%; width: 32%; height: 11%;
          display: flex; align-items: center; justify-content: space-between;
          pointer-events: none; z-index: 10;
        }
        .robotDot {
          height: 68%; aspect-ratio: 1; border-radius: 50%;
          background: ${BRIGHT_GOLD}; opacity: 1;
          box-shadow: 0 0 10px 3px rgba(255,210,74,0.95), 0 0 22px 8px rgba(255,210,74,0.55);
        }
        [data-activity-state="thinking"] .robotDot { animation: robotDotWave 1.1s ease-in-out infinite; }
        @keyframes robotDotWave {
          0%, 100% { transform: translateY(0); opacity: 0.85; }
          50% { transform: translateY(-55%); opacity: 1; }
        }

        /* Thinking: three particles genuinely orbiting the shell */
        .robotOrbitWrap { position: absolute; inset: -10%; pointer-events: none; z-index: 10; }
        [data-activity-state="thinking"] .robotOrbitWrap { animation: robotOrbitSpin 3.2s linear infinite; }
        .robotOrbitDot {
          position: absolute; width: 5.5%; height: 5.5%; border-radius: 50%;
          background: ${BRIGHT_GOLD}; opacity: 1;
          box-shadow: 0 0 8px 3px rgba(255,210,74,0.9);
        }
        .robotOrbitDotA { top: 2%; left: 50%; transform: translateX(-50%); }
        .robotOrbitDotB { top: 46%; left: 96%; }
        .robotOrbitDotC { top: 82%; left: 14%; }
        @keyframes robotOrbitSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Speaking: an ADDITIVE glow over each real eye — never a cover */
        .robotEyeGlow {
          position: absolute; top: 44%; width: 15%; height: 9%;
          border-radius: 50%; pointer-events: none; z-index: 10;
          background: radial-gradient(circle, rgba(255,210,74,0.95) 0%, rgba(255,210,74,0) 72%);
          mix-blend-mode: screen; opacity: 0.85;
        }
        [data-activity-state="speaking"] .robotEyeGlow { animation: robotEyePulse 0.9s ease-in-out infinite; }
        @keyframes robotEyePulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.35); }
        }

        /* Speaking: a 5-bar waveform beneath the visor (on the chin/lower shell) */
        .robotWaveRow {
          position: absolute; top: 79%; left: 34%; width: 32%; height: 9%;
          display: flex; align-items: flex-end; justify-content: space-between; gap: 6%;
          pointer-events: none; z-index: 10;
        }
        .robotWaveBar {
          flex: 1; height: 35%; border-radius: 2px; opacity: 1;
          background: ${BRIGHT_GOLD};
          box-shadow: 0 0 8px 2px rgba(255,210,74,0.85);
        }
        [data-activity-state="speaking"] .robotWaveBar { animation: robotBarBounce 0.5s ease-in-out infinite; }
        @keyframes robotBarBounce {
          0%, 100% { height: 30%; }
          50% { height: 100%; }
        }

        /* Listening: a gold/cyan equalizer near the left earpiece/M-badge */
        .robotListenRow {
          position: absolute; top: 57%; left: 4%; width: 17%; height: 11%;
          display: flex; align-items: flex-end; justify-content: space-between; gap: 14%;
          pointer-events: none; z-index: 10;
        }
        .robotListenBar {
          flex: 1; height: 35%; border-radius: 2px; opacity: 1;
        }
        .robotListenBarGold { background: ${BRIGHT_GOLD}; box-shadow: 0 0 8px 2px rgba(255,210,74,0.85); }
        .robotListenBarCyan { background: ${CYAN}; box-shadow: 0 0 8px 2px rgba(34,211,238,0.85); }
        [data-activity-state="listening"] .robotListenBar { animation: robotBarBounce 0.6s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
