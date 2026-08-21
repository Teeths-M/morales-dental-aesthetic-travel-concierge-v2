import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, MapPin } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { emitOpenMcare } from '@/lib/openMcareEvent';

const GOLD = '#D4AF37';

const PILL_BASE = {
  background:           'rgba(6, 11, 22, 0.82)',
  backdropFilter:       'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  boxShadow:            '0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
  display:     'flex',
  alignItems:  'center',
  gap:         '9px',
  borderRadius:'999px',
  cursor:      'pointer',
  userSelect:  'none',
  padding:     '10px 16px 10px 12px',
  whiteSpace:  'nowrap',
  minHeight:   '44px',
  overflow:    'hidden',
  maxWidth:    '100%',
};

export default function FloatingSOSButton() {
  const { t }          = useTranslation();
  // Delay initial entry so pills don't flash on first render
  const [visible, setVisible]     = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 1200); return () => clearTimeout(t); }, []);

  return (
    <>
      <AnimatePresence>
        {visible && (
      <motion.div
        key="floating-pills"
        initial={{ opacity: 0, y: 20, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.94, transition: { duration: 0.22 } }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position:      'fixed',
          bottom:        'calc(max(16px, env(safe-area-inset-bottom, 16px)) + var(--sticky-cta-height, 0px) + var(--bottom-tab-bar-height, 0px))',
          right:         '16px',
          zIndex:        9999,
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'flex-end',
          gap:           '8px',
          maxWidth:      'calc(100vw - 32px)',
        }}
      >
        {/* ── M Nearby pill (top) — opens M-Care, which already has real
            searchNearbyPlaces tool access; /nearby's own map-deep-link page
            stays reachable via a fallback pill on the Emergency Hub ── */}
        <button
          type="button"
          onClick={() => emitOpenMcare("I need to find something nearby — like a pharmacy, hospital, clinic, or police station.")}
          aria-label="Find nearby help"
          style={{ textDecoration: 'none', background: 'none', border: 'none', padding: 0, margin: 0 }}
        >
          <motion.div
            aria-label="Find Nearby — doctors, pharmacy, police and more"
            style={{ ...PILL_BASE, border: '1px solid rgba(0,229,255,0.28)' }}
            whileHover={{ scale: 1.04, boxShadow: '0 12px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,229,255,0.35)', transition: { duration: 0.18 } }}
            whileTap={{ scale: 0.97 }}
          >
            <div style={{ position: 'relative', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <motion.span
                style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,229,255,0.45)' }}
                animate={{ scale: [1, 1.9, 1], opacity: [0.35, 0, 0.35] }}
                transition={{ duration: 3.6, repeat: Infinity, ease: 'easeOut', repeatDelay: 1.4 }}
              />
              <span style={{ position: 'relative', width: 10, height: 10, borderRadius: '50%', background: '#00E5FF', boxShadow: '0 0 6px rgba(0,229,255,0.65)', display: 'block' }} />
            </div>
            <MapPin style={{ width: 16, height: 16, color: '#00E5FF', filter: 'drop-shadow(0 0 4px rgba(0,229,255,0.55))', flexShrink: 0 }} strokeWidth={2} />
            <span className="hidden sm:inline" style={{ fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#00E5FF', lineHeight: 1 }}>
              {t('sos.find_nearby')}
            </span>
          </motion.div>
        </button>

        {/* ── SOS pill (bottom) ── */}
        <Link to="/emergency" aria-label="SOS Emergency" style={{ textDecoration: 'none' }}>
          <motion.div
            aria-label="SOS — tap for immediate emergency access"
            style={{ ...PILL_BASE, border: '1px solid rgba(239, 68, 68, 0.40)' }}
            whileHover={{ scale: 1.04, boxShadow: '0 12px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(239,68,68,0.45)', transition: { duration: 0.18 } }}
            whileTap={{ scale: 0.97 }}
          >
            <div style={{ position: 'relative', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <motion.span
                style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.55)' }}
                animate={{ scale: [1, 2.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', repeatDelay: 0.4 }}
              />
              <span style={{ position: 'relative', width: 10, height: 10, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px rgba(239,68,68,0.7)', display: 'block' }} />
            </div>
            <ShieldAlert style={{ width: 16, height: 16, color: '#ef4444', filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.6))', flexShrink: 0 }} strokeWidth={2} />
            <span className="hidden sm:inline" style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#ef4444', lineHeight: 1 }}>
              {t('sos.label')}
            </span>
          </motion.div>
        </Link>
      </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
