import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GOLD = '#C5A059';
const GOLD_DIM = 'rgba(197,160,89,0.55)';

const SAFE_T_STATES = [
  { color: '#22c55e', glow: 'rgba(34,197,94,0.4)', title: "YOU'RE PROTECTED", sub: 'Your care journey appears compatible.', detail: 'Scan complete • All systems safe' },
  { color: '#f59e0b', glow: 'rgba(245,158,11,0.35)', title: 'ENHANCED REVIEW', sub: 'Recovery compatibility may require provider review.', detail: 'Review in progress • Care plan being tailored' },
  { color: '#f87171', glow: 'rgba(248,113,113,0.30)', title: 'PROVIDER REVIEW', sub: 'Additional safety review recommended.', detail: 'Specialist review • Personalised plan in progress' },
];

const DESTINATIONS = [
  { name: 'TURKEY',      angleDeg: 150 },
  { name: 'SOUTH\nKOREA', angleDeg: 30  },
  { name: 'THAILAND',    angleDeg: 65  },
  { name: 'COLOMBIA',    angleDeg: -15 },
  { name: 'BRAZIL',      angleDeg: -55 },
  { name: 'MEXICO',      angleDeg: 178 },
  { name: 'COSTA\nRICA', angleDeg: 210 },
];

const W = 420, H = 420, CX = W / 2, CY = H / 2;
const GLOBE_R = 145;
const NODE_R  = 178;

function polar(angleDeg, r = NODE_R) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

export default function HeroGlobe() {
  const [idx, setIdx] = useState(0);
  const [hovered, setHovered] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setIdx(p => (p + 1) % 3), 9000);
    return () => clearInterval(timerRef.current);
  }, []);

  const cur = SAFE_T_STATES[idx];

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* SAFE-T header */}
      <div className="text-center">
        <p className="text-xs font-black tracking-[0.3em] uppercase" style={{ color: GOLD }}>SAFE-T4LIFE™</p>
        <p className="text-[9px] tracking-[0.18em] uppercase font-semibold" style={{ color: 'rgba(197,160,89,0.42)' }}>Safety Intelligence Engine</p>
      </div>

      {/* Globe SVG */}
      <div className="relative" style={{ width: W, height: H }}>
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(circle at 50% 50%, rgba(197,160,89,0.18) 0%, rgba(197,160,89,0.06) 40%, transparent 68%)`,
          filter: 'blur(20px)',
        }} />

        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <clipPath id="gc2"><circle cx={CX} cy={CY} r={GLOBE_R} /></clipPath>
            <radialGradient id="gg2" cx="38%" cy="32%" r="70%">
              <stop offset="0%" stopColor="#1c3a5e" />
              <stop offset="50%" stopColor="#0b1e3a" />
              <stop offset="100%" stopColor="#050e1c" />
            </radialGradient>
            <filter id="glow2" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Globe fill */}
          <circle cx={CX} cy={CY} r={GLOBE_R} fill="url(#gg2)" />

          {/* Latitude ellipses */}
          {[-60,-30,0,30,60].map(lat => {
            const radLat = (lat * Math.PI) / 180;
            const ey = CY - GLOBE_R * Math.sin(radLat);
            const ex = GLOBE_R * Math.cos(radLat);
            const ry = Math.max(3, GLOBE_R * 0.19);
            return <ellipse key={`lat${lat}`} cx={CX} cy={ey} rx={Math.max(0,ex)} ry={ry} fill="none" stroke="rgba(197,160,89,0.15)" strokeWidth="0.6" clipPath="url(#gc2)" />;
          })}

          {/* Longitude ellipses */}
          {[0,30,60,90,120,150].map((a,i) => {
            const rad = (a * Math.PI) / 180;
            const rx = GLOBE_R * Math.abs(Math.sin(rad)) + 0.5;
            return <ellipse key={`lon${i}`} cx={CX} cy={CY} rx={rx} ry={GLOBE_R} fill="none" stroke="rgba(197,160,89,0.09)" strokeWidth="0.5" clipPath="url(#gc2)" />;
          })}

          {/* Globe edge glow */}
          <circle cx={CX} cy={CY} r={GLOBE_R} fill="none" stroke="rgba(197,160,89,0.38)" strokeWidth="1.5" />
          <circle cx={CX} cy={CY} r={GLOBE_R - 2} fill="none" stroke="rgba(197,160,89,0.08)" strokeWidth="4" />

          {/* Outer dashed ring */}
          <circle cx={CX} cy={CY} r={NODE_R + 16} fill="none" stroke="rgba(197,160,89,0.12)" strokeWidth="1" strokeDasharray="4 9" />

          {/* Lines + surface dots */}
          {DESTINATIONS.map(d => {
            const { x, y } = polar(d.angleDeg, NODE_R);
            const surf = polar(d.angleDeg, GLOBE_R - 4);
            const isHov = hovered === d.name;
            return (
              <g key={`ll${d.name}`}>
                <line x1={surf.x} y1={surf.y} x2={x} y2={y}
                  stroke={isHov ? GOLD : 'rgba(197,160,89,0.28)'}
                  strokeWidth={isHov ? 1.8 : 0.9}
                  strokeDasharray={isHov ? 'none' : '3 7'}
                  style={{ transition: 'all 0.35s' }}
                />
                <circle cx={surf.x} cy={surf.y} r={isHov ? 4 : 2.8}
                  fill={isHov ? GOLD : 'rgba(197,160,89,0.65)'}
                  filter={isHov ? 'url(#glow2)' : 'none'}
                  style={{ transition: 'all 0.35s' }}
                />
                {/* Outer node dot */}
                <circle cx={x} cy={y} r={isHov ? 5 : 3.5}
                  fill={isHov ? GOLD : 'rgba(197,160,89,0.5)'}
                  filter={isHov ? 'url(#glow2)' : 'none'}
                  style={{ transition: 'all 0.35s' }}
                />
              </g>
            );
          })}
        </svg>

        {/* Shield center (floating) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div animate={{ y: [0, -7, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }} className="relative flex items-center justify-center">
            {/* Pulse */}
            <motion.div animate={{ scale: [1, 1.7, 1], opacity: [0.45, 0, 0.45] }} transition={{ duration: 3.2, repeat: Infinity }}
              style={{ position: 'absolute', width: 130, height: 130, borderRadius: '50%', background: `radial-gradient(circle, ${cur.glow} 0%, transparent 70%)`, transition: 'background 2s' }} />
            {/* Shield */}
            <div className="relative flex flex-col items-center justify-center" style={{
              width: 110, height: 130,
              background: 'linear-gradient(155deg, rgba(20,42,74,0.98) 0%, rgba(10,22,40,0.96) 100%)',
              border: `2px solid ${cur.color}`,
              borderRadius: '50% 50% 44% 44% / 26% 26% 52% 52%',
              backdropFilter: 'blur(18px)',
              boxShadow: `0 0 50px ${cur.glow}, 0 0 100px rgba(197,160,89,0.07), inset 0 1px 0 rgba(197,160,89,0.15)`,
              transition: 'border-color 2s, box-shadow 2s',
            }}>
              {/* Heart/hands SVG */}
              <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
                <path d="M21 34s-2.5-2-6-5.5C10 24 7 20.5 7 17a6 6 0 0 1 6-6c2.4 0 4.5 1.2 5.7 3h.6C20.5 12.2 22.6 11 25 11a6 6 0 0 1 6 6c0 3.5-3 7-8 11.5-3.5 3.5-2 5.5-2 5.5z"
                  fill="none" stroke={GOLD} strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M14 28.5c-2 1.5-3.5 2.5-4 4M28 28.5c2 1.5 3.5 2.5 4 4"
                  stroke={GOLD} strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <span style={{ fontSize: 8.5, fontWeight: 800, color: GOLD, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 5 }}>SAFE-T</span>
              <span style={{ fontSize: 6.5, color: 'rgba(197,160,89,0.55)', letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 2 }}>4LIFE™</span>
            </div>
          </motion.div>
        </div>

        {/* Destination labels + invisible hit zones */}
        {DESTINATIONS.map(d => {
          const { x, y } = polar(d.angleDeg, NODE_R + 26);
          const isRight = x > CX + 10;
          const isLeft  = x < CX - 10;
          const isHov   = hovered === d.name;
          const lines   = d.name.split('\n');
          return (
            <button key={d.name}
              className="absolute focus:outline-none"
              style={{
                left: isRight ? x + 4 : isLeft ? 'auto' : x - 30,
                right: isLeft ? W - x + 4 : 'auto',
                top: y - 10,
                transform: 'none',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 4px',
                zIndex: 20,
              }}
              onMouseEnter={() => setHovered(d.name)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setHovered(hovered === d.name ? null : d.name)}
              aria-label={`Explore ${d.name.replace('\n', ' ')}`}
            >
              {lines.map((l, li) => (
                <div key={li} style={{
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: '0.14em',
                  color: isHov ? GOLD : 'rgba(255,255,255,0.60)',
                  lineHeight: 1.3,
                  textAlign: isRight ? 'left' : 'right',
                  transition: 'color 0.3s',
                  whiteSpace: 'nowrap',
                  textTransform: 'uppercase',
                }}>{l}</div>
              ))}
            </button>
          );
        })}
      </div>

      {/* SAFE-T status card */}
      <AnimatePresence mode="wait">
        <motion.div key={idx}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.65 }}
          style={{
            width: '100%', maxWidth: 320,
            background: 'rgba(8,18,35,0.95)',
            border: '1px solid rgba(197,160,89,0.22)',
            borderRadius: 16,
            padding: '14px 18px',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          }}
        >
          <div className="flex items-center gap-2.5 mb-2">
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${cur.glow}`, border: `1.5px solid ${cur.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <motion.div animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 1.8, repeat: Infinity }}
                style={{ width: 10, height: 10, borderRadius: '50%', background: cur.color }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, color: cur.color, letterSpacing: '0.05em', transition: 'color 1.5s' }}>{cur.title}</span>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 8, lineHeight: 1.55 }}>{cur.sub}</p>
          <div className="flex items-center gap-1.5 mb-3">
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: cur.color }} />
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em' }}>{cur.detail}</span>
          </div>
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2">
            {[0,1,2].map(i => (
              <div key={i} style={{
                height: 6, width: i === idx ? 18 : 6, borderRadius: 9999,
                background: i === idx ? cur.color : 'rgba(255,255,255,0.15)',
                transition: 'all 0.5s',
              }} />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}