import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, Navigation, AlertCircle, ExternalLink, Search, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import SurroundingAwarenessPanel from '@/components/nearby/SurroundingAwarenessPanel';

const CATEGORIES = [
  { id: 'doctors',  label: 'Doctor',   emoji: '🩺', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.25)',  gmaps: 'doctor',           apple: 'Doctor'           },
  { id: 'clinic',   label: 'Clinic',   emoji: '🏥', color: '#00E5FF', bg: 'rgba(0,229,255,0.12)',  border: 'rgba(0,229,255,0.25)',  gmaps: 'clinic',           apple: 'Medical+Clinic'   },
  { id: 'hospital', label: 'Hospital', emoji: '🚑', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)',  gmaps: 'hospital',         apple: 'Hospital'         },
  { id: 'pharmacy', label: 'Pharmacy', emoji: '💊', color: '#a855f7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.25)', gmaps: 'pharmacy',         apple: 'Pharmacy'         },
  { id: 'police',   label: 'Police',   emoji: '🚔', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)', gmaps: 'police+station',   apple: 'Police+Station'   },
  { id: 'embassy',  label: 'Embassy',  emoji: '🏛️',  color: '#D4AF37', bg: 'rgba(212,175,55,0.12)', border: 'rgba(212,175,55,0.25)', gmaps: 'embassy+consulate', apple: 'Embassy'         },
];

function fmtDist(m) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

async function osmSearch(lat, lng, categoryId, label) {
  const res  = await base44.functions.invoke('searchNearbyPlaces', {
    lat, lng, category: categoryId, radius_km: 15,
  });
  const data = res?.data ?? res;
  if (data?.error) throw new Error(data.error);
  return (data?.results || []).map(r => ({
    ...r,
    name: r.name || `Nearby ${label}`,
  }));
}

function gmapsUrl(cat, lat, lng) {
  return `https://www.google.com/maps/search/${cat.gmaps}/@${lat},${lng},14z`;
}
function appleMapsUrl(cat, lat, lng) {
  return `https://maps.apple.com/?q=${encodeURIComponent(cat.apple)}&sll=${lat},${lng}&z=14`;
}

export default function NearbyHelp() {
  const [loc, setLoc]             = useState(null);
  const [geoErr, setGeoErr]       = useState(null);
  const [geoLoading, setGL]       = useState(true);
  const [active, setActive]       = useState(null);
  const [osmResults, setOsmResults] = useState([]);
  const [searching, setSearching]   = useState(false);
  const [_osmFailed, setOsmFailed]   = useState(false);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoErr('Location not supported on this device.');
      setGL(false);
      return;
    }
    setGeoErr(null);
    setGL(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGL(false); },
      err => {
        // err.code distinguishes WHY geolocation failed — a phone's OS-level
        // Location toggle being on doesn't mean this site has permission, and
        // neither of those is the same problem as a weak/slow GPS fix. A single
        // "enable location access" message was wrong for 2 of these 3 cases.
        const message = err.code === 1
          ? "Location is blocked for this page specifically. Check your browser's site permissions (not just your phone's Location setting) and allow access for this site."
          : err.code === 3
            ? 'That took too long. Tap Try Again, or move somewhere with a clearer signal.'
            : "Couldn't get a signal — try moving near a window or outdoors.";
        setGeoErr(message);
        setGL(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => { locate(); }, [locate]);

  const search = useCallback(async (cat) => {
    if (!loc) return;
    setActive(cat.id);
    setOsmResults([]);
    setOsmFailed(false);
    setSearching(true);

    try {
      const data = await osmSearch(loc.lat, loc.lng, cat.id, cat.label);
      setOsmResults(data);
    } catch {
      setOsmFailed(true);
    } finally {
      setSearching(false);
    }
  }, [loc]);

  const activeCat = CATEGORIES.find(c => c.id === active);
  const hasOsm    = osmResults.length > 0;

  return (
    <div className="min-h-screen pb-32" style={{ background: '#060B16' }}>

      {/* Header */}
      <div className="px-4 sm:px-6 pt-8 pb-5 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.22)' }}>
            <MapPin className="w-5 h-5" style={{ color: '#D4AF37' }} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white leading-tight">Find Nearby Help</h1>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              M · Always on · No login required
            </p>
          </div>
        </div>

        {/* Geo status */}
        {geoLoading && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-1"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shrink-0" />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Locating you…</span>
          </div>
        )}
        {loc && !geoLoading && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-1"
            style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.14)' }}>
            <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-xs" style={{ color: 'rgba(34,197,94,0.85)' }}>
              Location locked — select a category below
            </span>
          </div>
        )}
        {geoErr && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)' }}>
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-xs text-red-400">{geoErr}</span>
              <button
                onClick={locate}
                className="block mt-1.5 text-xs font-semibold underline"
                style={{ color: '#ff8a8a' }}
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Surrounding Awareness (proactive proximity layer) */}
      <div className="px-4 sm:px-6 max-w-lg mx-auto mt-2">
        <SurroundingAwarenessPanel />
      </div>

      {/* Category grid */}
      <div className="px-4 sm:px-6 max-w-lg mx-auto">
        <p className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-3"
          style={{ color: 'rgba(255,255,255,0.18)' }}>
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
                style={{ color: active === cat.id ? cat.color : 'rgba(255,255,255,0.65)' }}>
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Results area */}
      <div className="px-4 sm:px-6 mt-6 max-w-lg mx-auto">

        {/* Searching spinner */}
        {searching && (
          <div className="flex items-center gap-3 py-6">
            <div className="w-5 h-5 rounded-full border-2 animate-spin shrink-0"
              style={{ borderColor: 'rgba(212,175,55,0.2)', borderTopColor: '#D4AF37' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Scanning nearby {activeCat?.label.toLowerCase()}s…
            </p>
          </div>
        )}

        <AnimatePresence>
          {/* ── Google Maps primary card — always shown after a search ── */}
          {activeCat && !searching && (
            <motion.div
              key={`gmaps-${activeCat.id}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-5"
            >
              {/* Section label */}
              <p className="text-[10px] uppercase tracking-[0.18em] font-semibold mb-2"
                style={{ color: 'rgba(255,255,255,0.18)' }}>
                {hasOsm ? 'Open in maps' : 'Search now — full coverage'}
              </p>

              {/* Google Maps card */}
              <a
                href={gmapsUrl(activeCat, loc?.lat, loc?.lng)}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between px-5 py-4 rounded-2xl transition-all active:scale-[0.98] group"
                style={{
                  background: 'linear-gradient(135deg, rgba(66,133,244,0.14) 0%, rgba(66,133,244,0.06) 100%)',
                  border: '1px solid rgba(66,133,244,0.28)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(66,133,244,0.18)' }}>
                    <span className="text-[18px] leading-none">{activeCat.emoji}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white leading-tight">
                      {activeCat.label} on Google Maps
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      Real-time · Ratings · Hours · Directions
                    </p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 shrink-0 group-hover:opacity-80"
                  style={{ color: '#4285f4' }} />
              </a>

              {/* Apple Maps secondary */}
              <a
                href={appleMapsUrl(activeCat, loc?.lat, loc?.lng)}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between px-5 py-3 rounded-2xl mt-2 transition-all active:scale-[0.98] group"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <span className="text-[16px] leading-none">🗺️</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white leading-tight">Apple Maps</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      Opens at your exact location
                    </p>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }} />
              </a>
            </motion.div>
          )}

          {/* ── OSM results — bonus layer when data exists ── */}
          {hasOsm && !searching && (
            <motion.div
              key="osm-results"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-3 h-3" style={{ color: '#D4AF37' }} />
                <p className="text-[10px] uppercase tracking-[0.18em] font-semibold"
                  style={{ color: 'rgba(255,255,255,0.18)' }}>
                  {osmResults.length} found near you
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {osmResults.map((r, i) => (
                  <motion.div
                    key={r.id || i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-2xl p-4"
                    style={{ background: '#0C1A1D', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="text-xl shrink-0 mt-0.5">{activeCat?.emoji}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white leading-tight">{r.name}</p>
                          {r.address && (
                            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                              {r.address}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono shrink-0 px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pre-search prompt */}
        {!active && !searching && !geoLoading && !geoErr && (
          <div className="text-center py-10">
            <Search className="w-8 h-8 mx-auto mb-3 opacity-20" style={{ color: 'rgba(255,255,255,0.4)' }} />
            <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.22)' }}>
              Tap a category to find nearby help
            </p>
          </div>
        )}
      </div>
    </div>
  );
}