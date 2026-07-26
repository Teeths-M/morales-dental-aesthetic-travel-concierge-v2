import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, MapPin } from 'lucide-react';
import { useTranslation } from '@/i18n';
import MoralesAssistPanel from './MoralesAssistPanel';

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
  const [panelOpen, setPanelOpen] = useState(false);
  // Delay initial entry so pills don't flash on first render
  const [visible, setVisible]     = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 1200); return () => clearTimeout(t); }, []);

  const pillsVisible = visible && !panelOpen;

  return (
    <>
      <AnimatePresence>
        {pillsVisible && (
      <motion.div
        key="floating-pills"
        initial={{ opacity: 0, y: 20, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.94, transition: { duration: 0.22 } }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position:      'fixed',
          bottom:        'calc(max(16px, env(safe-area-inset-bottom, 16px)) + var(--sticky-cta-height, 0px))',
          right:         '16px',
          zIndex:        9999,
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'flex-end',
          gap:           '8px',
          maxWidth:      'calc(100vw - 32px)',
        }}
      >
        {/* ── Morales Assist pill (top) ── */}
        <motion.div
          role="button"
          tabIndex={0}
          aria-label="Morales Assist — tap to chat with your concierge"
          onClick={() => setPanelOpen(true)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPanelOpen(true); } }}
          style={{ ...PILL_BASE, border: `1px solid rgba(212,175,55,0.30)` }}
          whileHover={{ scale: 1.04, boxShadow: `0 12px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(212,175,55,0.35)`, transition: { duration: 0.18 } }}
          whileTap={{ scale: 0.97 }}
        >
          {/* Gold pulse dot */}
          <div style={{ position: 'relative', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <motion.span
              style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(212,175,55,0.5)' }}
              animate={{ scale: [1, 2.0, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeOut', repeatDelay: 1.0 }}
            />
            <span style={{ position: 'relative', width: 10, height: 10, borderRadius: '50%', background: GOLD, boxShadow: `0 0 6px rgba(212,175,55,0.7)`, display: 'block' }} />
          </div>

          {/* Gold M mark */}
          <div style={{
            width: 20, height: 20, borderRadius: 6, flexShrink: 0,
            background: GOLD, color: '#060B16',
            fontFamily: 'Georgia, serif', fontSize: 12, fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>M</div>

          <span className="hidden sm:inline" style={{ fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: GOLD, lineHeight: 1 }}>
            {t('sos.morales_assist')}
          </span>
        </motion.div>

        {/* ── M Nearby pill (middle) ── */}
        <Link to="/nearby" aria-label="Find nearby help" style={{ textDecoration: 'none' }}>
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
        </Link>

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

      <MoralesAssistPanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  );
}
