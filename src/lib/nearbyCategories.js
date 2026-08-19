/**
 * nearbyCategories — the single shared definition of "what kind of nearby
 * help can we look up," used by NearbyHelp.jsx's manual tap-a-category
 * search, useSurroundingAwareness.js's background proximity sweep, and
 * SurroundingAwarenessPanel.jsx's per-category toggles. Extracted so the
 * three never drift out of sync on id/label/emoji/OSM-query mappings.
 */

export const CATEGORIES = [
  { id: 'doctors',  label: 'Doctor',   emoji: '🩺', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.25)',  gmaps: 'doctor',           apple: 'Doctor'           },
  { id: 'clinic',   label: 'Clinic',   emoji: '🏥', color: '#00E5FF', bg: 'rgba(0,229,255,0.12)',  border: 'rgba(0,229,255,0.25)',  gmaps: 'clinic',           apple: 'Medical+Clinic'   },
  { id: 'hospital', label: 'Hospital', emoji: '🚑', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)',  gmaps: 'hospital',         apple: 'Hospital'         },
  { id: 'pharmacy', label: 'Pharmacy', emoji: '💊', color: '#a855f7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.25)', gmaps: 'pharmacy',         apple: 'Pharmacy'         },
  { id: 'police',   label: 'Police',   emoji: '🚔', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)', gmaps: 'police+station',   apple: 'Police+Station'   },
  { id: 'embassy',  label: 'Embassy',  emoji: '🏛️',  color: '#D4AF37', bg: 'rgba(212,175,55,0.12)', border: 'rgba(212,175,55,0.25)', gmaps: 'embassy+consulate', apple: 'Embassy'         },
];

export function findCategory(id) {
  return CATEGORIES.find((c) => c.id === id) || null;
}
