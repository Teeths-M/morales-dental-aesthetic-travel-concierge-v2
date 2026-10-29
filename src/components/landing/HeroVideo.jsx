import { useEffect, useRef, useState } from 'react';
import { NAVY, CORRIDOR_EMPTY, HERO_VIDEO } from './theme';

/**
 * HeroVideo — the first thing a visitor sees: the film, full-bleed, already
 * running behind the question.
 *
 * Three practical rules are baked in, because a video hero that breaks them
 * fails loudly on a real phone:
 *
 * 1. `muted` + `playsInline` + `autoPlay` is the only combination iOS and
 *    Android will start without a tap. Sound is never offered here — this is a
 *    background scene, not a trailer.
 * 2. The corridor still-frame sits UNDERNEATH as a poster, so the first paint
 *    is a photograph rather than a black rectangle, and it stays as the scene
 *    if the video cannot be fetched at all.
 * 3. Under prefers-reduced-motion the video is never played: the still frame
 *    stands in for it. The hero reads identically; nothing moves for someone
 *    who asked for no movement.
 *
 * Purely decorative — no controls, no captions, hidden from assistive tech.
 * Everything a visitor needs to read lives in LandingHero's own copy.
 */
export default function HeroVideo() {
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
    // worth surfacing: the poster frame is a complete hero on its own.
    el.play?.().catch(() => {});
  }, [reduced]);

  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: NAVY }}>
      {/* Poster — real pixels on first frame, and the permanent fallback. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${CORRIDOR_EMPTY})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 42%',
          backgroundRepeat: 'no-repeat',
        }}
      />

      <video
        ref={videoRef}
        src={HERO_VIDEO}
        poster={CORRIDOR_EMPTY}
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
          objectPosition: 'center 42%',
          opacity: reduced ? 0 : 1,
          transition: 'opacity 600ms ease',
        }}
      />

      {/* Scrims: the film stays visible, the white copy stays readable. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(100deg, rgba(4,7,14,0.86) 0%, rgba(4,7,14,0.58) 46%, rgba(4,7,14,0.24) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 26%, rgba(4,7,14,0.48) 76%, rgba(4,7,14,0.82) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 'auto 0 0 0',
          height: '38%',
          background: `linear-gradient(to bottom, rgba(6,11,22,0) 0%, ${NAVY} 92%)`,
        }}
      />
    </div>
  );
}