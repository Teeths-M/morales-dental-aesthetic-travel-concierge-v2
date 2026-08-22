/**
 * geoUri.js — pure, zero-dependency helpers for building a real, standards-
 * based geo: URI (RFC 5870). Deliberately kept separate from mapLinks.js,
 * which imports the base44Client module for its preferred-app persistence —
 * that transitive import touches `window` at module-load time, which would make
 * these otherwise-pure functions untestable under Vitest's Node environment
 * for no real reason. mapLinks.js re-exports buildOfflineGeoUri so its
 * existing callers (MessageBubble.jsx, TravelPassCard.jsx) are unaffected.
 */

// True if the destination looks like "lat,lng" — coordinate deep links are
// more accurate than address queries, so callers prefer them when available.
export function isCoords(s) {
  return /^-?\d{1,3}\.\d+,-?\d{1,3}\.\d+$/.test((s || '').trim());
}

// Build a real geo: URI (RFC 5870) for a "lat,lng" destination — distinct
// from mapLinks.js's app-specific https:// links. A geo: URI routes through
// the OS's own native map-app handler rather than a specific website, which
// is what lets an already-installed offline map app (Google Maps with a
// downloaded area, or on Android specifically OsmAnd/Maps.me/HERE WeGo) show
// the pin without reaching any server first — unlike an https:// link, which
// generally needs a live network handshake or falls through to a browser
// tab. Android treats geo: as a first-class, guaranteed OS-level scheme; iOS
// has no universally guaranteed system handler for it (Apple Maps handles it
// in many cases, but this is less rock-solid than Android's intent system) —
// a real, disclosed platform limitation, not a guarantee every scan works
// offline. Only returns a value for real coordinates — an address string can
// never be resolved offline by any client-side trick, since geocoding it
// always needs a live service somewhere.
export function buildOfflineGeoUri(destination, label) {
  const dest = (destination || '').trim();
  if (!dest || !isCoords(dest)) return null;
  const labelPart = label ? `(${encodeURIComponent(label)})` : '';
  return `geo:${dest}?q=${dest}${labelPart}`;
}

// Build a real Google Maps DISPLAY-map URL (map_action=map) centered on real
// device coordinates, defaulting to a satellite basemap at a close-in zoom —
// deliberately distinct from mapLinks.js's generateMapLink(), which builds a
// DIRECTIONS url (map_action implied 'dir'). "Show me my exact location on
// Google Maps" wants a map centered on where the traveler is standing, not
// turn-by-turn directions to it. Returns null without real coordinates —
// never falls back to an address string, since this URL family is
// coordinate-only by design.
/**
 * @param {{ latitude?: number, longitude?: number, zoom?: number, basemap?: string }} [opts]
 */
export function buildGoogleMapsLocationUrl(opts = {}) {
  const { latitude, longitude, zoom = 19, basemap = 'satellite' } = opts;
  if (latitude == null || longitude == null) return null;
  const center = `${latitude},${longitude}`;
  const params = new URLSearchParams({ api: '1', map_action: 'map', center, zoom: String(zoom), basemap });
  return `https://www.google.com/maps/@?${params.toString()}`;
}

// Turns a real GeolocationPositionError-free accuracy reading (meters) into
// honest, non-overclaiming language. Never calls a coordinate "exact" when
// the browser reports a low-confidence fix — a large accuracy value is
// disclosed plainly rather than silently upgraded to sound precise.
export function describeAccuracy(meters) {
  if (meters == null || !Number.isFinite(meters)) return 'Your device did not report an accuracy value.';
  const rounded = Math.round(meters);
  if (meters <= 100) return `Accuracy: approximately ${rounded} meters.`;
  return `Your device returned a lower-confidence location (accuracy: approximately ${rounded} meters) — treat this as approximate, not exact.`;
}
