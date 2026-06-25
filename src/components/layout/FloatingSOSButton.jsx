import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import SafeTAssistantPanel from './SafeTAssistantPanel';

/**
 * FloatingSOSButton — pill stack, bottom-right, z-index 9999.
 *
 * Top pill:    Safe-T4life Assistance → opens AI assistant drawer
 * Bottom pill: Secure Line (SOS)      → navigates to /emergency
 */

const PILL_BASE = {
  background:           'rgba(6, 11, 22, 0.82)',
  backdropFilter:       'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  boxShadow:            '0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
  display:  'flex',
  alignItems: 'center',
  gap: '9px',
  borderRadius: '999px',
  cursor: 'pointer',
  userSelect: 'none',
  padding: '10px 16px 10px 12px',
  whiteSpace: 'nowrap',
  minHeight: '44px',
  overflow: 'hidden',
  maxWidth: '100%',
};

export default function FloatingSOSButton() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 1.2, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position:      'fixed',
          bottom:        'max(16px, env(safe-area-inset-bottom, 16px))',
          right:         '16px',
          zIndex:        9999,
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'flex-end',
          gap:           '8px',
          maxWidth:      'calc(100vw - 32px)',
        }}
      >
        {/* ── Safe-T4life Assistance (top) ── */}
        <motion.div
          onClick={() => setIsPanelOpen(true)}
          role="button"
          tabIndex={0}
          aria-label="Open Safe-T4life AI Assistant"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsPanelOpen(true); } }}
          style={{
            ...PILL_BASE,
            border: '1px solid rgba(52, 211, 153, 0.22)',
          }}
          whileHover={{
            scale: 1.04,
            boxShadow: '0 12px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(52,211,153,0.35)',
            transition: { duration: 0.18 },
          }}
          whileTap={{ scale: 0.97 }}
        >
          {/* Emerald pulse dot */}
          <div style={{ position: 'relative', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <motion.span
              style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(52, 211, 153, 0.5)' }}
              animate={{ scale: [1, 2.0, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeOut', repeatDelay: 1.0 }}
            />
            <span style={{ position: 'relative', width: '10px', height: '10px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.6)', display: 'block' }} />
          </div>

          <ShieldCheck style={{ width: '16px', height: '16px', color: '#34d399', filter: 'drop-shadow(0 0 4px rgba(52,211,153,0.5))', flexShrink: 0 }} strokeWidth={2} />

          <span style={{ fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#34d399', lineHeight: 1 }}>
            Assistance
          </span>
        </motion.div>

        {/* ── SOS (bottom) ── */}
        <Link to="/emergency" aria-label="SOS Emergency" style={{ textDecoration: 'none' }}>
          <motion.div
            aria-label="SOS — tap for immediate emergency access"
            style={{
              ...PILL_BASE,
              border: '1px solid rgba(239, 68, 68, 0.40)',
            }}
            whileHover={{
              scale: 1.04,
              boxShadow: '0 12px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(212,175,55,0.35)',
              transition: { duration: 0.18 },
            }}
            whileTap={{ scale: 0.97 }}
          >
            {/* Red pulse dot */}
            <div style={{ position: 'relative', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <motion.span
                style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.55)' }}
                animate={{ scale: [1, 2.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', repeatDelay: 0.4 }}
              />
              <span style={{ position: 'relative', width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px rgba(239,68,68,0.7)', display: 'block' }} />
            </div>

            <ShieldAlert style={{ width: '16px', height: '16px', color: '#ef4444', filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.6))', flexShrink: 0 }} strokeWidth={2} />

            <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#ef4444', lineHeight: 1 }}>
              SOS
            </span>
          </motion.div>
        </Link>
      </motion.div>

      {/* AI Assistant Drawer */}
      <SafeTAssistantPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} />
    </>
  );
}
