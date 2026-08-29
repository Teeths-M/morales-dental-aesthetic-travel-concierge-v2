import React from 'react';
import { Search, Shield, Share2, CircleCheck } from 'lucide-react';
import { MSAFE_PALETTE as C } from '../msafePlusConfig';

const ICONS = { Search, Shield, Share2, CircleCheck };

// A single white/transparent pill with a thin pale-gold border, a gold
// thin-line icon, and a bold charcoal label. Subtle gold glow on hover/tap.
export default function CapabilityPill({ label, icon, onClick }) {
  const Icon = ICONS[icon] || Search;
  return (
    <button
      type="button"
      onClick={onClick}
      className="msafe-pill group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all duration-200"
      style={{
        background: 'rgba(255,255,255,0.6)',
        border: `1px solid ${C.goldDeep}66`,
        color: C.charcoal,
      }}
    >
      <Icon
        className="w-3.5 h-3.5 transition-colors"
        strokeWidth={1.6}
        style={{ color: C.goldDeep }}
      />
      <span className="text-[12px] font-semibold tracking-tight" style={{ color: C.charcoal }}>
        {label}
      </span>
      <style>{`
        .msafe-pill:hover, .msafe-pill:active {
          border-color: ${C.goldMid}cc;
          box-shadow: 0 0 0 3px ${C.goldLight}33, 0 2px 10px ${C.goldDeep}22;
          background: rgba(255,255,255,0.85);
        }
        .msafe-pill:active { transform: scale(0.96); }
      `}</style>
    </button>
  );
}