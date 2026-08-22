/**
 * mapLinks.js — deep-link generation for opening a location directly in the
 * user's preferred navigation app (Waze, Google Maps, Apple Maps) from the
 * M-Care chat. One tap, no copy-paste.
 *
 * Used by MessageBubble: when M-Care emits a {{maps:LABEL|DEST}} token (or a
 * bare waze/google-maps/apple-maps URL), the chat renders tappable buttons that
 * call generateMapLink() + window.open(). The user's chosen app is remembered
 * (localStorage + server profile) and surfaced via analytics as an audit row.
 */
import { base44 } from '@/api/base44Client';
import { isCoords, buildOfflineGeoUri } from './geoUri';

// Re-exported so existing callers (MessageBubble.jsx, TravelPassCard.jsx)
// keep importing it from '@/lib/mapLinks' unchanged — see geoUri.js for why
// the implementation itself lives in a separate, zero-dependency module.
export { buildOfflineGeoUri };

const PREF_KEY = 'morales_preferred_maps_app';

export const MAP_APPS = [
  { id: 'waze',        label: 'Waze',        emoji: '🚗' },
  { id: 'google_maps', label: 'Google Maps', emoji: '📍' },
  { id: 'apple_maps',  label: 'Apple Maps',  emoji: '🍎' },
];

// Detect the user's platform so we can suggest the native app first.
// iOS → Apple Maps; Android / other → Google Maps.
export function detectPlatform() {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Macintosh|Mac OS X/i.test(ua) && /Safari/.test(ua) && !/Chrome/.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

export function defaultMapsApp() {
  return detectPlatform() === 'ios' ? 'apple_maps' : 'google_maps';
}

// Build the deep link for a given app + destination (address string or
// "lat,lng"). Returns null if no destination.
export function generateMapLink(destination, appType, satellite = false) {
  const dest = (destination || '').trim();
  if (!dest) return null;
  const coords = isCoords(dest);
  const enc = encodeURIComponent(dest);

  if (satellite) {
    switch (appType) {
      case 'waze':
        // Waze URL scheme has no satellite-layer toggle — use normal link
        return coords ? `https://waze.com/ul?ll=${dest}&navigate=yes` : `https://waze.com/ul?q=${enc}`;
      case 'apple_maps':
        // t=h = hybrid (satellite + labels)
        return coords ? `https://maps.apple.com/?ll=${dest}&z=16&t=h` : `https://maps.apple.com/?q=${enc}&t=h`;
      case 'google_maps':
      default:
        // Satellite view centered on coordinates, or satellite search for an address
        if (coords) {
          const [lat, lng] = dest.split(',').map((s) => s.trim());
          return `https://www.google.com/maps/@${lat},${lng},16z/data=!3m1!1e3`;
        }
        return `https://www.google.com/maps/search/?api=1&query=${enc}&t=k`;
    }
  }

  switch (appType) {
    case 'waze':
      return coords ? `https://waze.com/ul?ll=${dest}&navigate=yes` : `https://waze.com/ul?q=${enc}`;
    case 'apple_maps':
      return coords ? `https://maps.apple.com/?daddr=${dest}` : `https://maps.apple.com/?q=${enc}`;
    case 'google_maps':
    default:
      return `https://www.google.com/maps/dir/?api=1&destination=${coords ? dest : enc}`;
  }
}

// Remember the user's preferred maps app — localStorage for instant recall +
// the server User profile so it persists across devices.
export async function storePreferredMapsApp(appId) {
  try { localStorage.setItem(PREF_KEY, appId); } catch (_) {}
  try { await base44.auth.updateMe({ preferred_maps_app: appId }); } catch (_) {}
}

export function getPreferredMapsApp() {
  try { return localStorage.getItem(PREF_KEY) || null; } catch { return null; }
}

// The three apps, ordered with the user's preferred (or platform default) first.
export function orderedMapApps() {
  const pref = getPreferredMapsApp() || defaultMapsApp();
  return [...MAP_APPS].sort((a, b) => (a.id === pref ? -1 : b.id === pref ? 1 : 0));
}

// Open a maps link in a new tab. The new tab triggers the native app if it's
// installed, otherwise falls back to the web version of the maps app. Records
// the preference and fires an analytics event as a lightweight audit trail.
export function openInMapsApp(appId, destination, satellite = false) {
  const url = generateMapLink(destination, appId, satellite);
  if (!url) return false;
  window.open(url, '_blank', 'noopener,noreferrer');
  storePreferredMapsApp(appId);
  try {
    base44.analytics?.track?.({ eventName: 'mcare_open_maps', properties: { app: appId, destination, satellite } });
  } catch (_) {}
  return true;
}