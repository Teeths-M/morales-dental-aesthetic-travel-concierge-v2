/**
 * RobotAvatarImage — the real photorealistic 3D robot render, replacing the
 * inline-SVG `RobotAvatar.jsx` this app used for the two rounds before this
 * one. Portia generated the actual asset herself (the AI-image-generation
 * prompt she wrote, run through her own tool) and supplied the file
 * directly — `public/robot-avatar.png` is that exact image, copied in
 * unedited.
 *
 * This is the ONE place "which robot renders" is decided — LivingOrb.jsx's
 * `Shell` and the homepage's `LivingMOrb.jsx` both render through this
 * instead of `RobotAvatar` directly, so any future asset swap only ever
 * touches this file.
 *
 * The source image (349x301) already has its own dark navy background baked
 * in (not true alpha-cutout transparency around the robot) — checked
 * directly (PIL: mode RGBA, but alpha is 255 everywhere, i.e. fully opaque
 * throughout). That background is close to but not identical to this app's
 * own dark tokens (`DARK`/`PANEL_BG` in MCareOrb.jsx), so a plain rectangle
 * would show a faint seam. A soft CSS mask feathers the image's own edges
 * into whatever's behind it instead of needing a true cutout.
 *
 * `RobotAvatar` (the SVG) is kept as a real fallback — `onError` covers the
 * asset being renamed/removed later, not "waiting for Portia to supply one"
 * (she already has).
 */
import React, { useState } from 'react';
import RobotAvatar from './RobotAvatar';

const IMAGE_SRC = '/robot-avatar.png';

// Soft radial fade at the very edge so the source image's own rectangular
// boundary blends into whatever panel background sits behind it, rather
// than showing a hard-edged seam against a not-quite-matching dark tone.
const EDGE_MASK = 'radial-gradient(ellipse at center, #000 78%, transparent 100%)';

export default function RobotAvatarImage({ size = 104, color = '#D4AF37', glowAlpha = '45', dots = 0, animated = true }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (imgFailed) {
    return <RobotAvatar size={size} color={color} glowAlpha={glowAlpha} dots={dots} animated={animated} />;
  }

  return (
    <div
      aria-hidden="true"
      style={{
        width: size, height: size, position: 'relative', flexShrink: 0,
        // Same ambient outer glow technique RobotAvatar's own wrapper uses —
        // state-tinted, so the robot still visibly reacts to idle/thinking/
        // alert/etc. even though the image itself is static.
        filter: `drop-shadow(0 0 ${Math.round(size * 0.22)}px ${color}${glowAlpha})`,
      }}
    >
      <img
        src={IMAGE_SRC}
        alt=""
        draggable={false}
        onError={() => setImgFailed(true)}
        style={{
          width: '100%', height: '100%', objectFit: 'contain', display: 'block',
          WebkitMaskImage: EDGE_MASK, maskImage: EDGE_MASK,
          filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.5))',
        }}
      />
      {/* Three "intelligent activity" pulses — the one piece of the old SVG's
          state-reactivity a static image can't reproduce on its own.
          Same thinking/tool_executing-only discipline as before: never
          shown without a real reason. */}
      {dots > 0 && (
        <div style={{ position: 'absolute', bottom: '8%', left: 0, width: '100%', display: 'flex', justifyContent: 'center', gap: 6, pointerEvents: 'none' }}>
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
