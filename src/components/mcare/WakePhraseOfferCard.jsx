import React from 'react';
import { Mic } from 'lucide-react';
import { WAKE_OFFER_COPY } from '@/lib/wakePhraseOffer';

const GOLD = '#D4AF37';

/**
 * WakePhraseOfferCard — the one-time "Hey M-Care" offer, shown under the
 * greeting on the traveler's first eligible M-Care opening.
 *
 * Presentation only: whether it should appear at all is decided by
 * shouldOfferWakePhrase (wakePhraseOffer.js), and what the answers do belongs
 * to MCareOrb, which owns the real prefs and the conversation.
 */
export default function WakePhraseOfferCard({ dark = false, onTurnOn, onDismiss, busy = false }) {
  const cardBg = dark ? '#111E27' : '#FFFFFF';
  const border = dark ? '#2A3F4A' : '#E5E7EB';
  const titleColor = dark ? '#F3F4F6' : '#0F172A';
  const bodyColor = dark ? '#9CA3AF' : '#64748B';

  return (
    <div
      role="group"
      aria-label={WAKE_OFFER_COPY.title}
      style={{
        marginLeft: 42,
        maxWidth: 380,
        background: cardBg,
        border: `1px solid ${border}`,
        borderRadius: 14,
        padding: '12px 13px',
        boxShadow: dark ? 'none' : '0 2px 8px rgba(15,23,42,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: dark ? 'rgba(212,175,55,0.14)' : '#FBF5E4',
            flexShrink: 0,
          }}
        >
          <Mic style={{ width: 12, height: 12, color: GOLD }} />
        </span>
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 650, color: titleColor }}>
          {WAKE_OFFER_COPY.title}
        </p>
      </div>

      <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.6, color: bodyColor }}>
        {WAKE_OFFER_COPY.body}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
        <button
          type="button"
          onClick={onTurnOn}
          disabled={busy}
          style={{
            border: 'none',
            borderRadius: 999,
            padding: '6px 14px',
            fontSize: 11.5,
            fontWeight: 700,
            color: '#060B16',
            background: 'linear-gradient(135deg, #E8C85C, #D4AF37)',
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.6 : 1,
          }}
        >
          {WAKE_OFFER_COPY.turnOn}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          disabled={busy}
          style={{
            border: 'none',
            background: 'transparent',
            padding: '6px 2px',
            fontSize: 11.5,
            fontWeight: 600,
            color: bodyColor,
            cursor: busy ? 'default' : 'pointer',
          }}
        >
          {WAKE_OFFER_COPY.notNow}
        </button>
      </div>
    </div>
  );
}