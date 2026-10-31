import { useEffect, useRef, useState } from 'react';
import { CORRIDOR_EMPTY, CORRIDOR_FIGURE, NAVY } from './theme';

/**
 * CorridorScene — one continuous photograph, not a slideshow.
 *
 * Two frames of the SAME corridor: empty, and with one distant figure. Scrolling
 * cross-fades between them and lifts the darkness slightly, which reads as the
 * corridor brightening and someone walking towards you. There is no second scene
 * and no cut — the hero is a single shot that develops.
 *
 * Two deliberate engineering choices:
 *
 * 1. The whole animation is written straight to DOM style from inside a
 *    requestAnimationFrame callback. Putting 60fps scroll into React state would
 *    re-render this subtree on every frame of every scroll.
 * 2. Under prefers-reduced-motion there is no listener at all. The figure is
 *    simply already there at a readable opacity, so the scene still makes sense
 *    without any motion.
 *
 * Both frames sit inside one slowly drifting layer, so the first screen is never
 * a frozen photograph, and the two frames always stay lined up for the cross-fade.
 */
export default function CorridorScene({ sectionRef }) {
  const figureRef = useRef(null);
  const dimRef = useRef(null);
  const [reduced] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  );

  useEffect(() => {
    // Second frame is loaded eagerly after mount so the reveal never stutters
    // on the scroll that triggers it.
    const preload = new Image();
    preload.src = CORRIDOR_FIGURE;

    const reduce = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    if (reduce) {
      if (figureRef.current) figureRef.current.style.opacity = '0.5';
      if (dimRef.current) dimRef.current.style.opacity = '0.38';
      return undefined;
    }

    let frame = 0;

    const paint = () => {
      frame = 0;
      const el = sectionRef?.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const height = rect.height || window.innerHeight || 1;

      // 0 while the hero is untouched, 1 once it has fully scrolled past.
      const raw = -rect.top / height;
      const progress = Math.min(1, Math.max(0, raw));

      // The reveal belongs to the first three quarters of the hero's exit, so
      // the figure is already present by the time the headline leaves.
      const p = Math.min(1, progress / 0.72);
      const eased = 1 - Math.pow(1 - p, 3);

      if (figureRef.current) {
        figureRef.current.style.opacity = String(eased * 0.92);
        figureRef.current.style.transform = `scale(${1 + eased * 0.05})`;
      }
      if (dimRef.current) {
        // 0.50 → 0.26: the corridor brightens as you descend into it. The
        // left-side gradient below still holds the headline's contrast; this
        // layer only sets how much of the corridor itself shows.
        dimRef.current.style.opacity = String(0.5 - eased * 0.24);
      }
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(paint);
    };

    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [sectionRef]);

  /** @type {React.CSSProperties} */
  const layer = {
    position: 'absolute',
    inset: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center 42%',
    backgroundRepeat: 'no-repeat',
  };

  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: NAVY }}>
      <style>{'@keyframes corridorDrift { from { transform: scale(1.03) translate(0, 0); } to { transform: scale(1.1) translate(-1.5%, -1%); } }'}</style>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          animation: reduced ? 'none' : 'corridorDrift 26s ease-in-out infinite alternate',
          willChange: 'transform',
        }}
      >
        {/* The empty corridor. Always present. */}
        <div style={{ ...layer, backgroundImage: `url(${CORRIDOR_EMPTY})` }} />

        {/* The same corridor, one figure further down it. Cross-faded in on scroll. */}
        <div
          ref={figureRef}
          style={{
            ...layer,
            backgroundImage: `url(${CORRIDOR_FIGURE})`,
            opacity: 0,
            transformOrigin: 'center 45%',
            transition: 'opacity 0.15s linear',
            willChange: 'opacity, transform',
          }}
        />
      </div>

      {/* Darkness. Lifts as the scene develops, but never enough to cost the
          white text its contrast. */}
      <div
        ref={dimRef}
        style={{ position: 'absolute', inset: 0, background: NAVY, opacity: 0.5 }}
      />

      {/* Vignette — pulls the eye down the centre of the corridor and stops the
          corners going flat as the figure comes forward. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 28%, rgba(4,7,14,0.52) 76%, rgba(4,7,14,0.86) 100%)',
        }}
      />

      {/* Readability gradient under the copy, plus a seamless join into the
          transcript section below so the scene has no visible edge. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(100deg, rgba(4,7,14,0.92) 0%, rgba(4,7,14,0.62) 46%, rgba(4,7,14,0.30) 100%)',
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