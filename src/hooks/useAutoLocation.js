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
import { reverseGeocodePrecise } from '@/lib/reverseGeocode';

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
  // Companion to gpsStatus, purely additive — never changes gpsStatus's own
  // enum/transitions (redteam-pinned). Lets a caller show a differentiated,
  // actionable message instead of one generic "unavailable" for every real
  // GeolocationPositionError.code (1=denied, 2=position_unavailable,
  // 3=timeout) or the no-geolocation-API case.
  const [gpsErrorCode, setGpsErrorCode] = useState(null); // null | 1 | 2 | 3 | 'no_api'
  const [isLoading, setIsLoading] = useState(true);
  const [prefs, setPrefsState] = useState(readPrefs);
  const mountedRef = useRef(true);
  // Reentrancy guard — several independent callers (a typed-question GPS
  // upgrade, "Send my current location", the proactive LocationPermissionGate)
  // can each call requestGPS(true) around the same time. Without this, each
  // spins up its own permissions.query/getCurrentPosition call, which is not
  // just wasteful — it's the root cause of a real race where two overlapping
  // "pending" flows in a caller can both resolve against the same eventual
  // gpsStatus change. Cleared at every true terminal point below (never left
  // permanently stuck true).
  const gpsInFlightRef = useRef(false);

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

  // Request precise GPS (called explicitly by UI, not on mount). locationPaused
  // means "don't passively track me in the background" (e.g. the Emergency
  // Hub's breadcrumb auto-logging) — it must never silently veto a request
  // the traveler just explicitly made right now (a typed "where is my
  // location" or a tapped "Yes, use my exact location"). Callers making an
  // explicit, freshly-consented request pass force=true to bypass the pause
  // check entirely; a passive/automatic caller (the silent on-mount refresh
  // below, or a background-tracking UI) omits it and still respects pause.
  const requestGPS = useCallback((force = false, options = {}) => {
    if (!('geolocation' in navigator)) {
      setGpsStatus('unavailable');
      setGpsErrorCode('no_api');
      return;
    }
    if (prefs.locationPaused && !force) return;
    // A request is already resolving — let it finish rather than starting a
    // second, redundant permissions/geolocation call. gpsStatus will change
    // (or the caller's own safety-net timeout will fire) regardless of which
    // caller asked first.
    if (gpsInFlightRef.current) return;

    gpsInFlightRef.current = true;
    setGpsStatus('requesting');
    setGpsErrorCode(null);

    // maximumAge: a caller that must never silently reuse a stale fix (e.g.
    // "show my exact location on Google Maps right now") passes
    // { maximumAge: 0 } to force a genuinely fresh reading. The default 60s
    // cache window is fine for every other call site.
    const maximumAge = options.maximumAge != null ? options.maximumAge : 60000;

    // Hard safety timeout — separate from the browser's own { timeout }
    // option, which only bounds acquisition time once the permission is
    // already decided, not the time spent waiting on an unanswered native
    // permission prompt (which can hang forever behind a Permissions-Policy
    // restriction on a preview iframe). If neither callback has fired after
    // 14s, force a terminal state so gpsInFlightRef can never get
    // permanently stuck true (which would silently block every future
    // requestGPS call) and the gpsStatus effect in MCareOrb can show an
    // honest "timed out" message instead of leaving "Getting your exact
    // location now" as the last thing the traveler ever sees.
    let hardTimeoutFired = false;
    const hardTimeoutId = setTimeout(() => {
      if (hardTimeoutFired) return;
      hardTimeoutFired = true;
      gpsInFlightRef.current = false;
      if (!mountedRef.current) return;
      setGpsStatus('unavailable');
      setGpsErrorCode(3);
      updatePref('gpsGranted', false);
    }, 14000);

    const proceed = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (hardTimeoutFired) return;
          hardTimeoutFired = true;
          clearTimeout(hardTimeoutId);
          gpsInFlightRef.current = false;
          if (!mountedRef.current) return;
          const loc = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy_meters: pos.coords.accuracy ?? null,
            source: 'gps',
            precision: 'precise',
            logged_at: new Date().toISOString(),
            resolved_place: null,
          };
          setGpsLocation(loc);
          setGpsStatus('granted');
          setGpsErrorCode(null);
          updatePref('gpsGranted', true);

          // Best-effort real place name for this GPS fix — never blocks the
          // granted path itself. Guarded by logged_at so a slow reverse
          // geocode can never clobber a newer GPS reading.
          reverseGeocodePrecise(loc.latitude, loc.longitude).then((place) => {
            if (!mountedRef.current || !place) return;
            setGpsLocation((prev) => (prev && prev.logged_at === loc.logged_at)
              ? { ...prev, resolved_place: place }
              : prev);
          });
        },
        (err) => {
          if (hardTimeoutFired) return;
          hardTimeoutFired = true;
          clearTimeout(hardTimeoutId);
          gpsInFlightRef.current = false;
          if (!mountedRef.current) return;
          setGpsStatus(err.code === 1 ? 'denied' : 'unavailable');
          setGpsErrorCode(err.code === 1 ? 1 : (err.code === 2 ? 2 : 3));
          updatePref('gpsGranted', false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge }
      );
    };

    // Call getCurrentPosition directly — no permissions.query pre-check.
    // The pre-check was the root cause of zero console output: in the preview
    // iframe, navigator.permissions.query returns 'denied' (the iframe's
    // Permissions-Policy blocks geolocation), and the old code returned early
    // WITHOUT ever calling getCurrentPosition, so no geolocation activity was
    // visible in the console at all. The error callback above already
    // handles code 1 (denied), 2 (unavailable), and 3 (timeout) correctly —
    // there is no need for a separate fast-fail path that silently bypasses
    // the real API.
    proceed();
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
    gpsErrorCode,
    isLoading,
    prefs,
    requestGPS,
    setPaused,
    setAutoShare,
    setUseGPS,
  };
}