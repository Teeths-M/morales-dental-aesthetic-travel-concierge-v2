/**
 * RecoveryTrackerDemo — /demo/recovery
 *
 * Hardcoded demo of the PublicRecoveryTracker page.
 * Shows what Maria's family sees on their phone with zero login.
 * Built for buildathon judges — no token or backend required.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Heart, MapPin, ArrowLeft, Share2, RefreshCw } from 'lucide-react';

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

// Demo scenarios: judges can step through each phase
const DEMO_STAGES = [
  {
    id: 'transit_out',
    badge: '✈️ In Transit',
    data: { patient_display_name: 'Maria C.', destination: 'Caracas, Venezuela', current_step: 2, trip_phase: 'transit_out' },
  },
  {
    id: 'arrived',
    badge: '🏨 Arrived',
    data: { patient_display_name: 'Maria C.', destination: 'Caracas, Venezuela', current_step: 4, trip_phase: 'arrived' },
  },
  {
    id: 'recovery',
    badge: '🏥 In Recovery',
    data: { patient_display_name: 'Maria C.', destination: 'Caracas, Venezuela', current_step: 5, trip_phase: 'recovery' },
  },
  {
    id: 'transit_return',
    badge: '🛫 Heading Home',
    data: { patient_display_name: 'Maria C.', destination: 'Caracas, Venezuela', current_step: 7, trip_phase: 'transit_return' },
  },
  {
    id: 'completed',
    badge: '🏠 Safely Home',
    data: { patient_display_name: 'Maria C.', destination: 'Caracas, Venezuela', current_step: 9, trip_phase: 'completed' },
  },
];

function PulsingDot({ color }) {
  return (
    <span className="relative inline-flex">
      <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full opacity-75" style={{ background: color }} />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: color }} />
    </span>
  );
}

function TrackerCard({ caseData, lastRefresh }) {
  const currentStep = caseData.current_step ?? 0;
  const isComplete  = caseData.trip_phase === 'completed';
  const phaseInfo   = PHASE_MESSAGES[caseData.trip_phase] || PHASE_MESSAGES.pre_departure;
  const firstName   = (caseData.patient_display_name || 'Maria').split(' ')[0];
  const dest        = caseData.destination || 'their destination';

  return (
    <div className="max-w-sm mx-auto space-y-5">
      {/* Patient status hero */}
      <motion.div key={caseData.trip_phase} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl overflow-hidden"
        style={{ background: '#0C1A1D', border: `1px solid ${phaseInfo.color}40` }}>
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
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
            <Heart className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400">Wellbeing: Confirmed Good</span>
          </div>
          <div className="mt-3 flex items-center justify-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" style={{ color: GOLD }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{dest}</span>
          </div>
        </div>
      </motion.div>

      {/* 9-step progress */}
      <motion.div key={`progress-${caseData.current_step}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="rounded-2xl p-5" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: GOLD }}>Journey Progress</span>
          <span className="text-xs font-semibold" style={{ color: isComplete ? '#22c55e' : 'rgba(255,255,255,0.4)' }}>
            {isComplete ? '9/9 ✓' : `${currentStep}/9`}
          </span>
        </div>
        <div className="flex items-center gap-1 mb-4">
          {Array.from({ length: 9 }, (_, i) => {
            const step      = i + 1;
            const done      = isComplete || step <= currentStep;
            const isCurrent = !isComplete && step === currentStep + 1;
            const color     = done ? '#22c55e' : isCurrent ? GOLD : '#1e2d35';
            return (
              <React.Fragment key={step}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                  title={HS_LABELS[step]}
                  style={{ background: done ? 'rgba(34,197,94,0.15)' : isCurrent ? `${GOLD}15` : '#1e2d35',
                           border: `2px solid ${color}`,
                           fontSize: 10,
                           animation: isCurrent ? 'heartbeat 1.4s ease-in-out infinite' : undefined }}>
                  {done ? '✓' : step}
                </div>
                {i < 8 && <div className="flex-1 h-0.5 rounded-full"
                  style={{ background: done && !isComplete ? 'rgba(34,197,94,0.4)' : isComplete ? GOLD : '#1e2d35' }} />}
              </React.Fragment>
            );
          })}
        </div>
        {currentStep > 0 && currentStep <= 9 && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ background: isComplete ? `${GOLD}12` : 'rgba(34,197,94,0.08)',
                     border: `1px solid ${isComplete ? GOLD + '30' : 'rgba(34,197,94,0.2)'}` }}>
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

      {/* Next checkpoint */}
      {currentStep < 9 && currentStep + 1 <= 9 && (
        <motion.div key={`next-${currentStep}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
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
      <div className="text-center pb-4">
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <Shield className="w-3.5 h-3.5" style={{ color: GOLD }} />
          <span className="text-xs font-semibold" style={{ color: GOLD }}>Protected by Morales Safe-T4life™</span>
        </div>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Medical &amp; privacy information is never shared on this page.<br />
          This update is shared with consent by the traveller.
        </p>
      </div>
    </div>
  );
}

export default function RecoveryTrackerDemo() {
  const [stageIdx, setStageIdx] = useState(2); // start at 'recovery' — most interesting
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [copied, setCopied] = useState(false);

  const stage = DEMO_STAGES[stageIdx];

  function handleShare() {
    const url = `${window.location.origin}/track/eyJjYXNlX2lkIjoiTVJDLTIwMjYtMDAxIiwiZXhwaXJlc19hdCI6OTk5OTk5OTk5OTk5OX0=`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  }

  function handleRefresh() {
    setLastRefresh(new Date());
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060B16' }}>

      {/* Sticky demo control bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(6,11,22,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1e2d35' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <Link to="/demo" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', flexShrink: 0 }}>
            <ArrowLeft style={{ width: 13, height: 13 }} /> Demo
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
            Recovery Tracker — Family View
          </span>
          <div className="flex gap-1.5 ml-auto flex-wrap">
            {DEMO_STAGES.map((s, i) => (
              <button key={s.id} onClick={() => setStageIdx(i)}
                style={{
                  padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                  background: stageIdx === i ? GOLD : 'rgba(255,255,255,0.05)',
                  color: stageIdx === i ? '#060B16' : '#64748b',
                  border: stageIdx === i ? 'none' : '1px solid #2A3F4A',
                }}>
                {s.badge}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Simulated "phone view" header — mimics what family sees */}
      <div className="pt-6 pb-4 px-6 text-center" style={{ borderBottom: '1px solid #2A3F4A' }}>
        <img src="/morales-m-mark.png" alt="Morales" className="w-10 mx-auto mb-3"
          style={{ filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.5))' }} />
        <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: GOLD }}>Live Journey Update</div>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Auto-refreshes every 2 min
        </p>

        {/* Share + Refresh */}
        <div className="flex items-center justify-center gap-3 mt-3">
          <button onClick={handleShare}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: GOLD, color: '#060B16', border: 'none' }}>
            <Share2 style={{ width: 12, height: 12 }} />
            {copied ? '✓ Link Copied!' : 'Copy Share Link'}
          </button>
          <button onClick={handleRefresh}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid #2A3F4A' }}>
            <RefreshCw style={{ width: 11, height: 11 }} /> Refresh
          </button>
        </div>
      </div>

      {/* Tracker content */}
      <div className="px-4 py-8">
        <TrackerCard caseData={stage.data} lastRefresh={lastRefresh} />
      </div>

      {/* Judge callout at bottom */}
      <div className="max-w-sm mx-auto px-4 pb-12">
        <div style={{ borderRadius: 16, padding: '16px 20px', background: '#0C1A1D', border: `1px solid ${GOLD}25` }}>
          <p className="text-xs font-semibold mb-2" style={{ color: GOLD }}>The Viral Hook</p>
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
            The patient shares this link with family from inside the app. No login required.
            Friends watch in real time — like a flight tracker, but for medical travel.
            Every share is organic marketing for Morales.
          </p>
          <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Zero medical data exposed — only name, phase, and checkpoint progress.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes heartbeat { 0%,100%{transform:scale(1)} 14%{transform:scale(1.15)} 28%{transform:scale(1)} 42%{transform:scale(1.1)} }
      `}</style>
    </div>
  );
}
