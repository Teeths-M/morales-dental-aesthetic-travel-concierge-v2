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
 * 2026-08-23, real cutout round: the first pass used the raw screenshot
 * (`public/robot-avatar.png`) with a CSS radial-fade mask on just the outer
 * edge — Portia's live screenshot showed this wasn't enough, since most of
 * the frame is a large flat area of the source's own dark background that
 * doesn't match this app's panel tone closely enough to disappear, leaving
 * a clearly visible square. Fixed for real this round: `src/assets/
 * m-safe-robot-transparent.webp` is an actual alpha-cutout of that same
 * source photo, produced with a flood-fill background removal (seeded from
 * the border, walking inward through color-similar pixels only, with a
 * second global-distance-from-background-reference cap — the first attempt
 * without that second cap let the fill "leak" across the shell's own soft
 * ambient-occlusion shading gradient and erase the whole shell; confirmed
 * by dumping the raw mask and looking at it directly before trusting the
 * result) plus a Gaussian-blur feather on the alpha edge and a connected-
 * components cleanup (drops small stray artifacts far from the robot's own
 * body/particle cluster). Checked with PIL before use: real alpha extrema
 * 0-255, not flat-255 like the raw screenshot. No more CSS edge-mask
 * needed — the transparency is real now, not simulated.
 *
 * `naturalAspect` (default false): every existing small/UI-chrome instance
 * (the 56px floating button, 28px typing indicators, the old 104px header
 * slot) keeps the original square `size x size` box with `objectFit:
 * contain` — a tight circular UI slot, correct for those. The new
 * hero-scale desktop robot column passes `naturalAspect` instead, per
 * Portia's own specified CSS pattern: width-constrained, height auto, the
 * image's real ~1.16:1 aspect ratio (349x301), not forced into a square.
 *
 * `mix-blend-mode: screen` (from Portia's own example CSS) is deliberately
 * NOT applied — it's the right technique for faking transparency against a
 * dark page when no real cutout exists, but layering it on top of an
 * already-transparent image over this app's non-pure-black panel would
 * wash out the white shell and shift the gold tone for no benefit, since
 * the real alpha already solves the problem directly.
 *
 * `RobotAvatar` (the SVG) is kept as a real `onError` fallback only —
 * covers the asset being renamed/removed later, not "waiting for one."
 */
import React, { useState } from 'react';
import RobotAvatar from './RobotAvatar';
import robotSrc from '@/assets/m-safe-robot-transparent.webp';

export default function RobotAvatarImage({ size = 104, color = '#D4AF37', glowAlpha = '45', dots = 0, animated = true, naturalAspect = false }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (imgFailed) {
    return <RobotAvatar size={size} color={color} glowAlpha={glowAlpha} dots={dots} animated={animated} />;
  }

  const glowFilter = `drop-shadow(0 0 ${Math.round(size * 0.22)}px ${color}${glowAlpha}) drop-shadow(0 8px 16px rgba(0,0,0,0.45))`;

  return (
    <div
      aria-hidden="true"
      style={naturalAspect
        ? { position: 'relative', width: `min(${size}px, 100%)`, flexShrink: 0 }
        : { width: size, height: size, position: 'relative', flexShrink: 0 }}
    >
      <img
        src={robotSrc}
        alt=""
        draggable={false}
        onError={() => setImgFailed(true)}
        style={naturalAspect
          ? { width: '100%', height: 'auto', objectFit: 'contain', display: 'block', filter: glowFilter }
          : { width: '100%', height: '100%', objectFit: 'contain', display: 'block', filter: glowFilter }}
      />
      {/* Three "intelligent activity" pulses — the one piece of the old SVG's
          state-reactivity a static image can't reproduce on its own.
          Same thinking/tool_executing-only discipline as before: never
          shown without a real reason. */}
      {dots > 0 && (
        <div style={{ position: 'absolute', bottom: '10%', left: 0, width: '100%', display: 'flex', justifyContent: 'center', gap: 6, pointerEvents: 'none' }}>
          {[0, 1, 2].map(i => (
            <span
              key={i}
              style={{
                width: Math.max(3, size * 0.035), height: Math.max(3, size * 0.035), borderRadius: '50%',
                background: color, boxShadow: `0 0 6px ${color}`,
                animation: animated ? `robotAvatarPulse 1.2s ease-in-out ${i * 0.18}s infinite` : 'none',
                opacity: animated ? undefined : 0.7,
              }}
            />
          ))}
        </div>
      )}
      <style>{`
        @keyframes robotAvatarPulse {
          0%, 100% { opacity: 0.25; transform: scale(0.7); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
