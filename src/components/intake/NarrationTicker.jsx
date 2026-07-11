import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CALM } from '@/lib/brandTokens';

/**
 * Ambient line showing the most recent thing the concierge said while
 * working — "AI should always appear to be working," never a silent gap.
 * Never blocks the question flow; just trails behind it.
 */
export default function NarrationTicker({ text }) {
  if (!text) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={text}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          fontSize: 12.5,
          lineHeight: 1.6,
          color: CALM.textSoft,
          textAlign: 'center',
          margin: '14px 4px 0',
        }}
      >
        <span style={{ color: CALM.action }}>●</span> {text}
      </motion.p>
    </AnimatePresence>
  );
}
