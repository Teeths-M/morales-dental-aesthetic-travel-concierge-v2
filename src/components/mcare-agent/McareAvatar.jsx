import React from 'react';

// McareAvatar — the full Morales branded vest photo as the M-Care/M-Safe
// agent avatar (mascot-style, like Boardy AI). The circular crop centers on
// the golden "M" + MORALES wordmark on the chest. Only the agent side —
// user avatars are untouched.
//
// Props:
//   size    — px dimension of the rendered circle (default 28)
//   glow    — when true, adds a subtle gold pulse/glow ring (typing/loading)
//   className— extra classes on the outer wrapper
const VEST_URL = 'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/272a214ab_image.png';

export const MCARE_LOGO_URL = VEST_URL;

export default function McareAvatar({ size = 28, glow = false, className = '' }) {
  return (
    <span
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${glow ? 'mcare-glow' : ''} ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        background: '#1C2533',
        border: '1px solid rgba(212,175,55,0.35)',
        boxShadow: glow
          ? '0 0 0 2px rgba(212,175,55,0.18), 0 0 14px rgba(212,175,55,0.35)'
          : '0 1px 4px rgba(0,0,0,0.25)',
      }}
      aria-hidden
    >
      <img
        src={VEST_URL}
        alt="Morales"
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 38%' }}
      />
    </span>
  );
}