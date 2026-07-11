import React from 'react';
import { motion } from 'framer-motion';
import { CALM } from '@/lib/brandTokens';

const CARD = CALM.surface;
const BORDER = CALM.border;

/**
 * Shown after repeated low-confidence turns on the same question — the AI
 * hands off rather than guessing, and says so plainly. flagIntakeHandoff has
 * already fired by the time this renders, carrying the full turn_history and
 * answers, so the client is never asked to repeat anything.
 */
export default function HumanHandoffCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 24,
        padding: '32px 28px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: CALM.actionSoft,
          border: `1px solid rgba(14,138,125,0.3)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 18px',
          fontSize: 22,
        }}
      >
        💬
      </div>
      <h2 style={{ margin: '0 0 8px', fontSize: 19, fontWeight: 600, color: CALM.text }}>
        Let's bring in a person for this one
      </h2>
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: CALM.textSoft }}>
        One of our care coordinators will follow up with you personally, using everything
        you've already shared — you won't need to repeat any of it.
      </p>
    </motion.div>
  );
}
