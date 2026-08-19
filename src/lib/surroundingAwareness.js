/**
 * surroundingAwareness — arms/disarms the real background proximity engine
 * (src/components/layout/ProximityWatcher.jsx) conversationally instead of
 * through a settings toggle.
 *
 * ProximityWatcher already runs a real watchPosition loop and compares the
 * traveler's live position against a cached POI list — it just needs that
 * cache populated for real (it was previously always empty, so the loop
 * never fired for anyone). armSurroundingAwareness is the one place that
 * cache gets written; disarmSurroundingAwareness clears it. Both keyed off
 * the exact same localStorage keys ProximityWatcher itself reads, exported
 * here as the single source of truth so the two files can't drift.
 */

import { CATEGORIES, SAFETY_CATEGORY_IDS, findCategory } from './nearbyCategories';

export const POIS_KEY = 'm_nearby_pois';
export const SHOWN_KEY = 'm_proximity_shown';

const SAFETY_CATEGORIES = SAFETY_CATEGORY_IDS
  .map((id) => findCategory(id))
  .filter(Boolean);

/**
 * Searches every safety-relevant category near (lat, lng) and caches the
 * merged results for ProximityWatcher to compare against. Individual
 * category failures don't abort the whole arm — a partial result is still
 * real and worth caching.
 *
 * @param {object} base44 - the base44 SDK client
 * @param {{lat: number, lng: number}} coords
 * @returns {Promise<{count: number, categories: string[]}>}
 */
export async function armSurroundingAwareness(base44, { lat, lng }) {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new Error('armSurroundingAwareness requires a real lat/lng');
  }

  const settled = await Promise.allSettled(
    SAFETY_CATEGORIES.map((cat) =>
      base44.functions.invoke('searchNearbyPlaces', { lat, lng, category: cat.id, radius_km: 15 })
        .then((res) => {
          const data = res?.data ?? res ?? {};
          const results = Array.isArray(data.results) ? data.results : [];
          return results.map((r) => ({
            ...r,
            category: cat.label,
            emoji: cat.emoji,
          }));
        })
    )
  );

  const merged = [];
  const foundCategories = [];
  settled.forEach((outcome, i) => {
    if (outcome.status === 'fulfilled' && outcome.value.length) {
      merged.push(...outcome.value);
      foundCategories.push(SAFETY_CATEGORIES[i].label);
    }
  });

  try {
    localStorage.setItem(POIS_KEY, JSON.stringify(merged));
    sessionStorage.removeItem(SHOWN_KEY);
  } catch (_) {
    // localStorage unavailable (private browsing, quota) — fail open, the
    // caller's honest count still reflects what we found even if we
    // couldn't persist it for later comparison.
  }

  return { count: merged.length, categories: foundCategories };
}

/** Clears the cache — ProximityWatcher's loop goes back to comparing
 * against nothing, exactly its original (accidental) inert state. */
export function disarmSurroundingAwareness() {
  try {
    localStorage.removeItem(POIS_KEY);
    sessionStorage.removeItem(SHOWN_KEY);
  } catch (_) {
    // no-op — nothing to clean up if storage isn't reachable
  }
}

export { CATEGORIES };
