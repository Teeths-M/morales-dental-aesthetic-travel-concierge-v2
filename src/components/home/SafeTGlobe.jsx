import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';

const GOLD = '#C5A059';
const NAVY = 'rgba(10,22,40,0.92)';

const SAFE_T_STATES = [
  {
    color: '#22c55e',
    glow: 'rgba(34,197,94,0.32)',
    title: "You're Protected",
    subtext: 'Your safe care journey is fully coordinated.',
    durations: 10000,
  },
  {
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.30)',
    title: 'Enhanced Review',
    subtext: 'Recovery compatibility may require provider review.',
    durations: 12000,
  },
  {
    color: '#f87171',
    glow: 'rgba(248,113,113,0.25)',
    title: 'Provider Review',
    subtext: 'Additional safety review recommended.',
    durations: 9000,
  },
];

const DESTINATIONS = [
  {
    name: 'Turkey',
    angle: -25,
    flag: '🇹🇷',
    procedures: 'Dental implants, veneers, hair restoration',
    why: 'Advanced specialists and strong value',
  },
  {
    name: 'South Korea',
    angle: -65,
    flag: '🇰🇷',
    procedures: 'Advanced aesthetic & cosmetic care',
    why: 'Precision-focused aesthetic excellence',
  },
  {
    name: 'Thailand',
    angle: 10,
    flag: '🇹🇭',
    procedures: 'Cosmetic, wellness recovery, dental care',
    why: 'Hospitality-driven recovery experience',
  },
  {
    name: 'Brazil',
    angle: 95,
    flag: '🇧🇷',
    procedures: 'Aesthetic & cosmetic procedures',
    why: 'Recognized global aesthetics culture',
  },
  {
    name: 'Colombia',
    angle: 140,
    flag: '🇨🇴',
    procedures: 'Cosmetic surgery, dental excellence',
    why: 'Strong specialist network and premium care access',
  },
  {
    name: 'Venezuela',
    flag: '🇻🇪',
    angle: 170,
    procedures: 'Vetted dental care, veneers, restorative care',
    why: 'Selective specialist access and personalized support',
  },
  {
    name: 'Costa Rica',
    angle: 200,
    flag: '🇨🇷',
    procedures: 'Dental care, restorative dentistry',
    why: 'Trusted dental care near nature-focused recovery',
  },
  {
    name: 'Mexico',
    angle: 230,
    flag: '🇲🇽',
    procedures: 'Affordable dental care, implants, veneers',
    why: 'Convenient access and strong dental value',
  },
];

const SIZE = 300;
const CENTER = 150;
const GLOBE_R = 88;
const NODE_R = 116;

export default function SafeTGlobe() {
  const [stateIdx, setStateIdx] = useState(0);
  const [activeNode, setActiveNode] = useState(null);

  useEffect(() => {
    const s = SAFE_T_STATES[stateIdx];
    const t = setTimeout(() => setStateIdx(p => (p + 1) % SAFE_T_STATES.length), s.durations);
    return () => clearTimeout(t);
  }, [stateIdx]);

  const current = SAFE_T_STATES[stateIdx];

  const nodePos = (angleDeg) => {
    const r = ((angleDeg - 90) * Math.PI) / 180;
    return { x: CENTER + NODE_R * Math.cos(r), y: CENTER + NODE_R * Math.sin(r) };
  };

  const cardPos = (angleDeg) => {
    const { x, y } = nodePos(angleDeg);
    const isRight = x > CENTER;
    const isBottom = y > CENTER + 20;
    const cardW = 174;
    const cardH = 98;
    let cx = isRight ? x - cardW - 14 : x + 14;
    let cy = isBottom ? y - cardH - 6 : y + 6;
    cx = Math.max(4, Math.min(cx, SIZE - cardW - 4));
    cy = Math.max(4, Math.min(cy, SIZE - cardH - 4));
    return { cx, cy };
  };

  const latLines = [-60, -30, 0, 30, 60];
  const lonAngles = [0, 36, 72, 108, 144];

  const activeDest = DESTINATIONS.find(d => d.name === activeNode);

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        {/* Ambient glow */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, ${current.glow} 0%, transparent 62%)`,
            filter: 'blur(22px)',
            transition: 'background 2.5s ease',
          }}
        />

        {/* Globe SVG */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
        >
          <defs>
            <clipPath id="gc">
              <circle cx={CENTER} cy={CENTER} r={GLOBE_R} />
            </clipPath>
          </defs>
          {/* Globe fill */}
          <circle cx={CENTER} cy={CENTER} r={GLOBE_R}
            fill="rgba(10,22,40,0.80)"
            stroke="rgba(197,160,89,0.28)"
            strokeWidth="1"
          />
          {/* Latitude ellipses */}
          {latLines.map(lat => {
            const lr = (lat * Math.PI) / 180;
            const ry = GLOBE_R * 0.28;
            const ey = CENTER - GLOBE_R * Math.sin(lr);
            const ex = GLOBE_R * Math.cos(lr);
            return (
              <ellipse key={`lat${lat}`} cx={CENTER} cy={ey} rx={ex} ry={ry}
                fill="none" stroke="rgba(197,160,89,0.11)" strokeWidth="0.7" clipPath="url(#gc)" />
            );
          })}
          {/* Longitude ellipses */}
          {lonAngles.map(a => {
            const ar = (a * Math.PI) / 180;
            return (
              <ellipse key={`lon${a}`} cx={CENTER} cy={CENTER}
                rx={GLOBE_R * Math.abs(Math.sin(ar)) + 0.1}
                ry={GLOBE_R}
                fill="none" stroke="rgba(197,160,89,0.07)" strokeWidth="0.6" clipPath="url(#gc)" />
            );
          })}
          {/* Outer orbit ring */}
          <circle cx={CENTER} cy={CENTER} r={NODE_R + 14}
            fill="none" stroke="rgba(197,160,89,0.16)" strokeWidth="1" strokeDasharray="5 9" />
          <circle cx={CENTER} cy={CENTER} r={NODE_R - 8}
            fill="none" stroke="rgba(197,160,89,0.07)" strokeWidth="0.6" />
          {/* Route lines to nodes */}
          {DESTINATIONS.map(d => {
            const { x, y } = nodePos(d.angle);
            const isActive = activeNode === d.name;
            return (
              <line key={`l${d.name}`}
                x1={CENTER} y1={CENTER} x2={x} y2={y}
                stroke={isActive ? GOLD : 'rgba(197,160,89,0.09)'}
                strokeWidth={isActive ? 1.5 : 0.6}
                strokeDasharray="3 5"
                style={{ transition: 'all 0.4s ease' }}
              />
            );
          })}
        </svg>

        {/* Center Shield */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            className="relative flex items-center justify-center"
            style={{ width: 80, height: 80 }}
          >
            {/* Pulse */}
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle, ${current.glow} 0%, transparent 70%)`,
                transition: 'background 2.5s ease',
              }}
            />
            {/* Shield shape */}
            <div
              className="relative flex flex-col items-center justify-center gap-0.5"
              style={{
                width: 60,
                height: 70,
                background: 'linear-gradient(150deg, rgba(10,22,40,0.97) 0%, rgba(16,32,60,0.94) 100%)',
                border: `1.5px solid ${current.color}`,
                borderRadius: '48% 48% 38% 38% / 28% 28% 48% 48%',
                backdropFilter: 'blur(14px)',
                boxShadow: `0 0 28px ${current.glow}, inset 0 0 14px rgba(197,160,89,0.06)`,
                transition: 'border-color 2.5s ease, box-shadow 2.5s ease',
              }}
            >
              <Shield style={{ color: current.color, width: 17, height: 17, transition: 'color 2.5s ease' }} />
              <span style={{ fontSize: 6.5, fontWeight: 800, color: GOLD, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                SAFE-T
              </span>
              <span style={{ fontSize: 5, color: 'rgba(197,160,89,0.6)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                4LIFE™
              </span>
            </div>
          </motion.div>
        </div>

        {/* Destination Nodes */}
        {DESTINATIONS.map(d => {
          const { x, y } = nodePos(d.angle);
          const isActive = activeNode === d.name;
          return (
            <button
              key={d.name}
              className="absolute transition-all duration-300"
              style={{
                left: x - 15,
                top: y - 15,
                width: 30,
                height: 30,
                background: isActive ? 'rgba(197,160,89,0.22)' : 'rgba(10,22,40,0.88)',
                border: `1px solid ${isActive ? GOLD : 'rgba(197,160,89,0.38)'}`,
                borderRadius: '50%',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                boxShadow: isActive ? `0 0 14px rgba(197,160,89,0.4)` : 'none',
                zIndex: 10,
                cursor: 'pointer',
              }}
              onClick={() => setActiveNode(isActive ? null : d.name)}
              onMouseEnter={() => setActiveNode(d.name)}
              onMouseLeave={() => setActiveNode(null)}
              aria-label={`Explore ${d.name}`}
            >
              {d.flag}
            </button>
          );
        })}

        {/* Destination Hover Card */}
        <AnimatePresence>
          {activeDest && (() => {
            const { cx, cy } = cardPos(activeDest.angle);
            return (
              <motion.div
                key={activeDest.name}
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={{ duration: 0.22 }}
                className="absolute z-20 pointer-events-none"
                style={{
                  left: cx,
                  top: cy,
                  width: 174,
                  background: 'rgba(8,18,35,0.97)',
                  border: '1px solid rgba(197,160,89,0.48)',
                  borderRadius: 12,
                  padding: '10px 12px',
                  backdropFilter: 'blur(18px)',
                  boxShadow: '0 12px 36px rgba(0,0,0,0.55)',
                }}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span style={{ fontSize: 14 }}>{activeDest.flag}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: '0.04em' }}>
                    {activeDest.name}
                  </span>
                </div>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.52)', marginBottom: 4, lineHeight: 1.5 }}>
                  <span style={{ color: 'rgba(197,160,89,0.82)', fontWeight: 600 }}>Procedures: </span>
                  {activeDest.procedures}
                </p>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.42)', lineHeight: 1.5 }}>
                  <span style={{ color: 'rgba(197,160,89,0.6)', fontWeight: 600 }}>Why: </span>
                  {activeDest.why}
                </p>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>

      {/* SAFE-T State Pill */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stateIdx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center gap-1 text-center"
        >
          <div
            className="flex items-center gap-2 rounded-full px-3.5 py-1.5"
            style={{
              background: 'rgba(10,22,40,0.92)',
              border: `1px solid ${current.glow}`,
              backdropFilter: 'blur(10px)',
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: current.color, boxShadow: `0 0 6px ${current.color}` }}
            />
            <span style={{ fontSize: 10.5, fontWeight: 700, color: current.color, letterSpacing: '0.08em', transition: 'color 2.5s ease' }}>
              {current.title}
            </span>
          </div>
          <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.42)', maxWidth: 210 }}>
            {current.subtext}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}