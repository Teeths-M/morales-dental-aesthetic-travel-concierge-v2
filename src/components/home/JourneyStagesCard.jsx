/**
 * JourneyStagesCard
 * 4-section vertical card representing the Safe-T4life journey stages.
 * Glass-morphism border, warm gold accents, pure gradient imagery — no text overlay.
 */
import React from 'react';
import { motion } from 'framer-motion';

const GOLD = '#D4AF37';

const STAGES = [
  {
    label: 'Driver Pickup',
    icon: '🚗',
    sub: 'Home → Airport',
    hs: 1,
    photo: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=700&h=220&fit=crop&q=80',
    overlay: 'linear-gradient(to right, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.45) 55%, rgba(180,90,0,0.25) 100%)',
    accent: '#F4A261',
  },
  {
    label: 'Hotel Check-in',
    icon: '🏨',
    sub: 'Boutique. Warm welcome.',
    hs: 4,
    photo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=700&h=220&fit=crop&q=80',
    overlay: 'linear-gradient(to right, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.45) 55%, rgba(0,40,100,0.30) 100%)',
    accent: '#60A5FA',
  },
  {
    label: 'Clinic Arrival',
    icon: '🏥',
    sub: 'Verified. Ready for you.',
    hs: 5,
    photo: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=700&h=220&fit=crop&q=80',
    overlay: 'linear-gradient(to right, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.45) 55%, rgba(0,80,40,0.25) 100%)',
    accent: '#34D399',
  },
  {
    label: 'Welcome Home',
    icon: '🏠',
    sub: 'The Golden M is yours.',
    hs: 9,
    photo: 'https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=700&h=220&fit=crop&q=80',
    overlay: `linear-gradient(to right, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.45) 55%, ${GOLD}30 100%)`,
    accent: GOLD,
  },
];

export default function JourneyStagesCard() {
  return (
    <div
      style={{
        position:      'relative',
        width:         '100%',
        height:        '100%',
        borderRadius:  20,
        overflow:      'hidden',
        border:        `1px solid ${GOLD}30`,
        boxShadow:     `0 0 0 1px rgba(255,255,255,0.04) inset, 0 24px 64px rgba(0,0,0,0.6), 0 0 40px ${GOLD}15`,
        background:    '#06090F',
      }}
    >
      {/* Gold shimmer border glow */}
      <div style={{
        position:   'absolute', inset: 0, zIndex: 10, pointerEvents: 'none',
        borderRadius: 20,
        background: `linear-gradient(135deg, ${GOLD}18 0%, transparent 40%, transparent 60%, ${GOLD}12 100%)`,
      }} />

      {/* 4 sections */}
      {STAGES.map((stage, i) => (
        <motion.div
          key={stage.label}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position:           'relative',
            height:             '25%',
            backgroundImage:    `url(${stage.photo})`,
            backgroundSize:     'cover',
            backgroundPosition: 'center',
            overflow:           'hidden',
          }}
        >
          {/* Dark + accent overlay so text stays readable */}
          <div style={{ position: 'absolute', inset: 0, background: stage.overlay }} />

          {/* Separator line — gold for all but last */}
          {i < 3 && (
            <div style={{
              position:   'absolute', bottom: 0, left: 0, right: 0,
              height:     1,
              background: `linear-gradient(to right, transparent, ${GOLD}50, ${stage.accent}60, ${GOLD}50, transparent)`,
              zIndex:     2,
            }} />
          )}

          {/* Content */}
          <div style={{
            position:       'absolute', inset: 0, zIndex: 3,
            display:        'flex', alignItems: 'center',
            padding:        '0 20px',
            gap:            14,
          }}>
            {/* Icon circle */}
            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.8, ease: 'easeInOut' }}
              style={{
                width:          44, height: 44, borderRadius: '50%',
                background:     `${stage.accent}20`,
                border:         `1.5px solid ${stage.accent}50`,
                display:        'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink:     0,
                boxShadow:      `0 0 16px ${stage.accent}40`,
                fontSize:       20,
              }}
            >
              {stage.icon}
            </motion.div>

            {/* Labels */}
            <div>
              <p style={{
                margin: 0, fontSize: 13, fontWeight: 700,
                color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.2,
              }}>
                {stage.label}
              </p>
              <p style={{
                margin: 0, fontSize: 10, color: stage.accent,
                fontWeight: 500, letterSpacing: '0.04em', marginTop: 2,
              }}>
                {stage.sub}
              </p>
            </div>

            {/* Handshake number badge */}
            <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: `${stage.accent}15`,
                border:     `1px solid ${stage.accent}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800,
                color: stage.accent,
              }}>
                HS{stage.hs}
              </div>
            </div>
          </div>
        </motion.div>
      ))}

      {/* Bottom gold line */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, zIndex: 11,
        background: `linear-gradient(to right, transparent, ${GOLD}70, transparent)`,
      }} />
    </div>
  );
}
