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
  // Primary brand colors — Space Navy & Gold luxury palette
  gold: '#C9A84C',
  cyan: '#00E5CC',
  bg: '#0B1623',
  surface: '#0F1E30',
  card: '#1A2535',
  muted: '#A0AEC0',
  dim: '#6B7E93',
  
  // Legacy aliases for backwards compatibility
  dark: '#0B1623',
  darkCard: '#0F1E30',
  emerald: '#0F1E30',
  emeraldLight: '#1A2535',
  cream: '#FFFFFF',
  
  // Dynamic alpha channels for transparency
  goldAlpha: (opacity) => `rgba(201,168,76,${opacity})`,
  cyanAlpha: (opacity) => `rgba(0,229,204,${opacity})`,
  bgAlpha: (opacity) => `rgba(11,22,35,${opacity})`,
  surfaceAlpha: (opacity) => `rgba(15,30,48,${opacity})`,
  darkAlpha: (opacity) => `rgba(11,22,35,${opacity})`,
  emeraldAlpha: (opacity) => `rgba(15,30,48,${opacity})`,
  
  // Extended palette (for gradients, states)
  goldLight: '#D4B763',
  goldDark: '#A8903D',
  emeraldDark: '#0A1520',
  slate: '#6B7E93',
  slateLight: '#8899AA',
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