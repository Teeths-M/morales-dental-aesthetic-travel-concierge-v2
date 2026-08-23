// isSandboxed — detects when the app is running inside a restricted preview
// iframe / sandbox where the browser blocks the native geolocation permission
// prompt. In that context getCurrentPosition neither succeeds nor fires a
// usable error — it hangs — so the only honest thing to do is tell the user
// the prompt will never appear here and to use the live version instead.
//
// CRITICAL: if window.self === window.top (we're NOT in an iframe), the app
// is running in its own top-level browser tab and native GPS prompts will
// work normally — return false immediately regardless of the hostname. The
// *.base44.app hostname pattern is NOT sufficient on its own to declare
// sandbox mode, because published apps live on exactly that domain and need
// real GPS to work there.

const SANDBOX_HOST_PATTERNS = [
  /preview/i,
  /sandbox/i,
  /stackblitz/i,
  /codesandbox/i,
  /webcontainer/i,
  /localtunnel/i,
  /ngrok/i,
  /glitch/i,
  /replit/i,
];

export function isSandboxed() {
  if (typeof window === 'undefined') return false;

  // 1. Canonical iframe check — the ONLY reliable signal. If we're the
  // top-level window (self === top), we are NOT sandboxed, period. A
  // published app on *.base44.app running in its own tab must get real GPS.
  try {
    if (window.self === window.top) {
      return false;
    }
  } catch (_) {
    // Cross-origin access to window.top threw — we ARE framed (cross-origin
    // iframe). Fall through to return true below.
    return true;
  }

  // If we get here, window.self !== window.top — we're inside an iframe.
  // That's the restricted context where geolocation prompts are blocked.
  return true;
}

export default isSandboxed;