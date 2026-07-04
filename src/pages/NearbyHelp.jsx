import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, Navigation, AlertCircle } from 'lucide-react';

const CATEGORIES = [
  { id: 'doctors',  label: 'Doctor',   emoji: '🩺', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.25)'  },
  { id: 'clinic',   label: 'Clinic',   emoji: '🏥', color: '#00E5FF', bg: 'rgba(0,229,255,0.12)',  border: 'rgba(0,229,255,0.25)'  },
  { id: 'hospital', label: 'Hospital', emoji: '🚑', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)'  },
  { id: 'pharmacy', label: 'Pharmacy', emoji: '💊', color: '#a855f7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.25)' },
  { id: 'police',   label: 'Police',   emoji: '🚔', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)' },
  { id: 'embassy',  label: 'Embassy',  emoji: '🏛️',  color: '#D4AF37', bg: 'rgba(212,175,55,0.12)', border: 'rgba(212,175,55,0.25)' },
];

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDist(m) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

async function overpassSearch(lat, lng, amenity, radiusKm) {
  const r = radiusKm * 1000;
  const q = `[out:json][timeout:25];(node(around:${r},${lat},${lng})[amenity=${amenity}];way(around:${r},${lat},${lng})[amenity=${amenity}];);out body center;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: q });
  if (!res.ok) throw new Error('Search failed');
  const { elements } = await res.json();
  return elements
    .map(el => {
      const elLat = el.lat ?? el.center?.lat;
      const elLng = el.lon ?? el.center?.lon;
      return {
        id: el.id,
        name: el.tags?.name || null,
        lat: elLat, lng: elLng,
        phone: el.tags?.phone || el.tags?.['contact:phone'] || null,
        address: [el.tags?.['addr:street'], el.tags?.['addr:housenumber'], el.tags?.['addr:city']].filter(Boolean).join(' ') || null,
        distance: elLat != null ? haversine(lat, lng, elLat, elLng) : Infinity,
      };
    })
    .filter(el => el.lat != null && el.name)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 12);
}

export default function NearbyHelp() {
  const [loc, setLoc]             = useState(null);
  const [geoErr, setGeoErr]       = useState(null);
  const [geoLoading, setGL]       = useState(true);
  const [active, setActive]       = useState(null);
  const [results, setResults]     = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState(null);
  const [radius, setRadius]       = useState(3);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoErr('Location not supported on this device.');
      setGL(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => { setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGL(false); },
      ()   => { setGeoErr('Location access denied. Enable location to find nearby help.'); setGL(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const search = useCallback(async (cat, r) => {
    if (!loc) return;
    const km = r ?? radius;
    setActive(cat.id);
    setSearching(true);
    setSearchErr(null);
    setResults([]);
    try {
      const data = await overpassSearch(loc.lat, loc.lng, cat.id, km);
      setResults(data);
      if (data.length > 0) {
        // Persist POIs so ProximityWatcher can nudge the user as they walk past them
        const tagged = data.map(r => ({ ...r, category: cat.label, emoji: cat.emoji }));
        localStorage.setItem('m_nearby_pois', JSON.stringify(tagged));
      }
      if (data.length === 0) setSearchErr(`No ${cat.label.toLowerCase()} found within ${km} km.`);
    } catch {
      setSearchErr('Search failed. Check your connection and try again.');
    } finally {
      setSearching(false);
    }
  }, [loc, radius]);

  const activeCat = CATEGORIES.find(c => c.id === active);

  return (
    <div className="min-h-screen pb-32" style={{ background: '#060B16' }}>
      {/* Page header */}
      <div className="px-4 sm:px-6 pt-8 pb-5 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)' }}>
            <MapPin className="w-5 h-5" style={{ color: '#00E5FF' }} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white leading-tight">Find Nearby Help</h1>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              M · Always on · No login required
            </p>
          </div>
        </div>

        {/* Geo status badge */}
        {geoLoading && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shrink-0" />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Locating you…</span>
          </div>
        )}
        {loc && !geoLoading && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.14)' }}>
            <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-xs" style={{ color: 'rgba(34,197,94,0.85)' }}>
              Location found — results within {radius} km
            </span>
          </div>
        )}
        {geoErr && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)' }}>
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="text-xs text-red-400">{geoErr}</span>
          </div>
        )}
      </div>

      {/* Category grid */}
      <div className="px-4 sm:px-6 max-w-lg mx-auto">
        <p className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-3"
          style={{ color: 'rgba(255,255,255,0.2)' }}>
          What do you need?
        </p>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => search(cat)}
              disabled={!loc || searching}
              className="flex flex-col items-center gap-1.5 py-4 px-2 rounded-2xl transition-all duration-200 active:scale-95"
              style={{
                background: active === cat.id ? cat.bg : 'rgba(255,255,255,0.03)',
                border:     `1px solid ${active === cat.id ? cat.border : 'rgba(255,255,255,0.07)'}`,
                opacity:    !loc ? 0.45 : 1,
                cursor:     !loc ? 'not-allowed' : 'pointer',
              }}
            >
              <span className="text-[22px] leading-none">{cat.emoji}</span>
              <span className="text-[11px] font-semibold"
                style={{ color: active === cat.id ? cat.color : 'rgba(255,255,255,0.7)' }}>
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="px-4 sm:px-6 mt-6 max-w-lg mx-auto">
        {searching && (
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="w-8 h-8 rounded-full border-2 animate-spin"
              style={{ borderColor: 'rgba(0,229,255,0.2)', borderTopColor: '#00E5FF' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Scanning your area…</p>
          </div>
        )}

        {searchErr && !searching && (
          <div className="text-center py-8">
            <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>{searchErr}</p>
            {activeCat && radius < 10 && (
              <button
                onClick={() => { setRadius(10); search(activeCat, 10); }}
                className="text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
                style={{ background: 'rgba(0,229,255,0.1)', color: '#00E5FF', border: '1px solid rgba(0,229,255,0.2)' }}
              >
                Expand to 10 km
              </button>
            )}
          </div>
        )}

        <AnimatePresence>
          {results.length > 0 && !searching && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-2"
            >
              <p className="text-[10px] uppercase tracking-[0.18em] font-semibold mb-1"
                style={{ color: 'rgba(255,255,255,0.2)' }}>
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </p>
              {results.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.035 }}
                  className="rounded-2xl p-4"
                  style={{ background: '#0C1A1D', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-xl shrink-0 mt-0.5">{activeCat?.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white leading-tight">{r.name}</p>
                        {r.address && (
                          <p className="text-[11px] mt-0.5"
                            style={{ color: 'rgba(255,255,255,0.38)' }}>{r.address}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] font-mono shrink-0 px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)' }}>
                      {fmtDist(r.distance)}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all active:scale-95"
                      style={{ background: 'rgba(0,229,255,0.1)', color: '#00E5FF', border: '1px solid rgba(0,229,255,0.2)' }}
                    >
                      <Navigation className="w-3 h-3" /> Directions
                    </a>
                    {r.phone && (
                      <a href={`tel:${r.phone}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all active:scale-95"
                        style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                        <Phone className="w-3 h-3" /> Call
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state before any search */}
        {!active && !searching && !geoLoading && !geoErr && (
          <div className="text-center py-10">
            <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Tap a category above to find what you need.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
