import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

const THRESHOLD_M  = 200;
const POIS_KEY     = 'm_nearby_pois';
const SHOWN_KEY    = 'm_proximity_shown'; // sessionStorage — resets on tab close

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ProximityWatcher() {
  const { user }     = useAuth();
  const { pathname } = useLocation();
  const [nudge, setNudge] = useState(null);
  const watchId  = useRef(null);
  const dismissT = useRef(null);

  const firstName = user?.full_name?.split(' ')[0] || null;

  const checkProximity = useCallback((lat, lng) => {
    let pois;
    try { pois = JSON.parse(localStorage.getItem(POIS_KEY) || '[]'); } catch { return; }
    if (!pois.length) return;

    let shown;
    try { shown = new Set(JSON.parse(sessionStorage.getItem(SHOWN_KEY) || '[]')); } catch { shown = new Set(); }

    for (const poi of pois) {
      if (shown.has(String(poi.id))) continue;
      const dist = haversine(lat, lng, poi.lat, poi.lng);
      if (dist <= THRESHOLD_M) {
        shown.add(String(poi.id));
        sessionStorage.setItem(SHOWN_KEY, JSON.stringify([...shown]));
        setNudge({ ...poi, dist: Math.round(dist) });
        return;
      }
    }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    watchId.current = navigator.geolocation.watchPosition(
      pos => checkProximity(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: false, maximumAge: 30000, timeout: 15000 }
    );
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [checkProximity]);

  // Auto-dismiss after 8 s
  useEffect(() => {
    if (!nudge) return;
    dismissT.current = setTimeout(() => setNudge(null), 8000);
    return () => clearTimeout(dismissT.current);
  }, [nudge]);

  // Suppress on the /nearby page itself (redundant there) and admin pages
  if (pathname === '/nearby' || pathname.startsWith('/admin') || pathname.startsWith('/demo')) {
    return null;
  }

  return (
    <AnimatePresence>
      {nudge && (
        <div
          style={{
            position: 'fixed',
            bottom: '200px',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            padding: '0 16px',
            zIndex: 9998,
            pointerEvents: 'none',
          }}
        >
          <motion.div
            key="proximity-nudge"
            initial={{ opacity: 0, y: 56, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: '100%',
              maxWidth: '380px',
              background: 'rgba(6,11,22,0.95)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(0,229,255,0.28)',
              borderRadius: '20px',
              boxShadow: '0 8px 48px rgba(0,0,0,0.65), 0 0 0 1px rgba(0,229,255,0.06)',
              padding: '16px',
              pointerEvents: 'auto',
            }}
          >
            <div className="flex items-start gap-3">
              {/* Pin icon */}
              <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
                style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.22)' }}>
                <span className="text-xl leading-none">{nudge.emoji || '📍'}</span>
              </div>

              {/* Copy */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white leading-snug">
                  {firstName ? `Hey ${firstName},` : 'Heads up —'} you just passed a{' '}
                  <span style={{ color: '#00E5FF' }}>{nudge.category || 'nearby place'}</span>
                </p>
                <p className="text-sm font-semibold mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {nudge.name}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                  Only {nudge.dist} m away
                </p>
              </div>

              {/* Dismiss X */}
              <button
                onClick={() => setNudge(null)}
                className="shrink-0 p-1 rounded-lg transition-colors"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-3">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${nudge.lat},${nudge.lng}`}
                target="_blank" rel="noopener noreferrer"
                onClick={() => setNudge(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold"
                style={{
                  background: 'rgba(0,229,255,0.1)',
                  color: '#00E5FF',
                  border: '1px solid rgba(0,229,255,0.22)',
                }}
              >
                <Navigation className="w-3 h-3" /> Directions
              </a>
              <button
                onClick={() => setNudge(null)}
                className="px-3 py-1.5 rounded-xl text-[11px] font-semibold"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  color: 'rgba(255,255,255,0.45)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
