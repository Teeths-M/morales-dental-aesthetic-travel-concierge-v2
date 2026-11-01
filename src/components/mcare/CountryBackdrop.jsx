import React, { useState } from 'react';
import { backdropFor } from '@/lib/destinationBackdrops';
import { NIGHT } from './panelPalette';

/**
 * CountryBackdrop — the photo of the visitor's country behind the top of the
 * M-Safe screen (Portia's north-star mockup, 2026-11-01). Purely decorative:
 * hidden from screen readers, never blocks a tap (pointer-events: none), and
 * when there's no photo for the country, or it fails to load, the navy night
 * sky underneath is what shows.
 *
 * The caller places it as the first child of a `position: relative` block;
 * the content after it must sit above it (position: relative; z-index: 1).
 */

const NIGHT_SKY = `radial-gradient(120% 70% at 85% 0%, rgba(212,175,55,0.16), transparent 55%),
  radial-gradient(90% 60% at 0% 10%, rgba(41,72,140,0.35), transparent 60%),
  linear-gradient(180deg, #0B1630 0%, ${NIGHT.canvas} 100%)`;

export default function CountryBackdrop({ code }) {
  const backdrop = backdropFor(code);
  const src = backdrop?.src || null;
  // Keyed by the photo's own address, so a new country's photo stays hidden
  // until it has loaded (no flash of a half-drawn image).
  const [loadedSrc, setLoadedSrc] = useState(null);
  const [failedSrc, setFailedSrc] = useState(null);

  const showPhoto = !!src && failedSrc !== src;

  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none', background: NIGHT_SKY }}>
      {showPhoto && (
        <img
          src={src}
          alt=""
          decoding="async"
          onLoad={() => setLoadedSrc(src)}
          onError={() => setFailedSrc(src)}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: backdrop.position || 'center 40%',
            opacity: loadedSrc === src ? 1 : 0, transition: 'opacity 0.6s ease',
          }}
        />
      )}
      {/* Readable text over any photo: darker under the status bar and header,
          lighter through the middle, solid navy at the bottom so the photo melts
          into the chat below. */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(6,11,22,0.74) 0%, rgba(6,11,22,0.2) 24%, rgba(6,11,22,0.3) 55%, rgba(6,11,22,0.8) 80%, ${NIGHT.canvas} 100%)` }} />
      {/* A soft shade on the left keeps the robot and its gold rings crisp
          against a bright sky. */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(6,11,22,0.48) 0%, rgba(6,11,22,0.08) 45%, rgba(6,11,22,0) 65%)' }} />
    </div>
  );
}
