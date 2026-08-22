// isSandboxed — aggressively detects when the app is running inside a
// restricted preview iframe / sandbox where the browser blocks the native
// geolocation permission prompt. In that context getCurrentPosition neither
// succeeds nor fires a usable error — it hangs — so the only honest thing
// to do is tell the user the prompt will never appear here and to use the
// live version instead.
//
// Multiple complementary signals (any one is sufficient):
//   1. window.self !== window.top — the canonical "we're inside an iframe"
//   2. window.frameElement exists — another framing signal
//   3. Cross-origin access to parent.location throws — proves we're framed
//   4. Known preview/sandbox hostname patterns (base44, preview, sandbox,
//      stackblitz, codesandbox, webcontainer, localtunnel, ngrok, etc.)
//   5. document.referrer containing known preview/sandbox domains

const SANDBOX_HOST_PATTERNS = [
  /base44/i,
  /preview/i,
  /sandbox/i,
  /stackblitz/i,
  /codesandbox/i,
  /webcontainer/i,
  /localtunnel/i,
  /ngrok/i,
  /glitch/i,
  /replit/i,
  /vercel\.app/i,
  /netlify\.app/i,
  /cloudflare/i,
  /bitballoon/i,
];

export function isSandboxed() {
  if (typeof window === 'undefined') return false;

  const reasons = [];

  // 1. Canonical iframe check
  try {
    if (window.self !== window.top) {
      reasons.push('self !== top');
    }
  } catch (_) {
    // Cross-origin access to window.top threw — we are definitely framed.
    reasons.push('top-access-threw');
  }

  // 2. frameElement check — if we're in an iframe, this is non-null
  try {
    if (window.frameElement !== null && window.frameElement !== undefined) {
      reasons.push('frameElement');
    }
  } catch (_) {
    reasons.push('frameElement-threw');
  }

  // 3. Try accessing parent.location — throws if cross-origin (which is
  // exactly the restricted scenario we care about)
  try {
    // eslint-disable-next-line no-unused-expressions
    window.parent?.location?.href;
  } catch (_) {
    reasons.push('parent-location-threw');
  }

  // 4. Hostname / referrer pattern match
  const hostname = window.location?.hostname || '';
  const referrer = document.referrer || '';
  const combined = `${hostname} ${referrer}`;
  const matchedPattern = SANDBOX_HOST_PATTERNS.find((re) => re.test(combined));
  if (matchedPattern) {
    reasons.push(`host-pattern:${matchedPattern.source}`);
  }

  const result = reasons.length > 0;

  // Temporary diagnostic logging — remove after sandbox detection is confirmed
  if (typeof console !== 'undefined') {
    console.log(
      '[isSandboxed]',
      result ? 'TRUE' : 'FALSE',
      {
        hostname,
        referrer,
        reasons,
        selfIsTop: (() => { try { return window.self === window.top; } catch { return 'threw'; } })(),
        frameElement: (() => { try { return window.frameElement; } catch { return 'threw'; } })(),
      }
    );
  }

  return result;
}

export default isSandboxed;