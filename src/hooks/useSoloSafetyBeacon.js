/**
 * useSoloSafetyBeacon
 * Safety beacon hook — while app is open on an active solo journey:
 * - Refreshes GPS/IP location every 10 minutes
 * - Logs a new LocationBreadcrumb if location changed >100m or last log is >15min old
 * - Pauses when tab is hidden (Page Visibility API)
 * - Stops when journey completes or medical pause is active
 *
 * NOT true background tracking — only runs while app is open.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const BEACON_INTERVAL_MS = 10 * 60 * 1000;   // 10 minutes
const MIN_LOG_AGE_MS = 15 * 60 * 1000;        // don't re-log if last breadcrumb <15min old
const MOVEMENT_THRESHOLD_M = 100;

const MEDICAL_PAUSE_STATUSES = new Set([
  'Procedure-In-Progress',
  'SURGICAL_EXECUTION_WINDOW',
]);

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useSoloSafetyBeacon({ caseId, caseStatus, isSoloTraveler }) {
  const [beaconActive, setBeaconActive] = useState(false);
  const [lastLocation, setLastLocation] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle'); // 'idle'|'active'|'denied'|'ip_fallback'
  const [lastLoggedAt, setLastLoggedAt] = useState(null);
  const mountedRef = useRef(true);
  const intervalRef = useRef(null);
  const lastCrumbRef = useRef(null);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const shouldRun = caseId && isSoloTraveler && !MEDICAL_PAUSE_STATUSES.has(caseStatus);

  // ── Get best available location ──────────────────────────────────────────
  const getLocation = useCallback(() => new Promise((resolve) => {
    if (!('geolocation' in navigator)) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy_meters: pos.coords.accuracy ?? null,
        source: 'gps',
      }),
      () => resolve(null), // denied/unavailable — caller falls back to IP geo
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }), []);

  // ── IP geo fallback ──────────────────────────────────────────────────────
  const getIpGeo = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('getGeolocationAndCurrency', {});
      const d = res?.data;
      if (d && !d.error) {
        return {
          latitude: d.latitude ?? null,
          longitude: d.longitude ?? null,
          country: d.country,
          country_code: d.country_code,
          city: d.city,
          region: d.region,
          timezone: d.timezone,
          place_label: [d.city, d.country].filter(Boolean).join(', ') || null,
          source: 'ip_geo',
        };
      }
    } catch (_) {}
    return null;
  }, []);

  // ── Core beacon tick ─────────────────────────────────────────────────────
  const tick = useCallback(async () => {
    if (!mountedRef.current || !shouldRun) return;
    if (document.visibilityState !== 'visible') return; // pause when tab hidden

    let loc = await getLocation();
    if (!loc) {
      if (mountedRef.current) setGpsStatus('ip_fallback');
      loc = await getIpGeo();
    } else {
      if (mountedRef.current) setGpsStatus('active');
    }

    if (!loc) return;
    if (mountedRef.current) setLastLocation(loc);

    const lastCrumb = lastCrumbRef.current;
    const now = Date.now();

    // Skip if recent enough AND close enough
    if (lastCrumb) {
      const age = now - new Date(lastCrumb.logged_at || 0).getTime();
      if (age < MIN_LOG_AGE_MS) {
        if (loc.latitude != null && lastCrumb.latitude != null) {
          const dist = distanceMeters(loc.latitude, loc.longitude, lastCrumb.latitude, lastCrumb.longitude);
          if (dist < MOVEMENT_THRESHOLD_M) return; // close + recent — skip
        } else {
          return; // no coords to compare — skip if recent
        }
      }
    }

    // Log breadcrumb
    try {
      const res = await base44.functions.invoke('logLocationBreadcrumb', {
        action: 'log',
        case_id: caseId,
        latitude: loc.latitude ?? null,
        longitude: loc.longitude ?? null,
        accuracy_meters: loc.accuracy_meters ?? null,
        place_label: loc.place_label ?? null,
        source: loc.source,
        country: loc.country ?? null,
        country_code: loc.country_code ?? null,
        city: loc.city ?? null,
        region: loc.region ?? null,
        timezone: loc.timezone ?? null,
      });
      if (res.data?.logged && mountedRef.current) {
        const ts = new Date().toISOString();
        setLastLoggedAt(ts);
        lastCrumbRef.current = { ...loc, logged_at: ts };
      }
    } catch (_) {}
  }, [caseId, shouldRun, getLocation, getIpGeo]);

  // ── Start/stop beacon ────────────────────────────────────────────────────
  useEffect(() => {
    if (!shouldRun) {
      setBeaconActive(false);
      clearInterval(intervalRef.current);
      return;
    }

    setBeaconActive(true);
    // Initial tick on mount
    tick();
    intervalRef.current = setInterval(tick, BEACON_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [shouldRun, tick]);

  // GPS permission request (explicit, for UI prompt)
  const requestGPS = useCallback(() => {
    if (!('geolocation' in navigator)) { setGpsStatus('denied'); return; }
    setGpsStatus('idle');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!mountedRef.current) return;
        setGpsStatus('active');
        setLastLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy_meters: pos.coords.accuracy, source: 'gps' });
      },
      () => { if (mountedRef.current) setGpsStatus('denied'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return { beaconActive, lastLocation, gpsStatus, lastLoggedAt, requestGPS };
}