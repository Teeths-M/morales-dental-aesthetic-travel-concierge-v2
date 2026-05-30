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
  return btoa(JSON.stringify(payload));
}

export function decodePortalToken(token) {
  try {
    const decoded = JSON.parse(atob(token));
    if (decoded.expires_at && Date.now() > decoded.expires_at) {
      return { valid: false, error: 'Token has expired.' };
    }
    return { valid: true, ...decoded };
  } catch {
    return { valid: false, error: 'Invalid token.' };
  }
}

export function getTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}