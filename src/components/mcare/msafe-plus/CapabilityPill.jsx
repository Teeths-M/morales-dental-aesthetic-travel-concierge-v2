import React from 'react';
import { Search, Shield, LayoutGrid, Check, Share2, CircleCheck } from 'lucide-react';

// Share2 / CircleCheck stay mapped because the ring orb's own pill row uses
// the older capability icon names.
const ICONS = { Search, Shield, LayoutGrid, Check, Share2, CircleCheck };

// A single rounded pill: thin-line icon and a label. `full` makes it fill its
// grid cell in the sidebar's 2x2 capability block; without it the pill sizes
// to its content, which is how the orb's row of pills uses it.
export default function CapabilityPill({ label, icon, onClick, full = false }) {
  const Icon = ICONS[icon] || Search;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`msafe-pill inline-flex items-center gap-2 rounded-xl px-3 py-2 transition-all duration-200 ${full ? 'w-full justify-start' : ''}`}
      style={{
        background: 'var(--ms-card)',
        border: '1px solid var(--ms-border)',
        color: 'var(--ms-ink)',
      }}
    >
      <Icon className="w-[15px] h-[15px] flex-shrink-0" strokeWidth={1.7} style={{ color: 'var(--ms-gold)' }} />
      <span className="text-[12.5px] font-semibold tracking-tight" style={{ color: 'var(--ms-ink)' }}>
        {label}
      </span>
      <style>{`
        .msafe-pill:hover {
          border-color: var(--ms-gold);
          box-shadow: 0 1px 6px rgba(0,0,0,0.05);
        }
        .msafe-pill:active { transform: scale(0.98); }
      `}</style>
    </button>
  );
}