import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const GOLD = '#D4AF37';
const CARD = '#0C1A1D';
const BORDER = '#2A3F4A';

const LEVEL_COPY = {
  GREEN: {
    title: 'Your safety review is clear',
    body: 'Based on what you\'ve shared, your selected procedure shows no elevated risk factors on file. Your doctor will confirm this personally once assigned.',
  },
  YELLOW: {
    title: 'Your safety review needs a closer look',
    body: 'Nothing here stops you moving forward, but your care team will review your profile a little more closely before confirming your plan.',
  },
  RED: {
    title: 'Your safety review flagged something important',
    body: 'This should already have been resolved earlier in our conversation. If you\'re seeing this, a care coordinator will reach out before anything is booked.',
  },
};

/**
 * The visible trust checkpoint the 12-step wizard already has (a live SAFE-T
 * scan gating submission) — reusing the safety engine's already-computed
 * result (src/lib/procedureCompatibility.js via useCart().safetyStatus)
 * rather than firing a second, redundant AI risk call. safeT4LifeScan still
 * runs its own full server-side pass automatically once the Consultation is
 * created (see iq200Pipeline) — this is the pre-submission read-out, not a
 * replacement for it.
 */
export default function SafeTReadout({ safetyStatus, onContinue }) {
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setScanning(false), 1400);
    return () => clearTimeout(timer);
  }, []);

  const level = safetyStatus?.level || 'GREEN';
  const copy = LEVEL_COPY[level] || LEVEL_COPY.GREEN;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: '32px 28px', textAlign: 'center' }}
    >
      {scanning ? (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
            style={{
              width: 40, height: 40, margin: '0 auto 20px', borderRadius: '50%',
              border: '2px solid rgba(212,175,55,0.25)', borderTopColor: GOLD,
            }}
          />
          <p style={{ margin: 0, fontSize: 15, color: 'rgba(255,255,255,0.7)' }}>
            Running your SAFE-T4LIFE™ safety review...
          </p>
        </>
      ) : (
        <>
          <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: GOLD }}>
            SAFE-T4LIFE™
          </p>
          <h2 style={{ margin: '0 0 10px', fontSize: 19, fontWeight: 600, color: '#fff' }}>{copy.title}</h2>
          <p style={{ margin: '0 0 26px', fontSize: 13.5, lineHeight: 1.65, color: 'rgba(255,255,255,0.6)' }}>{copy.body}</p>
          <button
            type="button"
            onClick={onContinue}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: 999, cursor: 'pointer',
              background: GOLD, border: 'none', color: '#060B16', fontSize: 14, fontWeight: 700,
            }}
          >
            Continue
          </button>
        </>
      )}
    </motion.div>
  );
}
