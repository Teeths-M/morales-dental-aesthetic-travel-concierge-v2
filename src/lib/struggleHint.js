/**
 * Cross-tree signal from a form field/step to PlatformGuideOrb ("Morales
 * Guide"): "someone's stuck here, show this specific hint now." Same
 * pattern as i18n.js's `languageChange` window event — a single emit
 * function so nothing dispatches the raw event by hand.
 *
 * Deliberately NOT React context: the orb is a singleton mounted once in
 * AppLayout, while struggle signals originate from arbitrary form fields
 * deep in the tree (Login, signup wizards) that have no reason to be
 * wired to the orb's provider otherwise.
 */
export const STRUGGLE_HINT_EVENT = 'morales-struggle-hint';

/** emoji: single glyph. text: plain-language, specific to the field/error. */
export function emitStruggleHint(emoji, text) {
  window.dispatchEvent(new CustomEvent(STRUGGLE_HINT_EVENT, { detail: { emoji, text } }));
}
