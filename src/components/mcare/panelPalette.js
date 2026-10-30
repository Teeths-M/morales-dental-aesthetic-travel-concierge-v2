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