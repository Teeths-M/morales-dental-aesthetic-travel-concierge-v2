import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

/**
 * FloatingSOSButton
 * Premium pill stack — bottom-right corner, z-index 9999.
 *
 * Top pill:    Safe-T4life Assistance  → /safe-t
 * Bottom pill: Secure Line (SOS)       → /emergency
 */

const PILL_STYLE = {
  background:           'rgba(6, 11, 22, 0.82)',
  backdropFilter:       'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  boxShadow:            '0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
};

export default function FloatingSOSButton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 1.2, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'fixed',
        bottom:   '24px',
        right:    '24px',
        zIndex:   9999,
        display:  'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
      }}
    >
      {/* ── Top pill: Safe-T4life Assistance ── */}
      <Link to="/safe-t" aria-label="Safe-T4life Assistance">
        <motion.div
          className="flex items-center gap-2.5 rounded-full cursor-pointer select-none"
          style={{
            ...PILL_STYLE,
            padding: '10px 20px 10px 16px',
            border:  '1px solid rgba(52, 211, 153, 0.22)',
          }}
          whileHover={{
            scale:     1.04,
            boxShadow: '0 12px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(52,211,153,0.35)',
            transition: { duration: 0.18 },
          }}
          whileTap={{ scale: 0.97 }}
        >
          {/* Soft emerald pulse dot */}
          <div className="relative flex items-center justify-center w-3.5 h-3.5 shrink-0">
            <motion.span
              className="absolute inset-0 rounded-full"
              style={{ background: 'rgba(52, 211, 153, 0.5)' }}
              animate={{ scale: [1, 2.0, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeOut', repeatDelay: 1.0 }}
            />
            <span
              className="relative w-2.5 h-2.5 rounded-full"
              style={{ background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.6)' }}
            />
          </div>

          <ShieldCheck
            className="w-4 h-4 shrink-0"
            style={{ color: '#34d399', filter: 'drop-shadow(0 0 4px rgba(52,211,153,0.5))' }}
            strokeWidth={2}
          />

          <span
            style={{
              fontSize:      '11.5px',
              fontWeight:    600,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              color:         '#34d399',
              lineHeight:    1,
              whiteSpace:    'nowrap',
            }}
          >
            Safe-T4life Assistance
          </span>
        </motion.div>
      </Link>

      {/* ── Bottom pill: Secure Line (SOS) ── */}
      <Link to="/emergency" aria-label="Emergency secure line">
        <motion.div
          className="flex items-center gap-2.5 rounded-full cursor-pointer select-none"
          style={{
            ...PILL_STYLE,
            padding: '10px 20px 10px 16px',
            border:  '1px solid rgba(212, 175, 55, 0.22)',
          }}
          whileHover={{
            scale:     1.04,
            boxShadow: '0 12px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(212,175,55,0.35)',
            transition: { duration: 0.18 },
          }}
          whileTap={{ scale: 0.97 }}
        >
          {/* Red pulse dot */}
          <div className="relative flex items-center justify-center w-3.5 h-3.5 shrink-0">
            <motion.span
              className="absolute inset-0 rounded-full"
              style={{ background: 'rgba(239, 68, 68, 0.55)' }}
              animate={{ scale: [1, 2.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', repeatDelay: 0.4 }}
            />
            <span
              className="relative w-2.5 h-2.5 rounded-full"
              style={{ background: '#ef4444', boxShadow: '0 0 6px rgba(239,68,68,0.7)' }}
            />
          </div>

          <ShieldAlert
            className="w-4 h-4 shrink-0"
            style={{ color: '#D4AF37', filter: 'drop-shadow(0 0 4px rgba(212,175,55,0.5))' }}
            strokeWidth={2}
          />

          <span
            style={{
              fontSize:      '11.5px',
              fontWeight:    600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color:         '#D4AF37',
              lineHeight:    1,
              whiteSpace:    'nowrap',
            }}
          >
            Secure Line
          </span>
        </motion.div>
      </Link>
    </motion.div>
  );
}
