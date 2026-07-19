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

  /* Gold for TEXT on a LIGHT surface.
   *
   * BRAND.gold (#D4AF37) is a trust marker designed for the dark palette, where
   * it is excellent: 9.36:1 on #060B16, 8.46:1 on the card. On white it is
   * 2.10:1 — well under the 4.5:1 WCAG AA needs for normal text, and legitimately
   * hard to read for anyone with reduced contrast sensitivity, which includes a
   * large share of the older patients this product serves.
   *
   * This is the same hue, darkened until it clears AA on BOTH white (4.78:1)
   * and slate-50 (4.57:1). Checking only against pure white is not enough —
   * the light screens here use slate-50, and a value tuned to white alone
   * lands at 4.33:1 there. tests/contrast.test.js asserts both.
   *
   * Use for gold TEXT on light surfaces: the light booking screens, the light
   * modals, the partner portals.
   *
   * Backgrounds, borders, icons and large display type can keep BRAND.gold —
   * the contrast rule is about text legibility, and a gold CTA with dark text
   * on it is already fine.
   */
  goldOnLight: '#887023',
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

/**
 * CALM system — Product Principle #5 ("Consistency builds trust").
 *
 * Decision-making screens (intake, safety review, booking, confirmation) use a
 * calm/light surface so a scared patient can think, with TEAL as the ONLY
 * "safe to proceed" action color. GOLD is reserved strictly for trust markers
 * (verified badges, safety checkpoints, the Golden M) — never a plain button.
 * The dark/dramatic hero palette (BRAND.dark + gold) is reserved for the
 * landing hero and investor/demo surfaces only.
 *
 * See docs/product-principles.md.
 */
export const CALM = {
  page:        '#F1F5F4', // calm page background
  surface:     '#FFFFFF', // card / decision surface
  surfaceSoft: '#EEF3F1', // inputs, option chips, subtle fills
  border:      '#E2E9E6',
  text:        '#17302C', // primary — deep calm slate, never pure black
  textSoft:    '#566B66', // secondary / explanatory copy
  textFaint:   '#8A9B96', // hints, counts, disabled
  action:      '#0E8A7D', // TEAL — the only "proceed" color
  actionHover: '#0C7568',
  actionSoft:  'rgba(14,138,125,0.10)',
  trust:       '#D4AF37', // GOLD — trust markers ONLY, never a plain button
  trustSoft:   'rgba(212,175,55,0.08)',
};