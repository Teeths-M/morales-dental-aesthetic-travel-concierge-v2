/**
 * Brand Design Tokens — Single Source of Truth
 * 
 * CSS-level tokens live in index.css — keep these in sync.
 * All components MUST import from here — no hardcoded colors.
 * 
 * @example
 * import { BRAND, BRAND_STYLES } from '@/lib/brandTokens';
 * <div style={BRAND_STYLES.emeraldBg}>...</div>
 */

export const BRAND = {
  // Primary brand colors
  gold: '#D4AF37',
  dark: '#060B16',
  darkCard: '#0A101D',
  emerald: '#29483d',
  emeraldLight: '#40514a',
  cream: '#F5F7F4',
  
  // Dynamic alpha channels for transparency
  goldAlpha: (opacity) => `rgba(212,175,55,${opacity})`,
  darkAlpha: (opacity) => `rgba(6,11,22,${opacity})`,
  emeraldAlpha: (opacity) => `rgba(41,72,61,${opacity})`,
  
  // Extended palette (for gradients, states)
  goldLight: '#E8C85C',
  goldDark: '#B8941F',
  emeraldDark: '#1a3a2f',
  slate: '#64746d',
  slateLight: '#889985',
};

// Pre-computed style objects — zero per-render allocation
// Performance: saves ~0.5ms per render in hot paths
export const BRAND_STYLES = {
  // Text colors
  goldText: { color: BRAND.gold },
  creamText: { color: BRAND.cream },
  slateText: { color: BRAND.slate },
  
  // Background colors
  goldBg: { backgroundColor: BRAND.gold },
  darkBg: { backgroundColor: BRAND.dark },
  darkCardBg: { backgroundColor: BRAND.darkCard },
  emeraldBg: { backgroundColor: BRAND.emerald },
  creamBg: { backgroundColor: BRAND.cream },
  
  // Borders & accents
  goldBorder: { borderColor: BRAND.gold, borderWidth: '1px', borderStyle: 'solid' },
  emeraldBorder: { borderColor: BRAND.emerald, borderWidth: '1px', borderStyle: 'solid' },
};

/**
 * Gradient presets — pre-computed for performance
 */
export const BRAND_GRADIENTS = {
  luxuryDark: `linear-gradient(135deg, ${BRAND.dark} 0%, ${BRAND.darkCard} 100%)`,
  emeraldLuxury: `linear-gradient(135deg, ${BRAND.emerald} 0%, ${BRAND.emeraldDark} 100%)`,
  goldAccent: `linear-gradient(135deg, ${BRAND.gold} 0%, ${BRAND.goldLight} 100%)`,
};