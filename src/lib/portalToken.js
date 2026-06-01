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
  const utf8 = new TextEncoder().encode(JSON.stringify(payload));
  return btoa(String.fromCharCode.apply(null, utf8));
}

export function decodePortalToken(token) {
  try {
    const binaryString = atob(token);
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