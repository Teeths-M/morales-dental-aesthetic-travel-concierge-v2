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

/**
 * The hero film: a wordless 18.8-second loop cut from ad 23's real footage (free
 * Pixabay clips, posed by models, never presented as M-Care customers). Night to
 * gold: a hotel corridor, awake in bed, a night drive, a doctor, two hands meeting
 * at sunset, a plane wing at sunrise, then back to the corridor so the loop has no
 * visible seam. 1920x1080, no sound, index first, 2.2 MB (the captioned ad it
 * replaces was 55 MB). Background films must never contain words: the old hero
 * was the finished ad, so its captions repeated the headline behind the heading.
 */
export const HERO_VIDEO = '/video/hero-film.mp4';
/** First frame of the hero film, shown while it loads or when a phone blocks video. */
export const HERO_POSTER = '/video/hero-film-poster.jpg';

/** The demonstration film — the ground behind the M-Safe workspace. */
export const DEMO_VIDEO =
  'https://media.base44.com/videos/public/6a01c1305c540b75f24dd373/c4f9da0f6_s4.mp4';

/** The pilot film — the closing section's ground. */
export const PILOT_VIDEO =
  'https://media.base44.com/videos/public/6a01c1305c540b75f24dd373/8bf574b87_Lisahappyend.mp4';

/**
 * Phone versions of the three films, served from the app's own /public folder.
 * A phone can't start the full films reliably: the demo film keeps its index at
 * the END of the file, so a phone must download all 16 MB before showing a frame.
 * These are the same films at phone size, no soundtrack, index first. The hero's
 * phone version is its own upright 720x1280 cut (each shot re-framed for a tall
 * screen), 0.9 MB. Demo 2.4 MB, pilot 0.5 MB. Computers keep the originals above.
 */
export const HERO_VIDEO_MOBILE = '/video/hero-film-mobile.mp4';
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