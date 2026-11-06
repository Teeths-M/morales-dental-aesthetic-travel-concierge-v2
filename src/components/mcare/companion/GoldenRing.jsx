import React from 'react';

const ART = 'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/8a40709f7_generated_image.png';

export default function GoldenRing({ state = 'idle', size = 300, reduced = false, amplitude = 0 }) {
  return (
    <div className="companion-energy relative shrink-0" role="img" aria-label={`M-Care ring, ${state}`}
      style={{ width: size, height: size, transform: `scale(${state === 'speaking' ? 1 + Math.min(0.05, amplitude * 0.05) : 1})` }}>
      <img src={ART} alt="" aria-hidden="true" draggable={false}
        className="h-full w-full object-contain"
        style={{ mixBlendMode: 'screen', maskImage: 'radial-gradient(ellipse, black 38%, transparent 73%)', WebkitMaskImage: 'radial-gradient(ellipse, black 38%, transparent 73%)', animation: reduced ? 'none' : 'companion-energy-breathe 7s ease-in-out infinite' }} />
    </div>
  );
}