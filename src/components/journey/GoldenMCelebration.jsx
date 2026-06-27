import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import GoldenMCertificate from './GoldenMCertificate';

const GOLD = '#D4AF37';

/**
 * GoldenMCelebration — full-screen modal shown when Handshake 9 is confirmed.
 *
 * Props:
 *   visible  — boolean
 *   trip     — TravelRequest object (for summary stats)
 *   onClose  — callback
 */
export default function GoldenMCelebration({ visible, trip, patientName, onClose }) {
  const [canClose, setCanClose] = useState(false);
  const [showCert, setShowCert] = useState(false);

  useEffect(() => {
    if (!visible) { setCanClose(false); return; }

    // Confetti burst
    const burst = () => confetti({
      particleCount: 120,
      spread: 100,
      origin: { y: 0.55 },
      colors: [GOLD, '#FFE066', '#FFF8DC', '#ffffff'],
      ticks: 200,
    });
    burst();
    const t2 = setTimeout(burst, 600);
    const t3 = setTimeout(burst, 1200);

    // Delay close button so the moment lands
    const tc = setTimeout(() => setCanClose(true), 3000);
    return () => { clearTimeout(t2); clearTimeout(t3); clearTimeout(tc); };
  }, [visible]);

  if (!visible) return null;

  // Journey summary
  const startDate = trip?.departure_date
    ? new Date(trip.departure_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const hs9Time = trip?.handshake_timestamps?.['9'];
  const hs1Time = trip?.handshake_timestamps?.['1'];
  let durationLabel = null;
  if (hs1Time && hs9Time) {
    const ms = new Date(hs9Time) - new Date(hs1Time);
    const hours = Math.floor(ms / 3_600_000);
    const days  = Math.floor(hours / 24);
    durationLabel = days > 0 ? `${days} day${days !== 1 ? 's' : ''}` : `${hours}h`;
  }

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'rgba(6,11,22,0.95)', backdropFilter: 'blur(8px)' }}
    >
      {/* ── Real Morales M logo mark with deep glow ── */}
      <div className="relative flex flex-col items-center mb-6">
        {/* Outer radial glow */}
        <div className="absolute" style={{
          width: 320, height: 320, top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          background: 'radial-gradient(circle, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0.06) 45%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Pulse rings */}
        <div className="absolute" style={{
          width: 200, height: 200, top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          border: '1px solid rgba(212,175,55,0.3)',
          borderRadius: '50%',
          animation: 'mring1 2.6s ease-in-out infinite',
        }} />
        <div className="absolute" style={{
          width: 240, height: 240, top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          border: '1px solid rgba(212,175,55,0.15)',
          borderRadius: '50%',
          animation: 'mring2 2.6s ease-in-out 0.7s infinite',
        }} />

        {/* The actual Morales M mark */}
        <img
          src="/morales-m-mark.png"
          alt="Morales M"
          style={{
            width: 140,
            height: 'auto',
            filter: 'drop-shadow(0 0 32px rgba(212,175,55,0.9)) drop-shadow(0 0 64px rgba(212,175,55,0.5)) drop-shadow(0 0 120px rgba(212,175,55,0.25))',
            position: 'relative',
            zIndex: 1,
          }}
        />

        {/* Gold line — the signature brand separator */}
        <div style={{
          width: 200,
          height: 1,
          marginTop: 20,
          background: 'linear-gradient(to right, transparent, #D4AF37, #F0D060, #D4AF37, transparent)',
          boxShadow: '0 0 8px rgba(212,175,55,0.8)',
          position: 'relative',
          zIndex: 1,
        }} />
      </div>

      <style>{`
        @keyframes mring1 { 0%,100%{transform:translate(-50%,-50%) scale(1);opacity:0.5} 50%{transform:translate(-50%,-50%) scale(1.12);opacity:0} }
        @keyframes mring2 { 0%,100%{transform:translate(-50%,-50%) scale(1);opacity:0.3} 50%{transform:translate(-50%,-50%) scale(1.1);opacity:0} }
      `}</style>

      {/* Heading */}
      <h1
        className="text-3xl font-bold text-center mb-1"
        style={{ color: GOLD, letterSpacing: '0.08em', fontFamily: 'Georgia, serif', textTransform: 'uppercase', fontSize: '1.6rem' }}
      >
        MORALES
      </h1>
      <p className="text-sm tracking-widest uppercase mb-1" style={{ color: 'rgba(212,175,55,0.6)', letterSpacing: '0.25em' }}>
        Journey Complete
      </p>
      <p className="text-base font-medium mb-8" style={{ color: '#94a3b8' }}>
        Welcome Home.
      </p>

      {/* Summary card */}
      <div
        className="rounded-2xl px-8 py-5 mb-8 text-center space-y-2"
        style={{ background: '#0C1A1D', border: `1px solid ${GOLD}30`, maxWidth: 320, width: '90%' }}
      >
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-400">Handshakes confirmed</span>
          <span className="text-sm font-bold" style={{ color: GOLD }}>9 / 9</span>
        </div>
        {startDate && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Journey started</span>
            <span className="text-sm font-medium text-white">{startDate}</span>
          </div>
        )}
        {durationLabel && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Total duration</span>
            <span className="text-sm font-medium text-white">{durationLabel}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-1 border-t border-white/10">
          <span className="text-xs text-slate-400">Status</span>
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: GOLD }}>
            Golden M Achieved
          </span>
        </div>
      </div>

      {/* Actions */}
      {canClose ? (
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => setShowCert(true)}
            className="rounded-xl px-8 py-3 font-bold text-sm transition-all duration-200 hover:opacity-90 active:scale-95"
            style={{ background: GOLD, color: '#060B16', letterSpacing: '0.05em' }}
          >
            🏆 Download My Certificate
          </button>
          <button
            onClick={async () => {
              const text = `I just completed my Morales Medical journey — all 9 safety handshakes confirmed. The Golden M is mine. 🏆 #MoralesMedical #GoldenM #MedicalTravel`;
              if (navigator.share) {
                try { await navigator.share({ title: 'My Golden M — Morales Medical', text }); } catch (_) {}
              } else {
                try { await navigator.clipboard.writeText(text); alert('Journey story copied — paste it anywhere!'); } catch (_) {}
              }
            }}
            className="rounded-xl px-8 py-3 font-bold text-sm transition-all duration-200 hover:opacity-90 active:scale-95"
            style={{ background: 'rgba(212,175,55,0.15)', color: GOLD, border: `1px solid ${GOLD}40`, letterSpacing: '0.05em' }}
          >
            🌍 Share My Journey
          </button>
          <button
            onClick={onClose}
            className="text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ color: 'rgba(212,175,55,0.55)' }}
          >
            Close
          </button>
        </div>
      ) : (
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: 6, height: 6, background: GOLD,
                animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>

    {/* Certificate overlay — shown when patient clicks Download */}
    {showCert && (
      <GoldenMCertificate
        patientName={patientName}
        procedure={(trip?.procedure_types || []).join(', ')}
        destination={trip?.destination_country || ''}
        completedDate={trip?.handshake_timestamps?.['9'] || new Date().toISOString()}
        duration={durationLabel}
        onClose={() => setShowCert(false)}
      />
    )}
    </>
  );
}
