import React from 'react';
import { Search, Shield, MapPin, Handshake } from 'lucide-react';
import { P } from './plusTheme';

// Analyze · Protect · Coordinate · Resolve — the four pillars, each with the
// outcome it produces underneath. Literal class strings only, so Tailwind keeps them.
const PILLARS = [
  { key: 'analyze', title: 'Analyze', caption: 'Intelligence', Icon: Search },
  { key: 'protect', title: 'Protect', caption: 'Safety First', Icon: Shield },
  { key: 'coordinate', title: 'Coordinate', caption: 'Everything', Icon: MapPin },
  { key: 'resolve', title: 'Resolve', caption: 'Peace of Mind', Icon: Handshake },
];

export default function CapabilityGrid() {
  return (
    <section
      className="grid grid-cols-4 gap-1 rounded-2xl px-2 py-3.5"
      style={{ border: `1px solid ${P.border}`, background: P.card }}
      aria-label="What M-Safe+ does"
    >
      {PILLARS.map(({ key, title, caption, Icon }) => (
        <div key={key} className="flex flex-col items-center text-center">
          <Icon size={17} strokeWidth={1.6} color={P.gold} aria-hidden="true" />
          <span style={{ marginTop: 6, fontSize: 9.5, fontWeight: 600, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.9)' }}>
            {title}
          </span>
          <span style={{ marginTop: 2, fontSize: 8.5, lineHeight: 1.3, color: P.muted }}>
            {caption}
          </span>
        </div>
      ))}
    </section>
  );
}