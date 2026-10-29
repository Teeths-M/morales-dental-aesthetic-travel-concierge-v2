import { useEffect, useState } from 'react';

/**
 * The same photograph, twice.
 *
 * The second frame is the first with one distant figure added, generated from it
 * so the two register exactly. Nothing moves between them except the figure's
 * presence and a small amount of exposure — so the change reads as someone
 * arriving down the corridor rather than as a second image loading.
 */
const CORRIDOR = 'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/69b1227fa_generated_image.png';
const CORRIDOR_WITH_FIGURE = 'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/3dd8b96f3_generated_image.png';

/**
 * HeroCorridor — the only image on the page, and the whole product in one gesture.
 *
 * At rest the corridor is empty. A few pixels of scroll and someone appears at
 * the far end, over the better part of four seconds, while the corridor lifts
 * slightly out of the dark. It happens once and it never reverses: it is not a
 * slideshow, and it is not a loop.
 */
export default function HeroCorridor() {
  const [awake, setAwake] = useState(false);

  useEffect(() => {
    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    if (reduced) {
      setAwake(true);
      return undefined;
    }

    const onScroll = () => {
      if (window.scrollY > 30) {
        setAwake(true);
        window.removeEventListener('scroll', onScroll);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <img
        src={CORRIDOR}
        alt=""
        className={`mp-hero-img mp-plate ${awake ? 'mp-plate--awake' : ''}`}
        fetchPriority="high"
      />
      <img
        src={CORRIDOR_WITH_FIGURE}
        alt=""
        className={`mp-hero-img mp-figure ${awake ? 'mp-figure--awake' : ''}`}
      />
      <div className="mp-veil" />
    </div>
  );
}