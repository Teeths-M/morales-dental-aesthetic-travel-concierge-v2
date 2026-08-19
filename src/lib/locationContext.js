/**
 * Builds the machine-readable [[LOCATION_CONTEXT: ...]] block MCareOrb.jsx
 * prepends to the first message of a session, so M-Care can skip asking
 * "where are you" for anything location-based. Stripped from display by
 * MessageBubble.jsx's extractLocationContext — the traveler never sees this
 * raw text, only their own typed words.
 *
 * Pure and testable: given a location object (or null/undefined), always
 * returns either a well-formed block string or null, never throws.
 *
 * Deliberately conservative: useAutoLocation.js always labels its IP result
 * source: 'ip_geo', including its own honest all-fields-null fallback for
 * when every geo provider failed (country: 'Unknown', no coordinates) — that
 * fallback carries no real signal and must never be presented as if it were.
 */
export function buildLocationContextBlock(loc) {
  if (!loc) return null;

  if (loc.source === 'gps') {
    if (loc.latitude == null || loc.longitude == null) return null;
    const accuracySegment = loc.accuracy_meters != null ? `, accuracy_m=${Math.round(loc.accuracy_meters)}` : '';
    return `[[LOCATION_CONTEXT: lat=${loc.latitude}, lng=${loc.longitude}, source=gps_precise${accuracySegment}]]`;
  }

  if (loc.country === 'Unknown') return null;
  if (!loc.city && !loc.country && loc.latitude == null && loc.longitude == null) return null;

  const parts = [];
  if (loc.city) parts.push(`city=${loc.city}`);
  if (loc.country) parts.push(`country=${loc.country}`);
  if (loc.latitude != null && loc.longitude != null) {
    parts.push(`lat=${loc.latitude}`, `lng=${loc.longitude}`);
  }
  parts.push('source=ip_approximate');

  return `[[LOCATION_CONTEXT: ${parts.join(', ')}]]`;
}
