import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { CONSOLE } from './consoleTheme';

/**
 * ConsoleHeader — the console's identity bar: the gold M, who M-Care is, and
 * the honest label that this surface is a demonstration. The X is the only
 * way out of a full-screen surface, so it stays even though the reference
 * crops it.
 */
export default function ConsoleHeader() {
  const navigate = useNavigate();

  return (
    <header
      className="flex-shrink-0 flex items-center gap-3 px-5 py-3.5"
      style={{ borderBottom: `1px solid ${CONSOLE.borderSoft}` }}
    >
      <div
        className="flex-shrink-0 flex items-center justify-center rounded-full select-none"
        style={{
          width: 40,
          height: 40,
          background: 'linear-gradient(145deg, #F3D98A 0%, #D4AF37 55%, #A9832A 100%)',
          boxShadow: '0 2px 10px rgba(212,175,55,0.22)',
        }}
        aria-hidden="true"
      >
        <span style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 700, fontSize: 20, color: '#0b0e14', lineHeight: 1 }}>
          M
        </span>
      </div>

      <div className="min-w-0">
        <p className="truncate" style={{ color: '#ffffff', fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em', margin: 0 }}>
          M-Care
        </p>
        <p className="truncate" style={{ color: CONSOLE.textSoft, fontSize: 11.5, margin: '1px 0 0' }}>
          M-Care care concierge
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2 flex-shrink-0">
        <span
          className="rounded-md px-2.5 py-1"
          style={{
            border: `1px solid ${CONSOLE.border}`,
            background: CONSOLE.bubble,
            color: CONSOLE.textSoft,
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.14em',
          }}
        >
          DEMONSTRATION
        </span>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          aria-label="Leave M-Care"
          title="Leave M-Care"
          className="flex items-center justify-center rounded-full transition-colors hover:bg-white/5"
          style={{ width: 30, height: 30, color: CONSOLE.textFaint }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}