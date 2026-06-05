import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GOLD = '#C5A059';
const WARM = 'rgba(197,160,89,';

const STATES = [
  { color: '#22c55e', title: "YOU'RE PROTECTED",  sub: 'Your care journey appears compatible.',                detail: 'Scan complete · All systems safe' },
  { color: '#f59e0b', title: 'ENHANCED REVIEW',   sub: 'Recovery compatibility may require provider review.', detail: 'Review in progress · Care plan being tailored' },
  { color: '#ef4444', title: 'PROVIDER REVIEW',   sub: 'Additional safety review recommended.',               detail: 'Specialist review · Plan in progress' },
];

const NODES = [
  { label: 'COLOMBIA',     angle: -72 },
  { label: 'SOUTH KOREA',  angle:  22 },
  { label: 'BRAZIL',       angle: -108},
  { label: 'THAILAND',     angle:  58 },
  { label: 'TURKEY',       angle: 128 },
  { label: 'MEXICO',       angle: 195 },
  { label: 'COSTA RICA',   angle: 162 },
];

const W = 440, H = 440, CX = W/2, CY = H/2, GR = 148, NR = 188;

function polar(deg, r) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

// Stable particles — generated once
const PARTICLES = Array.from({ length: 22 }, (_, i) => {
  const seed = i * 137.5;
  const angle = (seed % 360);
  const radius = GR + 8 + (i % 4) * 14;
  const base = polar(angle, radius);
  return {
    id: i,
    x: base.x,
    y: base.y,
    r: 1.2 + (i % 3) * 0.6,
    dur: 6 + (i % 5) * 2.4,
    delay: (i % 7) * -1.1,
    dx: (i % 2 === 0 ? 1 : -1) * (2 + i % 4),
    dy: (i % 3 === 0 ? 1 : -1) * (2 + i % 3),
  };
});

export default function HeroGlobe() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx(p => (p + 1) % 3), 9000);
    return () => clearInterval(t);
  }, []);

  const cur = STATES[idx];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      {/* Header label */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.30em', color: GOLD, textTransform: 'uppercase' }}>SAFE-T4LIFE™</div>
        <div style={{ fontSize: 8.5, letterSpacing: '0.20em', color: `${WARM}0.42)`, textTransform: 'uppercase', fontWeight: 600, marginTop: 2 }}>Safety Intelligence Engine</div>
      </div>

      {/* Globe container */}
      <div style={{ position: 'relative', width: W, height: H }}>

        {/* Cinematic warm ambient glow — behind globe */}
        <div style={{
          position: 'absolute', inset: '5%',
          background: `radial-gradient(circle at 50% 50%, ${WARM}0.22) 0%, ${WARM}0.08) 42%, transparent 68%)`,
          filter: 'blur(28px)',
          pointerEvents: 'none',
        }} />

        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          <defs>
            <clipPath id="hgc"><circle cx={CX} cy={CY} r={GR} /></clipPath>
            <radialGradient id="hgg" cx="40%" cy="32%" r="72%">
              <stop offset="0%"   stopColor="#1c3d62" />
              <stop offset="48%"  stopColor="#0c2040" />
              <stop offset="100%" stopColor="#050e1e" />
            </radialGradient>
            <radialGradient id="shieldGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={`${WARM}0.35)`} />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <filter id="softglow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Globe fill */}
          <circle cx={CX} cy={CY} r={GR} fill="url(#hgg)" />

          {/* Subtle inner rim glow */}
          <circle cx={CX} cy={CY} r={GR - 2} fill="none" stroke={`${WARM}0.06)`} strokeWidth="8" />

          {/* Latitude ellipses */}
          {[-60,-30,0,30,60].map(lat => {
            const rad = (lat * Math.PI) / 180;
            const ey = CY - GR * Math.sin(rad);
            const ex = GR * Math.cos(rad);
            return <ellipse key={lat} cx={CX} cy={ey} rx={Math.max(0,ex)} ry={GR*0.17} fill="none" stroke={`${WARM}0.18)`} strokeWidth="0.7" clipPath="url(#hgc)" />;
          })}

          {/* Longitude ellipses */}
          {[0,30,60,90,120,150].map((a,i) => {
            const rad = (a * Math.PI) / 180;
            return <ellipse key={i} cx={CX} cy={CY} rx={GR * Math.abs(Math.sin(rad)) + 0.5} ry={GR} fill="none" stroke={`${WARM}0.10)`} strokeWidth="0.6" clipPath="url(#hgc)" />;
          })}

          {/* Globe border — warm gold rim */}
          <circle cx={CX} cy={CY} r={GR} fill="none" stroke={GOLD} strokeWidth="1.4" opacity="0.50" />

          {/* Outer dashed orbit ring */}
          <circle cx={CX} cy={CY} r={NR + 10} fill="none" stroke={`${WARM}0.14)`} strokeWidth="1" strokeDasharray="5 10" />

          {/* Connection lines */}
          {NODES.map(n => {
            const s = polar(n.angle, GR - 2);
            const e = polar(n.angle, NR);
            return (
              <g key={n.label}>
                <line x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke={`${WARM}0.28)`} strokeWidth="0.9" strokeDasharray="3 7" />
                <circle cx={s.x} cy={s.y} r={2.8} fill={`${WARM}0.65)`} />
                <circle cx={e.x} cy={e.y} r={4}   fill={`${WARM}0.40)`} filter="url(#softglow)" />
              </g>
            );
          })}

          {/* Floating particles */}
          {PARTICLES.map(p => (
            <motion.circle key={p.id} cx={p.x} cy={p.y} r={p.r}
              fill={GOLD} opacity={0.55}
              animate={{ cx: [p.x, p.x + p.dx, p.x - p.dx*0.5, p.x], cy: [p.y, p.y + p.dy, p.y - p.dy*0.5, p.y], opacity: [0.55, 0.85, 0.30, 0.55] }}
              transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </svg>

        {/* SAFE-T Shield — center, floating */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <motion.div animate={{ y: [0,-8,0] }} transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }} style={{ position: 'relative' }}>
            {/* Outer breathing glow ring */}
            <motion.div animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              style={{ position: 'absolute', inset: -22, borderRadius: '50% 50% 44% 44% / 26% 26% 52% 52%', background: `radial-gradient(ellipse, ${WARM}0.28) 0%, transparent 70%)` }} />
            {/* Inner breathing pulse */}
            <motion.div animate={{ scale: [1, 1.25, 1], opacity: [0.7, 0, 0.7] }} transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
              style={{ position: 'absolute', inset: -6, borderRadius: '50% 50% 44% 44% / 26% 26% 52% 52%', background: `radial-gradient(ellipse, ${WARM}0.22) 0%, transparent 70%)` }} />
            {/* Shield body */}
            <motion.div
              animate={{ boxShadow: [
                `0 0 28px ${WARM}0.30), 0 0 60px ${WARM}0.10)`,
                `0 0 52px ${WARM}0.55), 0 0 100px ${WARM}0.22)`,
                `0 0 28px ${WARM}0.30), 0 0 60px ${WARM}0.10)`,
              ]}}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 108, height: 126,
                background: 'linear-gradient(155deg, #1c3e6a 0%, #0c2040 50%, #070f1e 100%)',
                border: `2px solid ${GOLD}`,
                borderRadius: '50% 50% 44% 44% / 26% 26% 52% 52%',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
              {/* Heart + hands icon */}
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                <path d="M22 36s-3-2.2-6.5-5.8C11 26 8 21.8 8 18.5a6.5 6.5 0 0 1 6.5-6.5c2.4 0 4.6 1.3 5.8 3.2h3.4c1.2-1.9 3.4-3.2 5.8-3.2A6.5 6.5 0 0 1 36 18.5c0 3.3-3 7.5-7.5 11.7C25 33.5 22 36 22 36z"
                  fill="none" stroke={GOLD} strokeWidth="1.6" strokeLinejoin="round"/>
                <path d="M15 31c-2 1.5-3.5 2.8-4 4.5M29 31c2 1.5 3.5 2.8 4 4.5"
                  stroke={GOLD} strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <div style={{ fontSize: 8.5, fontWeight: 800, color: GOLD, letterSpacing: '0.18em', marginTop: 5, textTransform: 'uppercase' }}>SAFE-T</div>
              <div style={{ fontSize: 6.5, color: `${WARM}0.52)`, letterSpacing: '0.14em', marginTop: 2, textTransform: 'uppercase' }}>4LIFE™</div>
            </motion.div>
          </motion.div>
        </div>

        {/* Destination labels */}
        {NODES.map(n => {
          const p = polar(n.angle, NR + 28);
          const isRight = p.x > CX + 8;
          const isLeft  = p.x < CX - 8;
          return (
            <div key={n.label} style={{
              position: 'absolute',
              left:  isRight ? p.x + 8  : isLeft ? 'auto' : p.x - 28,
              right: isLeft  ? W - p.x + 8 : 'auto',
              top: p.y - 9,
              fontSize: 9, fontWeight: 700,
              color: 'rgba(255,255,255,0.65)',
              letterSpacing: '0.14em', textTransform: 'uppercase',
              whiteSpace: 'nowrap', lineHeight: 1.3,
              pointerEvents: 'none',
            }}>{n.label}</div>
          );
        })}
      </div>

      {/* SAFE-T Status */}
      <AnimatePresence mode="wait">
        <motion.div key={idx}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.55 }}
          style={{
            width: 320,
            background: 'rgba(7,14,26,0.96)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16, padding: '16px 20px',
            backdropFilter: 'blur(20px)',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', border: `2px solid ${cur.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <motion.div animate={{ scale: [1,1.3,1] }} transition={{ duration: 1.8, repeat: Infinity }}
                style={{ width: 10, height: 10, borderRadius: '50%', background: cur.color }} />
            </div>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: cur.color, letterSpacing: '0.04em' }}>{cur.title}</span>
          </div>
          <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.58)', margin: '0 0 8px', lineHeight: 1.55 }}>{cur.sub}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: cur.color }} />
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.32)', letterSpacing: '0.04em' }}>{cur.detail}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 7 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ height: 5, width: i === idx ? 20 : 5, borderRadius: 99, transition: 'all 0.45s', background: i === idx ? cur.color : 'rgba(255,255,255,0.14)' }} />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}