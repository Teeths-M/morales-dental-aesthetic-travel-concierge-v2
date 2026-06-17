/**
 * Brand Design Tokens
 * Single source of truth for brand colours used in JS/JSX.
 * CSS-level tokens live in index.css — keep these in sync.
 * 
 * Usage: import { BRAND } from '@/lib/brandTokens';
 * DO NOT hardcode colors like '#D4AF37' in components.
 */

export const BRAND = {
  gold: '#D4AF37',
  dark: '#060B16',
  darkCard: '#0A101D',
  emerald: '#29483d',
  emeraldLight: '#40514a',
  cream: '#F5F7F4',
  goldAlpha: (opacity) => `rgba(212,175,55,${opacity})`,
  darkAlpha: (opacity) => `rgba(6,11,22,${opacity})`,
  emeraldAlpha: (opacity) => `rgba(41,72,61,${opacity})`,
};

// Pre-computed style objects to avoid per-render allocation
export const BRAND_STYLES = {
  goldText: { color: BRAND.gold },
  goldBg: { backgroundColor: BRAND.gold },
  darkBg: { backgroundColor: BRAND.dark },
  emeraldBg: { backgroundColor: BRAND.emerald },
};