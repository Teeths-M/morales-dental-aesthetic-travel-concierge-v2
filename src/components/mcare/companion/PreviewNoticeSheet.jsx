import React from 'react';
import { Eye, X, ArrowRight } from 'lucide-react';
import { C } from './companionTheme';

/**
 * The small, always-visible marker that this screen is the supplied design
 * reference rather than live safety information. Deliberately quiet, and
 * deliberately impossible to miss: the greeting, alert and monitoring wording
 * below it are artwork copy, and this label is what keeps that honest.
 */
export default function PreviewBadge({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 10px 5px 9px',
        borderRadius: 999,
        border: '1px solid rgba(212,168,96,0.35)',
        background: 'rgba(212,168,96,0.10)',
        color: C.goldLight,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      <Eye aria-hidden="true" style={{ width: 11, height: 11 }} strokeWidth={2} />
      Design preview
    </button>
  );
}

/**
 * The explanation behind the badge, so a visitor can find out — in one tap —
 * exactly which parts of this screen are artwork and where the real thing is.
 */
export function PreviewNoticeSheet({ open, onClose, onOpenLive, onOpenHistory }) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-sheet-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'rgba(3,5,10,0.72)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 430,
          margin: '0 auto',
          padding: '20px 20px calc(20px + env(safe-area-inset-bottom))',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          background: 'linear-gradient(180deg, #0B0F16 0%, #05080C 100%)',
          borderTop: '1px solid rgba(212,168,96,0.28)',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
          fontFamily: C.font,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <h2 id="preview-sheet-title" style={{ margin: 0, fontSize: 16, fontWeight: 600, color: C.text }}>
            This is a design preview
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ border: 'none', background: 'transparent', color: C.textMuted, cursor: 'pointer', padding: 4 }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.6, color: C.textMuted }}>
          The greeting, the Copacabana safety alert, the saved-places count and the monitoring
          wording on this screen are the supplied reference copy. They are not a live alert, a real
          count, or a statement that monitoring is running.
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.6, color: C.textMuted }}>
          Live monitoring, saved places and advisories are only ever shown from your own confirmed
          data, on the live M-Care screen.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
          <button
            type="button"
            onClick={onOpenLive}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '13px 16px',
              borderRadius: 14,
              border: 'none',
              background: C.gold,
              color: '#06080C',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Open live M-Care
            <ArrowRight style={{ width: 15, height: 15 }} />
          </button>

          <button
            type="button"
            onClick={onOpenHistory}
            style={{
              padding: '12px 16px',
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.78)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            View conversation history
          </button>
        </div>
      </div>
    </div>
  );
}