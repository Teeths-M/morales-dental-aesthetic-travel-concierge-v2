import React from 'react';
import { motion } from 'framer-motion';
import { CALM } from '@/lib/brandTokens';
import VisaRequirementLive from '@/components/trust/VisaRequirementLive';

const CARD = CALM.surface;
const BORDER = CALM.border;

/**
 * Shown the moment both home country and destination are known — as early
 * as the conversation allows, not deferred to the final review — so a visa
 * that takes weeks to arrange is never a surprise ten questions later.
 * Modeled on AuthGateStep.jsx: same card shell, one always-enabled
 * "Continue" button, no back button. Advisory only — this never blocks
 * progress, whatever the status turns out to be.
 */
export default function VisaReadinessStep({ nationality, destination, onContinue }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: '32px 28px',
      }}
    >
      <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600, color: CALM.text }}>
        Quick travel check
      </h2>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: CALM.textSoft, lineHeight: 1.5 }}>
        Before we go any further, let's check what you'll need to actually enter the country.
      </p>

      <VisaRequirementLive nationality={nationality} destination={destination} />

      <button
        type="button"
        onClick={onContinue}
        style={{
          marginTop: 20,
          width: '100%',
          padding: '13px 20px',
          borderRadius: 999,
          cursor: 'pointer',
          background: CALM.action,
          border: 'none',
          color: '#fff',
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        Continue
      </button>
    </motion.div>
  );
}
