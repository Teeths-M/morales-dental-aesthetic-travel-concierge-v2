import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BRAND } from '@/lib/brandTokens';
import { useTranslation } from '@/i18n';

const GOLD = BRAND.gold;

const SCENE_META_MEDICAL = [
  { key: 'pickup',   chapter: '01', dot: '#22c55e' },
  { key: 'clinic',   chapter: '02', dot: GOLD },
  { key: 'surgery',  chapter: '03', dot: '#f59e0b' },
  { key: 'recovery', chapter: '04', dot: '#22c55e' },
  { key: 'home',     chapter: '05', dot: '#22c55e' },
];

const SCENE_META_TRAVEL = [
  { key: 'pickup',  chapter: '01', dot: '#22c55e' },
  { key: 'arrival', chapter: '02', dot: '#00E5FF' },
  { key: 'hotel',   chapter: '03', dot: GOLD },
  { key: 'return',  chapter: '04', dot: '#f59e0b' },
  { key: 'home',    chapter: '05', dot: '#22c55e' },
];

export default function LiveJourneyCard({ isMedical = true }) {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(0);
  const sceneMeta = isMedical ? SCENE_META_MEDICAL : SCENE_META_TRAVEL;
  const namespace = isMedical ? 'medical' : 'travel';

  useEffect(() => {
    const timer = setInterval(() => setIdx(i => (i + 1) % sceneMeta.length), 4800);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const meta = sceneMeta[idx];
  const s = {
    ...meta,
    title:      t(`journey_card.${namespace}.${meta.key}_title`),
    patient:    'María, 67',
    location:   t(`journey_card.${namespace}.${meta.key}_location`),
    time:       t(`journey_card.${namespace}.${meta.key}_time`),
    status:     t(`journey_card.${namespace}.${meta.key}_status`),
    statusNote: t(`journey_card.${namespace}.${meta.key}_note`),
  };

  return (
    <div
      className="hidden lg:flex flex-col justify-center relative overflow-hidden"
      style={{ minHeight: 'calc(100svh - 72px)', paddingLeft: 48, paddingBottom: 80 }}
    >
      {/* Ghost chapter number — in the background, very subtle */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`ghost-${idx}`}
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
          style={{
            position: 'absolute',
            right: -16,
            bottom: '6%',
            fontSize: 'min(20vw, 240px)',
            fontWeight: 900,
            color: 'rgba(255,255,255,0.035)',
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
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          {/* Chapter label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 28, height: 1, background: `${GOLD}50` }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: `${GOLD}65` }}>
              {t('journey_card.stage_of', { current: s.chapter, total: sceneMeta.length })}
            </span>
          </div>

          {/* Scene title — secondary to NEVER ALONE, not competing */}
          <h2 style={{
            fontSize: 'clamp(2.4rem, 3.8vw, 4.2rem)',
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '-0.04em',
            lineHeight: 0.92,
            textTransform: 'uppercase',
            whiteSpace: 'pre-line',
            fontFamily: '"SF Pro Display", system-ui, -apple-system',
            marginBottom: 28,
            textShadow: '0 2px 40px rgba(0,0,0,0.95), 0 0 80px rgba(0,0,0,0.8)',
            opacity: 0.88,
          }}>
            {s.title}
          </h2>

          {/* Patient + location */}
          <div style={{ marginBottom: 26 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.52)', margin: 0 }}>
              {s.patient}
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.26)', margin: '4px 0 0' }}>
              {s.location}
            </p>
            <p style={{ fontSize: 11, color: `${GOLD}75`, margin: '3px 0 0', fontWeight: 600 }}>
              {s.time}
            </p>
          </div>

          {/* Status pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 9,
            padding: '9px 17px', borderRadius: 99,
            background: 'rgba(6,11,22,0.6)',
            border: '1px solid rgba(255,255,255,0.09)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            marginBottom: 36,
          }}>
            <motion.div
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.3, repeat: Infinity }}
              style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, flexShrink: 0 }}
            />
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', margin: 0 }}>{s.status}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', margin: '1px 0 0' }}>{s.statusNote}</p>
            </div>
          </div>

          {/* Progress indicators */}
          <div style={{ display: 'flex', gap: 6 }}>
            {sceneMeta.map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  width: i === idx ? 24 : 6,
                  backgroundColor: i === idx ? GOLD : 'rgba(255,255,255,0.18)',
                }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                style={{ height: 3, borderRadius: 2 }}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
