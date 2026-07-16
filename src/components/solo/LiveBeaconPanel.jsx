/**
 * LiveBeaconPanel — premium live location sharing
 *
 * Design: WhatsApp-style clarity. One tap to share, clear LIVE state,
 * elapsed timer, guardian link, share options. Works on light + dark surfaces.
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio, Navigation, Globe, WifiOff, Pause, Play,
  Copy, CheckCircle2, AlertTriangle, Lock, Share2,
  MessageCircle, Phone, ChevronDown, ChevronUp, Zap,
} from 'lucide-react';
import { useLiveLocationBeacon } from '@/hooks/useLiveLocationBeacon';
import { base44 } from '@/api/base44Client';

const _GOLD = '#D4AF37';
const GREEN = '#22c55e';

const STATUS_CONFIG = {
  idle:        { label: 'Tap to share your live location', short: 'Off',       color: '#94a3b8', pulse: false },
  requesting:  { label: 'Acquiring GPS signal…',           short: 'Starting',  color: '#f59e0b', pulse: true  },
  active:      { label: 'Live · Your guardian can see you',short: 'Live',      color: GREEN,     pulse: true  },
  denied:      { label: 'GPS denied — using network',      short: 'Approx.',   color: '#60a5fa', pulse: true  },
  ip_fallback: { label: 'Using network location',          short: 'Approx.',   color: '#60a5fa', pulse: true  },
  unavailable: { label: 'Location unavailable',            short: 'Unavail.',  color: '#f87171', pulse: false },
  paused:      { label: 'Sharing paused',                  short: 'Paused',    color: '#94a3b8', pulse: false },
};

function ElapsedTimer({ startedAt }) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    const tick = () => {
      const secs = Math.floor((Date.now() - startedAt) / 1000);
      if (secs < 60)        setElapsed(`${secs}s`);
      else if (secs < 3600) setElapsed(`${Math.floor(secs / 60)}m ${secs % 60}s`);
      else {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        setElapsed(`${h}h ${m}m`);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return <span>{elapsed}</span>;
}

export default function LiveBeaconPanel({
  caseId,
  caseStatus,
  guardianToken,
  isAdmin      = false,
  autoStart    = false,
  compact      = false,
}) {
  const [enabled,    setEnabled]    = useState(autoStart);
  const [copied,     setCopied]     = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [showShare,  setShowShare]  = useState(false);
  const startedAtRef = useRef(null);
  const [startedAt,  setStartedAt]  = useState(null);

  const { status, lastUpdate, currentLocation, isPaused, pause, resume } = useLiveLocationBeacon({
    caseId,
    caseStatus,
    enabled,
  });

  const sc          = STATUS_CONFIG[status] || STATUS_CONFIG.idle;
  const isLive      = enabled && (status === 'active' || status === 'ip_fallback' || status === 'denied');
  const isRunning   = enabled && !isPaused;
  const appUrl      = typeof window !== 'undefined' ? window.location.origin : '';
  const guardianLink = guardianToken ? `${appUrl}/guardian/${guardianToken}` : null;

  // Track when live sharing started
  useEffect(() => {
    if (isLive && !startedAtRef.current) {
      startedAtRef.current = Date.now();
      setStartedAt(Date.now());
    }
    if (!enabled) {
      startedAtRef.current = null;
      setStartedAt(null);
    }
  }, [isLive, enabled]);

  const toggle = () => {
    if (enabled && isRunning) {
      pause();
    } else if (enabled && isPaused) {
      resume();
    } else {
      setEnabled(true);
    }
  };

  const stop = () => {
    pause();
    setEnabled(false);
  };

  const copyLink = () => {
    if (!guardianLink) return;
    navigator.clipboard.writeText(guardianLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const shareWhatsApp = () => {
    if (!guardianLink) return;
    const text = encodeURIComponent(`I'm sharing my live location with you via Morales Safety. View it here: ${guardianLink}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const shareSMS = () => {
    if (!guardianLink) return;
    const text = encodeURIComponent(`My live location: ${guardianLink}`);
    window.open(`sms:?body=${text}`, '_blank', 'noopener,noreferrer');
  };

  const simulateMovement = async () => {
    if (!caseId || simulating) return;
    setSimulating(true);
    const baseLat = currentLocation?.lat ?? 10.4806;
    const baseLng = currentLocation?.lng ?? -66.9036;
    const jitter  = () => (Math.random() - 0.5) * 0.002;
    try {
      await base44.functions.invoke('updateLiveLocation', {
        case_id: caseId,
        latitude: baseLat + jitter(),
        longitude: baseLng + jitter(),
        accuracy_meters: 15,
        source: 'gps',
      });
    } catch (_) {}
    setSimulating(false);
  };

  if (compact) {
    // Slim inline version for dashboard cards
    return (
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3"
        style={{ background: isLive ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isLive ? 'rgba(34,197,94,0.3)' : 'rgba(42,63,74,0.6)'}` }}
      >
        <div className="relative flex-shrink-0">
          <div className={`w-3 h-3 rounded-full`} style={{ background: sc.color }} />
          {sc.pulse && (
            <div className="absolute inset-0 rounded-full animate-ping" style={{ background: sc.color, opacity: 0.4 }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold" style={{ color: '#fff' }}>
            {isLive ? 'Live location sharing' : 'Live location off'}
          </p>
          {startedAt && isLive && (
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Sharing for <ElapsedTimer startedAt={startedAt} />
            </p>
          )}
        </div>
        <button
          onClick={toggle}
          className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
          style={{
            background: isRunning ? 'rgba(248,113,113,0.15)' : 'rgba(34,197,94,0.15)',
            color: isRunning ? '#f87171' : '#4ade80',
            border: `1px solid ${isRunning ? 'rgba(248,113,113,0.3)' : 'rgba(34,197,94,0.3)'}`,
          }}
        >
          {isRunning ? 'Pause' : 'Share'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main live location card */}
      <motion.div
        layout
        className="rounded-2xl overflow-hidden"
        style={{
          background: isLive
            ? 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(16,185,129,0.06) 100%)'
            : 'rgba(12,26,29,0.8)',
          border: `1px solid ${isLive ? 'rgba(34,197,94,0.35)' : 'rgba(42,63,74,0.8)'}`,
          boxShadow: isLive ? '0 0 24px rgba(34,197,94,0.08)' : 'none',
          transition: 'all 0.4s ease',
        }}
      >
        <div className="p-4 space-y-4">

          {/* Top row: icon + label + LIVE badge + last update */}
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{
                  background: isLive ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${isLive ? 'rgba(34,197,94,0.4)' : 'rgba(42,63,74,0.8)'}`,
                }}
              >
                <Radio className="w-5 h-5" style={{ color: sc.color }} />
              </div>
              {sc.pulse && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full"
                  style={{ background: sc.color }}
                >
                  <span
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{ background: sc.color, opacity: 0.5 }}
                  />
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold" style={{ color: '#fff' }}>
                  Live Location
                </p>
                {isLive && (
                  <motion.span
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1,   opacity: 1 }}
                    className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded-md"
                    style={{ background: GREEN, color: '#fff', letterSpacing: '0.1em' }}
                  >
                    LIVE
                  </motion.span>
                )}
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {sc.label}
              </p>
            </div>

            {lastUpdate && isLive && (
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {new Date(lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
                <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>last sent</p>
              </div>
            )}
          </div>

          {/* Elapsed timer + coords */}
          <AnimatePresence>
            {isLive && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div
                  className="rounded-xl px-3 py-2.5 flex items-center gap-3"
                  style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.15)' }}
                >
                  <Zap className="w-3.5 h-3.5 flex-shrink-0" style={{ color: GREEN }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: GREEN }}>
                      Sharing for {startedAt ? <ElapsedTimer startedAt={startedAt} /> : '—'}
                    </p>
                    {currentLocation && (
                      <p className="text-[10px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {currentLocation.source === 'gps'
                          ? <><Navigation className="w-2.5 h-2.5 inline mr-0.5" />{currentLocation.lat?.toFixed(5)}, {currentLocation.lng?.toFixed(5)}</>
                          : <><Globe className="w-2.5 h-2.5 inline mr-0.5" />Approx. network location</>
                        }
                        {currentLocation.accuracy != null && ` ±${Math.round(currentLocation.accuracy)}m`}
                      </p>
                    )}
                  </div>
                  {startedAt && (
                    <button
                      onClick={stop}
                      className="text-[10px] font-semibold px-2.5 py-1 rounded-lg flex-shrink-0"
                      style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}
                    >
                      Stop
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* GPS denied warning */}
          {status === 'denied' && (
            <div
              className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#fcd34d' }}
            >
              <WifiOff className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>GPS permission denied. Using approximate network location. For precise tracking, allow location in your browser settings.</span>
            </div>
          )}

          {/* Privacy notice */}
          {enabled && (
            <div
              className="flex items-start gap-2 rounded-xl px-3 py-2 text-[11px]"
              style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', color: 'rgba(147,197,253,0.8)' }}
            >
              <Lock className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>Your guardian sees your moving location while this is active. If updates stop for 15 minutes, your safety team is automatically notified.</span>
            </div>
          )}

          {/* Main toggle */}
          <div className="flex gap-2">
            <button
              onClick={toggle}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all"
              style={isRunning ? {
                background: 'rgba(248,113,113,0.1)',
                border: '1px solid rgba(248,113,113,0.3)',
                color: '#fca5a5',
              } : {
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                border: '1px solid rgba(34,197,94,0.4)',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(34,197,94,0.25)',
              }}
            >
              {isRunning
                ? <><Pause className="w-4 h-4" /> Pause Sharing</>
                : isPaused
                  ? <><Play  className="w-4 h-4" /> Resume Sharing</>
                  : <><Radio className="w-4 h-4" /> Share Live Location</>
              }
            </button>

            {guardianLink && (
              <button
                onClick={() => setShowShare(s => !s)}
                className="flex items-center justify-center gap-1.5 px-4 rounded-2xl font-semibold text-xs transition-all"
                style={{ border: '1px solid rgba(42,63,74,0.8)', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.03)' }}
              >
                <Share2 className="w-4 h-4" />
                {showShare ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>

          {/* Share drawer */}
          <AnimatePresence>
            {showShare && guardianLink && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-1 space-y-2">
                  <p className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    Share guardian view link
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {/* WhatsApp */}
                    <button
                      onClick={shareWhatsApp}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all"
                      style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.25)' }}
                    >
                      <MessageCircle className="w-4 h-4" style={{ color: '#25d166' }} />
                      <span className="text-[10px] font-semibold" style={{ color: '#25d166' }}>WhatsApp</span>
                    </button>
                    {/* SMS */}
                    <button
                      onClick={shareSMS}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all"
                      style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)' }}
                    >
                      <Phone className="w-4 h-4" style={{ color: '#60a5fa' }} />
                      <span className="text-[10px] font-semibold" style={{ color: '#60a5fa' }}>SMS</span>
                    </button>
                    {/* Copy */}
                    <button
                      onClick={copyLink}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all"
                      style={{ background: copied ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(42,63,74,0.8)'}` }}
                    >
                      {copied
                        ? <CheckCircle2 className="w-4 h-4" style={{ color: GREEN }} />
                        : <Copy         className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
                      }
                      <span className="text-[10px] font-semibold" style={{ color: copied ? GREEN : 'rgba(255,255,255,0.4)' }}>
                        {copied ? 'Copied!' : 'Copy link'}
                      </span>
                    </button>
                  </div>
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    Anyone with this link can see your live location while you're sharing.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Admin demo controls */}
      {isAdmin && (
        <div
          className="rounded-xl px-3 py-2.5 flex items-center gap-3"
          style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}
        >
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#a78bfa' }} />
          <div className="flex-1">
            <p className="text-[10px]" style={{ color: '#c4b5fd' }}>Admin only — simulates GPS movement for demo</p>
          </div>
          <button
            onClick={simulateMovement}
            disabled={simulating || !caseId}
            className="text-[10px] font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
            style={{ background: 'rgba(124,58,237,0.2)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.3)' }}
          >
            {simulating ? 'Simulating…' : 'Simulate Move'}
          </button>
        </div>
      )}
    </div>
  );
}
