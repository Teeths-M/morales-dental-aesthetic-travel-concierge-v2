import React from 'react';
import { Search, Shield, LayoutGrid, Check, Share2, CircleCheck } from 'lucide-react';

// Share2 / CircleCheck stay mapped because the ring orb's own pill row uses
// the older capability icon names.
const ICONS = { Search, Shield, LayoutGrid, Check, Share2, CircleCheck };

// A single rounded pill: thin-line icon and a label. `full` makes it fill its
// grid cell in the sidebar's 2x2 capability block; without it the pill sizes
// to its content, which is how the orb's row of pills uses it.
//
// The --ms-* colours are set by the /m-care workspace (MSafeWorkspace). The
// M-Care chat panel never set them, so there the pills rendered with no
// background or border; each var now carries the panel's own value as a
// fallback. `active` lights the pill when it is M-Safe's real current
// capability (MCareOrb's activeCapability), never a decorative highlight.
export default function CapabilityPill({ label, icon, onClick, full = false, active = false }) {
  const Icon = ICONS[icon] || Search;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`msafe-pill inline-flex items-center gap-2 rounded-xl px-3 py-2 transition-all duration-200 ${full ? 'w-full justify-start' : ''}`}
      style={{
        background: active ? 'rgba(212,175,55,0.16)' : 'var(--ms-card, #FFFFFF)',
        border: `1px solid ${active ? 'var(--ms-gold, #D4AF37)' : 'var(--ms-border, #EAE3D5)'}`,
        boxShadow: active ? '0 0 0 3px rgba(212,175,55,0.14)' : '0 1px 2px rgba(15,23,42,0.04)',
        color: 'var(--ms-ink, #0F172A)',
        minHeight: 40,
      }}
    >
      <Icon className="w-[15px] h-[15px] flex-shrink-0" strokeWidth={1.7} style={{ color: 'var(--ms-gold, #D4AF37)' }} />
      <span className={`text-[12.5px] tracking-tight ${active ? 'font-bold' : 'font-semibold'}`} style={{ color: 'var(--ms-ink, #0F172A)' }}>
        {label}
      </span>
      <style>{`
        .msafe-pill:hover {
          border-color: var(--ms-gold, #D4AF37) !important;
          box-shadow: 0 2px 8px rgba(212,175,55,0.16) !important;
        }
        .msafe-pill:active { transform: scale(0.97); }
        .msafe-pill:focus-visible { outline: 2px solid var(--ms-gold, #D4AF37); outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) {
          .msafe-pill { transition: none; }
          .msafe-pill:active { transform: none; }
        }
      `}</style>
    </button>
  );
}
