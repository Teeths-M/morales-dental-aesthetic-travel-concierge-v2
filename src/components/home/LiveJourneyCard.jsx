import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BRAND } from '@/lib/brandTokens';

const GOLD = BRAND.gold;

const PATIENTS = [
  {
    name: 'Maria, 67',
    route: 'Miami → Cancún',
    procedure: 'Dental Implants',
    doctor: 'Dr. Arroyo',
    family: '2 family members watching',
    stages: [
      { label: 'Escort confirmed',       done: true  },
      { label: 'Checked in with doctor', done: true  },
      { label: 'Procedure in progress',  active: true },
      { label: 'Recovery monitoring',    pending: true },
    ],
  },
  {
    name: 'Rosa, 71',
    route: 'Houston → Guadalajara',
    procedure: 'Hip Replacement',
    doctor: 'Dr. Méndez',
    family: '4 family members watching',
    stages: [
      { label: 'Airport pickup confirmed', done: true  },
      { label: 'Hotel check-in',           done: true  },
      { label: 'Pre-op consultation',      active: true },
      { label: 'Procedure tomorrow',       pending: true },
    ],
  },
  {
    name: 'James, 44',
    route: 'Phoenix → Mexico City',
    procedure: 'Emergency Eye Care',
    doctor: 'Dr. Vásquez',
    family: '1 family member watching',
    stages: [
      { label: 'Emergency doctor matched', done: true  },
      { label: 'Surgery complete',         done: true  },
      { label: 'Recovery confirmed',       done: true  },
      { label: 'Flying home safely',       active: true },
    ],
  },
];

function StageRow({ stage }) {
  if (stage.done) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ fontSize: 9, color: '#22c55e' }}>✓</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.45)' }}>{stage.label}</span>
      </div>
    );
  }
  if (stage.active) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <motion.div
          animate={{ boxShadow: ['0 0 0 0 rgba(212,175,55,0.5)', '0 0 0 6px rgba(212,175,55,0)', '0 0 0 0 rgba(212,175,55,0)'] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          style={{
            width: 18, height: 18, borderRadius: '50%',
            background: `rgba(212,175,55,0.18)`, border: `1px solid ${GOLD}`, flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', flex: 1 }}>{stage.label}</span>
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          style={{ fontSize: 10, color: GOLD, fontWeight: 700, letterSpacing: '0.05em' }}
        >
          now
        </motion.span>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0,
      }} />
      <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.2)' }}>{stage.label}</span>
    </div>
  );
}

export default function LiveJourneyCard() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % PATIENTS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const p = PATIENTS[idx];

  return (
    <div className="hidden lg:flex items-center justify-center relative">
      {/* Ambient glow behind card */}
      <div style={{
        position: 'absolute', width: 360, height: 360, borderRadius: '50%', pointerEvents: 'none',
        background: `radial-gradient(circle, ${BRAND.goldAlpha(0.07)} 0%, transparent 70%)`,
      }} />

      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.97 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: 316,
              background: 'rgba(6,11,22,0.9)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid rgba(212,175,55,0.18)',
              borderRadius: 22,
              padding: '22px 24px',
              boxShadow: '0 28px 70px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03) inset',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <motion.div
                  animate={{ opacity: [1, 0.25, 1] }}
                  transition={{ duration: 1.3, repeat: Infinity }}
                  style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }}
                />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Live</span>
              </div>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', fontWeight: 500 }}>{p.procedure}</span>
            </div>

            {/* Patient */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>{p.name}</p>
              <p style={{ fontSize: 12, color: `${GOLD}99`, margin: '3px 0 0', fontWeight: 500 }}>{p.route}</p>
            </div>

            {/* Stages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 20 }}>
              {p.stages.map((stage, i) => <StageRow key={i} stage={stage} />)}
            </div>

            {/* Footer */}
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: `${BRAND.goldAlpha(0.12)}`, border: `1px solid ${BRAND.goldAlpha(0.25)}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 12 }}>🩺</span>
                </div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', fontWeight: 500 }}>{p.doctor}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2.4, repeat: Infinity }}
                  style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD }}
                />
                <span style={{ fontSize: 10, color: `${GOLD}70`, fontWeight: 500 }}>{p.family}</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
