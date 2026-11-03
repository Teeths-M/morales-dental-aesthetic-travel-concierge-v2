import React from 'react';
import { VolumeX, Volume2, Bell, X } from 'lucide-react';
import { P } from './plusTheme';

const IconButton = ({ label, onClick, children }) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    className="flex h-8 w-8 items-center justify-center rounded-full"
    style={{ border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.72)', cursor: 'pointer' }}
  >
    {children}
  </button>
);

/**
 * PlusHeader — the M-CARE wordmark on the left, session controls on the right.
 * Every control goes somewhere real: mute is a real persisted toggle, the bell
 * opens the notifications surface, close returns to the site.
 */
export default function PlusHeader({ muted, onToggleMute, onOpenAlerts, onClose }) {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ border: `1px solid ${P.border}`, background: 'rgba(197,160,89,0.08)' }}
          aria-hidden="true"
        >
          <span style={{ fontFamily: P.fontSerif, fontSize: 19, fontWeight: 600, color: P.gold, lineHeight: 1 }}>
            M
          </span>
        </span>
        <div className="flex flex-col leading-tight">
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', color: P.gold }}>
            M-CARE
          </span>
          <span style={{ fontSize: 7.5, fontWeight: 600, letterSpacing: '0.16em', color: 'rgba(160,170,184,0.75)', marginTop: 3 }}>
            MEDICAL TRAVEL SAFETY
          </span>
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        <IconButton label={muted ? 'Unmute M-Care' : 'Mute M-Care'} onClick={onToggleMute}>
          {muted
            ? <VolumeX size={16} strokeWidth={1.8} color={P.gold} />
            : <Volume2 size={16} strokeWidth={1.8} />}
        </IconButton>
        <IconButton label="Alerts" onClick={onOpenAlerts}>
          <Bell size={16} strokeWidth={1.8} />
        </IconButton>
        <IconButton label="Close M-Safe" onClick={onClose}>
          <X size={17} strokeWidth={1.8} />
        </IconButton>
      </div>
    </header>
  );
}