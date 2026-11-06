import React from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { C } from './companionTheme';

/**
 * The saved-places card from the reference screen: a green check, a teal
 * heading, a white count line, and a chevron that leads somewhere real.
 */
export default function SavedPlacesCard({ title, subtitle, onOpen }) {
  const Wrapper = onOpen ? 'button' : 'div';

  return (
    <Wrapper
      type={onOpen ? 'button' : undefined}
      onClick={onOpen}
      className="w-full"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '14px',
        borderRadius: 18,
        background: C.card,
        border: C.cardEdge,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 10px 30px rgba(0,0,0,0.35)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        cursor: onOpen ? 'pointer' : 'default',
        textAlign: 'left',
        font: 'inherit',
        color: 'inherit',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 30,
          height: 30,
          flexShrink: 0,
          borderRadius: '50%',
          background: 'rgba(46,188,122,0.12)',
          border: '1px solid rgba(46,188,122,0.45)',
          boxShadow: '0 0 14px rgba(46,188,122,0.25)',
        }}
      >
        <Check style={{ width: 16, height: 16, color: C.teal }} strokeWidth={3} />
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', color: C.teal }}>
          {title}
        </p>
        <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.45, color: C.text }}>
          {subtitle}
        </p>
      </div>

      <ChevronRight aria-hidden="true" style={{ width: 18, height: 18, flexShrink: 0, color: C.textMuted }} />
    </Wrapper>
  );
}