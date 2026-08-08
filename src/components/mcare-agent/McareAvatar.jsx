import React from 'react';

// McareAvatar — the golden Morales "M" monogram, the official M-Care/M-Safe
// agent avatar. Replaces the old purple "M" letter circle across the chat UI
// (header, message bubbles, typing indicator). Only the agent side — user
// avatars are untouched.
//
// Props:
//   size    — px dimension of the rendered circle (default 28)
//   glow    — when true, adds a subtle gold pulse/glow ring (typing/loading)
//   className— extra classes on the outer wrapper
//
// The logo asset is a transparent PNG of the metallic-gold "M" emblem.
const LOGO_URL = 'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/8418bc501_generated_image.png';

export const MCARE_LOGO_URL = LOGO_URL;

export default function McareAvatar({ size = 28, glow = false, className = '' }) {
  return (
    <span
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${glow ? 'mcare-glow' : ''} ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        background: '#060B16',
        border: '1px solid rgba(212,175,55,0.35)',
        boxShadow: glow
          ? '0 0 0 2px rgba(212,175,55,0.18), 0 0 14px rgba(212,175,55,0.35)'
          : '0 1px 4px rgba(0,0,0,0.25)',
      }}
      aria-hidden
    >
      <img
        src={LOGO_URL}
        alt="M-Care"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </span>
  );
}