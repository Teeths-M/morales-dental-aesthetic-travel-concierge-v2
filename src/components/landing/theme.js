/**
 * The landing page's palette, in one place.
 *
 * These are literal hexes rather than the app's semantic tokens because this
 * surface is deliberately a different medium: a dark, cinematic photograph
 * rather than a product screen. The rest of the product keeps its tokens
 * untouched; nothing here leaks into any other route.
 */
export const NAVY = '#060B16';
export const NAVY_DEEP = '#04070E';
export const WHITE = '#FFFFFF';
export const GOLD = '#D4AF37';

// Reserved for exactly two things: the answer in the hero, and genuinely
// important warnings inside the transcript. Never used as decoration.
export const RED = '#FF4B4B';

export const BODY = 'rgba(255,255,255,0.70)';
// 0.55 rather than 0.44. This value carries 11.5px captions and footnotes, so
// it has to clear AA for normal text, not just look calm. Composited over the
// deep navy it is 6.3:1; at 0.44 it was 4.35:1, just under the 4.5 line.
export const MUTED = 'rgba(255,255,255,0.55)';
export const HAIRLINE = 'rgba(255,255,255,0.10)';
export const CARD = 'rgba(255,255,255,0.04)';

export const SERIF = 'Georgia, "Times New Roman", serif';
export const SANS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif';

/** The hero film — full-bleed, muted, looping behind the question. */
export const HERO_VIDEO =
  'https://media.base44.com/videos/public/6a01c1305c540b75f24dd373/54fd2ace2_23-WhoWouldKnow58s.mp4';

/** The demonstration film — the ground behind the M-Safe workspace. */
export const DEMO_VIDEO =
  'https://media.base44.com/videos/public/6a01c1305c540b75f24dd373/c4f9da0f6_s4.mp4';

/** The pilot film — the closing section's ground. */
export const PILOT_VIDEO =
  'https://media.base44.com/videos/public/6a01c1305c540b75f24dd373/8bf574b87_Lisahappyend.mp4';

/**
 * Phone versions of the three films, served from the app's own /public folder.
 * A phone can't start the full films reliably: the hero is a 55 MB, 58-second
 * ad with sound, and the demo film keeps its index at the END of the file, so a
 * phone must download all 16 MB before showing a frame. These are the same films
 * at phone size, no soundtrack (it's muted anyway), index first: 2.7, 2.4 and
 * 0.5 MB. Computers and tablets keep the originals above.
 */
export const HERO_VIDEO_MOBILE = '/video/hero-mobile.mp4';
export const DEMO_VIDEO_MOBILE = '/video/demo-mobile.mp4';
export const PILOT_VIDEO_MOBILE = '/video/pilot-mobile.mp4';
/** Stills for the two films that had none, so a blocked or loading film still shows the scene. */
export const DEMO_POSTER = '/video/demo-poster.jpg';
export const PILOT_POSTER = '/video/pilot-poster.jpg';
/** The two corridor frames. Empty hall, then one distant figure. */
export const CORRIDOR_EMPTY =
  'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/0e05bf9b3_generated_image.png';
export const CORRIDOR_FIGURE =
  'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/e0d5fa69e_generated_image.png';