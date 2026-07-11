import React from 'react';
import { motion } from 'framer-motion';
import { CALM } from '@/lib/brandTokens';

const GOLD = '#D4AF37';        // the Golden M — an achievement / trust marker
const CARD = CALM.surface;
const BORDER = CALM.border;

/**
 * The closing beat — not a form-submission dead end. Purely presentational:
 * each flow (medical intake, travel intake) builds its own `items` list from
 * whatever it genuinely computed during the conversation — never a
 * fabricated checkmark. Where a flow doesn't have real backing data for
 * something, it should leave that item out rather than claim it.
 */
export default function JourneyBeginsStep({ firstName = '', title = '', intro = '', items = [] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: '40px 32px', textAlign: 'center' }}
    >
      <img
        src="/morales-m-mark.png"
        alt="Morales"
        style={{ width: 44, height: 44, margin: '0 auto 20px', display: 'block' }}
      />
      <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: GOLD }}>
        Welcome to Morales
      </p>
      <h2 style={{ margin: '0 0 14px', fontSize: 24, fontWeight: 600, color: CALM.text, lineHeight: 1.3 }}>
        {title || (firstName ? `${firstName}, your journey has begun.` : 'Your journey has begun.')}
      </h2>
      <p style={{ margin: '0 0 28px', fontSize: 14, lineHeight: 1.65, color: CALM.textSoft }}>
        {intro}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
        {items.map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: item.state === 'done' ? 'rgba(34,197,94,0.15)' : CALM.surfaceSoft,
                border: item.state === 'done' ? '2px solid #22c55e' : `2px solid ${BORDER}`,
              }}
            >
              {item.state === 'done' && <span style={{ color: '#16a34a', fontSize: 11, fontWeight: 700 }}>✓</span>}
            </div>
            <span
              style={{
                fontSize: 13.5,
                color: item.state === 'done' ? CALM.text : CALM.textFaint,
                fontWeight: item.state === 'done' ? 600 : 500,
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
