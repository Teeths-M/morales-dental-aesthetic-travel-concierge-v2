/**
 * M-Care's ?mcare=… links. open is a shared "land straight in the chat" link; pilot and partner are the QR codes at
 * the end of the ads (/?mcare=pilot&src=ad31). They used to open M-Care over whatever page they named. Now that M-Care
 * has its own full-screen screen (/m-care), AppLayout sends them there instead, so nothing of the website loads
 * behind M-Care.
 */
export const MCARE_DEEP_LINK_MODES = new Set(['open', 'pilot', 'partner']);

// Pages where M-Care stays out of the way (a booking or payment in progress, the emergency screens): the floating
// M-Care doesn't offer tips there and a ?mcare=… link doesn't take over the page.
export const MCARE_QUIET_ROUTES = [
  '/booking', '/intake', '/travel-intake', '/medical-intake',
  '/checkout', '/payment', '/passport-vault', '/vault',
  '/emergency', '/sos', '/safe-t',
];

export const isMcareQuietRoute = (pathname) => MCARE_QUIET_ROUTES.some((p) => (pathname || '').startsWith(p));

/** The ?mcare= mode a query string asks for ('open' | 'pilot' | 'partner'), or null for anything else. */
export function mcareDeepLinkMode(search) {
  const mode = new URLSearchParams(search || '').get('mcare');
  return MCARE_DEEP_LINK_MODES.has(mode) ? mode : null;
}
