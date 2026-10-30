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
 * Rules baked in, because a background video that breaks them fails loudly on a
 * real phone:
 *
 * 1. `muted` + `playsInline` + `autoPlay` is the only combination iOS and
 *    Android will start without a tap. No sound is ever offered — this is
 *    scenery, not a trailer.
 * 2. An optional still frame sits UNDERNEATH as a poster, so the first paint is
 *    a photograph rather than a black rectangle, and it remains the scene if the
 *    video cannot be fetched. Without one the section's own navy shows.
 * 3. Under prefers-reduced-motion the video never plays: the poster (or plain
 *    navy) stands in.
 *
 * MOBILE: one attempt at play() is not enough. These films are tens of megabytes,
 * so on a phone the element is still fetching when the first play() lands and the
 * browser refuses it (NotAllowedError / AbortError) — silently, on desktop it
 * simply starts. The refusal used to be swallowed, leaving the poster on screen
 * forever. So playback is now re-attempted on every media event that means "there
 * is now something to play", on a short backoff, and once on the first touch or
 * scroll (which also covers iOS Low Power Mode, where autoplay is blocked until
 * the visitor interacts). The film fades in only when a frame is actually
 * rendering, so a stalled load looks like a photograph, never a black box.
 *
 * Purely decorative — no controls, no captions, hidden from assistive tech.
 * Everything a visitor needs to read lives in the section's own copy.
 */
export default function AmbientVideo({ src, poster, variant = 'hero', objectPosition = 'center 42%' }) {
  const videoRef = useRef(null);
  const [reduced, setReduced] = useState(false);
  const [playing, setPlaying] = useState(false);

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

    // React applies `muted` as a property, but some older WebViews (and the
    // shipped Capacitor shells) only honour the attribute, and an unmuted video
    // is never allowed to autoplay. Setting both is the difference between a
    // film and a frozen frame there.
    el.muted = true;
    el.defaultMuted = true;
    el.setAttribute('muted', '');
    el.setAttribute('playsinline', '');
    el.setAttribute('webkit-playsinline', '');

    let cancelled = false;

    const attempt = () => {
      if (cancelled) return;
      el.play?.().catch(() => {
        // Not an error to surface — the poster is a complete section. The
        // listeners below try again the moment the element is ready.
      });
    };

    // Each of these means "more of the film exists now than last time".
    const onReady = () => { if (el.paused) attempt(); };
    const onPlaying = () => setPlaying(true);

    const MEDIA_EVENTS = ['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough', 'suspend', 'stalled'];
    MEDIA_EVENTS.forEach((name) => el.addEventListener(name, onReady));
    el.addEventListener('playing', onPlaying);

    attempt();

    // Backoff retries, because on a slow connection the element can be ready
    // without firing anything we listen for between attempts.
    const timeouts = [600, 1800, 4000].map((ms) => setTimeout(attempt, ms));

    // Last resort, and the only path on iOS Low Power Mode: the first
    // interaction anywhere starts it. One-shot, removed as soon as it works.
    const GESTURES = ['touchstart', 'pointerdown', 'click', 'scroll', 'keydown'];
    const onGesture = () => {
      attempt();
      if (!el.paused) GESTURES.forEach((name) => window.removeEventListener(name, onGesture));
    };
    GESTURES.forEach((name) => window.addEventListener(name, onGesture, { passive: true }));

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
      MEDIA_EVENTS.forEach((name) => el.removeEventListener(name, onReady));
      el.removeEventListener('playing', onPlaying);
      GESTURES.forEach((name) => window.removeEventListener(name, onGesture));
    };
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
        // "metadata" is enough on a desktop connection. On a phone the film is
        // tens of megabytes and iOS will not begin until it has been asked to
        // buffer in earnest, so the mobile path asks for the data up front.
        preload="auto"
        disablePictureInPicture
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition,
          // Fade in only once a frame is truly rendering: while a big film is
          // still arriving the poster behind stays visible, instead of the
          // black box an empty <video> would paint over it.
          opacity: reduced || !playing ? 0 : 1,
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