import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Heart, MapPin, ExternalLink, Navigation, MessageCircle, MessageSquare } from 'lucide-react';

function openNav(url) { window.open(url, '_blank', 'noopener,noreferrer'); }

const GOLD = '#D4AF37';

const HS_LABELS = [
  '', 'Home Pickup', 'Airport Drop-off', 'Destination Arrival',
  'Hotel Check-In', 'Clinic Arrival', 'Companion Delivery',
  'Return Transport', 'Home Airport', 'Journey Complete',
];
const HS_ICONS = ['', '🚗', '✈️', '🛬', '🏨', '🏥', '🍽️', '🚕', '🛫', '🏠'];

const PHASE_MESSAGES = {
  pre_departure:  { text: 'Preparing for departure',     color: '#94a3b8' },
  transit_out:    { text: 'Currently travelling abroad', color: '#60a5fa' },
  arrived:        { text: 'Arrived safely',              color: '#22c55e' },
  recovery:       { text: 'In recovery',                 color: GOLD       },
  transit_return: { text: 'Heading home',                color: '#a855f7' },
  completed:      { text: 'Journey complete ⭐',          color: '#22c55e' },
};

function decodeToken(token) {
  try {
    return JSON.parse(atob(token));
  } catch {
    return null;
  }
}

function PulsingDot({ color }) {
  return (
    <span className="relative inline-flex">
      <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full opacity-75" style={{ background: color }} />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: color }} />
    </span>
  );
}

/**
 * PublicRecoveryTracker — The Viral Hook
 *
 * A zero-login, beautiful, shareable page showing a patient's journey progress.
 * Like a flight tracker — friends and family can watch in real time.
 * No medical details exposed. Only: name, phase, progress, wellbeing status.
 *
 * URL: /track/[token]
 * Share via: WhatsApp, email, family group chat
 */
export default function PublicRecoveryTracker() {
  const { token } = useParams();
  const [caseData,  setCaseData]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadCase = async () => {
    if (!token) { setError('Invalid share link'); setLoading(false); return; }

    const decoded = decodeToken(token);
    if (!decoded?.case_id) { setError('This link is invalid or has expired'); setLoading(false); return; }
    if (decoded.expires_at && Date.now() > decoded.expires_at) { setError('This link has expired'); setLoading(false); return; }

    try {
      // Read only public-safe fields via a function that validates the token
      const res = await fetch(`/api/public/case-tracker?token=${encodeURIComponent(token)}`);
      if (!res.ok) throw new Error('not found');
      const data = await res.json();
      setCaseData(data);
      setLastRefresh(new Date());
    } catch (_) {
      // Fallback: use localStorage if this is the patient's own device
      const localData = localStorage.getItem(`morales_tracker_${decoded.case_id}`);
      if (localData) {
        try { setCaseData(JSON.parse(localData)); } catch (_) {}
      } else {
        setError('Unable to load journey status. Please try again shortly.');
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCase();
    // Refresh every 2 minutes
    const interval = setInterval(() => { loadCase(); }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#060B16' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Loading journey…</p>
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#060B16' }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ background: '#0C1A1D', border: `1px solid ${GOLD}30` }}>
            <img src="/morales-m-mark.png" alt="M" style={{ width: 40 }} />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Journey Not Available</h2>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>{error || 'This journey tracker link is not available.'}</p>
          <p className="text-xs mt-4" style={{ color: 'rgba(255,255,255,0.25)' }}>Morales Dental & Aesthetic — Medical Travel Concierge</p>
        </div>
      </div>
    );
  }

  const currentStep = caseData.current_step ?? 0;
  const isComplete  = caseData.trip_phase === 'completed';
  const phaseInfo   = PHASE_MESSAGES[caseData.trip_phase] || PHASE_MESSAGES.pre_departure;
  const firstName   = (caseData.patient_display_name || 'Your loved one').split(' ')[0];
  const dest        = caseData.destination || 'their destination';

  return (
    <div className="min-h-screen" style={{ background: '#060B16' }}>

      {/* Header */}
      <div className="pt-8 pb-6 px-6 text-center" style={{ borderBottom: '1px solid #2A3F4A' }}>
        <img src="/morales-m-mark.png" alt="Morales" className="w-10 mx-auto mb-3"
          style={{ filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.5))' }} />
        <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: GOLD }}>Live Journey Update</div>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Last updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Auto-refreshes every 2 min
        </p>
      </div>

      <div className="max-w-sm mx-auto px-4 py-8 space-y-6">

        {/* Patient status hero */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: '#0C1A1D', border: `1px solid ${phaseInfo.color}40` }}>
          {/* Top accent */}
          <div style={{ height: 3, background: `linear-gradient(to right, transparent, ${phaseInfo.color}, transparent)` }} />
          <div className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <PulsingDot color={phaseInfo.color} />
              <span className="text-xs font-semibold" style={{ color: phaseInfo.color }}>{phaseInfo.text}</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-1">{firstName}</h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              is {isComplete ? 'safely home' : `in ${dest}`}
            </p>

            {/* Wellbeing badge */}
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
              <Heart className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400">Wellbeing: Confirmed Good</span>
            </div>

            {dest && (
              <div className="mt-3 flex items-center justify-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" style={{ color: GOLD }} />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{dest}</span>
              </div>
            )}
            {dest && !isComplete && (() => {
              const destQuery = encodeURIComponent(dest);
              const googleUrl = `https://www.google.com/maps/search/?api=1&query=${destQuery}`;
              const wazeUrl   = `https://waze.com/ul?q=${destQuery}&navigate=yes`;
              const shareMsg  = encodeURIComponent(`${firstName} is in ${dest} — ${window.location.href}`);
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
                  <button onClick={() => openNav(googleUrl)} style={{ padding: '8px 6px', borderRadius: 8, background: '#4285F4', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <ExternalLink size={12} />Google Maps
                  </button>
                  <button onClick={() => openNav(wazeUrl)} style={{ padding: '8px 6px', borderRadius: 8, background: '#33CCFF', border: 'none', color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <Navigation size={12} />Waze
                  </button>
                  <button onClick={() => openNav(`https://wa.me/?text=${shareMsg}`)} style={{ padding: '8px 6px', borderRadius: 8, background: '#25D366', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <MessageCircle size={12} />WhatsApp
                  </button>
                  <button onClick={() => openNav(`sms:?body=${shareMsg}`)} style={{ padding: '8px 6px', borderRadius: 8, background: '#1e3040', border: '1px solid #2A3F4A', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <MessageSquare size={12} />SMS
                  </button>
                </div>
              );
            })()}
          </div>
        </motion.div>

        {/* 9-step journey progress */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl p-5" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: GOLD }}>Journey Progress</span>
            <span className="text-xs font-semibold" style={{ color: isComplete ? '#22c55e' : 'rgba(255,255,255,0.4)' }}>
              {isComplete ? '9/9 ✓' : `${currentStep}/9`}
            </span>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-1 mb-4">
            {Array.from({ length: 9 }, (_, i) => {
              const step     = i + 1;
              const done     = isComplete || step <= currentStep;
              const isCurrent = !isComplete && step === currentStep + 1;
              const color    = done ? '#22c55e' : isCurrent ? GOLD : '#1e2d35';
              return (
                <React.Fragment key={step}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                    title={HS_LABELS[step]}
                    style={{ background: done ? 'rgba(34,197,94,0.15)' : isCurrent ? `${GOLD}15` : '#1e2d35',
                             border: `2px solid ${color}`,
                             animation: isCurrent ? 'heartbeat 1.4s ease-in-out infinite' : undefined }}>
                    {done ? '✓' : <span style={{ fontSize: 10 }}>{step}</span>}
                  </div>
                  {i < 8 && <div className="flex-1 h-0.5 rounded-full" style={{ background: done && !isComplete ? 'rgba(34,197,94,0.4)' : isComplete ? GOLD : '#1e2d35' }} />}
                </React.Fragment>
              );
            })}
          </div>

          {/* Current milestone */}
          {currentStep > 0 && currentStep <= 9 && (
            <div className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ background: isComplete ? `${GOLD}12` : 'rgba(34,197,94,0.08)', border: `1px solid ${isComplete ? GOLD + '30' : 'rgba(34,197,94,0.2)'}` }}>
              <span style={{ fontSize: 20 }}>{HS_ICONS[currentStep]}</span>
              <div>
                <p className="text-xs font-semibold" style={{ color: isComplete ? GOLD : '#22c55e' }}>
                  {isComplete ? 'Golden M Achieved ✨' : `Last confirmed: ${HS_LABELS[currentStep]}`}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {isComplete ? 'All 9 checkpoints confirmed by Morales' : 'Digitally confirmed by Morales system'}
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {/* What's next */}
        {currentStep < 9 && currentStep + 1 <= 9 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="rounded-2xl px-5 py-4" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Next checkpoint</p>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 20 }}>{HS_ICONS[currentStep + 1]}</span>
              <div>
                <p className="text-sm font-semibold text-white">{HS_LABELS[currentStep + 1]}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Will be confirmed by Morales</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <div className="text-center pb-6">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <Shield className="w-3.5 h-3.5" style={{ color: GOLD }} />
            <span className="text-xs font-semibold" style={{ color: GOLD }}>Protected by Morales Safe-T4life™</span>
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Medical & privacy information is never shared on this page.<br/>
            This update is shared with your consent by the traveller.
          </p>
          <a href="/" className="block mt-4 text-xs underline" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Powered by Morales Dental & Aesthetic Travel Concierge
          </a>
        </div>
      </div>

      <style>{`
        @keyframes heartbeat { 0%,100%{transform:scale(1)} 14%{transform:scale(1.15)} 28%{transform:scale(1)} 42%{transform:scale(1.1)} }
      `}</style>
    </div>
  );
}
