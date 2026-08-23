// @ts-nocheck — pre-existing arithmetic/symbol type gaps, matches sibling mcare components
/**
 * RobotAvatar — M-Safe's robot head, as real inline SVG. Replaces the
 * Three.js `RoboOrb3D.jsx` scene (retired 2026-08-23) after three straight
 * rounds of blind WebGL lighting/bloom tuning each produced a real, visible
 * defect — this checkout has no way to render WebGL, so every fix was a
 * guess corrected only by Portia's next screenshot. SVG is deterministic
 * markup: exact shapes, exact gradient stops, no rendering pipeline to get
 * wrong unseen.
 *
 * A pearl-metallic shell, a thick gold bezel framing a dark glossy visor,
 * two glowing gold "eye" capsules on the visor, and a small gold "M" badge
 * on the shell itself (not inside the visor) — built directly from the real
 * reference image (`M-care AI agent bot.png`), reusing this app's own
 * already-proven pearl/visor gradient recipes verbatim (the same stops
 * `LivingOrb.jsx`'s old DOM-based `Shell` used before this file replaced
 * it), not reinvented.
 *
 * Pure and stateless — `color`/`glowAlpha`/`dots` are driven by the caller
 * (LivingOrb's STATE_CONFIG), matching the exact same prop shape the old
 * DOM-based Shell took, so this is a like-for-like renderer swap, not a new
 * data contract. `animated` gates every framer-motion pulse — false gives a
 * fully static render (prefers-reduced-motion, or a caller that just wants
 * a still frame).
 *
 * Multiple instances of this component are mounted simultaneously in the
 * live app (a 44px header-button orb, a 104px hero orb, 28px typing/
 * greeting orbs — all at once). SVG <defs> ids are global to the document,
 * so every gradient/filter id is scoped with React's useId() as a per-mount
 * prefix — without this, one instance's gradient could silently leak into
 * another's url(#...) reference.
 */
import React, { useId } from 'react';
import { motion } from 'framer-motion';

const HEAD = { cx: 100, cy: 100, r: 90 };
const VISOR = { cx: 107, cy: 96, r: 58 };
const EYE_Y = VISOR.cy + 6;
const EYE_DX = 15;
const EYE_W = 24;
const EYE_H = 11;
const BADGE = { cx: 27, cy: 92, r: 16 };

export default function RobotAvatar({ size = 104, color = '#D4AF37', glowAlpha = '45', dots = 0, animated = true }) {
  const uid = useId();
  const pearlId = `${uid}-pearl`;
  const visorId = `${uid}-visor`;
  const goldId = `${uid}-gold`;
  const eyeId = `${uid}-eye`;
  const blurId = `${uid}-blur`;
  const badgeBlurId = `${uid}-badgeblur`;

  const EyeGlow = animated ? motion.rect : 'rect';
  const eyeGlowAnim = animated
    ? { animate: { opacity: [0.32, 0.62, 0.32] }, transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } }
    : { style: { opacity: 0.45 } };

  const PulseDot = animated ? motion.circle : 'circle';

  return (
    <div
      aria-hidden="true"
      style={{
        width: size, height: size, position: 'relative', flexShrink: 0,
        borderRadius: '50%',
        boxShadow: `0 0 ${Math.round(size * 0.5)}px ${color}${glowAlpha}`,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 200 200" style={{ display: 'block' }}>
        <defs>
          <radialGradient id={pearlId} cx="35%" cy="26%" r="80%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="38%" stopColor="#f5f1e8" />
            <stop offset="68%" stopColor="#d9d3c4" />
            <stop offset="100%" stopColor="#b8b2a0" />
          </radialGradient>
          <radialGradient id={visorId} cx="38%" cy="30%" r="85%">
            <stop offset="0%" stopColor="#384052" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#060a10" stopOpacity="0.98" />
          </radialGradient>
          <linearGradient id={goldId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8a6d1f" />
            <stop offset="15%" stopColor="#F4E4A6" />
            <stop offset="35%" stopColor="#D4AF37" />
            <stop offset="55%" stopColor="#FFD700" />
            <stop offset="75%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#8a6d1f" />
          </linearGradient>
          <linearGradient id={eyeId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFC107" />
            <stop offset="50%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#FFB300" />
          </linearGradient>
          <filter id={blurId} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4.5" />
          </filter>
          <filter id={badgeBlurId} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
        </defs>

        {/* Pearl-metallic shell */}
        <circle cx={HEAD.cx} cy={HEAD.cy} r={HEAD.r} fill={`url(#${pearlId})`} />
        {/* Thin rim-light — light catching the edge of the sphere */}
        <circle cx={HEAD.cx} cy={HEAD.cy} r={HEAD.r - 1} fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" />
        {/* Specular gloss highlight — one off-center shape */}
        <ellipse cx={HEAD.cx - 34} cy={HEAD.cy - 52} rx="26" ry="16" fill="rgba(255,255,255,0.9)" filter={`url(#${blurId})`} opacity="0.5" />

        {/* Gold bezel framing the visor */}
        <circle cx={VISOR.cx} cy={VISOR.cy} r={VISOR.r + 5} fill="none" stroke={`url(#${goldId})`} strokeWidth="10" />
        <circle cx={VISOR.cx} cy={VISOR.cy} r={VISOR.r - 4} fill="none" stroke={`url(#${goldId})`} strokeWidth="2.5" opacity="0.85" />

        {/* Dark glossy visor */}
        <circle cx={VISOR.cx} cy={VISOR.cy} r={VISOR.r} fill={`url(#${visorId})`} />

        {/* Two glowing gold "eye" capsules — a soft blurred glow layer behind a crisp shape on top */}
        {[VISOR.cx - EYE_DX, VISOR.cx + EYE_DX].map((cx, i) => (
          <React.Fragment key={i}>
            <EyeGlow
              x={cx - EYE_W / 2 - 3} y={EYE_Y - EYE_H / 2 - 3} width={EYE_W + 6} height={EYE_H + 6}
              rx={(EYE_H + 6) / 2} fill={color} filter={`url(#${blurId})`}
              {...eyeGlowAnim}
            />
            <rect x={cx - EYE_W / 2} y={EYE_Y - EYE_H / 2} width={EYE_W} height={EYE_H} rx={EYE_H / 2} fill={`url(#${eyeId})`} />
          </React.Fragment>
        ))}

        {/* Three "intelligent activity" pulses — thinking / tool_executing only, never faked */}
        {dots > 0 && [0, 1, 2].map((i) => (
          <PulseDot
            key={i}
            cx={VISOR.cx + (i - 1) * 16} cy={EYE_Y + 24} r="4.5" fill={color}
            {...(animated
              ? { animate: { opacity: [0.25, 1, 0.25], scale: [0.7, 1.1, 0.7] }, transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.18 } }
              : { opacity: 0.6 })}
          />
        ))}

        {/* Side "M" badge on the shell itself — not inside the visor */}
        <circle cx={BADGE.cx} cy={BADGE.cy} r={BADGE.r} fill="#0a0b0d" stroke={`url(#${goldId})`} strokeWidth="3" />
        <text
          x={BADGE.cx} y={BADGE.cy + 6} textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif" fontWeight="700" fontSize="18"
          fill="#FFD700" filter={`url(#${badgeBlurId})`}
        >
          M
        </text>
        <text
          x={BADGE.cx} y={BADGE.cy + 6} textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif" fontWeight="700" fontSize="18"
          fill="#FFD700"
        >
          M
        </text>
      </svg>
    </div>
  );
}
