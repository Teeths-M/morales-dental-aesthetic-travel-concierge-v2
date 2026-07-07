import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const GOLD = '#D4AF37';
const CARD = '#0C1A1D';
const BORDER = '#2A3F4A';

/**
 * "I've noticed you've selected N procedures... let me evaluate..." — the
 * narrated beat the mission asks for before any safety verdict appears.
 * Renders full-screen at a higher z-index than SafetyPivotOverlay (z-10000)
 * and ProcedureStackingBlocker (z-9998) — both are already globally mounted
 * in App.jsx and react to the same cart change, so this sits in front of
 * them for a fixed narration window, then unmounts to reveal whichever of
 * the two the deterministic safety engine actually decided to show. This
 * component makes no safety decision itself — it only narrates that one is
 * in progress.
 */
export default function ProcedureEvaluationStep({ procedureCount, procedureNames = [], onDone }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 1700);
    return () => clearTimeout(timer);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        background: 'rgba(6,11,22,0.92)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 24,
          padding: '36px 32px',
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
          style={{
            width: 40,
            height: 40,
            margin: '0 auto 20px',
            borderRadius: '50%',
            border: `2px solid rgba(212,175,55,0.25)`,
            borderTopColor: GOLD,
          }}
        />
        <p style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 600, color: '#fff', lineHeight: 1.5 }}>
          {procedureCount > 1
            ? procedureNames.length > 1
              ? `I've noticed you've selected ${procedureNames.join(', ')}.`
              : `I've noticed you've selected ${procedureCount} procedures.`
            : "I'm reviewing this against your other selections."}
        </p>
        <p style={{ margin: 0, fontSize: 13.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
          Many combinations are safely performed together, but not every one is medically
          appropriate. I'm weighing combined anesthesia time, recovery overlap, and surgical
          stress against your profile — your safety comes first.
        </p>
      </motion.div>
    </div>
  );
}
