/**
 * useLocationHistory
 * GPS breadcrumb trail — every 30s or 50m of movement.
 *
 * - Separate from useLiveLocationBeacon (lower accuracy, battery-friendly)
 * - Stores trail in localStorage: morales_trail_${caseId}
 * - Syncs unsynced points to logLocationBreadcrumb when online
 * - On reconnect: flushes accumulated offline points
 * - Returns trail for polyline rendering (no network needed after initial load)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const TRAIL_INTERVAL_MS = 30 * 1000;
const MOVE_THRESHOLD_M  = 50;
const MAX_TRAIL_POINTS  = 2000;  // ~16h at 30s intervals

function trailKey(caseId) { return `morales_trail_${caseId}`; }

function distanceM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function loadTrail(caseId) {
  if (!caseId) return [];
  try {
    const raw = localStorage.getItem(trailKey(caseId));
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}

function persistTrail(caseId, trail) {
  if (!caseId) return trail;
  try {
    const trimmed = trail.length > MAX_TRAIL_POINTS ? trail.slice(-MAX_TRAIL_POINTS) : trail;
    localStorage.setItem(trailKey(caseId), JSON.stringify(trimmed));
    return trimmed;
  } catch (_) { return trail; }
}

export function useLocationHistory({ caseId, enabled = true }) {
  const [trail, setTrail]           = useState(() => loadTrail(caseId));
  const [isRecording, setIsRecording] = useState(false);
  const watchIdRef   = useRef(null);
  const lastPtRef    = useRef(null);  // { lat, lng, ts }
  const mountedRef   = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Reload from localStorage when caseId changes
  useEffect(() => {
    setTrail(loadTrail(caseId));
    lastPtRef.current = null;
  }, [caseId]);

  const appendPoint = useCallback((lat, lng, accuracy) => {
    const last = lastPtRef.current;
    const now  = Date.now();
    const tooSoon    = last && (now - new Date(last.ts).getTime()) < TRAIL_INTERVAL_MS;
    const movedEnough = last && distanceM(lat, lng, last.lat, last.lng) >= MOVE_THRESHOLD_M;
    if (tooSoon && !movedEnough) return;

    const ts    = new Date().toISOString();
    const point = { lat, lng, accuracy: accuracy ?? null, ts, synced: false };
    lastPtRef.current = { lat, lng, ts };

    setTrail(prev => {
      const next = persistTrail(caseId, [...prev, point]);
      return next;
    });

    if (navigator.onLine && caseId) {
      base44.functions.invoke('logLocationBreadcrumb', {
        action: 'log', case_id: caseId,
        latitude: lat, longitude: lng,
        accuracy_meters: accuracy ?? null,
        source: 'gps',
      }).then(() => {
        // Mark synced in localStorage
        const current = loadTrail(caseId);
        const updated = current.map(p =>
          p.ts === ts ? { ...p, synced: true } : p
        );
        persistTrail(caseId, updated);
      }).catch(() => {});
    }
  }, [caseId]);

  // Flush unsynced points on reconnect
  const syncUnsynced = useCallback(async () => {
    if (!caseId || !navigator.onLine) return;
    const current = loadTrail(caseId);
    const unsynced = current.filter(p => !p.synced);
    if (!unsynced.length) return;

    for (const point of unsynced) {
      try {
        await base44.functions.invoke('logLocationBreadcrumb', {
          action: 'log', case_id: caseId,
          latitude: point.lat, longitude: point.lng,
          accuracy_meters: point.accuracy,
          source: 'gps',
        });
        point.synced = true;
      } catch (_) { break; }
    }
    const updated = persistTrail(caseId, current);
    if (mountedRef.current) setTrail([...updated]);
  }, [caseId]);

  useEffect(() => {
    window.addEventListener('online', syncUnsynced);
    return () => window.removeEventListener('online', syncUnsynced);
  }, [syncUnsynced]);

  // GPS watch (low accuracy = battery-friendly, still precise enough for trail)
  useEffect(() => {
    if (!enabled || !caseId || !('geolocation' in navigator)) {
      setIsRecording(false);
      return;
    }
    setIsRecording(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (!mountedRef.current) return;
        appendPoint(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
      },
      () => { if (mountedRef.current) setIsRecording(false); },
      { enableHighAccuracy: false, maximumAge: 30000, timeout: 15000 }
    );
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (mountedRef.current) setIsRecording(false);
    };
  }, [enabled, caseId, appendPoint]);

  const clearTrail = useCallback(() => {
    if (!caseId) return;
    try { localStorage.removeItem(trailKey(caseId)); } catch (_) {}
    if (mountedRef.current) setTrail([]);
  }, [caseId]);

  return { trail, isRecording, clearTrail };
}
