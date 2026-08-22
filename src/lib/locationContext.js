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
    // resolved_place is a real Nominatim reverse-geocode result (see
    // reverseGeocode.js) — a real place name, not the LLM guessing one from
    // the raw coordinates. Parens, not a comma, so it can't be misread as a
    // second key=value pair once embedded in this comma-separated block.
    const placeSegment = loc.resolved_place ? `, resolved_place=${loc.resolved_place}` : '';
    return `[[LOCATION_CONTEXT: lat=${loc.latitude}, lng=${loc.longitude}, source=gps_precise${accuracySegment}${placeSegment}]]`;
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

/**
 * Builds the human-facing message shown when a precise-GPS request is
 * blocked because the app is running inside a restricted preview/sandbox
 * iframe. Unlike a generic "location unavailable" error, this pivots
 * immediately to the best approximate (IP-based) location M-Care already
 * has, labels it honestly as approximate, and offers useful nearby-care
 * actions the traveler can still take with that approximate area.
 *
 * Pure and testable: given a location object (or null), always returns a
 * well-formed string, never throws.
 */
export function buildSandboxLocationMessage(loc) {
  const base = "I can't request your precise GPS while running in preview mode — the browser blocks the permission prompt here.";

  // Build the approximate-location line from whatever real data we have.
  // city is the most specific, region adds context if different, country
  // anchors it. Falls back to raw coordinates only if that's all we have.
  const placeParts = [];
  if (loc?.city) placeParts.push(loc.city);
  if (loc?.region && loc.region !== loc?.city) placeParts.push(loc.region);
  if (loc?.country) placeParts.push(loc.country);

  const hasCoords = loc?.latitude != null && loc?.longitude != null;
  const hasApprox = placeParts.length > 0 || hasCoords;

  let approxLine;
  let mapDest = null; // passed to {{maps:...}} so the traveler can SEE the area
  if (hasApprox) {
    if (placeParts.length > 0) {
      const placeLabel = placeParts.join(', ');
      approxLine = `Right now I only have an approximate location based on your network: near ${placeLabel}. This can be off by several kilometers.`;
      // Prefer the place name as the map destination — for IP geo, a city
      // name search is more reliable than the ISP's registered lat/lng point
      // (which can be tens of km from the traveler's real position).
      mapDest = placeLabel;
    } else {
      const coordLabel = `near ${loc.latitude.toFixed(2)}, ${loc.longitude.toFixed(2)}`;
      approxLine = `Right now I only have an approximate location based on your network: ${coordLabel}. This can be off by several kilometers.`;
      mapDest = `${loc.latitude},${loc.longitude}`;
    }
  } else {
    approxLine = "I don't have even an approximate location available right now, so I can't offer nearby-care search just yet.";
  }

  // Tappable map button — MessageBubble renders {{maps:LABEL|DEST}} as
  // buttons for Waze / Google Maps / Apple Maps. Lets the traveler SEE
  // the approximate area visually, which is reassuring when the text says
  // "near [City]" and they want to confirm where that actually is.
  const mapToken = mapDest
    ? `\n\n{{maps:View My Approximate Area|${mapDest}}}`
    : '';

  // Offer useful actions even with approximate location — these choices are
  // rendered as tappable buttons by MessageBubble and routed to the agent.
  // sendAgentMessage (MCareOrb.jsx) re-attaches the machine-readable
  // [[LOCATION_CONTEXT: ...]] block for any location-sensitive message
  // (the "nearby" keyword matches its regex), so the agent receives the
  // real coordinates/city and can pass them to searchNearbyPlaces — the
  // location is never lost between the tap and the actual search.
  const choices = hasApprox
    ? "\n\nEven with approximate location, I can still help you find nearby care:\n\n{{choices:Find nearby hospitals|Find nearby pharmacies|Find nearby clinics}}"
    : "";

  const reminder = "\n\nFor exact GPS, open the live version of M-Safe on your phone or outside this preview — I'll use it automatically the moment you do.";

  return `${base}\n\n${approxLine}${mapToken}${choices}${reminder}`;
}