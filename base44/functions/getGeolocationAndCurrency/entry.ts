import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../_shared/createHandler.ts';
import { createKeyedMemoCache } from '../_shared/memoCache.ts';

// ── SAFE-T GEO ENGINE ───────────────────────────────────────────────────────
// Primary:   ipapi.co   (free, no key, HTTPS, 30k req/month, good Caribbean accuracy)
// Secondary: ipwho.is   (free, no key, HTTPS, unlimited, MaxMind database)
// Default:   USD/Unknown fallback — never blocks the app
//
// ipinfo.io dropped: it misidentifies TSTT (Trinidad) IPs as Venezuelan
// because many T&T routes share Caribbean exchange points with VE networks.

const GEO_CACHE_TTL = 15 * 60 * 1000; // 15 min — shorter to avoid stale results during demos

// Comprehensive CURRENCY_MAP — covers Caribbean, LATAM, Europe, Asia-Pacific
const CURRENCY_MAP = {
  // Caribbean
  TT: 'TTD', BB: 'BBD', JM: 'JMD', GY: 'GYD', VE: 'USD',
  DO: 'DOP', CU: 'CUP', HT: 'HTG', BZ: 'BZD', BS: 'BSD',
  AG: 'XCD', LC: 'XCD', VC: 'XCD', GD: 'XCD', KN: 'XCD', DM: 'XCD',
  TC: 'USD', KY: 'KYD', MS: 'XCD', AI: 'XCD',
  // North America
  US: 'USD', CA: 'CAD', MX: 'MXN',
  // Central America
  PA: 'PAB', CR: 'CRC', GT: 'GTQ', HN: 'HNL', NI: 'NIO', SV: 'USD',
  // South America
  CO: 'COP', PE: 'PEN', CL: 'CLP', AR: 'ARS', BR: 'BRL', EC: 'USD',
  BO: 'BOB', PY: 'PYG', UY: 'UYU',
  // Europe
  GB: 'GBP', DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR',
  BE: 'EUR', AT: 'EUR', PT: 'EUR', IE: 'EUR', FI: 'EUR', GR: 'EUR',
  CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK',
  // Asia-Pacific
  AU: 'AUD', NZ: 'NZD', JP: 'JPY', CN: 'CNY', IN: 'INR', SG: 'SGD',
  KR: 'KRW', TH: 'THB', MY: 'MYR', PH: 'PHP', ID: 'IDR',
  // Middle East & Africa
  AE: 'AED', SA: 'SAR', QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR',
  ZA: 'ZAR', NG: 'NGN', GH: 'GHS', KE: 'KES',
};

// Extract the real client IP — handles Cloudflare, nginx, and multi-proxy setups.
// T&T deployments often route through regional CDN nodes; picking the wrong IP
// from the forwarded chain is the #1 cause of misidentifying T&T as Venezuelan.
function extractClientIp(req) {
  // Cloudflare sets this reliably (always the true client IP)
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  // nginx/load balancer sets x-real-ip to the direct client
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  // x-forwarded-for: skip internal/private IPs, take first public one
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',').map(s => s.trim()).filter(Boolean);
    for (const ip of ips) {
      if (!isPrivateIp(ip)) return ip;
    }
    return ips[0] || 'unknown';
  }

  return 'unknown';
}

function isPrivateIp(ip) {
  return /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|::1$|localhost)/i.test(ip);
}

async function fetchWithTimeout(url, ms = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

// PRIMARY: ipapi.co — free, no key, HTTPS, accurate Caribbean coverage
async function fromIpapiCo(ip) {
  const url = ip && ip !== 'unknown'
    ? `https://ipapi.co/${ip}/json/`
    : 'https://ipapi.co/json/';
  const res = await fetchWithTimeout(url, 5000);
  if (!res.ok) throw new Error(`ipapi.co ${res.status}`);
  const d = await res.json();
  if (d.error || !d.country_code) throw new Error(`ipapi.co bad response: ${d.reason || 'unknown'}`);
  return {
    country: d.country_name || d.country_code,
    country_code: d.country_code,
    city: d.city || null,
    region: d.region || null,
    timezone: d.timezone || null,
    latitude: d.latitude || null,
    longitude: d.longitude || null,
    currency: d.currency || CURRENCY_MAP[d.country_code] || 'USD',
    source: 'ipapi_co',
  };
}

// SECONDARY: ipwho.is — free, no key, HTTPS, uses MaxMind database
async function fromIpwhoIs(ip) {
  const url = ip && ip !== 'unknown'
    ? `https://ipwho.is/${ip}`
    : 'https://ipwho.is/';
  const res = await fetchWithTimeout(url, 5000);
  if (!res.ok) throw new Error(`ipwho.is ${res.status}`);
  const d = await res.json();
  if (!d.success || !d.country_code) throw new Error('ipwho.is bad response');
  const currency = d.currency?.code || CURRENCY_MAP[d.country_code] || 'USD';
  return {
    country: d.country || d.country_code,
    country_code: d.country_code,
    city: d.city || null,
    region: d.region || null,
    timezone: d.timezone?.id || null,
    latitude: d.latitude || null,
    longitude: d.longitude || null,
    currency,
    source: 'ipwho_is',
  };
}

const DEFAULT_FALLBACK = {
  country: 'Unknown',
  country_code: 'US',
  city: null,
  region: null,
  timezone: null,
  latitude: null, 
  longitude: null,
  currency: 'USD',
  source: 'default_fallback',
};

// Try primary then secondary; throws if both fail, so the memo cache never
// stores a fallback result — matches the original "only cache real hits" rule.
async function resolveGeo(ip) {
  try {
    return await fromIpapiCo(ip);
  } catch (_e1) {
    return await fromIpwhoIs(ip);
  }
}

// v3 in the key clears stale v1/v2 misidentified entries.
const geoCache = createKeyedMemoCache(resolveGeo, GEO_CACHE_TTL, (ip) => `geo_v3_${ip}`);

Deno.serve(createHandler(async ({ req }) => {
  try {
    const ip = extractClientIp(req);
    const result = await geoCache(ip).catch(() => DEFAULT_FALLBACK);
    return Response.json(result);
  } catch (_) {
    return Response.json(DEFAULT_FALLBACK);
  }
}, { name: 'getGeolocationAndCurrency', requireAuth: false }));
