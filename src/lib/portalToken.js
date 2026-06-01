/**
 * Portal Token Utility
 * Encodes/decodes tokenized URL parameters for external vendor portals.
 * Token format: base64(JSON { consultation_id, partner_id, portal_type, expires_at })
 */

export function encodePortalToken({ consultation_id, partner_id, portal_type }) {
  const payload = {
    consultation_id,
    partner_id,
    portal_type,
    expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  // Encode to base64, then URL-encode for safe transmission in URLs
  const utf8 = new TextEncoder().encode(JSON.stringify(payload));
  const base64 = btoa(String.fromCharCode.apply(null, utf8));
  return encodeURIComponent(base64);
}

export function decodePortalToken(token) {
  try {
    // URL-decode first, then base64 decode
    const base64 = decodeURIComponent(token);
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const decoded = JSON.parse(new TextDecoder().decode(bytes));
    if (decoded.expires_at && Date.now() > decoded.expires_at) {
      return { valid: false, error: 'Token has expired.' };
    }
    return { valid: true, ...decoded };
  } catch (e) {
    console.error('Token decode error:', e);
    return { valid: false, error: 'Invalid token format.' };
  }
}

export function getTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}