/**
 * useLiveLocationBeacon
 * Uber-style watchPosition GPS beacon for active solo travelers.
 *
 * - Uses navigator.geolocation.watchPosition (continuous, not one-shot)
 * - Sends updates when: first fix | moved >25m | 60s elapsed since last send
 * - Falls back to IP geo if GPS is denied
 * - Stops on unmount, journey complete, logout, or pause
 * - Browser limitation: pauses when tab/app is in background or phone is locked
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const MOVE_THRESHOLD_M = 25;
const MAX_INTERVAL_MS = 60 * 1000; // send at least every 60s if position held
const COMPLETED_STATUSES = new Set(['Completed', 'waiver_refused']);

function distanceM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useLiveLocationBeacon({ caseId, caseStatus, enabled = true }) {
  const [status, setStatus] = useState('idle'); // 'idle'|'requesting'|'active'|'denied'|'unavailable'|'ip_fallback'|'paused'
  const [lastUpdate, setLastUpdate] = useState(null); // ISO string
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isPaused, setIsPaused] = useState(false);

  const watchIdRef = useRef(null);
  const lastSentRef = useRef(null); // { lat, lng, ts }
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // Restore last known position from localStorage so the patient sees their location
  // immediately on mount, even before the first GPS fix arrives.
  useEffect(() => {
    if (!caseId) return;
    try {
      const raw = localStorage.getItem(`morales_loc_cache_${caseId}`);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached?.lat != null && !currentLocation) setCurrentLocation(cached);
      }
    } catch (_) {}
  }, [caseId]);

  // cacheKey and sendUpdate must be defined before the online-flush useEffect
  // that references sendUpdate in its dependency array — otherwise they'd be in
  // the JavaScript temporal dead zone when React evaluates the dep array.
  const cacheKey = caseId ? `morales_loc_cache_${caseId}` : null;

  const sendUpdate = useCallback(async (lat, lng, accuracy, heading, speed, altitude, source = 'gps') => {
    if (!caseId || !mountedRef.current) return;

    const ts = new Date().toISOString();
    const locSnapshot = { lat, lng, accuracy, heading, speed, altitude, source, ts };

    // Always persist locally first — survives offline and app restarts
    if (cacheKey) {
      try { localStorage.setItem(cacheKey, JSON.stringify(locSnapshot)); } catch (_) {}
    }

    if (!navigator.onLine) {
      // Offline: update local state so patient UI stays accurate; sync on reconnect
      if (mountedRef.current) {
        setCurrentLocation(locSnapshot);
        setLastUpdate(ts);
      }
      return;
    }

    try {
      await base44.functions.invoke('updateLiveLocation', {
        case_id: caseId,
        latitude: lat,
        longitude: lng,
        accuracy_meters: accuracy ?? null,
        heading: heading ?? null,
        speed: speed ?? null,
        altitude: altitude ?? null,
        source,
      });
      lastSentRef.current = { lat, lng, ts };
      if (mountedRef.current) {
        setLastUpdate(ts);
        setCurrentLocation(locSnapshot);
      }
    } catch (_) {
      // Network error — local cache already written; will retry on next position event
      if (mountedRef.current) setCurrentLocation(locSnapshot);
    }
  }, [caseId, cacheKey]);

  // When connectivity returns, flush the latest cached position to the backend
  // so the Guardian map updates without waiting for the next GPS watchPosition event.
  useEffect(() => {
    if (!caseId) return;
    const onOnline = () => {
      try {
        const raw = localStorage.getItem(`morales_loc_cache_${caseId}`);
        if (!raw) return;
        const cached = JSON.parse(raw);
        if (!cached?.lat || !cached?.ts) return;
        const ageMs = Date.now() - new Date(cached.ts).getTime();
        if (ageMs < 30 * 60_000 && mountedRef.current) {
          sendUpdate(cached.lat, cached.lng, cached.accuracy, cached.heading, cached.speed, cached.altitude, cached.source || 'gps');
        }
      } catch (_) {}
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [caseId, sendUpdate]);

  const shouldRun = enabled && caseId && !COMPLETED_STATUSES.has(caseStatus) && !isPaused;

  const stopWatch = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  const startWatch = useCallback(() => {
    if (!('geolocation' in navigator)) {
      if (mountedRef.current) setStatus('unavailable');
      return;
    }

    if (mountedRef.current) setStatus('requesting');

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (!mountedRef.current) return;
        const { latitude, longitude, accuracy, heading, speed, altitude } = pos.coords;
        setStatus('active');

        const last = lastSentRef.current;
        const now = Date.now();
        const movedEnough = !last || distanceM(latitude, longitude, last.lat, last.lng) >= MOVE_THRESHOLD_M;
        const timeElapsed = !last || (now - new Date(last.ts).getTime()) >= MAX_INTERVAL_MS;

        if (movedEnough || timeElapsed) {
          sendUpdate(latitude, longitude, accuracy, heading, speed, altitude, 'gps');
        }
      },
      (err) => {
        if (!mountedRef.current) return;
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
          // Do NOT fall back to IP geolocation. IP geo resolves to the patient's ISP city
          // (often wrong country, especially with VPNs) and would pin the Guardian map to
          // the wrong location — e.g. Caracas for Venezuelan ISPs regardless of where the
          // patient physically is. Guardian sees "Location not yet shared" instead, which
          // is accurate and doesn't cause false alarms.
        } else {
          setStatus('unavailable');
        }
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
    );

    // Heartbeat: even if stationary, send every 60s to keep stale threshold from triggering
    intervalRef.current = setInterval(() => {
      if (!mountedRef.current || !lastSentRef.current) return;
      const last = lastSentRef.current;
      const age = Date.now() - new Date(last.ts).getTime();
      if (age >= MAX_INTERVAL_MS) {
        sendUpdate(last.lat, last.lng, currentLocation?.accuracy, currentLocation?.heading, currentLocation?.speed, currentLocation?.altitude, currentLocation?.source || 'gps');
      }
    }, MAX_INTERVAL_MS);
  }, [sendUpdate, currentLocation]);

  useEffect(() => {
    if (!shouldRun) {
      stopWatch();
      if (mountedRef.current) setStatus(isPaused ? 'paused' : 'idle');
      return;
    }
    startWatch();
    return stopWatch;
  }, [shouldRun, startWatch, stopWatch, isPaused]);

  // Page visibility: pause watch when tab hidden, restart when visible again
  useEffect(() => {
    if (!shouldRun) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible' && watchIdRef.current == null) {
        startWatch();
      } else if (document.visibilityState === 'hidden') {
        stopWatch(); // Pause when tab hidden — restarts on visibility
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [shouldRun, startWatch, stopWatch]);

  const pause = useCallback(() => {
    stopWatch();
    setIsPaused(true);
    setStatus('paused');
  }, [stopWatch]);

  const resume = useCallback(() => {
    setIsPaused(false);
    // shouldRun will re-trigger startWatch via effect
  }, []);

  return { status, lastUpdate, currentLocation, isPaused, pause, resume };
}
