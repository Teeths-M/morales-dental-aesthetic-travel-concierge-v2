import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * CategoryRotator — shows exactly ONE of the platform's real automation
 * categories at a time (never all 8 at once, per the feature's own explicit
 * "one subsystem active at a time" requirement). The category/description/
 * cadence text is always real data passed in from the caller — this
 * component never invents a name, description, or cadence of its own.
 *
 * Cadence pill styling matches SystemHealth.jsx's existing automation-list
 * pill exactly (gold text/border on a translucent gold fill), so the
 * rotating hero and the static list further down the same page read as one
 * consistent visual language, not two different designs.
 */
export default function CategoryRotator({ category, compact = false, reducedMotion = false }) {
  if (!category) return null;

  const content = (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <p style={{ margin: 0, fontSize: compact ? 15 : 18, fontWeight: 800, color: '#fff', letterSpacing: 0.3 }}>
        {category.category.toUpperCase()}
      </p>
      {!compact && (
        <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.55)', maxWidth: 360, lineHeight: 1.4 }}>
          {category.description}
        </p>
      )}
      <span
        style={{
          fontSize: 11, fontWeight: 700, color: '#D4AF37', background: 'rgba(212,175,55,0.1)',
          border: '1px solid rgba(212,175,55,0.3)', borderRadius: 999, padding: '4px 10px', whiteSpace: 'nowrap',
        }}
      >
        {category.cadence}
      </span>
    </div>
  );

  if (reducedMotion) {
    // No crossfade under reduced motion — the caller also freezes tickIndex,
    // so this branch mostly just avoids mounting an AnimatePresence for
    // nothing, but stays correct even if it's ever handed a changing prop.
    return content;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={category.category}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {content}
      </motion.div>
    </AnimatePresence>
  );
}
