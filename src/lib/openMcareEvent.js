/**
 * Cross-tree signal to open M-Care ("M-Safe") from anywhere: "the user asked
 * to talk to M-Care, open the panel now." Same pattern as struggleHint.js's
 * STRUGGLE_HINT_EVENT — a plain window event, deliberately NOT React context,
 * since the orb is a singleton mounted once in AppLayout while the trigger
 * (a navbar button, a page CTA) can come from anywhere in the tree with no
 * reason to be wired to a shared provider.
 *
 * Unlike the `?mcare=open` deep-link (which only fires once per page load
 * via a ref guard), this is a plain event — safe to dispatch repeatedly, any
 * time, from any page.
 */
export const MCARE_OPEN_EVENT = 'morales-mcare-open';

export function emitOpenMcare() {
  window.dispatchEvent(new CustomEvent(MCARE_OPEN_EVENT));
}
