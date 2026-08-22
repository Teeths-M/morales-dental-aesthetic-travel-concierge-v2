// isSandboxed — detects when the app is running inside a restricted preview
// iframe / sandbox where the browser blocks the native geolocation permission
// prompt. In that context getCurrentPosition neither succeeds nor fires a
// usable error — it hangs — so the only honest thing to do is tell the user
// the prompt will never appear here and to use the live version instead.
//
// Two complementary signals (either is sufficient):
//   1. window.self !== window.top — the canonical "we're inside an iframe"
//      check. The Base44 builder/preview renders the app in a cross-origin
//      iframe whose Permissions-Policy disallows geolocation, which is exactly
//      what suppresses the native prompt. Accessing window.top across
//      origins can throw, so the check is try/catch-guarded (a throw itself
//      proves we're framed and cross-origin).
//   2. Known preview/sandbox hostname patterns — a belt-and-suspenders signal
//      for cases where the iframe check is inconclusive (e.g. a sandboxed
//      top-level preview document). Kept deliberately narrow so a real
//      published app on a custom domain never matches.

const SANDBOX_HOST_PATTERNS = [
  /preview-sandbox/i,
];

export function isSandboxed() {
  if (typeof window === 'undefined') return false;
  try {
    if (window.self !== window.top) return true;
  } catch (_) {
    // Cross-origin access to window.top threw — we are definitely framed.
    return true;
  }
  const host = (window.location?.hostname || '') + ' ' + (document.referrer || '');
  return SANDBOX_HOST_PATTERNS.some((re) => re.test(host));
}

export default isSandboxed;