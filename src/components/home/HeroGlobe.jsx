import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GOLD = '#C5A059';

const STATES = [
  { color: '#22c55e', title: "YOU'RE PROTECTED", sub: 'Your care journey appears compatible.', detail: 'Scan complete • All systems safe' },
  { color: '#f59e0b', title: 'ENHANCED REVIEW',  sub: 'Recovery compatibility may require provider review.', detail: 'Review in progress • Care plan being tailored' },
  { color: '#ef4444', title: 'PROVIDER REVIEW',  sub: 'Additional safety review recommended.',              detail: 'Specialist review • Plan in progress' },
];

const NODES = [
  { label: 'COLOMBIA',    angle: -70 },
  { label: 'SOUTH\nKOREA', angle:  20 },
  { label: 'BRAZIL',      angle: -110 },
  { label: 'THAILAND',    angle:  55 },
  { label: 'TURKEY',      angle: 125 },
  { label: 'MEXICO',      angle: 195 },
  { label: 'COSTA\nRICA', angle: 160 },
];

const W = 400, H = 400, CX = W / 2, CY = H / 2;
const GR = 138; // globe radius
const NR = 172; // node ring radius

function pt(angleDeg, r) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

export default function HeroGlobe() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx(p => (p + 1) % 3), 9000);
    return () => clearInterval(t);
  }, []);

  const cur = STATES[idx];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.28em', color: GOLD, textTransform: 'uppercase' }}>SAFE-T4LIFE™</div>
        <div style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(197,160,89,0.5)', textTransform: 'uppercase', fontWeight: 600, marginTop: 2 }}>Safety Intelligence Engine</div>
      </div>

      {/* Globe */}
      <div style={{ position: 'relative', width: W, height: H }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <clipPath id="gc"><circle cx={CX} cy={CY} r={GR} /></clipPath>
            <radialGradient id="gbg" cx="42%" cy="36%" r="68%">
              <stop offset="0%"   stopColor="#1b3a5c" />
              <stop offset="55%"  stopColor="#0b1e38" />
              <stop offset="100%" stopColor="#060e1c" />
            </radialGradient>
          </defs>

          {/* Globe */}
          <circle cx={CX} cy={CY} r={GR} fill="url(#gbg)" />

          {/* Latitude lines */}
          {[-60,-30,0,30,60].map(lat => {
            const r = (lat * Math.PI) / 180;
            const ey = CY - GR * Math.sin(r);
            const ex = GR * Math.cos(r);
            return <ellipse key={lat} cx={CX} cy={ey} rx={Math.max(0,ex)} ry={GR * 0.18} fill="none" stroke="rgba(197,160,89,0.13)" strokeWidth="0.7" clipPath="url(#gc)" />;
          })}

          {/* Longitude lines */}
          {[0,30,60,90,120,150].map((a,i) => {
            const r = (a * Math.PI) / 180;
            const rx = GR * Math.abs(Math.sin(r)) + 0.5;
            return <ellipse key={i} cx={CX} cy={CY} rx={rx} ry={GR} fill="none" stroke="rgba(197,160,89,0.08)" strokeWidth="0.6" clipPath="url(#gc)" />;
          })}

          {/* Globe border */}
          <circle cx={CX} cy={CY} r={GR} fill="none" stroke="rgba(197,160,89,0.40)" strokeWidth="1.5" />

          {/* Outer orbit ring */}
          <circle cx={CX} cy={CY} r={NR + 12} fill="none" stroke="rgba(197,160,89,0.10)" strokeWidth="1" strokeDasharray="5 10" />

          {/* Lines from globe to nodes */}
          {NODES.map(n => {
            const surf = pt(n.angle, GR - 3);
            const node = pt(n.angle, NR);
            return (
              <g key={n.label}>
                <line x1={surf.x} y1={surf.y} x2={node.x} y2={node.y}
                  stroke="rgba(197,160,89,0.25)" strokeWidth="0.9" strokeDasharray="3 6" />
                <circle cx={surf.x} cy={surf.y} r={2.5} fill="rgba(197,160,89,0.6)" />
                <circle cx={node.x} cy={node.y} r={3.5} fill="rgba(197,160,89,0.45)" />
              </g>
            );
          })}
        </svg>

        {/* Shield — center */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <motion.div animate={{ y: [0,-6,0] }} transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}>
            <div style={{
              width: 100, height: 118,
              background: 'linear-gradient(155deg, #182e4e 0%, #0a1628 100%)',
              border: `2px solid ${GOLD}`,
              borderRadius: '50% 50% 42% 42% / 26% 26% 50% 50%',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 32px rgba(197,160,89,0.22), inset 0 1px 0 rgba(197,160,89,0.12)`,
            }}>
              {/* Heart with hands icon */}
              <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
                <path d="M19 30s-2-1.8-5-4.8C10 22 7.5 18.5 7.5 15.5a5.5 5.5 0 0 1 5.5-5.5c2.1 0 4 1.1 5 2.8 1-1.7 2.9-2.8 5-2.8a5.5 5.5 0 0 1 5.5 5.5c0 3-2.5 6.5-6.5 9.7C18 27.5 19 30 19 30z"
                  fill="none" stroke={GOLD} strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M13 25.5c-1.5 1-3 2-3.5 3.5M25 25.5c1.5 1 3 2 3.5 3.5"
                  stroke={GOLD} strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <div style={{ fontSize: 8, fontWeight: 800, color: GOLD, letterSpacing: '0.18em', marginTop: 5, textTransform: 'uppercase' }}>SAFE-T</div>
              <div style={{ fontSize: 6, color: 'rgba(197,160,89,0.50)', letterSpacing: '0.14em', marginTop: 2, textTransform: 'uppercase' }}>4LIFE™</div>
            </div>
          </motion.div>
        </div>

        {/* Destination labels */}
        {NODES.map(n => {
          const p = pt(n.angle, NR + 24);
          const isRight = p.x > CX + 5;
          const isLeft  = p.x < CX - 5;
          return (
            <div key={n.label} style={{
              position: 'absolute',
              left: isRight ? p.x + 6 : 'auto',
              right: isLeft  ? W - p.x + 6 : 'auto',
              top: p.y - 10,
              ...((!isRight && !isLeft) ? { left: p.x - 25, textAlign: 'center' } : {}),
              fontSize: 8.5, fontWeight: 700,
              color: 'rgba(255,255,255,0.62)',
              letterSpacing: '0.13em',
              textTransform: 'uppercase',
              lineHeight: 1.3,
              whiteSpace: 'pre',
              pointerEvents: 'none',
            }}>
              {n.label}
            </div>
          );
        })}
      </div>

      {/* Status card */}
      <AnimatePresence mode="wait">
        <motion.div key={idx}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.5 }}
          style={{
            width: 310,
            background: 'rgba(8,18,35,0.96)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            padding: '14px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              border: `2px solid ${cur.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: cur.color }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, color: cur.color, letterSpacing: '0.04em' }}>{cur.title}</span>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.58)', marginBottom: 8, lineHeight: 1.55 }}>{cur.sub}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: cur.color }} />
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em' }}>{cur.detail}</span>
          </div>
          {/* Dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                height: 6, width: i === idx ? 18 : 6,
                borderRadius: 99, transition: 'all 0.4s',
                background: i === idx ? cur.color : 'rgba(255,255,255,0.15)',
              }} />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}