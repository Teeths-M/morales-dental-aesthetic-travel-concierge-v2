import { createHandler, ok, err } from '../_shared/createHandler.ts';

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.karte.io/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.openstreetmap.ru/cgi/interpreter',
];

const TAGS: Record<string, [string, string][]> = {
  doctors:  [['amenity', 'doctors'], ['amenity', 'clinic'], ['healthcare', 'doctor']],
  clinic:   [['amenity', 'clinic'],  ['amenity', 'doctors'], ['amenity', 'health_centre'], ['healthcare', 'clinic']],
  hospital: [['amenity', 'hospital'], ['healthcare', 'hospital']],
  // pharmacy has many OSM tag variants across different countries
  pharmacy: [['amenity', 'pharmacy'], ['healthcare', 'pharmacy'], ['shop', 'chemist'], ['shop', 'pharmacy'], ['healthcare', 'drug_store']],
  police:   [['amenity', 'police']],
  embassy:  [['amenity', 'embassy'], ['office', 'diplomatic'], ['diplomatic', 'embassy']],
};

function buildQuery(lat: number, lng: number, radiusM: number, tags: [string, string][]): string {
  // Longer Overpass timeout for large search areas
  const overpassTimeout = radiusM > 50000 ? 45 : radiusM > 20000 ? 30 : 20;
  const pairs = tags.flatMap(([k, v]) => [
    `node(around:${radiusM},${lat},${lng})[${k}=${v}];`,
    `way(around:${radiusM},${lat},${lng})[${k}=${v}];`,
  ]).join('');
  return `[out:json][timeout:${overpassTimeout}];(${pairs});out body center;`;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

Deno.serve(createHandler(async ({ body }) => {
  const { lat, lng, category, radius_km } = await body<{
    lat: number; lng: number; category: string; radius_km?: number;
  }>();

  if (!lat || !lng || !category) return err('lat, lng, category required');

  const tags    = TAGS[category] || [['amenity', category]];
  const radiusM = (radius_km ?? 5) * 1000;
  const query   = buildQuery(lat, lng, radiusM, tags);

  let lastErr = '';
  for (const mirror of MIRRORS) {
    try {
      const fetchTimeout = (radius_km ?? 5) > 50 ? 50000 : 25000;
      const res = await fetch(mirror, {
        method: 'POST',
        body: query,
        signal: AbortSignal.timeout(fetchTimeout),
      });
      if (!res.ok) { lastErr = `HTTP ${res.status}`; continue; }

      const json = await res.json();
      const results = ((json.elements || []) as Record<string, unknown>[])
        .map(el => {
          const elLat = (el.lat as number) ?? (el.center as Record<string, number>)?.lat;
          const elLng = (el.lon as number) ?? (el.center as Record<string, number>)?.lon;
          const tags  = (el.tags || {}) as Record<string, string>;
          return {
            id:       el.id,
            name:     tags.name || tags['name:en'] || null,
            lat:      elLat,
            lng:      elLng,
            phone:    tags.phone || tags['contact:phone'] || null,
            address:  [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']].filter(Boolean).join(' ') || null,
            distance: elLat != null ? haversine(lat, lng, elLat, elLng) : Infinity,
          };
        })
        .filter(el => el.lat != null)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 12);

      return ok({ results });
    } catch (e: unknown) {
      lastErr = (e as Error)?.message || String(e);
    }
  }

  return err(`Location search unavailable — ${lastErr}`);
}, { name: 'searchNearbyPlaces', requireAuth: false }));
