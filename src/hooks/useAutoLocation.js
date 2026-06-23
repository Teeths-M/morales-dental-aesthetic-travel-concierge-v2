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

const IP_CACHE_KEY = 'auto_location_ip_v3'; // v3: clears stale misidentified entries from ipinfo.io era
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
  try { sessionStorage.setItem(IP_CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch {}
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

  // Load IP geolocation on mount (cached, never blocks app)
  useEffect(() => {
    const cached = readCache();
    if (cached) { setIpLocation(cached); setIsLoading(false); return; }

    setIsLoading(true);
    base44.functions.invoke('getGeolocationAndCurrency', {})
      .then(res => {
        if (!mountedRef.current) return;
        const d = res?.data;
        if (d && !d.error) {
          const loc = {
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
          writeCache(loc);
          setIpLocation(loc);
        }
      })
      .catch(() => {})
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
  }, [prefs.locationPaused]);

  // If user previously granted GPS, silently refresh on mount
  useEffect(() => {
    if (prefs.gpsGranted && !prefs.locationPaused && 'geolocation' in navigator) {
      requestGPS();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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