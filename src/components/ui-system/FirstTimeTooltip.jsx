import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'morales_mission_brief_done';
const GOLD = '#D4AF37';

const features = [
  {
    icon: '🛡️',
    title: 'Your Safety Pulse',
    body: 'The MedGuard shield above is your safety heartbeat. Green means we are watching. Red means we are acting.',
  },
  {
    icon: '❤️',
    title: 'Your Journey Hearts',
    body: 'Nine hearts track your journey from home to clinic and back. Each tap confirms you are safe — one step at a time.',
  },
  {
    icon: '🆘',
    title: 'SOS — Always One Tap Away',
    body: 'The SOS button in the bottom-right corner connects you to emergency assistance in seconds. It is always visible.',
  },
];

export default function FirstTimeTooltip() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch (_) {}
  }, []);

  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch (_) {}
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="mission-brief"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          onClick={dismiss}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(6, 11, 22, 0.88)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px',
          }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0C1A1D',
              border: '1px solid #2A3F4A',
              borderRadius: 24,
              padding: '36px 28px 28px',
              maxWidth: 420,
              width: '100%',
              boxShadow: `0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,175,55,0.12), inset 0 1px 0 rgba(255,255,255,0.04)`,
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{
                fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase',
                color: GOLD, fontWeight: 700, marginBottom: 10,
              }}>
                Mission Brief
              </div>
              <div style={{
                width: 160, height: 1, margin: '0 auto 16px',
                background: `linear-gradient(to right, transparent, ${GOLD}, transparent)`,
              }} />
              <h2 style={{
                fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 400,
                color: '#fff', lineHeight: 1.2, margin: 0,
              }}>
                Welcome to your journey.
              </h2>
              <p style={{ margin: '10px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                Here is everything you need to know to feel safe and confident.
              </p>
            </div>

            {/* Feature rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
              {features.map(({ icon, title, body }) => (
                <div key={title} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  background: 'rgba(255,255,255,0.03)', borderRadius: 14,
                  border: '1px solid rgba(42,63,74,0.8)', padding: '14px 16px',
                }}>
                  <span style={{ fontSize: 24, flexShrink: 0, lineHeight: 1 }}>{icon}</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{title}</p>
                    <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.58)', lineHeight: 1.6 }}>{body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Dismiss CTA */}
            <button
              onClick={dismiss}
              style={{
                width: '100%',
                minHeight: 52,
                background: GOLD,
                color: '#060B16',
                border: 'none',
                borderRadius: 999,
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 24px rgba(212,175,55,0.4)`,
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              I understand — Let's go →
            </button>

            <p style={{ textAlign: 'center', margin: '12px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.28)' }}>
              Tap anywhere to dismiss · Shown once
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
