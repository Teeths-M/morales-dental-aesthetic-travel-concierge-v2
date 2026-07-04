import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BRAND } from '@/lib/brandTokens';

const GOLD = BRAND.gold;

const SCENES = [
  {
    chapter: '01',
    title: 'THE\nPICKUP.',
    patient: 'María, 67',
    location: 'Miami International · Terminal D',
    time: '6:23 AM · Day of surgery',
    status: 'Escort confirmed',
    statusNote: 'Driver 4 min away',
    dot: '#22c55e',
  },
  {
    chapter: '02',
    title: 'THE\nCLINIC.',
    patient: 'María, 67',
    location: 'Cancún Medical Center · Suite 12',
    time: '11:05 AM · Arrival',
    status: 'Dr. Arroyo is ready',
    statusNote: 'Pre-op complete',
    dot: GOLD,
  },
  {
    chapter: '03',
    title: 'IN\nSURGERY.',
    patient: 'María, 67',
    location: 'Operating Suite 3 · Monitored',
    time: '12:40 PM · Ongoing',
    status: 'Procedure in progress',
    statusNote: '2 family members watching',
    dot: '#f59e0b',
  },
  {
    chapter: '04',
    title: 'HOME\nSAFE.',
    patient: 'María, 67',
    location: 'Cancún → Miami · Flight CM-412',
    time: '5:15 PM · En route',
    status: 'Mission complete',
    statusNote: 'See you next time, María ✦',
    dot: '#22c55e',
  },
];

export default function LiveJourneyCard() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % SCENES.length), 4800);
    return () => clearInterval(t);
  }, []);

  const s = SCENES[idx];

  return (
    <div
      className="hidden lg:flex flex-col justify-center relative overflow-hidden"
      style={{ minHeight: 'calc(100svh - 72px)', paddingLeft: 52, paddingBottom: 80 }}
    >
      {/* Ghost chapter number — cinematic backdrop */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`ghost-${idx}`}
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          style={{
            position: 'absolute',
            right: -24,
            bottom: '5%',
            fontSize: 'min(24vw, 280px)',
            fontWeight: 900,
            color: 'rgba(255,255,255,0.03)',
            lineHeight: 1,
            letterSpacing: '-0.06em',
            pointerEvents: 'none',
            userSelect: 'none',
            fontFamily: '"SF Pro Display", system-ui',
          }}
        >
          {s.chapter}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          {/* Chapter label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26 }}>
            <div style={{ width: 32, height: 1, background: `${GOLD}55` }} />
            <span style={{
              fontSize: 11, fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              color: `${GOLD}75`,
            }}>
              Chapter {s.chapter} of {SCENES.length}
            </span>
          </div>

          {/* Scene title — fills the column */}
          <h2 style={{
            fontSize: 'clamp(3.8rem, 6.2vw, 6.4rem)',
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '-0.04em',
            lineHeight: 0.92,
            textTransform: 'uppercase',
            whiteSpace: 'pre-line',
            fontFamily: '"SF Pro Display", system-ui, -apple-system',
            marginBottom: 36,
            textShadow: '0 2px 50px rgba(0,0,0,0.95), 0 0 100px rgba(0,0,0,0.7)',
          }}>
            {s.title}
          </h2>

          {/* Patient + location */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.58)', margin: 0 }}>
              {s.patient}
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', margin: '5px 0 0', fontWeight: 400 }}>
              {s.location}
            </p>
            <p style={{ fontSize: 12, color: `${GOLD}80`, margin: '4px 0 0', fontWeight: 600 }}>
              {s.time}
            </p>
          </div>

          {/* Status pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '11px 20px', borderRadius: 99,
            background: 'rgba(6,11,22,0.65)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            marginBottom: 44,
          }}>
            <motion.div
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.3, repeat: Infinity }}
              style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot, flexShrink: 0 }}
            />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0 }}>{s.status}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)', margin: '1px 0 0' }}>{s.statusNote}</p>
            </div>
          </div>

          {/* Progress indicators */}
          <div style={{ display: 'flex', gap: 7 }}>
            {SCENES.map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  width: i === idx ? 28 : 7,
                  backgroundColor: i === idx ? GOLD : 'rgba(255,255,255,0.2)',
                }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                style={{ height: 4, borderRadius: 2 }}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
