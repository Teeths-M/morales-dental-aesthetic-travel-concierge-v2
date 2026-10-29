import { useEffect, useRef, useState } from 'react';
import { NAVY } from './theme';

/**
 * AmbientVideo — a muted, looping film used as the ground of a landing section.
 *
 * Two surfaces use it, and they need different light: the hero holds white copy
 * bottom-left over a moving corridor, while the pilot section holds a centred
 * column of text straight over the picture. So the scrim is chosen by variant
 * rather than repeated at each call site.
 *
 * Three practical rules are baked in, because a background video that breaks
 * them fails loudly on a real phone:
 *
 * 1. `muted` + `playsInline` + `autoPlay` is the only combination iOS and
 *    Android will start without a tap. No sound is ever offered — this is
 *    scenery, not a trailer.
 * 2. An optional still frame sits UNDERNEATH as a poster, so the first paint is
 *    a photograph rather than a black rectangle, and it remains the scene if
 *    the video cannot be fetched. Without one the section's own navy shows.
 * 3. Under prefers-reduced-motion the video never plays: the poster (or plain
 *    navy) stands in. The section reads identically, nothing moves for someone
 *    who asked for no movement.
 *
 * Purely decorative — no controls, no captions, hidden from assistive tech.
 * Everything a visitor needs to read lives in the section's own copy.
 */
export default function AmbientVideo({ src, poster, variant = 'hero', objectPosition = 'center 42%' }) {
  const videoRef = useRef(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = (event) => setReduced(event.matches);
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (reduced) {
      el.pause();
      return;
    }
    // A refused play() (Low Power Mode, a data-saver browser) is not an error
    // worth surfacing: the still frame is a complete section on its own.
    el.play?.().catch(() => {});
  }, [reduced]);

  const scrims = {
    // Dark from the left where the question sits, open on the right so the film
    // is still visible, and faded into the navy so the next section joins it.
    hero: [
      'linear-gradient(100deg, rgba(4,7,14,0.86) 0%, rgba(4,7,14,0.58) 46%, rgba(4,7,14,0.24) 100%)',
      'radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 26%, rgba(4,7,14,0.48) 76%, rgba(4,7,14,0.82) 100%)',
    ],
    // Text sits across the whole width here, so the film is held back evenly
    // instead of side-to-side. Still moving, still visible, never competing.
    panel: [
      'linear-gradient(180deg, rgba(6,11,22,0.80) 0%, rgba(6,11,22,0.74) 55%, rgba(6,11,22,0.88) 100%)',
    ],
  };

  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: NAVY }}>
      {poster && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${poster})`,
            backgroundSize: 'cover',
            backgroundPosition: objectPosition,
            backgroundRepeat: 'no-repeat',
          }}
        />
      )}

      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        autoPlay
        preload="metadata"
        disablePictureInPicture
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition,
          opacity: reduced ? 0 : 1,
          transition: 'opacity 600ms ease',
        }}
      />

      {(scrims[variant] || scrims.hero).map((background) => (
        <div key={background} style={{ position: 'absolute', inset: 0, background }} />
      ))}

      {/* The film always dissolves into the navy at the bottom edge, so no
          section boundary ever shows a hard cut. */}
      <div
        style={{
          position: 'absolute',
          inset: 'auto 0 0 0',
          height: variant === 'hero' ? '38%' : '28%',
          background: `linear-gradient(to bottom, rgba(6,11,22,0) 0%, ${NAVY} 92%)`,
        }}
      />
    </div>
  );
}