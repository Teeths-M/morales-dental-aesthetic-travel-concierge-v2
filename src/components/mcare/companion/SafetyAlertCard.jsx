import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { C } from './companionTheme';

/**
 * The gold-edged advisory card from the reference screen.
 *
 * `onOpen` is optional: when the card is showing reference artwork it opens the
 * preview explanation, so a tap never pretends to open a live alert.
 */
export default function SafetyAlertCard({ title, body, tail, imageUrl, onOpen }) {
  const Wrapper = onOpen ? 'button' : 'div';

  return (
    <Wrapper
      type={onOpen ? 'button' : undefined}
      onClick={onOpen}
      className="w-full text-left"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '13px 13px 13px 14px',
        borderRadius: 18,
        background: C.card,
        border: C.cardEdge,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 10px 30px rgba(0,0,0,0.35)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        cursor: onOpen ? 'pointer' : 'default',
        fontFamily: 'inherit',
        color: 'inherit',
      }}
    >
      <AlertTriangle
        aria-hidden="true"
        style={{ width: 26, height: 26, flexShrink: 0, color: C.warn, filter: 'drop-shadow(0 0 6px rgba(244,180,0,0.35))' }}
        strokeWidth={2.2}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', color: C.gold }}>
          {title}
        </p>
        <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: C.textSoft }}>
          {body}
          {tail ? <> <span style={{ color: C.textMuted }}>{tail}</span></> : null}
        </p>
      </div>

      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
          style={{
            width: 84,
            height: 72,
            flexShrink: 0,
            borderRadius: 12,
            objectFit: 'cover',
            border: '1px solid rgba(212,168,96,0.22)',
          }}
        />
      )}
    </Wrapper>
  );
}