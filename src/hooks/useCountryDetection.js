/**
 * useCountryDetection
 * Reverse geocodes GPS coordinates → country name using Nominatim.
 *
 * - Caches results by 1° lat/lng bucket in localStorage (24h TTL)
 * - Detects country change and exposes isNewCountry flag
 * - Offline: returns last known country from cache
 * - No API key required (Nominatim is open; respects 1 req/s limit via deduplication)
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const CACHE_TTL_MS      = 24 * 60 * 60 * 1000;  // 24h per tile
const LAST_COUNTRY_KEY  = 'morales_last_country';
const bucketKey = (lat, lng) =>
  `morales_geo_${Math.floor(lat)}_${Math.floor(lng)}`;

function codeToFlag(code) {
  if (!code || code.length !== 2) return '🌍';
  try {
    // Regional-indicator 'A' (🇦) is U+1F1E6 = 127462; 127462 − 'A'(65) = 127397.
    return String.fromCodePoint(
      ...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0))
    );
  } catch (_) { return '🌍'; }
}

function readCache(lat, lng) {
  try {
    const raw = localStorage.getItem(bucketKey(lat, lng));
    if (!raw) return null;
    const { country, countryCode, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return { country, countryCode };
  } catch (_) { return null; }
}

function writeCache(lat, lng, country, countryCode) {
  try {
    localStorage.setItem(bucketKey(lat, lng), JSON.stringify({ country, countryCode, ts: Date.now() }));
  } catch (_) {}
}

function readLastCountry() {
  try { return JSON.parse(localStorage.getItem(LAST_COUNTRY_KEY) || 'null'); }
  catch (_) { return null; }
}

function writeLastCountry(country, countryCode) {
  try { localStorage.setItem(LAST_COUNTRY_KEY, JSON.stringify({ country, countryCode })); }
  catch (_) {}
}

export function useCountryDetection({ lat, lng, enabled = true }) {
  const [country,      setCountry]      = useState(null);
  const [countryCode,  setCountryCode]  = useState(null);
  const [isNewCountry, setIsNewCountry] = useState(false);
  const inflightRef  = useRef(null);  // bucket string of current request
  const mountedRef   = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Restore last known country on mount for immediate display
  useEffect(() => {
    const last = readLastCountry();
    if (last && !country) {
      setCountry(last.country);
      setCountryCode(last.countryCode);
    }
  }, []);

  useEffect(() => {
    if (!enabled || lat == null || lng == null) return;

    const bucket = bucketKey(lat, lng);

    // Deduplicate: don't re-fetch the same bucket
    if (inflightRef.current === bucket) return;

    // Try local cache first (works offline)
    const cached = readCache(lat, lng);
    if (cached) {
      if (!mountedRef.current) return;
      const last = readLastCountry();
      setCountry(cached.country);
      setCountryCode(cached.countryCode);
      if (last && last.countryCode !== cached.countryCode) {
        setIsNewCountry(true);
      }
      return;
    }

    if (!navigator.onLine) return;

    inflightRef.current = bucket;
    // Nominatim: zoom=3 = country level, fast response, minimal data
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}&format=json&zoom=3`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'Morales Medical/1.0' } }
    )
      .then(r => r.json())
      .then(data => {
        const c  = data.address?.country;
        const cc = data.address?.country_code?.toUpperCase();
        if (!c || !cc) return;
        writeCache(lat, lng, c, cc);
        if (!mountedRef.current) return;
        const last = readLastCountry();
        setCountry(c);
        setCountryCode(cc);
        if (!last) {
          // First detection — record but don't trigger "new country" modal
          writeLastCountry(c, cc);
        } else if (last.countryCode !== cc) {
          setIsNewCountry(true);
        }
      })
      .catch(() => {})
      .finally(() => { inflightRef.current = null; });
  }, [lat, lng, enabled]);

  const acknowledgeCountry = useCallback(() => {
    if (country && countryCode) writeLastCountry(country, countryCode);
    if (mountedRef.current) setIsNewCountry(false);
  }, [country, countryCode]);

  return {
    country,
    countryCode,
    flag: codeToFlag(countryCode),
    isNewCountry,
    acknowledgeCountry,
  };
}
