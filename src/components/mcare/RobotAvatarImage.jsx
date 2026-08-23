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
 * `mix-blend-mode: screen` is deliberately NOT applied — see the git
 * history / CLAUDE.md for why (it's a fake-transparency technique, and
 * layering it on top of a real cutout would wash out the white shell).
 *
 * `RobotAvatar` (the SVG) is kept as a real `onError` fallback only —
 * covers the asset being renamed/removed later, not "waiting for one."
 *
 * 2026-08-23, "alive AI agent" round: this file now also owns the robot's
 * live-activity overlays — a genuine, always-alive presence tied to real
 * UI state, not a static picture. `activityState` (one of 'idle' /
 * 'listening' / 'thinking' / 'speaking', computed by LivingOrb.jsx from its
 * own already-real `orbState` signals — see that file's doc comment) drives:
 *
 * - idle: a gentle translateY float on the whole shell, plus an occasional
 *   real blink (two small dark capsules briefly covering each real eye —
 *   the only way to "close" eyes baked into a static photo).
 * - listening: three small bars near the left earpiece/M-badge, bouncing
 *   height. Stated plainly: this is a stylized ambient cue, not a real
 *   microphone-amplitude visualizer — "listening" here also fires from
 *   plain text-input focus with no mic involved at all (see MCareOrb.jsx),
 *   so a literal audio-reactive claim would be dishonest in that case.
 *   Matches this app's own established principle for "speaking" below.
 * - thinking: three dots on the visor, between/under the eyes (the exact
 *   anchor the old bottom-of-image pulse row used to sit at, moved onto the
 *   face itself), pulsing in sequence, plus a subtle head tilt (rotate +
 *   a hair of scale — never a fake 3D turn) and two small particles
 *   orbiting the shell.
 * - speaking: the same visor anchor as thinking, rendered as 5 thin bars
 *   bouncing independently — a waveform look, visually distinct from
 *   thinking's discrete dots. Same "no real TTS signal to honestly react
 *   to" principle as LivingOrb.jsx's own doc comment already states —
 *   this is an honest "a reply is being delivered" cue, not a fabricated
 *   audio waveform.
 *
 * Eye/visor/badge anchor percentages come from RobotAvatar.jsx's own real,
 * already-calibrated SVG geometry (built directly from this same photo),
 * not a fresh guess. Every animation lives in real CSS `@keyframes` in the
 * `<style>` block below, gated by a `data-activity-state` attribute — one
 * file, easy to retune. Blink/float/tilt/orbit are pure decoration and are
 * fully skipped when `animated` is false (prefers-reduced-motion, or any
 * caller wanting a static frame); the visor-dot/waveform/listening-bar
 * shapes still render, just without motion — matching the precedent the
 * old dot row already set for `animated=false`.
 */
import React, { useState, useEffect } from 'react';
import RobotAvatar from './RobotAvatar';
import robotSrc from '@/assets/m-safe-robot-transparent.webp';

export default function RobotAvatarImage({ size = 104, color = '#D4AF37', glowAlpha = '45', activityState = 'idle', animated = true, naturalAspect = false }) {
  const [imgFailed, setImgFailed] = useState(false);
  const [blinking, setBlinking] = useState(false);

  // Occasional blink — idle only, real DOM-timer driven. Skipped entirely
  // under reduced motion / any static caller (pure decoration, nothing
  // informational lost by omitting it).
  useEffect(() => {
    if (!animated || activityState !== 'idle') { setBlinking(false); return; }
    let timeoutId;
    let closeId;
    const scheduleBlink = () => {
      const delay = 3200 + Math.random() * 3600; // ~3.2-6.8s
      timeoutId = setTimeout(() => {
        setBlinking(true);
        closeId = setTimeout(() => setBlinking(false), 160);
        scheduleBlink();
      }, delay);
    };
    scheduleBlink();
    return () => { clearTimeout(timeoutId); clearTimeout(closeId); };
  }, [animated, activityState]);

  if (imgFailed) {
    return <RobotAvatar size={size} color={color} glowAlpha={glowAlpha} dots={activityState === 'thinking' ? 3 : 0} animated={animated} />;
  }

  const glowFilter = `drop-shadow(0 0 ${Math.round(size * 0.22)}px ${color}${glowAlpha}) drop-shadow(0 8px 16px rgba(0,0,0,0.45))`;
  const showFaceOverlays = size >= 80;
  const cssActivityState = animated ? activityState : 'static';

  return (
    <div
      aria-hidden="true"
      className="robotAvatarWrap"
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
            {/* Idle: a brief blink over each real eye */}
            {activityState === 'idle' && blinking && (
              <>
                <span className="robotEyeBlink" style={{ left: '40%' }} />
                <span className="robotEyeBlink" style={{ left: '55%' }} />
              </>
            )}

            {/* Thinking: three dots on the visor, between/under the eyes */}
            {activityState === 'thinking' && (
              <div className="robotDotRow">
                {[0, 1, 2].map(i => (
                  <span key={i} className="robotDot" style={{ animationDelay: `${i * 0.18}s`, background: color, boxShadow: `0 0 6px ${color}` }} />
                ))}
              </div>
            )}

            {/* Speaking: a 5-bar waveform at the same visor anchor */}
            {activityState === 'speaking' && (
              <div className="robotWaveRow">
                {[0, 1, 2, 3, 4].map(i => (
                  <span key={i} className="robotWaveBar" style={{ animationDelay: `${i * 0.09}s`, background: color }} />
                ))}
              </div>
            )}

            {/* Listening: small bars near the left earpiece/M-badge */}
            {activityState === 'listening' && (
              <div className="robotListenRow">
                {[0, 1, 2].map(i => (
                  <span key={i} className="robotListenBar" style={{ animationDelay: `${i * 0.12}s`, background: color }} />
                ))}
              </div>
            )}

            {/* Thinking: two small particles orbiting the shell */}
            {activityState === 'thinking' && (
              <div className="robotOrbitWrap">
                <span className="robotOrbitDot" style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
                <span className="robotOrbitDot robotOrbitDotB" style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .robotAvatarFloat { position: relative; width: 100%; height: 100%; }

        [data-activity-state="idle"] .robotAvatarFloat {
          animation: robotFloat 4.8s ease-in-out infinite;
        }
        [data-activity-state="thinking"] .robotAvatarFloat {
          animation: robotThinkTilt 3.4s ease-in-out infinite;
          transform-origin: 50% 88%;
        }
        @keyframes robotFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes robotThinkTilt {
          0%, 100% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(2.4deg) scale(1.008); }
        }

        /* Eye blink — dark capsules exactly over each real eye */
        .robotEyeBlink {
          position: absolute; top: 48.25%; width: 12%; height: 5.5%;
          background: #05070a; border-radius: 50%;
          pointer-events: none; z-index: 2;
        }

        /* Thinking: dots between/under the eyes */
        .robotDotRow {
          position: absolute; top: 60%; left: 43%; width: 22%; height: 4%;
          display: flex; align-items: center; justify-content: space-between;
          pointer-events: none; z-index: 2;
        }
        .robotDot { width: 20%; aspect-ratio: 1; border-radius: 50%; opacity: 0.4; }
        [data-activity-state="thinking"] .robotDot { animation: robotDotPulse 1.3s ease-in-out infinite; }
        @keyframes robotDotPulse {
          0%, 100% { opacity: 0.25; transform: scale(0.7); }
          50% { opacity: 1; transform: scale(1.15); }
        }

        /* Speaking: a small waveform at the same anchor */
        .robotWaveRow {
          position: absolute; top: 58.5%; left: 41%; width: 26%; height: 7%;
          display: flex; align-items: flex-end; justify-content: space-between; gap: 4%;
          pointer-events: none; z-index: 2;
        }
        .robotWaveBar { flex: 1; height: 32%; border-radius: 2px; opacity: 0.85; }
        [data-activity-state="speaking"] .robotWaveBar { animation: robotWaveBounce 0.55s ease-in-out infinite; }
        @keyframes robotWaveBounce {
          0%, 100% { height: 25%; }
          50% { height: 100%; }
        }

        /* Listening: bars near the left earpiece/M-badge */
        .robotListenRow {
          position: absolute; top: 58%; left: 6%; width: 14%; height: 9%;
          display: flex; align-items: flex-end; justify-content: space-between; gap: 12%;
          pointer-events: none; z-index: 2;
        }
        .robotListenBar { flex: 1; height: 32%; border-radius: 2px; opacity: 0.85; }
        [data-activity-state="listening"] .robotListenBar { animation: robotWaveBounce 0.7s ease-in-out infinite; }

        /* Thinking: two particles orbiting the shell */
        .robotOrbitWrap {
          position: absolute; inset: -8%; pointer-events: none; z-index: 1;
        }
        [data-activity-state="thinking"] .robotOrbitWrap { animation: robotOrbitSpin 5.5s linear infinite; }
        .robotOrbitDot {
          position: absolute; top: 4%; left: 50%; width: 4%; height: 4%;
          border-radius: 50%; opacity: 0.75; transform: translateX(-50%);
        }
        .robotOrbitDotB { top: auto; bottom: 8%; left: 22%; opacity: 0.5; }
        @keyframes robotOrbitSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
