/**
 * _shared/tokens.js  — REFERENCE ONLY
 *
 * Backend functions deploy independently and cannot import local files.
 * Inline the helpers below into each function that needs token generation.
 *
 * Inline snippet:
 *
 *   // Cryptographically random hex token
 *   async function generateSecureToken(prefix = '', bytes = 32) {
 *     const raw = new Uint8Array(bytes);
 *     crypto.getRandomValues(raw);
 *     return prefix + Array.from(raw).map(b => b.toString(16).padStart(2, '0')).join('');
 *   }
 *
 *   // SHA-256 hash of a string
 *   async function sha256(text) {
 *     const buf = new TextEncoder().encode(text);
 *     const hash = await crypto.subtle.digest('SHA-256', buf);
 *     return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
 *   }
 *
 *   // HMAC-signed portal token (used by generateDoctorPortalLink etc.)
 *   async function encodePortalToken({ consultation_id, partner_id, portal_type }) {
 *     const payload = { consultation_id, partner_id, portal_type, expires_at: Date.now() + 7*24*60*60*1000 };
 *     // Do NOT add a fallback here. See _shared/portalToken.ts — a published
 *     // default is a forgeable signing key. New code should import
 *     // signPortalToken/verifyPortalToken from there rather than inlining.
 *     const secret = Deno.env.get('PORTAL_TOKEN_SECRET');
 *     const data = JSON.stringify(payload);
 *     const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
 *       { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
 *     const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
 *     const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,'0')).join('');
 *     return btoa(data) + '.' + sigHex;
 *   }
 */

export const TOKEN_PREFIXES = {
  VAULT:   'VAULT_',
  SHARE:   'SHARE_',
  CHECKIN: 'CHECK_',
  LUGGAGE: 'LUG_',
};