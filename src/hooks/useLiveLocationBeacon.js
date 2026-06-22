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

  const shouldRun = enabled && caseId && !COMPLETED_STATUSES.has(caseStatus) && !isPaused;

  const sendUpdate = useCallback(async (lat, lng, accuracy, heading, speed, altitude, source = 'gps') => {
    if (!caseId || !mountedRef.current) return;
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
      const ts = new Date().toISOString();
      lastSentRef.current = { lat, lng, ts };
      if (mountedRef.current) {
        setLastUpdate(ts);
        setCurrentLocation({ lat, lng, accuracy, heading, speed, altitude, source });
      }
    } catch (_) { /* network error — silent, will retry on next position event */ }
  }, [caseId]);

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
          // IP geo fallback
          base44.functions.invoke('getGeolocationAndCurrency', {}).then(res => {
            const d = res?.data;
            if (d?.latitude && mountedRef.current) {
              setStatus('ip_fallback');
              sendUpdate(d.latitude, d.longitude, null, null, null, null, 'ip_geo');
              // Re-poll IP geo every 60s as fallback
              intervalRef.current = setInterval(() => {
                if (!mountedRef.current) return;
                base44.functions.invoke('getGeolocationAndCurrency', {}).then(r => {
                  const dd = r?.data;
                  if (dd?.latitude) sendUpdate(dd.latitude, dd.longitude, null, null, null, null, 'ip_geo');
                }).catch(() => {});
              }, MAX_INTERVAL_MS);
            } else if (mountedRef.current) {
              setStatus('unavailable');
            }
          }).catch(() => { if (mountedRef.current) setStatus('unavailable'); });
        } else {
          setStatus('unavailable');
        }
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
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

  // Page visibility: restart watch when tab becomes visible again
  useEffect(() => {
    if (!shouldRun) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible' && watchIdRef.current == null) {
        startWatch();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [shouldRun, startWatch]);

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