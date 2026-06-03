/**
 * Portal Token Utility (client-side)
 * 
 * Token GENERATION is backend-only (HMAC-SHA256 signed via Deno functions).
 * This module only handles client-side DECODING of signed tokens for display.
 * 
 * Signed token format: btoa(JSON payload) + '.' + hmac-sha256-hex
 * Legacy unsigned format: btoa(JSON payload)   ← still decoded for backwards compat
 */

export function decodePortalToken(token) {
  if (!token) return { valid: false, error: 'No token provided.' };
  try {
    // Support both signed (payload.sig) and legacy unsigned tokens
    const b64 = token.includes('.') ? token.split('.')[0] : token;
    const decoded = JSON.parse(atob(b64));
    if (decoded.expires_at && Date.now() > decoded.expires_at) {
      return { valid: false, error: 'Token has expired.' };
    }
    return { valid: true, ...decoded };
  } catch (e) {
    return { valid: false, error: 'Invalid token format.' };
  }
}

export function getTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}