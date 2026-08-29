import React from 'react';

// MSafeWorkspace — the premium two-column shell: a softly blurred luxury
// ivory background, one large rounded ivory panel centered in the viewport,
// split into two equal columns with a thin vertical divider. On mobile the
// columns stack (identity above chat). `left` and `right` are React nodes.
export default function MSafeWorkspace({ left, right }) {
  return (
    <div
      className="min-h-screen w-full relative flex items-center justify-center overflow-hidden"
      style={{
        background: `
          radial-gradient(circle at 25% 18%, rgba(255,253,248,0.95) 0%, transparent 45%),
          radial-gradient(circle at 78% 75%, rgba(243,233,210,0.7) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, #FBF7EE 0%, #F1E9D8 100%)
        `,
      }}
    >
      {/* Soft blurred light pools — evokes a sunlit, out-of-focus luxury interior */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(circle at 18% 28%, rgba(255,250,235,0.6) 0%, transparent 38%),
          radial-gradient(circle at 82% 68%, rgba(232,212,165,0.32) 0%, transparent 42%)
        `,
        filter: 'blur(48px)',
      }} />

      <div
        className="msafe-panel relative z-10 flex flex-col md:flex-row w-full md:w-[94%] h-screen md:h-[88vh] md:rounded-[28px] overflow-hidden"
        style={{
          background: '#F8F7F2',
          boxShadow: '0 30px 80px rgba(120,100,40,0.16), 0 8px 24px rgba(0,0,0,0.05)',
          border: '1px solid rgba(210,169,61,0.16)',
        }}
      >
        {/* Left — identity */}
        <div
          className="msafe-left flex-shrink-0 md:flex-1 relative flex flex-col overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #FAF8F2 0%, #F3ECDD 100%)', maxHeight: '40vh' }}
        >
          <div className="hidden md:block absolute inset-0" style={{ maxHeight: 'none' }} />
          {left}
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px flex-shrink-0" style={{ background: 'rgba(210,169,61,0.18)' }} />

        {/* Right — chat */}
        <div className="msafe-right flex-1 min-h-0 relative flex flex-col" style={{ background: '#FBFAF6' }}>
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