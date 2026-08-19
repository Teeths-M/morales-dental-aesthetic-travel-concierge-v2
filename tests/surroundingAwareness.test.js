import { describe, it, expect, beforeEach } from 'vitest';
import { armSurroundingAwareness, disarmSurroundingAwareness, POIS_KEY, SHOWN_KEY } from '@/lib/surroundingAwareness';

// vitest runs this suite under environment: 'node' — localStorage/
// sessionStorage aren't real browser globals there, so a minimal in-memory
// mock stands in. Mirrors what ProximityWatcher.jsx actually reads (a JSON
// array under POIS_KEY, a JSON array under SHOWN_KEY).
function makeMemoryStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

beforeEach(() => {
  globalThis.localStorage = makeMemoryStorage();
  globalThis.sessionStorage = makeMemoryStorage();
});

// base44.functions.invoke resolves to the raw axios response ({ data: ... }),
// not the JSON body directly — this codebase has been bitten by that footgun
// repeatedly, so the mock deliberately returns that shape rather than a bare
// object, to prove armSurroundingAwareness unwraps it correctly.
function fakeBase44(resultsByCategory) {
  return {
    functions: {
      invoke: (name, { category }) => {
        if (name !== 'searchNearbyPlaces') return Promise.reject(new Error('unexpected fn'));
        const results = resultsByCategory[category] || [];
        return Promise.resolve({ data: { results } });
      },
    },
  };
}

describe('armSurroundingAwareness', () => {
  it('rejects without real coordinates', async () => {
    await expect(armSurroundingAwareness(fakeBase44({}), {})).rejects.toThrow();
  });

  it('merges results across categories and tags each with category/emoji', async () => {
    const base44 = fakeBase44({
      hospital: [{ id: 'h1', name: 'General Hospital', lat: 1, lng: 2, distance: 300 }],
      pharmacy: [{ id: 'p1', name: 'City Pharmacy', lat: 1, lng: 2, distance: 150 }],
      police: [],
      embassy: [],
    });
    const result = await armSurroundingAwareness(base44, { lat: 10.65, lng: -61.51 });
    expect(result.count).toBe(2);
    expect(result.categories.sort()).toEqual(['Hospital', 'Pharmacy'].sort());

    const cached = JSON.parse(localStorage.getItem(POIS_KEY));
    expect(cached).toHaveLength(2);
    const hospitalEntry = cached.find((p) => p.id === 'h1');
    expect(hospitalEntry.category).toBe('Hospital');
    expect(hospitalEntry.emoji).toBeTruthy();
  });

  it('tolerates one category failing without losing the others', async () => {
    const base44 = {
      functions: {
        invoke: (name, { category }) => {
          if (category === 'police') return Promise.reject(new Error('boom'));
          return Promise.resolve({ data: { results: [{ id: `${category}-1`, name: 'x', lat: 1, lng: 1 }] } });
        },
      },
    };
    const result = await armSurroundingAwareness(base44, { lat: 1, lng: 1 });
    expect(result.count).toBe(3); // hospital, pharmacy, embassy — police failed
  });

  it('caches an empty array (never leaves a stale prior cache) when nothing is found', async () => {
    localStorage.setItem(POIS_KEY, JSON.stringify([{ id: 'stale', name: 'old' }]));
    const base44 = fakeBase44({ hospital: [], pharmacy: [], police: [], embassy: [] });
    const result = await armSurroundingAwareness(base44, { lat: 1, lng: 1 });
    expect(result.count).toBe(0);
    expect(JSON.parse(localStorage.getItem(POIS_KEY))).toEqual([]);
  });

  it('clears the shown-set on a fresh arm', async () => {
    sessionStorage.setItem(SHOWN_KEY, JSON.stringify(['already-shown-id']));
    const base44 = fakeBase44({ hospital: [], pharmacy: [], police: [], embassy: [] });
    await armSurroundingAwareness(base44, { lat: 1, lng: 1 });
    expect(sessionStorage.getItem(SHOWN_KEY)).toBeNull();
  });
});

describe('disarmSurroundingAwareness', () => {
  it('clears both the POI cache and the shown-set', () => {
    localStorage.setItem(POIS_KEY, JSON.stringify([{ id: 'x' }]));
    sessionStorage.setItem(SHOWN_KEY, JSON.stringify(['x']));
    disarmSurroundingAwareness();
    expect(localStorage.getItem(POIS_KEY)).toBeNull();
    expect(sessionStorage.getItem(SHOWN_KEY)).toBeNull();
  });

  it('is a safe no-op when nothing was ever armed', () => {
    expect(() => disarmSurroundingAwareness()).not.toThrow();
  });
});
