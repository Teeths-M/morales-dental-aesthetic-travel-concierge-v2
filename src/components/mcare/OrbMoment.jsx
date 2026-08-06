/**
 * OrbMoment — M-Care's "big moment" beat (Phase 6). A small, reusable,
 * in-panel version of the huge-type/pulsing-dot treatment already proven on
 * the homepage (src/components/home/LiveJourneyCard.jsx) and in
 * HowItWorksModal.jsx's dark-vignette overlay — scaled down to fit inside
 * M-Care's own docked panel (380-600px) instead of the full viewport, so the
 * "always there, never blocks what you're doing" rule stays intact: this
 * never becomes a position:fixed/inset:0 takeover.
 *
 * Deliberately NOT a multi-scene carousel or stepper — each use is one real,
 * already-existing confirmation string (a routing hand-off, a signup
 * completing, a booking parse) getting a better-looking render, not a new
 * narrative sequence. `status` is optional and only passed where there's a
 * genuine ongoing state to reflect (e.g. verification actually in progress)
 * — a pill with nothing real to say would be decoration, not information.
 */
import React from 'react';
import { motion } from 'framer-motion';

const GOLD = '#D4AF37';

export default function OrbMoment({ headline, caption, status }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{ padding: '14px 2px 6px' }}
    >
      <h3 style={{
        fontSize: 'clamp(1.05rem, 6vw, 1.4rem)',
        fontWeight: 900,
        color: '#fff',
        letterSpacing: '-0.03em',
        lineHeight: 1.08,
        margin: caption || status ? '0 0 8px' : 0,
        textShadow: '0 2px 20px rgba(0,0,0,0.55)',
      }}>
        {headline}
      </h3>

      {caption && (
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: status ? '0 0 12px' : 0, maxWidth: '94%' }}>
          {caption}
        </p>
      )}

      {status && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '7px 13px', borderRadius: 99,
          background: 'rgba(6,11,22,0.6)', border: '1px solid rgba(255,255,255,0.09)',
          backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        }}>
          <motion.div
            aria-hidden="true"
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.3, repeat: Infinity }}
            style={{ width: 6, height: 6, borderRadius: '50%', background: status.dot || GOLD, flexShrink: 0 }}
          />
          <div>
            <p style={{ fontSize: 11.5, fontWeight: 600, color: '#fff', margin: 0 }}>{status.label}</p>
            {status.note && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', margin: '1px 0 0' }}>{status.note}</p>}
          </div>
        </div>
      )}
    </motion.div>
  );
}
