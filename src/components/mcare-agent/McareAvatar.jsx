import React from 'react';
import LivingOrb from '@/components/mcare/LivingOrb';

// McareAvatar — the M-Care/M-Safe agent avatar shown on every assistant
// message, the panel header, and every typing/loading indicator across
// MCareOrb.jsx and MCareAgent.jsx.
//
// 2026-08-12: previously rendered a real photo of a person in a Morales
// vest, circle-cropped (a base44-builder[bot] "mascot-style" addition).
// Portia flagged it live as reading like an unsettling, face-like image at
// chat-avatar size — replaced with the same dark orb + embossed Morales M
// emblem every other M-Care surface uses, so there is exactly one visual
// definition of "M-Care's presence" in this app, not two.
//
// That "no eyes, no photo, ever" stance was itself reversed several rounds
// later (see LivingOrb.jsx's own history comment) once Portia supplied a
// real generated robot-avatar photo and asked for the genuine render, eyes
// included — src/components/mcare/LivingOrb.jsx (via RobotAvatarImage.jsx)
// now renders that real photo, with real independently-blinking/gazing
// eyes, at every real avatar size including this component's own default
// (28) — a 2026-08-23 fix specifically closed the gap where eyes only
// showed at size>=80, leaving every call site here invisible-eyed.
//
// Props (unchanged — every existing call site needed zero changes):
//   size      — px dimension (default 28, matches every existing call site)
//   glow      — true for a "thinking/typing" moment (maps to LivingOrb's
//               'thinking' state); false renders LivingOrb's normal 'idle'
//               breathing glow
//   className — extra classes on the outer wrapper
export default function McareAvatar({ size = 28, glow = false, className = '' }) {
  return (
    <span className={`inline-flex items-center justify-center flex-shrink-0 ${className}`} aria-hidden>
      <LivingOrb state={glow ? 'thinking' : 'idle'} size={size} />
    </span>
  );
}