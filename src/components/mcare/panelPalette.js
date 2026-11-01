/**
 * panelPalette — the M-Care panel's own colour tokens.
 *
 * These started life as module-local constants inside MCareOrb.jsx. They moved
 * here unchanged when the capability rows were extracted into their own
 * component (CapabilityRows.jsx), which needs the exact same values: two copies
 * of a gold that is off by one hex digit is exactly the kind of drift this app
 * avoids everywhere else. Values and their reasoning are byte-identical to what
 * MCareOrb declared — nothing was restyled in the move.
 *
 * Deliberately NOT merged into msafePlusConfig.js's MSAFE_PALETTE: the hex
 * values differ slightly, and keeping them separate means that unrelated
 * file's future edits can't silently recolour this panel.
 */

// The brand gold and the dark ground the panel sits on.
export const GOLD = '#D4AF37';
export const DARK = '#060B16';

// Round 4 (2026-08-23): the open panel itself went dark, not just the floating
// button/header. These reuse this app's own established design tokens
// (CLAUDE.md's Design Tokens section — background/card/border) so the panel
// matches the rest of the product rather than inventing a new palette.
// MessageBubble.jsx / SafetyGateCard.jsx / JourneyStageTracker.jsx need none of
// these — they already source colour from Tailwind's semantic `.dark` CSS
// variables (confirmed in src/index.css), which the panel container's
// `className="dark"` activates for free.
export const PANEL_BG = '#0C1A1D';
export const CARD_BG = '#111E27';
export const BORDER_DARK = '#2A3F4A';
export const TEXT_LIGHT = '#F3F4F6';
export const TEXT_MUTED_DARK = '#9CA3AF';

// Mobile "M-Safe" light redesign (2026-08-28) — Portia's reference screenshot.
// GOLD stays #D4AF37 (reused, not replaced): visually indistinguishable from the
// screenshot's requested #D6A72E, and reusing it keeps LivingOrb's rings, the
// launcher button, and every other gold accent consistent with the
// newly-lightened mobile panel rather than a second, subtly different "gold."
// Mint/lavender are genuinely new accents, scoped to this panel's own
// surfaces rather than global brandTokens.js.
export const LIGHT_BG = '#F8FAFC';
export const LIGHT_CARD = '#FFFFFF';
export const LIGHT_BORDER = '#E5E7EB';
export const LIGHT_TEXT = '#0F172A';
export const LIGHT_TEXT_MUTED = '#64748B';
export const MINT = '#36DDB2';
export const LAVENDER = '#A78BFA';
export const GOLD_GRADIENT = 'linear-gradient(135deg, #E8C85C, #D4AF37)';

// Desktop-light "M-Safe+" luxury redesign (2026-08-29) — Portia's reference
// mockup. Used ONLY when `isDesktopPanel && !useDarkTheme`, so dark mode and
// mobile stay byte-identical to before.
export const DESKTOP_LUXURY_BG = '#F8F7F2';
export const DESKTOP_LUXURY_GOLD = '#D2A93D';
export const DESKTOP_LUXURY_USER_GRADIENT = 'linear-gradient(135deg, #F6E6BE 0%, #EAD08C 100%)';

// ── Design upgrade (2026-10-31): one set of meanings, sizes and shapes for
// every M-Safe surface, so the bottom bar, activity card and panel stop
// keeping their own copies. ──

// Gold text that stays readable on white (gold #D4AF37 itself is only ~2:1 on
// white, fine for icons and fills, too faint for words).
export const GOLD_INK = '#7A5B0E';
export const GOLD_WASH = 'rgba(212,175,55,0.14)';

// Meaning colours: green = fine, amber = look at this, red = critical only.
export const POSITIVE = '#16A34A';
export const POSITIVE_INK = '#15803D';
export const CAUTION = '#F59E0B';
export const CAUTION_INK = '#B45309';
export const CRITICAL = '#DC2626';

// The "M-Safe" wordmark: a heavy sans at every size, as in Portia's north-star
// mockup (2026-11-01; it was the brand serif from Oct 31). The brand serif
// stays for the small "M-CARE / MEDICAL TRAVEL SAFETY" logo text.
export const WORDMARK_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
export const BRAND_SERIF = 'var(--font-serif)';

// Night look for the M-Safe screen (north-star redesign, 2026-11-01). Same
// values as the app's own day/night theme, [data-msafe-theme="night"] in
// src/index.css (Portia's Base44 session, commit 787811cd), so there is one
// navy palette, not two. tests/destinationBackdrops.test.js fails if they drift.
export const NIGHT = {
  canvas: '#060B16',
  surface: '#0E1725',
  raised: '#141F30',
  border: '#22303F',
  ink: '#F3F5F7',
  muted: '#9AA6B2',
  goldInk: '#E8C85C',
  positive: '#4ADE80',
  warn: '#F2B544',
  critical: '#F87171',
};

// Frosted glass for cards that sit over the country photo: NIGHT.surface with
// transparency, plus a thin gold edge.
export const GLASS = {
  card: 'rgba(14,23,37,0.62)',
  cardStrong: 'rgba(14,23,37,0.86)',
  edge: 'rgba(212,175,55,0.24)',
  hairline: 'rgba(255,255,255,0.09)',
  blur: 'blur(16px) saturate(140%)',
  shadow: '0 12px 32px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.06)',
};

// Type scale for the panel, in px. Nothing a person must read goes below 11.
export const TYPE = {
  wordmarkMobile: 23,
  wordmarkDesktop: 28,
  subtitle: 12.5,
  body: 14,
  chip: 13,
  meta: 11.5,
  label: 11,
};

// Shapes: bubbles and cards are soft rectangles, controls are round.
export const RADIUS = { bubble: 16, card: 18, pill: 999 };

// Smallest tap target for icon buttons (Apple and Google both ask 44; 40 is
// the floor used for the dense header row).
export const TOUCH = 40;