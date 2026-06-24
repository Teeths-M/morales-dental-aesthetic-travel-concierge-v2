import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';

/**
 * FloatingSOSButton
 * Global persistent emergency access button — one tap away from any page.
 *
 * Fixed: bottom-6 right-6, z-80
 * Style: glassmorphism pill, red pulse dot, gold accent
 * Links to /emergency (Emergency Hub — PIN gate, vault, SOS options)
 */
export default function FloatingSOSButton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 1.4, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed bottom-6 right-6 z-[80]"
    >
      <Link to="/emergency" aria-label="Emergency secure line">
        <motion.div
          className="flex items-center gap-2.5 rounded-full cursor-pointer select-none"
          style={{
            padding:            '11px 20px 11px 16px',
            background:         'rgba(6, 11, 22, 0.80)',
            backdropFilter:     'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border:             '1px solid rgba(212, 175, 55, 0.18)',
            boxShadow:          '0 8px 40px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.04) inset',
          }}
          whileHover={{
            scale: 1.04,
            boxShadow: '0 12px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(212,175,55,0.3)',
            transition: { duration: 0.18 },
          }}
          whileTap={{ scale: 0.97 }}
        >
          {/* Pulsing alert dot */}
          <div className="relative flex items-center justify-center w-3.5 h-3.5 shrink-0">
            <motion.span
              className="absolute inset-0 rounded-full"
              style={{ background: 'rgba(239, 68, 68, 0.6)' }}
              animate={{ scale: [1, 2.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', repeatDelay: 0.4 }}
            />
            <span
              className="relative w-2.5 h-2.5 rounded-full"
              style={{ background: '#ef4444', boxShadow: '0 0 6px rgba(239,68,68,0.7)' }}
            />
          </div>

          {/* Shield icon */}
          <ShieldAlert
            className="w-4 h-4 shrink-0"
            style={{ color: '#D4AF37', filter: 'drop-shadow(0 0 4px rgba(212,175,55,0.5))' }}
            strokeWidth={2}
          />

          {/* Label */}
          <span
            style={{
              fontSize:      '12px',
              fontWeight:    600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color:         '#D4AF37',
              lineHeight:    1,
            }}
          >
            Secure Line
          </span>
        </motion.div>
      </Link>
    </motion.div>
  );
}
