import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../../shared/createHandler.ts';
import { createKeyedMemoCache } from '../../shared/memoCache.ts';
import { reportIncident, generateIncidentCode } from '../../shared/incidentReporting.ts';

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
//
// Both failure reasons are logged (console.error) AND combined into the
// thrown error so the caller can report a real incident with the specific
// reason both providers failed — console.error alone was confirmed (live,
// via Base44's own log viewer) to never actually surface for this function:
// createHandler.ts has no logger on the success path, only on an unhandled
// throw, and this function deliberately never lets one reach it. Found while
// diagnosing a live report of location context never reaching M-Care.
async function resolveGeo(ip) {
  try {
    return await fromIpapiCo(ip);
  } catch (e1) {
    const msg1 = e1?.message || String(e1);
    console.error(`[getGeolocationAndCurrency] ipapi.co failed for ip=${ip}:`, msg1);
    try {
      return await fromIpwhoIs(ip);
    } catch (e2) {
      const msg2 = e2?.message || String(e2);
      console.error(`[getGeolocationAndCurrency] ipwho.is failed for ip=${ip}:`, msg2);
      throw new Error(`ipapi.co: ${msg1} | ipwho.is: ${msg2}`);
    }
  }
}

// v3 in the key clears stale v1/v2 misidentified entries.
const geoCache = createKeyedMemoCache(resolveGeo, GEO_CACHE_TTL, (ip) => `geo_v3_${ip}`);

// This function is called on nearly every session's first location check —
// a sustained outage (like the one that surfaced this) would otherwise
// create a fresh ReliabilityIncident, and a fresh 'high'-severity alert
// email, on every single request. One hour is a deliberately coarse
// cooldown — "tell someone this is broken," not a precise failure counter.
// Module-level state resets on a cold isolate restart (same documented
// caveat as memoCache.ts's own "free win, not a durable guarantee") — an
// acceptable, bounded amount of noise, never per-request spam.
let lastIncidentAt = 0;
const INCIDENT_COOLDOWN_MS = 60 * 60 * 1000;

Deno.serve(createHandler(async ({ req, base44 }) => {
  try {
    const ip = extractClientIp(req);
    const result = await geoCache(ip);
    return Response.json(result);
  } catch (geoErr) {
    // Both providers failed. console.error was confirmed not to surface in
    // Base44's log viewer for this function's shape (see resolveGeo's own
    // comment) — reportIncident is the same real, proven mechanism
    // createHandler.ts's own catch-all already uses: a real, queryable
    // ReliabilityIncident row, plus a real alert email if
    // INCIDENT_ALERT_EMAILS is configured. Awaited (bounded by the same
    // 2s timeout race createHandler.ts's own catch-all uses) rather than
    // fire-and-forget — the Deno isolate can tear down right after this
    // response returns, which would otherwise silently drop the report more
    // often than not. Never lets a reporting failure affect the response —
    // the app still gets its honest fallback either way.
    if (Date.now() - lastIncidentAt > INCIDENT_COOLDOWN_MS) {
      lastIncidentAt = Date.now();
      try {
        await Promise.race([
          reportIncident({
            base44,
            incidentCode: generateIncidentCode(),
            severity: 'high',
            source: 'api',
            feature: 'getGeolocationAndCurrency',
            errorMessage: geoErr instanceof Error ? geoErr.message : String(geoErr),
          }),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ]);
      } catch (_) { /* incident reporting must never affect the response */ }
    }
    return Response.json(DEFAULT_FALLBACK);
  }
}, { name: 'getGeolocationAndCurrency', requireAuth: false }));
