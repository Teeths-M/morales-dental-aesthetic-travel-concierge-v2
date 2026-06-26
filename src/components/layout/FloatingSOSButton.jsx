import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Bot } from 'lucide-react';
import SafeTAssistantPanel from './SafeTAssistantPanel';
import ChannelList from '@/components/sos/ChannelList';

/**
 * FloatingSOSButton — pill stack, bottom-right, z-9999.
 *
 * Top pill:    WhatsApp → opens popover (WhatsApp + AI + Channel strip)
 * Bottom pill: SOS      → navigates to /emergency
 */

const WHATSAPP_GREEN = '#25D366';
const WHATSAPP_URL   = 'https://wa.me/18005550199?text=Hello%20Morales%20Concierge%2C%20I%20need%20assistance.';

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

function WhatsAppIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={WHATSAPP_GREEN} style={{ flexShrink: 0 }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.116 1.527 5.845L.057 23.571a.75.75 0 0 0 .92.92l5.733-1.47A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.686-.528-5.208-1.443l-.374-.222-3.405.874.89-3.328-.241-.385A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
    </svg>
  );
}

export default function FloatingSOSButton() {
  const [isPanelOpen,      setIsPanelOpen]      = useState(false);
  const [isMenuOpen,       setIsMenuOpen]       = useState(false);
  const [detectedChannels, setDetectedChannels] = useState([]);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setIsMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [isMenuOpen]);

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
        {/* ── WhatsApp pill (top) ── */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          {/* Popover */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                style={{
                  position:       'absolute',
                  bottom:         'calc(100% + 10px)',
                  right:          0,
                  background:     'rgba(6,11,22,0.95)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border:         '1px solid rgba(255,255,255,0.08)',
                  borderRadius:   16,
                  padding:        '8px',
                  display:        'flex',
                  flexDirection:  'column',
                  gap:            '6px',
                  minWidth:       210,
                  boxShadow:      '0 16px 48px rgba(0,0,0,0.6)',
                }}
              >
                {/* WhatsApp — primary */}
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMenuOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(37,211,102,0.12)',
                    border: '1px solid rgba(37,211,102,0.25)',
                    textDecoration: 'none', cursor: 'pointer',
                  }}
                >
                  <WhatsAppIcon size={18} />
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: WHATSAPP_GREEN, lineHeight: 1.2 }}>WhatsApp</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.3, marginTop: 2 }}>Fastest response · global</p>
                  </div>
                </a>

                {/* AI Assistant — secondary */}
                <button
                  onClick={() => { setIsMenuOpen(false); setIsPanelOpen(true); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(52,211,153,0.08)',
                    border: '1px solid rgba(52,211,153,0.15)',
                    cursor: 'pointer', width: '100%', textAlign: 'left',
                  }}
                >
                  <Bot style={{ width: 18, height: 18, color: '#34d399', flexShrink: 0 }} />
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#34d399', lineHeight: 1.2 }}>AI Assistant</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.3, marginTop: 2 }}>Safe-T4life · always on</p>
                  </div>
                </button>

                {/* SOS channel status strip */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6 }}>
                  <p style={{ margin: '0 0 2px', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
                    textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                    SOS Channels
                  </p>
                  <ChannelList compact onDetected={setDetectedChannels} />
                  {(detectedChannels.includes('gotenna') || detectedChannels.includes('inreach')) && (
                    <p style={{ margin: '4px 0 0', fontSize: 9, color: '#3b82f6', textAlign: 'center' }}>
                      BLE hardware detected
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* WhatsApp pill button */}
          <motion.div
            onClick={() => setIsMenuOpen(v => !v)}
            role="button"
            tabIndex={0}
            aria-label="WhatsApp assistance"
            aria-expanded={isMenuOpen}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsMenuOpen(v => !v); } }}
            style={{ ...PILL_BASE, border: `1px solid rgba(37, 211, 102, 0.30)` }}
            whileHover={{ scale: 1.04, boxShadow: `0 12px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(37,211,102,0.35)`, transition: { duration: 0.18 } }}
            whileTap={{ scale: 0.97 }}
          >
            <div style={{ position: 'relative', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <motion.span
                style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(37, 211, 102, 0.5)' }}
                animate={{ scale: [1, 2.0, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeOut', repeatDelay: 1.0 }}
              />
              <span style={{ position: 'relative', width: 10, height: 10, borderRadius: '50%', background: WHATSAPP_GREEN, boxShadow: `0 0 6px rgba(37,211,102,0.6)`, display: 'block' }} />
            </div>
            <WhatsAppIcon size={16} />
            <span style={{ fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: WHATSAPP_GREEN, lineHeight: 1 }}>
              WhatsApp
            </span>
          </motion.div>
        </div>

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
            <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#ef4444', lineHeight: 1 }}>
              SOS
            </span>
          </motion.div>
        </Link>
      </motion.div>

      <SafeTAssistantPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} />
    </>
  );
}
