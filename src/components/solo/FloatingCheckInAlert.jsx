import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, CheckCircle2, AlertTriangle, MapPin, X, Heart } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const POLL_INTERVAL_MS = 60 * 1000; // re-check every 60s

/**
 * FloatingCheckInAlert
 *
 * A global floating card that slides up from the bottom whenever the
 * authenticated user has a pending or overdue solo check-in.
 * The patient taps "I Am Safe" right here — no navigation required.
 * Works on any page, any device.
 *
 * Props: user — auth user object (from AuthContext)
 */
export default function FloatingCheckInAlert({ user }) {
  const [checkIn, setCheckIn]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [dismissed, setDismiss] = useState(false);
  const [locStatus, setLoc]     = useState('idle'); // idle|acquiring|ready|none
  const locRef  = useRef(null);
  const timerRef = useRef(null);

  const poll = () => {
    if (!user?.email) return;
    base44.functions.invoke('getSoloCheckInStatus')
      .then(res => {
        const d = res?.data;
        const pending = d?.overdue_check_ins?.[0] || d?.upcoming_check_ins?.[0] || null;
        setCheckIn(pending);
        if (pending) setDismiss(false); // new check-in — re-show if previously dismissed
      })
      .catch(() => {});
  };

  // Poll on mount and every 60s
  useEffect(() => {
    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [user?.email]);

  // Pre-acquire GPS when a check-in is pending
  useEffect(() => {
    if (!checkIn) return;
    setLoc('acquiring');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          locRef.current = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            source: 'gps',
          };
          setLoc('ready');
        },
        () => {
          // GPS denied — try IP geo silently
          base44.functions.invoke('getGeolocationAndCurrency', {})
            .then(res => {
              const g = res?.data;
              if (g?.latitude) {
                locRef.current = { lat: g.latitude, lng: g.longitude, country: g.country, city: g.city, source: 'ip_geo' };
                setLoc('ready');
              } else setLoc('none');
            })
            .catch(() => setLoc('none'));
        },
        { timeout: 8000, maximumAge: 60000 }
      );
    } else setLoc('none');
  }, [checkIn?.id]);

  const handleSafe = async () => {
    if (!checkIn || loading) return;
    setLoading(true);
    const loc = locRef.current;
    try {
      await base44.functions.invoke('acknowledgeSoloCheckIn', {
        case_id:          checkIn.case_id,
        response_method:  'app',
        location_lat:     loc?.lat     ?? null,
        location_lng:     loc?.lng     ?? null,
        accuracy_meters:  loc?.accuracy ?? null,
        location_source:  loc?.source   ?? null,
        country:          loc?.country  ?? null,
        city:             loc?.city     ?? null,
      });
      setDone(true);
      setCheckIn(null);
      // Auto-hide after 4 seconds
      setTimeout(() => setDone(false), 4000);
    } catch (_) {
      // silent — user can try again; don't break the experience
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = checkIn && new Date(checkIn.scheduled_time) < new Date();
  const visible   = (!!checkIn && !dismissed) || done;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={done ? 'done' : checkIn?.id}
          initial={{ y: 100, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed z-[9990]"
          style={{
            // Center-bottom on all screen sizes, above SOS + WhatsApp buttons
            bottom: 88,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(420px, calc(100vw - 32px))',
          }}
        >
          {done ? (
            /* ── Success state ── */
            <div
              className="rounded-2xl px-5 py-4 flex items-center gap-3 shadow-2xl"
              style={{ background: '#0a1a0a', border: '2px solid rgba(34,197,94,0.5)' }}
            >
              <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">✅ You're Marked Safe</p>
                <p className="text-xs mt-0.5" style={{ color: '#4ade80' }}>Location recorded. Next check-in in 12 hours.</p>
              </div>
            </div>
          ) : (
            /* ── Pending / overdue check-in ── */
            <div
              className="rounded-2xl overflow-hidden shadow-2xl"
              style={{
                background: isOverdue ? '#1a0505' : '#060B16',
                border: isOverdue
                  ? '2px solid rgba(239,68,68,0.6)'
                  : '2px solid rgba(34,197,94,0.4)',
                boxShadow: isOverdue
                  ? '0 8px 40px rgba(239,68,68,0.3)'
                  : '0 8px 40px rgba(34,197,94,0.2)',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center gap-2.5">
                  {isOverdue ? (
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" style={{ animation: 'pulse 1s ease-in-out infinite' }} />
                  ) : (
                    <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">
                      {isOverdue ? '🚨 Check-In Overdue' : '🛡️ Safety Check-In Due'}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: isOverdue ? '#fca5a5' : '#4ade80' }}>
                      {isOverdue
                        ? 'Confirm now to stop escalation'
                        : `Due: ${new Date(checkIn.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDismiss(true)}
                  className="p-1.5 rounded-lg"
                  style={{ color: '#475569' }}
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* GPS status */}
              {locStatus === 'ready' && locRef.current && (
                <div className="px-4 pt-2 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                  <p className="text-[10px]" style={{ color: '#4ade80' }}>
                    GPS ready · {locRef.current.lat?.toFixed(4)}, {locRef.current.lng?.toFixed(4)}
                  </p>
                </div>
              )}

              {/* I Am Safe button */}
              <div className="px-4 pb-4 pt-3">
                <motion.button
                  onClick={handleSafe}
                  disabled={loading}
                  whileTap={{ scale: 0.97 }}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm disabled:opacity-60 transition-all"
                  style={{
                    background: isOverdue
                      ? 'linear-gradient(135deg, #dc2626, #ef4444)'
                      : 'linear-gradient(135deg, #16a34a, #22c55e)',
                    color: '#fff',
                    boxShadow: isOverdue
                      ? '0 4px 20px rgba(239,68,68,0.4)'
                      : '0 4px 20px rgba(34,197,94,0.4)',
                  }}
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4 fill-white" />
                      I Am Safe
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
