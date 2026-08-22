/**
 * reverseGeocodePrecise — turns a real GPS lat/lng into a short, real place
 * name, so M-Care can state something a real geocoding service actually
 * returned instead of the LLM guessing a place name from two floats.
 *
 * Same Nominatim reverse-geocoding service useCountryDetection.js already
 * uses for country-level detection, but at a finer zoom (suburb/neighborhood,
 * not just country) and a finer cache bucket — this is a differently-scoped
 * sibling, not a refactor of that hook. A plain async function, not a hook:
 * it needs to be callable from inside useAutoLocation.js's requestGPS
 * success handler, not tied to a component's render lifecycle.
 *
 * Never throws — returns null on any failure, matching clientIpGeo.js's
 * established convention. Callers must never treat a null as data.
 */

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h per bucket

// ~111m per 0.001 degree of latitude — fine enough for suburb-level reuse
// without re-querying Nominatim on every near-identical GPS read.
function bucketKey(lat, lng) {
  return `morales_revgeo_${lat.toFixed(3)}_${lng.toFixed(3)}`;
}

function readCache(lat, lng) {
  try {
    const raw = sessionStorage.getItem(bucketKey(lat, lng));
    if (!raw) return null;
    const { place, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return place;
  } catch { return null; }
}

function writeCache(lat, lng, place) {
  try {
    sessionStorage.setItem(bucketKey(lat, lng), JSON.stringify({ place, ts: Date.now() }));
  } catch {}
}

export function buildDisplayPlace(address) {
  if (!address) return null;
  const area = address.suburb || address.neighbourhood || address.quarter
    || address.city || address.town || address.village
    || address.county || address.state;
  const country = address.country;
  if (area && country) return `${area} (${country})`;
  return area || country || null;
}

export async function reverseGeocodePrecise(lat, lng) {
  if (lat == null || lng == null) return null;

  const cached = readCache(lat, lng);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}&format=json&zoom=14`,
      {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'Morales Medical/1.0' },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const place = buildDisplayPlace(data?.address);
    if (!place) return null;
    writeCache(lat, lng, place);
    return place;
  } catch {
    return null;
  }
}
