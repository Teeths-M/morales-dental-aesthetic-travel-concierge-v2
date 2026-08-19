/**
 * useSurroundingAwareness — proactive proximity-detection store + hook.
 *
 * Watches the user's location via navigator.geolocation.watchPosition whenever
 * the app is open AND the user has explicitly enabled the feature. On
 * significant movement (>250m) or every 3 minutes, runs a proximity sweep
 * across the user's enabled categories via the existing searchNearbyPlaces
 * backend function. New places within the pass-by radius trigger BOTH an
 * in-app gold M-Care bubble (rendered on NearbyHelp from detectedPlaces) AND
 * a push notification (via notifyProximityAlert backend function, which also
 * creates a JourneyEvent if the user has an active case).
 *
 * Dedup is localStorage-backed (persists across sessions) with 24h age
 * eviction so the same police station is never re-alerted while stationary.
 *
 * Module-level state + observer pattern so the watching logic runs once
 * globally (via SurroundingAwarenessWatcher in App.jsx) while the UI panel
 * on NearbyHelp subscribes to the same state.
 */
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// ── Constants ──────────────────────────────────────────────────────────────
const STORAGE_KEY = 'm_surrounding_awareness';
const NOTIFIED_KEY = 'm_surrounding_notified';

const CATEGORIES = ['doctors', 'clinic', 'hospital', 'pharmacy', 'police', 'embassy'];
const CATEGORY_LABELS = {
  doctors: 'Doctor', clinic: 'Clinic', hospital: 'Hospital',
  pharmacy: 'Pharmacy', police: 'Police', embassy: 'Embassy',
};

const MIN_MOVE_METERS = 250;
const SWEEP_COOLDOWN_MS = 3 * 60 * 1000;
const SEARCH_RADIUS_KM = 2;
const NOTIFY_RADIUS_M = 1500;
const EVICT_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_NOTIFIED = 120;

// ── Helpers ────────────────────────────────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        enabled: !!parsed.enabled,
        categories: {
          ...Object.fromEntries(CATEGORIES.map(c => [c, true])),
          ...(parsed.categories || {}),
        },
      };
    }
  } catch { /* fall through */ }
  return {
    enabled: false,
    categories: Object.fromEntries(CATEGORIES.map(c => [c, true])),
  };
}

function saveSettings(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* quota */ }
}

function loadDetected() {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      const now = Date.now();
      return (Array.isArray(arr) ? arr : []).filter(p => now - p.detectedAt < EVICT_AGE_MS);
    }
  } catch { /* fall through */ }
  return [];
}

function saveDetected(arr) {
  try { localStorage.setItem(NOTIFIED_KEY, JSON.stringify(arr.slice(0, MAX_NOTIFIED))); } catch { /* quota */ }
}

function fmtDist(m) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

// ── Module-level state ─────────────────────────────────────────────────────
let settings = loadSettings();
let detectedPlaces = loadDetected();
let sweeping = false;
let watchId = null;
let lastSweepLoc = null;
let lastSweepTime = 0;
const listeners = new Set();

function emit() { listeners.forEach(l => l()); }

// ── Actions ────────────────────────────────────────────────────────────────
export function toggleEnabled() {
  settings = { ...settings, enabled: !settings.enabled };
  saveSettings(settings);
  if (settings.enabled) startWatching();
  else stopWatching();
  emit();
}

export function toggleCategory(catId) {
  settings = {
    ...settings,
    categories: { ...settings.categories, [catId]: !settings.categories[catId] },
  };
  saveSettings(settings);
  emit();
}

export function clearHistory() {
  detectedPlaces = [];
  saveDetected(detectedPlaces);
  emit();
}

// ── Watching logic ──────────────────────────────────────────────────────────
function startWatching() {
  if (watchId !== null || !navigator.geolocation) return;
  watchId = navigator.geolocation.watchPosition(
    handlePosition,
    () => { /* silent — geolocation errors are non-fatal; sweeps retry on next fix */ },
    { enableHighAccuracy: false, maximumAge: 60000, timeout: 30000 },
  );
}

function stopWatching() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  lastSweepLoc = null;
  lastSweepTime = 0;
}

async function handlePosition(pos) {
  const { latitude: lat, longitude: lng } = pos.coords;
  const now = Date.now();

  // Throttle: only sweep if moved enough OR enough time passed
  if (lastSweepLoc) {
    const moved = haversine(lastSweepLoc.lat, lastSweepLoc.lng, lat, lng);
    if (moved < MIN_MOVE_METERS && now - lastSweepTime < SWEEP_COOLDOWN_MS) return;
  } else if (now - lastSweepTime < SWEEP_COOLDOWN_MS && lastSweepTime > 0) {
    return;
  }

  lastSweepLoc = { lat, lng };
  lastSweepTime = now;

  await runSweep(lat, lng);
}

async function runSweep(lat, lng) {
  if (sweeping) return;
  sweeping = true;
  emit();

  let isAuthed = false;
  try { isAuthed = await base44.auth.isAuthenticated(); } catch { /* not logged in */ }

  try {
    for (const cat of CATEGORIES) {
      if (!settings.categories[cat]) continue;

      let res;
      try {
        res = await base44.functions.invoke('searchNearbyPlaces', {
          lat, lng, category: cat, radius_km: SEARCH_RADIUS_KM,
        });
      } catch { continue; /* one category failing shouldn't block others */ }

      const data = res?.data ?? res;
      const results = (data?.results || []).filter(r => r.distance <= NOTIFY_RADIUS_M);

      for (const place of results) {
        const placeKey = place.id || place.name || `${place.lat},${place.lng}`;
        const dedupKey = `${placeKey}_${cat}`;
        if (detectedPlaces.some(p => p.key === dedupKey)) continue;

        // Add to detected list (drives both dedup + UI history)
        detectedPlaces = [
          {
            key: dedupKey,
            name: place.name || `Nearby ${CATEGORY_LABELS[cat]}`,
            category: cat,
            categoryLabel: CATEGORY_LABELS[cat],
            lat: place.lat,
            lng: place.lng,
            address: place.address,
            distance: place.distance,
            detectedAt: Date.now(),
          },
          ...detectedPlaces.filter(p => p.key !== dedupKey),
        ].slice(0, MAX_NOTIFIED);
        saveDetected(detectedPlaces);
        emit();

        // Fire push + JourneyEvent (only if logged in — push requires a user_id)
        if (isAuthed) {
          base44.functions.invoke('notifyProximityAlert', {
            place_name: place.name || `Nearby ${CATEGORY_LABELS[cat]}`,
            category: cat,
            category_label: CATEGORY_LABELS[cat],
            lat: place.lat,
            lng: place.lng,
            address: place.address || null,
          }).catch(() => { /* non-fatal — in-app bubble still rendered */ });
        }
      }
    }
  } catch { /* entire sweep failing is non-fatal — retries on next movement */ }

  sweeping = false;
  emit();
}

// ── React hook ──────────────────────────────────────────────────────────────
export function useSurroundingAwareness() {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const cb = () => forceUpdate(n => n + 1);
    listeners.add(cb);
    return () => listeners.delete(cb);
  }, []);

  return {
    enabled: settings.enabled,
    categories: settings.categories,
    detectedPlaces,
    sweeping,
    toggleEnabled,
    toggleCategory,
    clearHistory,
  };
}

// ── Global watcher init/cleanup (used by SurroundingAwarenessWatcher) ───────
export function initIfEnabled() {
  if (settings.enabled) startWatching();
}

export function cleanup() {
  stopWatching();
}