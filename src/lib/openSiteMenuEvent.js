/**
 * Cross-tree signal to open the site's real navigation menu from anywhere —
 * the exact reverse of openMcareEvent.js's MCARE_OPEN_EVENT (Header → open
 * M-Care). This direction exists for the new mobile M-Care hamburger button
 * (MCareOrb.jsx): tapping it should open Header.jsx's own real full-screen
 * nav tray, not a second, separate menu.
 *
 * Same plain-window-event pattern as MCARE_OPEN_EVENT and struggleHint.js's
 * STRUGGLE_HINT_EVENT — deliberately not React context, since Header is a
 * singleton mounted once in AppLayout while the trigger (M-Care's own header
 * row) lives deep in a different, unrelated component tree with no reason to
 * be wired to a shared provider. Header.jsx's full-screen tray renders at a
 * higher z-index (z-[9999]) than M-Care's panel (z-9001), so it correctly
 * appears on top of the still-mounted M-Care panel when triggered this way —
 * closing the tray reveals M-Care again underneath, nothing is torn down.
 */
export const SITE_MENU_OPEN_EVENT = 'morales-site-menu-open';

export function emitOpenSiteMenu() {
  window.dispatchEvent(new CustomEvent(SITE_MENU_OPEN_EVENT));
}
