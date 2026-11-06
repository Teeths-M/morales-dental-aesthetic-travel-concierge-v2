/**
 * Checks a browser push subscription before the server stores it.
 *
 * registerPushSubscription saves it under the signed-in user's own id and
 * email, never ones sent in the request. This only checks the subscription
 * itself: an https address for the push service, and the two keys web-push
 * needs to encrypt a notification. The stored copy keeps only those fields.
 *
 * Returns null for anything else, so a bad request saves nothing.
 */
export interface StoredPushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
}

const MAX_ENDPOINT = 1024;
// Browsers send both keys as base64url, sometimes padded. p256dh is a
// 65-byte public key (87-88 characters); auth is 16 bytes (22-24).
const P256DH = /^[A-Za-z0-9_-]{80,100}={0,2}$/;
const AUTH = /^[A-Za-z0-9_-]{16,32}={0,2}$/;

export function cleanPushSubscription(raw: unknown): StoredPushSubscription | null {
  let value: any = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const endpoint = value.endpoint;
  if (typeof endpoint !== 'string' || endpoint.length > MAX_ENDPOINT) return null;
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !url.hostname) return null;

  const p256dh = value.keys?.p256dh;
  const auth = value.keys?.auth;
  if (typeof p256dh !== 'string' || !P256DH.test(p256dh)) return null;
  if (typeof auth !== 'string' || !AUTH.test(auth)) return null;

  const expirationTime = typeof value.expirationTime === 'number' && Number.isFinite(value.expirationTime)
    ? value.expirationTime
    : null;
  return { endpoint, expirationTime, keys: { p256dh, auth } };
}
