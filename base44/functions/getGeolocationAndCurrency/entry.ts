import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const GEO_CACHE_TTL = 60 * 60 * 1000; // 1 hour in-memory
const cache = new Map();

function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.ts > GEO_CACHE_TTL) { cache.delete(key); return null; }
  return item.data;
}
function setCache(key, data) { cache.set(key, { data, ts: Date.now() }); }

const CURRENCY_MAP = {
  US: 'USD', CA: 'CAD', GB: 'GBP', AU: 'AUD', NZ: 'NZD',
  TT: 'TTD', GY: 'GYD', VE: 'USD', EU: 'EUR', DE: 'EUR',
  FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR',
  MX: 'MXN', BR: 'BRL', CO: 'COP', PE: 'PEN', CL: 'CLP',
  IN: 'INR', JP: 'JPY', CN: 'CNY', SG: 'SGD', AE: 'AED',
};

Deno.serve(async (req) => {
  try {
    const ipinfoApiKey = Deno.env.get('IPINFO_API_KEY');
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const cacheKey = `geo_${ip}`;

    const cached = getCache(cacheKey);
    if (cached) return Response.json({ ...cached, from_cache: true });

    if (!ipinfoApiKey) {
      return Response.json({ country: 'US', currency: 'USD', source: 'default_fallback' });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    let ipData;
    try {
      const ipPath = ip && ip !== 'unknown' ? `/${ip}` : '';
      const res = await fetch(`https://ipinfo.io${ipPath}/json?token=${ipinfoApiKey}`, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`ipinfo ${res.status}`);
      ipData = await res.json();
    } catch {
      clearTimeout(timer);
      return Response.json({ country: 'US', currency: 'USD', source: 'default_fallback' });
    }

    const countryCode = ipData.country || 'US';
    const currency = CURRENCY_MAP[countryCode] || 'USD';

    // ipinfo loc field is "lat,lng"
    let latitude = null, longitude = null;
    if (ipData.loc) {
      const parts = ipData.loc.split(',');
      if (parts.length === 2) {
        latitude = parseFloat(parts[0]) || null;
        longitude = parseFloat(parts[1]) || null;
      }
    }

    const result = {
      country: ipData.country_name || countryCode,
      country_code: countryCode,
      city: ipData.city || null,
      region: ipData.region || null,
      timezone: ipData.timezone || null,
      latitude,
      longitude,
      currency,
      source: 'ipinfo',
    };

    setCache(cacheKey, result);
    return Response.json(result);
  } catch (_) {
    return Response.json({ country: 'US', currency: 'USD', source: 'default_fallback' });
  }
});