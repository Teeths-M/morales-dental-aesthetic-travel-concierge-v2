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
    label: 'Your Driver',
    icon: '🚗',
    sub: 'At your door. On time.',
    hs: 1,
    photo: '/images/journey-stage-01.jpg',
    overlay: 'linear-gradient(to right, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.50) 50%, rgba(180,90,0,0.20) 100%)',
    accent: '#F4A261',
  },
  {
    label: 'Your Doctor',
    icon: '👨‍⚕️',
    sub: 'Verified. Waiting for you.',
    hs: 5,
    photo: 'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/03cdc6bc8_image.png',
    overlay: 'linear-gradient(to right, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.50) 50%, rgba(0,80,40,0.20) 100%)',
    accent: '#34D399',
  },
  {
    label: 'Your Companion',
    icon: '🤝',
    sub: 'With you through recovery.',
    hs: 6,
    photo: '/images/journey-stage-02.jpg',
    overlay: 'linear-gradient(to right, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.50) 50%, rgba(190,30,100,0.20) 100%)',
    accent: '#ec4899',
  },
  {
    label: 'Your Air Hostess',
    icon: '✈️',
    sub: 'Safe travels home.',
    hs: 8,
    photo: '/images/journey-stage-03.jpg',
    overlay: `linear-gradient(to right, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.50) 50%, ${GOLD}22 100%)`,
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
