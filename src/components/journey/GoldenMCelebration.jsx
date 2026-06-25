import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';

const GOLD = '#D4AF37';

/**
 * GoldenMCelebration — full-screen modal shown when Handshake 9 is confirmed.
 *
 * Props:
 *   visible  — boolean
 *   trip     — TravelRequest object (for summary stats)
 *   onClose  — callback
 */
export default function GoldenMCelebration({ visible, trip, onClose }) {
  const [canClose, setCanClose] = useState(false);

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
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'rgba(6,11,22,0.95)', backdropFilter: 'blur(8px)' }}
    >
      {/* Premium Golden M logo mark */}
      <div className="relative flex items-center justify-center mb-8" style={{ width: 160, height: 160 }}>
        {/* Deep background radial glow */}
        <div className="absolute" style={{
          inset: -60,
          background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 65%)',
          borderRadius: '50%',
        }} />
        {/* Animated pulse ring 1 */}
        <div className="absolute inset-0 rounded-full" style={{
          border: '1px solid rgba(212,175,55,0.25)',
          animation: 'mring1 2.4s ease-in-out infinite',
        }} />
        {/* Animated pulse ring 2 */}
        <div className="absolute rounded-full" style={{
          inset: -18,
          border: '1px solid rgba(212,175,55,0.15)',
          animation: 'mring2 2.4s ease-in-out 0.5s infinite',
        }} />
        {/* Outer decorative ring */}
        <div className="absolute inset-0 rounded-full" style={{
          border: '1px solid rgba(212,175,55,0.35)',
          background: 'rgba(212,175,55,0.04)',
        }} />
        {/* Main gold circle */}
        <div
          className="relative flex items-center justify-center rounded-full"
          style={{
            width: 128,
            height: 128,
            background: 'linear-gradient(145deg, #F0D060 0%, #D4AF37 40%, #B8941F 100%)',
            boxShadow: '0 0 70px rgba(212,175,55,0.75), 0 0 140px rgba(212,175,55,0.3), inset 0 2px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.15)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <span style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 70,
            fontWeight: 700,
            color: '#060B16',
            letterSpacing: '-0.05em',
            lineHeight: 1,
            textShadow: '0 2px 0 rgba(255,255,255,0.18), 0 -1px 0 rgba(0,0,0,0.2)',
            userSelect: 'none',
          }}>
            M
          </span>
        </div>
      </div>
      <style>{`
        @keyframes mring1 { 0%,100%{transform:scale(1);opacity:0.6} 50%{transform:scale(1.18);opacity:0} }
        @keyframes mring2 { 0%,100%{transform:scale(1);opacity:0.4} 50%{transform:scale(1.22);opacity:0} }
      `}</style>

      {/* Heading */}
      <h1
        className="text-3xl font-bold text-center mb-2"
        style={{ color: GOLD, letterSpacing: '-0.03em', fontFamily: 'Georgia, serif' }}
      >
        Journey Complete.
      </h1>
      <p className="text-lg font-medium mb-8" style={{ color: '#e2e8f0' }}>
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

      {/* Close */}
      {canClose ? (
        <button
          onClick={onClose}
          className="rounded-xl px-8 py-3 font-semibold text-sm transition-all duration-200 hover:opacity-80 active:scale-95"
          style={{ background: GOLD, color: '#060B16' }}
        >
          Close
        </button>
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
  );
}
