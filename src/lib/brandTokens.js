/**
 * Brand Design Tokens
 * Single source of truth for brand colours used in JS/JSX.
 * CSS-level tokens live in index.css — keep these in sync.
 */

export const BRAND = {
  gold: '#D4AF37',
  dark: '#060B16',
  darkCard: '#0A101D',
  goldAlpha: (opacity) => `rgba(212,175,55,${opacity})`,
  darkAlpha: (opacity) => `rgba(6,11,22,${opacity})`,
};