import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BRAND } from '@/lib/brandTokens';

const GOLD = BRAND.gold;

const PATIENTS = [
  {
    name: 'María, 67',
    route: 'Miami → Cancún',
    procedure: 'Dental Implants',
    doctor: 'Dr. Arroyo',
    family: '2 family members watching',
    stages: [
      { label: 'Escort confirmed',       done: true   },
      { label: 'Checked in with doctor', done: true   },
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
      { label: 'Airport pickup confirmed', done: true   },
      { label: 'Hotel check-in',           done: true   },
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

function Stage({ stage }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {/* Dot */}
      {stage.done ? (
        <div style={{
          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 10, color: '#22c55e' }}>✓</span>
        </div>
      ) : stage.active ? (
        <motion.div
          animate={{ boxShadow: ['0 0 0 0 rgba(212,175,55,0.55)', '0 0 0 6px rgba(212,175,55,0)', '0 0 0 0 rgba(212,175,55,0)'] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          style={{
            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(212,175,55,0.16)', border: `1.5px solid ${GOLD}`,
          }}
        />
      ) : (
        <div style={{
          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
        }} />
      )}

      {/* Label */}
      <span style={{
        fontSize: 13, flex: 1,
        fontWeight: stage.active ? 600 : 400,
        color: stage.done ? 'rgba(255,255,255,0.45)' : stage.active ? '#fff' : 'rgba(255,255,255,0.2)',
      }}>
        {stage.label}
      </span>

      {stage.active && (
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          style={{ fontSize: 10, color: GOLD, fontWeight: 700, letterSpacing: '0.06em' }}
        >
          now
        </motion.span>
      )}
    </div>
  );
}

export default function LiveJourneyCard() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % PATIENTS.length), 5500);
    return () => clearInterval(t);
  }, []);

  const p = PATIENTS[idx];

  return (
    <div className="hidden lg:flex items-center justify-center relative">
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', width: 380, height: 380, borderRadius: '50%',
        background: `radial-gradient(circle, ${BRAND.goldAlpha(0.06)} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: 390,
              background: 'rgba(6,11,22,0.92)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: `1px solid rgba(212,175,55,0.18)`,
              borderRadius: 22,
              padding: '24px 26px',
              boxShadow: `0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 60px ${BRAND.goldAlpha(0.04)}`,
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <motion.div
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 1.3, repeat: Infinity }}
                  style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }}
                />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Live
                </span>
              </div>
              <span style={{
                fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 500,
                background: 'rgba(255,255,255,0.05)', padding: '3px 10px', borderRadius: 99,
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                {p.procedure}
              </span>
            </div>

            {/* Patient */}
            <div style={{ marginBottom: 22 }}>
              <p style={{ fontSize: 19, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                {p.name}
              </p>
              <p style={{ fontSize: 12, color: `${GOLD}90`, margin: '4px 0 0', fontWeight: 500 }}>
                {p.route}
              </p>
            </div>

            {/* Journey stages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginBottom: 22 }}>
              {p.stages.map((stage, i) => <Stage key={i} stage={stage} />)}
            </div>

            {/* Footer */}
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              paddingTop: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: `${BRAND.goldAlpha(0.12)}`, border: `1px solid ${BRAND.goldAlpha(0.28)}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 13 }}>🩺</span>
                </div>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', fontWeight: 500 }}>
                  {p.doctor}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD }}
                />
                <span style={{ fontSize: 11, color: `${GOLD}65`, fontWeight: 500 }}>
                  {p.family}
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
