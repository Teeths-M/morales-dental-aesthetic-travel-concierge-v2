/**
 * useAutoLocation
 * Detects the user's approximate location from IP (always), then upgrades to precise GPS
 * when the user is in a safety/location context and grants permission.
 *
 * Usage:
 *   const { ipLocation, gpsLocation, bestLocation, gpsStatus, requestGPS, isLoading } = useAutoLocation();
 *
 * gpsStatus: 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable'
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { fetchClientIpGeo } from '@/lib/clientIpGeo';

// v4: tries a direct-from-browser lookup (clientIpGeo.js) before falling
// back to the Base44 edge function, and no longer caches a failed/Unknown
// result as if it were real data — bump clears any session that already
// cached a bad "Unknown" from the prior generation's outage.
const IP_CACHE_KEY = 'auto_location_ip_v4';
const IP_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const PREFS_KEY = 'location_prefs_v1';

function readCache() {
  try {
    const raw = sessionStorage.getItem(IP_CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > IP_CACHE_TTL) { sessionStorage.removeItem(IP_CACHE_KEY); return null; }
    return data;
  } catch { return null; }
}

function writeCache(data) {
  try {
    // Only cache country-level data, never precise coordinates
    const safeToCache = {
      country: data.country,
      country_code: data.country_code,
      city: data.city,
      region: data.region,
      timezone: data.timezone,
      currency: data.currency,
      source: data.source,
      precision: data.precision,
      // DO NOT cache: latitude, longitude (precise coordinates)
    };
    sessionStorage.setItem(IP_CACHE_KEY, JSON.stringify({ data: safeToCache, ts: Date.now() }));
  } catch {}
}

function readPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch { return {}; }
}

function writePrefs(prefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {}
}

export function useAutoLocation() {
  const [ipLocation, setIpLocation] = useState(null);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle'); // 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable'
  const [isLoading, setIsLoading] = useState(true);
  const [prefs, setPrefsState] = useState(readPrefs);
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // Load IP geolocation on mount (cached, never blocks app). Tries a direct
  // browser->provider call first (sidesteps a confirmed, unresolved issue
  // where Base44's own server-side call to the same two providers reliably
  // fails — see getGeolocationAndCurrency/entry.ts's own header comment and
  // CLAUDE.md's "MCare auto-location" section). Falls back to the Base44
  // edge function only if that returns nothing.
  useEffect(() => {
    const cached = readCache();
    if (cached) { setIpLocation(cached); setIsLoading(false); return; }

    setIsLoading(true);

    async function resolve() {
      const clientGeo = await fetchClientIpGeo();
      if (clientGeo) {
        return { ...clientGeo, source: 'ip_geo', precision: 'approximate' };
      }

      try {
        const res = await base44.functions.invoke('getGeolocationAndCurrency', {});
        const d = res?.data;
        // default_fallback means both providers failed server-side too —
        // that's not real data, never cache or use it as if it were.
        if (d && !d.error && d.source !== 'default_fallback') {
          return {
            country: d.country,
            country_code: d.country_code || d.country,
            city: d.city || null,
            region: d.region || null,
            timezone: d.timezone || null,
            latitude: d.latitude || null,
            longitude: d.longitude || null,
            currency: d.currency,
            source: 'ip_geo',
            precision: 'approximate',
          };
        }
      } catch { /* honest failure — no location, no cache write */ }
      return null;
    }

    resolve()
      .then((loc) => {
        if (!mountedRef.current || !loc) return;
        writeCache(loc);
        setIpLocation(loc);
      })
      .finally(() => { if (mountedRef.current) setIsLoading(false); });
  }, []);

  // Request precise GPS (called explicitly by UI, not on mount)
  const requestGPS = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGpsStatus('unavailable');
      return;
    }
    if (prefs.locationPaused) return;

    setGpsStatus('requesting');

    // Before calling getCurrentPosition, check the Permissions API. In a
    // preview iframe whose Permissions-Policy disallows geolocation, the
    // browser reports the permission as 'denied' AND never shows the native
    // prompt — getCurrentPosition hangs with neither callback firing, so the
    // 15s safety net is the only thing that ever resolves it. Catching
    // 'denied' here fails fast and honestly instead. Any other state, or a
    // throwing/unavailable Permissions API, falls through to the normal call.
    const proceed = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!mountedRef.current) return;
          const loc = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy_meters: pos.coords.accuracy ?? null,
            source: 'gps',
            precision: 'precise',
            logged_at: new Date().toISOString(),
          };
          setGpsLocation(loc);
          setGpsStatus('granted');
          updatePref('gpsGranted', true);
        },
        (err) => {
          if (!mountedRef.current) return;
          setGpsStatus(err.code === 1 ? 'denied' : 'unavailable');
          updatePref('gpsGranted', false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    };

    try {
      if (!navigator.permissions || !navigator.permissions.query) { proceed(); return; }
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((result) => {
          if (!mountedRef.current) return;
          if (result.state === 'denied') {
            setGpsStatus('denied');
            updatePref('gpsGranted', false);
            return;
          }
          proceed();
        })
        .catch(() => proceed());
    } catch { proceed(); }
  }, [prefs.locationPaused]);

  // If user previously granted GPS, silently refresh on mount
  useEffect(() => {
    if (prefs.gpsGranted && !prefs.locationPaused && 'geolocation' in navigator) {
      requestGPS();
    }
  }, []);

  const updatePref = (key, value) => {
    const next = { ...readPrefs(), [key]: value };
    writePrefs(next);
    setPrefsState(next);
  };

  const setPaused = (paused) => updatePref('locationPaused', paused);
  const setAutoShare = (val) => updatePref('autoShareSafety', val);
  const setUseGPS = (val) => updatePref('useGPS', val);

  // Best available: GPS if available and not paused, else IP geo
  const bestLocation = (!prefs.locationPaused && gpsLocation) ? gpsLocation : ipLocation;

  return {
    ipLocation,
    gpsLocation,
    bestLocation,
    gpsStatus,
    isLoading,
    prefs,
    requestGPS,
    setPaused,
    setAutoShare,
    setUseGPS,
  };
}