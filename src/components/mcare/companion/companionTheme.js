/**
 * The exact palette sampled from the supplied M-Care reference screen.
 *
 * These are literal values rather than theme tokens on purpose: this screen has
 * to match one specific artwork, and the app's semantic tokens (which the rest
 * of the product understands in day/night terms) describe a different visual
 * language. Nothing outside this folder should import from here.
 */
export const C = {
  bg: '#020D1C',
  bgDeep: '#010916',

  gold: '#D4A860',
  goldLight: '#F8D58C',
  goldDeep: '#8A6A2F',
  goldFaint: 'rgba(212, 168, 96, 0.30)',
  goldHairline: 'rgba(212, 168, 96, 0.34)',

  teal: '#2EBC7A',
  warn: '#F4B400',

  text: '#FFFFFF',
  textSoft: 'rgba(255, 255, 255, 0.80)',
  textMuted: 'rgba(255, 255, 255, 0.60)',
  textFaint: 'rgba(255, 255, 255, 0.42)',

  card: 'rgba(13, 15, 20, 0.62)',
  cardEdge: '1px solid rgba(212, 168, 96, 0.28)',

  font: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
  fontDisplay: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
};