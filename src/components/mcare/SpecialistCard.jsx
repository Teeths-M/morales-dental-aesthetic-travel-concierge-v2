import React from 'react';

const GOLD = '#D4AF37';

export default function SpecialistCard() {
  return (
    <div style={{
      margin: '2px 0 6px',
      padding: '14px 16px',
      borderRadius: 14,
      background: 'rgba(212,175,55,0.07)',
      border: '1px solid rgba(212,175,55,0.22)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: GOLD, color: '#060B16',
          fontFamily: 'Georgia, serif', fontSize: 15, fontWeight: 900,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>M</div>
        <p style={{ fontSize: 13, fontWeight: 700, color: GOLD, margin: 0 }}>A specialist is on their way</p>
      </div>
      <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.62)', lineHeight: 1.55, margin: 0 }}>
        I've shared your conversation with a member of our care team. They'll reach out to you personally — you won't need to repeat a thing.
      </p>
    </div>
  );
}
