/**
 * Storage health utilities — handle quota exceeded gracefully
 */

export function getStorageUsageEstimate() {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      total += (key?.length || 0) + (value?.length || 0);
    }
    return { usedBytes: total * 2, isHealthy: total < 4 * 1024 * 1024 }; // ~4MB warning threshold
  } catch {
    return { usedBytes: 0, isHealthy: true };
  }
}

export function clearExpiredCaches() {
  try {
    const keysToRemove = [];
    const now = Date.now();
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Clear old geo caches (older than 24h)
      if (key.startsWith('morales_geo_')) {
        try {
          const val = JSON.parse(localStorage.getItem(key) || '{}');
          if (val.ts && now - val.ts > 24 * 60 * 60 * 1000) {
            keysToRemove.push(key);
          }
        } catch (_) {}
      }

      // Clear old IP caches (older than 1 hour)
      if (key.startsWith('auto_location_')) {
        try {
          const val = JSON.parse(localStorage.getItem(key) || '{}');
          if (val.ts && now - val.ts > 60 * 60 * 1000) {
            keysToRemove.push(key);
          }
        } catch (_) {}
      }
    }

    keysToRemove.forEach(k => { try { localStorage.removeItem(k); } catch (_) {} });
    return keysToRemove.length;
  } catch {
    return 0;
  }
}
