/**
 * Palette for the M-Safe+ screen, taken from the supplied reference artwork.
 *
 * Scoped to this folder on purpose: the rest of the app carries its own
 * day/night tokens, and this screen is a single, deliberate midnight surface.
 */
export const P = {
  bg: '#0A1420',
  bgLift: '#0D1A28',
  card: 'rgba(255,255,255,0.035)',
  border: 'rgba(197,160,89,0.30)',
  borderStrong: 'rgba(197,160,89,0.55)',
  gold: '#C5A059',
  goldBright: '#E2C489',
  text: '#FFFFFF',
  muted: '#A0AAB8',

  // The LIVE SESSION pill: a pale mint dot on a dark green field.
  mint: '#7FD1A6',
  mintBg: 'rgba(22,163,74,0.22)',
  mintText: '#B9F0CE',

  font: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
  fontDisplay: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
  fontSerif: '"Cormorant Garamond", Georgia, "Times New Roman", serif',
};