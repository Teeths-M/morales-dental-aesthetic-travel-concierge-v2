import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';

const GOLD = '#C5A059';

const SAFE_T_STATES = [
  {
    color: '#22c55e',
    glow: 'rgba(34,197,94,0.35)',
    title: "You're Protected",
    subtext: 'Your care journey appears compatible.',
    detail: 'Scan complete • All systems safe',
  },
  {
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.32)',
    title: 'Enhanced Review',
    subtext: 'Recovery compatibility may require provider review.',
    detail: 'Scan in progress • Review recommended',
  },
  {
    color: '#f87171',
    glow: 'rgba(248,113,113,0.28)',
    title: 'Provider Review',
    subtext: 'Additional safety review recommended.',
    detail: 'Specialist review • Care plan being tailored',
  },
];

const DESTINATIONS = [
  { name: 'Turkey',      angle: 145, flag: '🇹🇷' },
  { name: 'South Korea', angle:  25, flag: '🇰🇷' },
  { name: 'Thailand',    angle:  65, flag: '🇹🇭' },
  { name: 'Colombia',    angle: -15, flag: '🇨🇴' },
  { name: 'Brazil',      angle: -50, flag: '🇧🇷' },
  { name: 'Mexico',      angle: 175, flag: '🇲🇽' },
  { name: 'Costa Rica',  angle: 200, flag: '🇨🇷' },
];

const DEST_DATA = {
  Turkey:      { procedures: 'Dental implants, veneers, hair restoration', why: 'Advanced specialists and strong value' },
  'South Korea': { procedures: 'Advanced aesthetic & cosmetic care', why: 'Precision-focused aesthetic excellence' },
  Thailand:    { procedures: 'Cosmetic, wellness recovery, dental care', why: 'Hospitality-driven recovery experience' },
  Colombia:    { procedures: 'Cosmetic surgery, dental excellence', why: 'Strong specialist network and premium care access' },
  Brazil:      { procedures: 'Aesthetic & cosmetic procedures', why: 'Recognized global aesthetics culture' },
  Mexico:      { procedures: 'Affordable dental care, implants, veneers', why: 'Convenient access and strong dental value' },
  'Costa Rica': { procedures: 'Dental care, restorative dentistry', why: 'Trusted dental care near nature-focused recovery' },
};

const SIZE = 340;
const CX = SIZE / 2;
const CY = SIZE / 2;
const GLOBE_R = 118;
const NODE_R = 148;

function nodeXY(angleDeg) {
  const r = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + NODE_R * Math.cos(r), y: CY + NODE_R * Math.sin(r) };
}

export default function HeroGlobe() {
  const [stateIdx, setStateIdx] = useState(0);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    const durations = [10000, 13000, 9000];
    const t = setTimeout(() => setStateIdx(p => (p + 1) % 3), durations[stateIdx]);
    return () => clearTimeout(t);
  }, [stateIdx]);

  const cur = SAFE_T_STATES[stateIdx];

  // Latitude lines projected as ellipses
  const latLines = [-60, -30, 0, 30, 60];
  // Longitude lines as vertical ellipses
  const lonAngles = [0, 30, 60, 90, 120, 150];

  return (
    <div className="flex flex-col items-center gap-0">
      {/* SAFE-T Header */}
      <div className="flex flex-col items-center gap-0.5 mb-3">
        <span className="text-xs font-black tracking-[0.28em] uppercase" style={{ color: GOLD }}>
          SAFE-T4LIFE™
        </span>
        <span className="text-[9px] tracking-[0.18em] uppercase text-white/38 font-semibold">
          Safety Intelligence Engine
        </span>
      </div>

      {/* Globe container */}
      <div className="relative select-none" style={{ width: SIZE, height: SIZE }}>
        {/* Ambient glow behind globe */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: '10%',
            background: `radial-gradient(circle, rgba(197,160,89,0.22) 0%, rgba(197,160,89,0.06) 45%, transparent 70%)`,
            filter: 'blur(18px)',
          }}
        />

        {/* SVG: globe + rings + lines */}
        <svg
          className="absolute inset-0"
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{ pointerEvents: 'none' }}
        >
          <defs>
            <clipPath id="globeClip">
              <circle cx={CX} cy={CY} r={GLOBE_R} />
            </clipPath>
            <radialGradient id="globeGrad" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#1a3a5c" />
              <stop offset="45%" stopColor="#0a1628" />
              <stop offset="100%" stopColor="#050d1a" />
            </radialGradient>
            <radialGradient id="shieldGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(197,160,89,0.18)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* Globe base */}
          <circle cx={CX} cy={CY} r={GLOBE_R} fill="url(#globeGrad)" />

          {/* Latitude lines */}
          {latLines.map(lat => {
            const radLat = (lat * Math.PI) / 180;
            const ry = Math.max(2, GLOBE_R * 0.22);
            const ey = CY - GLOBE_R * Math.sin(radLat);
            const ex = GLOBE_R * Math.cos(radLat);
            return (
              <ellipse
                key={`lat${lat}`}
                cx={CX} cy={ey} rx={ex} ry={ry}
                fill="none"
                stroke="rgba(197,160,89,0.13)"
                strokeWidth="0.7"
                clipPath="url(#globeClip)"
              />
            );
          })}

          {/* Longitude lines */}
          {lonAngles.map((a, i) => {
            const rad = (a * Math.PI) / 180;
            const rx = GLOBE_R * Math.abs(Math.sin(rad)) + 1;
            return (
              <ellipse
                key={`lon${i}`}
                cx={CX} cy={CY}
                rx={rx} ry={GLOBE_R}
                fill="none"
                stroke="rgba(197,160,89,0.08)"
                strokeWidth="0.6"
                clipPath="url(#globeClip)"
              />
            );
          })}

          {/* Globe border glow */}
          <circle
            cx={CX} cy={CY} r={GLOBE_R}
            fill="none"
            stroke="rgba(197,160,89,0.32)"
            strokeWidth="1.2"
          />

          {/* Outer orbit ring */}
          <circle
            cx={CX} cy={CY} r={NODE_R + 10}
            fill="none"
            stroke="rgba(197,160,89,0.10)"
            strokeWidth="1"
            strokeDasharray="4 8"
          />

          {/* Connection lines from globe center to nodes */}
          {DESTINATIONS.map(d => {
            const { x, y } = nodeXY(d.angle);
            const isActive = hovered === d.name;
            const gx = CX + (GLOBE_R - 5) * Math.cos(((d.angle - 90) * Math.PI) / 180);
            const gy = CY + (GLOBE_R - 5) * Math.sin(((d.angle - 90) * Math.PI) / 180);
            return (
              <g key={`line${d.name}`}>
                <line
                  x1={gx} y1={gy} x2={x} y2={y}
                  stroke={isActive ? GOLD : 'rgba(197,160,89,0.22)'}
                  strokeWidth={isActive ? 1.5 : 0.8}
                  strokeDasharray={isActive ? 'none' : '3 6'}
                  style={{ transition: 'all 0.3s ease' }}
                />
                {/* Glowing dot on globe surface */}
                <circle cx={gx} cy={gy} r={isActive ? 3.5 : 2.5}
                  fill={isActive ? GOLD : 'rgba(197,160,89,0.6)'}
                  style={{ transition: 'all 0.3s ease' }}
                />
              </g>
            );
          })}
        </svg>

        {/* Shield center — floating */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="relative flex items-center justify-center"
          >
            {/* Breathing pulse ring */}
            <motion.div
              animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute rounded-full"
              style={{
                width: 110, height: 110,
                background: `radial-gradient(circle, ${cur.glow} 0%, transparent 70%)`,
                transition: 'background 2s ease',
              }}
            />
            {/* Shield shape */}
            <div
              className="relative flex flex-col items-center justify-center"
              style={{
                width: 90,
                height: 108,
                background: 'linear-gradient(160deg, rgba(16,34,62,0.98) 0%, rgba(10,22,40,0.96) 100%)',
                border: `2px solid ${cur.color}`,
                borderRadius: '50% 50% 44% 44% / 28% 28% 50% 50%',
                backdropFilter: 'blur(16px)',
                boxShadow: `0 0 40px ${cur.glow}, 0 0 80px rgba(197,160,89,0.08), inset 0 1px 0 rgba(197,160,89,0.12)`,
                transition: 'border-color 2s ease, box-shadow 2s ease',
              }}
            >
              {/* Heart with hands SVG icon */}
              <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
                <path
                  d="M17 28s-2-1.5-5-4.5C8.5 20 6 17 6 14a5 5 0 0 1 5-5c2 0 3.8 1 4.8 2.5h.4C17.2 10 19 9 21 9a5 5 0 0 1 5 5c0 3-2.5 6-6 9.5-3 3-3 4.5-3 4.5z"
                  fill="none"
                  stroke={GOLD}
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 23c-1.5 1-3 2-3.5 3M22 23c1.5 1 3 2 3.5 3"
                  stroke={GOLD}
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
              <span style={{ fontSize: 7, fontWeight: 800, color: GOLD, letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 4 }}>
                SAFE-T
              </span>
              <span style={{ fontSize: 5.5, color: 'rgba(197,160,89,0.55)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 1 }}>
                4LIFE™
              </span>
            </div>
          </motion.div>
        </div>

        {/* Destination node buttons */}
        {DESTINATIONS.map(d => {
          const { x, y } = nodeXY(d.angle);
          const isActive = hovered === d.name;
          // Label offset: push labels outward
          const langle = ((d.angle - 90) * Math.PI) / 180;
          const lx = CX + (NODE_R + 28) * Math.cos(langle);
          const ly = CY + (NODE_R + 28) * Math.sin(langle);
          const labelRight = lx > CX;
          return (
            <React.Fragment key={d.name}>
              <button
                className="absolute transition-all duration-300 focus:outline-none"
                style={{
                  left: x - 13,
                  top: y - 13,
                  width: 26,
                  height: 26,
                  background: isActive ? 'rgba(197,160,89,0.25)' : 'rgba(10,22,40,0.90)',
                  border: `1.5px solid ${isActive ? GOLD : 'rgba(197,160,89,0.45)'}`,
                  borderRadius: '50%',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  boxShadow: isActive ? `0 0 16px rgba(197,160,89,0.45)` : `0 0 6px rgba(197,160,89,0.15)`,
                  zIndex: 10,
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHovered(d.name)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setHovered(hovered === d.name ? null : d.name)}
                aria-label={`Explore ${d.name}`}
              >
                <span style={{ fontSize: 9, fontWeight: 700, color: isActive ? GOLD : 'rgba(197,160,89,0.8)', fontFamily: 'sans-serif' }}>
                  {d.flag}
                </span>
              </button>
              {/* Destination label */}
              <div
                className="absolute pointer-events-none transition-all duration-200"
                style={{
                  left: labelRight ? lx + 4 : lx - 4,
                  top: ly - 7,
                  transform: labelRight ? 'none' : 'translateX(-100%)',
                  fontSize: 8.5,
                  fontWeight: 700,
                  color: isActive ? GOLD : 'rgba(255,255,255,0.52)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.3s ease',
                  zIndex: 8,
                }}
              >
                {d.name.toUpperCase()}
              </div>
            </React.Fragment>
          );
        })}

        {/* Hover card */}
        <AnimatePresence>
          {hovered && DEST_DATA[hovered] && (
            <motion.div
              key={hovered}
              initial={{ opacity: 0, scale: 0.9, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 4 }}
              transition={{ duration: 0.2 }}
              className="absolute z-30 pointer-events-none"
              style={{
                left: '50%',
                bottom: -12,
                transform: 'translateX(-50%)',
                width: 220,
                background: 'rgba(8,18,35,0.97)',
                border: '1px solid rgba(197,160,89,0.45)',
                borderRadius: 12,
                padding: '10px 14px',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
              }}
            >
              <p style={{ fontSize: 10, fontWeight: 700, color: GOLD, marginBottom: 5, letterSpacing: '0.06em' }}>
                {hovered.toUpperCase()}
              </p>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', marginBottom: 3, lineHeight: 1.5 }}>
                <span style={{ color: 'rgba(197,160,89,0.75)', fontWeight: 600 }}>Best for: </span>
                {DEST_DATA[hovered].procedures}
              </p>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                <span style={{ color: 'rgba(197,160,89,0.55)', fontWeight: 600 }}>Why: </span>
                {DEST_DATA[hovered].why}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SAFE-T Status bar */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stateIdx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.7 }}
          className="mt-6 w-full max-w-xs"
          style={{
            background: 'rgba(8,18,35,0.92)',
            border: `1px solid rgba(197,160,89,0.25)`,
            borderRadius: 16,
            padding: '12px 16px',
            backdropFilter: 'blur(14px)',
          }}
        >
          <div className="flex items-center gap-2.5 mb-1.5">
            <div
              className="flex items-center justify-center rounded-full flex-shrink-0"
              style={{ width: 22, height: 22, background: `${cur.glow}`, border: `1.5px solid ${cur.color}` }}
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 rounded-full"
                style={{ background: cur.color }}
              />
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: cur.color, letterSpacing: '0.04em', transition: 'color 1.5s ease' }}>
              {cur.title.toUpperCase()}
            </span>
          </div>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.52)', marginBottom: 6, lineHeight: 1.5 }}>
            {cur.subtext}
          </p>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: cur.color }} />
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>{cur.detail}</span>
          </div>
          {/* Dots */}
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="rounded-full transition-all duration-500"
                style={{
                  width: i === stateIdx ? 16 : 6,
                  height: 6,
                  background: i === stateIdx ? cur.color : 'rgba(255,255,255,0.15)',
                }}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}