import React from 'react';

// MSafeWorkspace — the premium two-column shell. Rendered as a fixed
// full-screen overlay so it escapes any surrounding app-layout chrome and
// fills the viewport with a softly blurred luxury interior backdrop, with
// one large rounded ivory panel centered and split into two equal columns.
// On mobile the columns stack (identity above chat).
export default function MSafeWorkspace({ left, right }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden" style={{ background: '#0e0e0e' }}>
      {/* Blurred luxury interior photograph */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1600&q=80')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(22px)',
          transform: 'scale(1.12)',
          opacity: 0.6,
        }}
      />
      {/* Warm ivory light wash — keeps the scene bright & neutral */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 30% 25%, rgba(255,253,248,0.55) 0%, transparent 50%),
            radial-gradient(circle at 75% 78%, rgba(240,230,210,0.5) 0%, transparent 55%),
            linear-gradient(135deg, rgba(248,247,242,0.5) 0%, rgba(238,229,212,0.6) 100%)
          `,
        }}
      />

      {/* Panel */}
      <div
        className="relative z-10 flex flex-col md:flex-row w-full md:w-[94%] h-screen md:h-[88vh] md:rounded-[28px] overflow-hidden"
        style={{
          background: '#F5F3ED',
          boxShadow: '0 30px 90px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.08)',
          border: '1px solid rgba(210,169,61,0.18)',
        }}
      >
        {/* Left — identity */}
        <div
          className="msafe-left flex-shrink-0 md:flex-1 relative flex flex-col overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #FAF8F2 0%, #F3ECDD 100%)', maxHeight: '42vh' }}
        >
          {left}
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px flex-shrink-0" style={{ background: 'rgba(210,169,61,0.18)' }} />

        {/* Right — chat */}
        <div className="msafe-right flex-1 min-h-0 relative flex flex-col" style={{ background: '#FDFDFB' }}>
          {right}
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .msafe-left { max-height: none !important; }
        }
      `}</style>
    </div>
  );
}