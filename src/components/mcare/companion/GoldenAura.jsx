import React from 'react';
import { C } from './companionTheme';

/**
 * The midnight backdrop: a near-black navy field with the gold light filaments
 * and bloom that sit behind the ring in the reference artwork.
 *
 * Purely decorative, so it is aria-hidden and pointer-events-none, and it holds
 * still when the visitor has asked for reduced motion.
 */
export default function GoldenAura({ children, reduced = false }) {
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ background: `radial-gradient(120% 80% at 50% 0%, ${C.bg} 0%, ${C.bg} 45%, ${C.bgDeep} 100%)` }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Broad amber bloom behind the ring */}
        <div
          style={{
            position: 'absolute',
            top: '-18%',
            left: '50%',
            width: '150%',
            height: '62%',
            transform: 'translateX(-50%)',
            background:
              'radial-gradient(closest-side, rgba(248, 213, 140, 0.20) 0%, rgba(212, 168, 96, 0.10) 42%, rgba(212, 168, 96, 0) 72%)',
            filter: 'blur(6px)',
          }}
        />
        {/* Swirling filaments */}
        <div
          style={{
            position: 'absolute',
            top: '-12%',
            left: '50%',
            width: '128%',
            height: '46%',
            transform: 'translateX(-50%) rotate(-8deg)',
            background:
              'conic-gradient(from 140deg at 50% 50%, rgba(212,168,96,0) 0deg, rgba(212,168,96,0.16) 40deg, rgba(248,213,140,0.05) 90deg, rgba(212,168,96,0) 150deg, rgba(248,213,140,0.13) 230deg, rgba(212,168,96,0) 300deg)',
            filter: 'blur(26px)',
            opacity: 0.9,
            animation: reduced ? 'none' : 'mc-aura-drift 38s linear infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '2%',
            left: '50%',
            width: '96%',
            height: '30%',
            transform: 'translateX(-50%) rotate(12deg)',
            background:
              'radial-gradient(closest-side, rgba(248,213,140,0.12) 0%, rgba(212,168,96,0.05) 55%, transparent 78%)',
            filter: 'blur(30px)',
            animation: reduced ? 'none' : 'mc-aura-drift-rev 52s linear infinite',
          }}
        />
        {/* Fine ember specks */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(1px 1px at 22% 14%, rgba(248,213,140,0.55) 0%, transparent 100%),' +
              'radial-gradient(1px 1px at 68% 9%, rgba(248,213,140,0.42) 0%, transparent 100%),' +
              'radial-gradient(1.4px 1.4px at 47% 22%, rgba(212,168,96,0.38) 0%, transparent 100%),' +
              'radial-gradient(1px 1px at 82% 26%, rgba(248,213,140,0.30) 0%, transparent 100%),' +
              'radial-gradient(1px 1px at 12% 30%, rgba(212,168,96,0.28) 0%, transparent 100%)',
            opacity: reduced ? 0.7 : 1,
          }}
        />
        {/* Vignette so the lower content stays readable */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(140% 90% at 50% 30%, transparent 40%, rgba(3,5,10,0.55) 78%, rgba(3,5,10,0.92) 100%)',
          }}
        />
      </div>

      <style>{`
        @keyframes mc-aura-drift { from { transform: translateX(-50%) rotate(-8deg) rotate(0deg); } to { transform: translateX(-50%) rotate(-8deg) rotate(360deg); } }
        @keyframes mc-aura-drift-rev { from { transform: translateX(-50%) rotate(12deg) rotate(0deg); } to { transform: translateX(-50%) rotate(12deg) rotate(-360deg); } }
      `}</style>

      <div className="relative">{children}</div>
    </div>
  );
}