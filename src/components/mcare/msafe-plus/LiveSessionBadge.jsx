import React from 'react';
import { MSAFE_PALETTE as C } from '../msafePlusConfig';

// Small pale-mint pill with a pulsing mint-green dot and dark-green
// "LIVE SESSION" text, centered under the capability row.
export default function LiveSessionBadge() {
  return (
    <div
      className="msafe-live inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
      style={{
        background: C.mintBg,
      }}
    >
      <span
        className="msafe-live-dot w-1.5 h-1.5 rounded-full"
        style={{ background: C.mintDot }}
      />
      <span
        className="text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: C.mintText }}
      >
        Live Session
      </span>
      <style>{`
        .msafe-live-dot { animation: msafe-dot-pulse 2s ease-in-out infinite; }
        @keyframes msafe-dot-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 ${C.mintDot}66; }
          50% { opacity: 0.6; box-shadow: 0 0 0 4px ${C.mintDot}00; }
        }
        @media (prefers-reduced-motion: reduce) {
          .msafe-live-dot { animation: none; }
        }
      `}</style>
    </div>
  );
}