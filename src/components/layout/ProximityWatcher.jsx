import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

const THRESHOLD_M = 200;
const POIS_KEY    = 'm_nearby_pois';
const SHOWN_KEY   = 'm_proximity_shown'; // sessionStorage — resets on tab close
const AI_TIMEOUT  = 3500; // ms — fall back to generic if AI takes longer

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
  const [nudge, setNudge]   = useState(null); // poi data
  const [aiMsg, setAiMsg]   = useState(null); // personalized message from Claude
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
        setAiMsg(null);
        setNudge({ ...poi, dist: Math.round(dist) });
        return;
      }
    }
  }, []);

  // Watch position globally
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

  // When a nudge fires: show generic immediately, then ask Claude to reason
  useEffect(() => {
    if (!nudge || !user) return;
    let cancelled = false;
    const timer = setTimeout(() => { cancelled = true; }, AI_TIMEOUT);

    base44.functions.invoke('analyzeProximityContext', {
      poi: nudge,
      current_time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    }).then(result => {
      clearTimeout(timer);
      if (cancelled) return;
      if (result?.relevant === false) {
        setNudge(null); // AI decided this isn't relevant — suppress silently
      } else if (result?.message) {
        setAiMsg(result.message); // upgrade to personalized message
      }
    }).catch(() => {}); // timeout or error → keep generic nudge

    return () => { cancelled = true; clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nudge?.id, user?.email]);

  // Auto-dismiss after 8 s
  useEffect(() => {
    if (!nudge) return;
    dismissT.current = setTimeout(() => setNudge(null), 8000);
    return () => clearTimeout(dismissT.current);
  }, [nudge]);

  // Suppress on /nearby (redundant), admin, and demo pages
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
            left: 0, right: 0,
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
              <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
                style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.22)' }}>
                <span className="text-xl leading-none">{nudge.emoji || '📍'}</span>
              </div>

              <div className="flex-1 min-w-0">
                <AnimatePresence mode="wait">
                  {aiMsg ? (
                    /* Personalized AI message */
                    <motion.p
                      key="ai"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.28 }}
                      className="text-[13px] font-semibold text-white leading-snug"
                    >
                      {aiMsg}
                    </motion.p>
                  ) : (
                    /* Generic fallback */
                    <motion.div key="generic" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <p className="text-[13px] font-semibold text-white leading-snug">
                        {firstName ? `Hey ${firstName},` : 'Heads up —'} you just passed a{' '}
                        <span style={{ color: '#00E5FF' }}>{nudge.category || 'nearby place'}</span>
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="text-sm font-semibold mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {nudge.name}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {nudge.dist} m away
                </p>
              </div>

              <button
                onClick={() => setNudge(null)}
                className="shrink-0 p-1 rounded-lg"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2 mt-3">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${nudge.lat},${nudge.lng}`}
                target="_blank" rel="noopener noreferrer"
                onClick={() => setNudge(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold"
                style={{ background: 'rgba(0,229,255,0.1)', color: '#00E5FF', border: '1px solid rgba(0,229,255,0.22)' }}
              >
                <Navigation className="w-3 h-3" /> Directions
              </a>
              <button
                onClick={() => setNudge(null)}
                className="px-3 py-1.5 rounded-xl text-[11px] font-semibold"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.07)' }}
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
