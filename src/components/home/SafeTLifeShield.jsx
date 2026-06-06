import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GOLD = '#C9A84C';

// Pre-computed stable particle data
const PARTICLES = [
  { id: 0, angle: 18,  r: 108, s: 2.5, dur: 18, delay: 0.0 },
  { id: 1, angle: 58,  r: 124, s: 2.0, dur: 22, delay: 1.3 },
  { id: 2, angle: 98,  r: 100, s: 3.0, dur: 15, delay: 2.7 },
  { id: 3, angle: 145, r: 132, s: 2.0, dur: 20, delay: 0.9 },
  { id: 4, angle: 195, r: 112, s: 2.5, dur: 17, delay: 3.4 },
  { id: 5, angle: 245, r: 122, s: 2.0, dur: 23, delay: 1.8 },
  { id: 6, angle: 295, r: 102, s: 3.0, dur: 16, delay: 4.1 },
  { id: 7, angle: 345, r: 118, s: 2.0, dur: 21, delay: 2.1 },
].map(p => ({
  ...p,
  x: Math.round(p.r * Math.cos(p.angle * Math.PI / 180)),
  y: Math.round(p.r * Math.sin(p.angle * Math.PI / 180) * 0.38),
}));

const STATES = [
  {
    id: 'green',
    color: '#34D399',
    glow: 'rgba(52,211,153,0.42)',
    label: 'Protected',
    sub: 'Your care journey appears compatible.',
  },
  {
    id: 'yellow',
    color: '#FBBF24',
    glow: 'rgba(251,191,36,0.36)',
    label: 'Enhanced Review',
    sub: 'Recovery compatibility may require provider review.',
  },
  {
    id: 'red',
    color: '#FCA5A5',
    glow: 'rgba(252,165,165,0.30)',
    label: 'Provider Review Required',
    sub: 'Additional safety review recommended.',
  },
];

// Weighted pool: green ~60%, yellow ~25%, red ~15%
const STATE_POOL = [
  ...Array(12).fill(0),
  ...Array(5).fill(1),
  ...Array(3).fill(2),
];

export default function SafeTLifeShield() {
  const [phase, setPhase] = useState('idle'); // idle | scanning | revealed
  const [stateIdx, setStateIdx] = useState(null);

  const state = stateIdx !== null ? STATES[stateIdx] : null;
  const accentColor = state?.color || GOLD;
  const glowColor   = state?.glow   || 'rgba(201,168,76,0.22)';

  useEffect(() => {
    let t;
    const run = () => {
      t = setTimeout(() => {
        setPhase('scanning');
        setTimeout(() => {
          const idx = STATE_POOL[Math.floor(Math.random() * STATE_POOL.length)];
          setStateIdx(idx);
          setPhase('revealed');
          setTimeout(() => {
            setPhase('idle');
            setStateIdx(null);
            run();
          }, 5200);
        }, 2400);
      }, 9000 + Math.random() * 6000);
    };
    run();
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {/* CSS Animations — GPU-accelerated */}
      <style>{`
        @keyframes safe-orbit-a {
          from { transform: perspective(600px) rotateX(74deg) rotateZ(0deg); }
          to   { transform: perspective(600px) rotateX(74deg) rotateZ(360deg); }
        }
        @keyframes safe-orbit-b {
          from { transform: perspective(600px) rotateX(56deg) rotateZ(0deg); }
          to   { transform: perspective(600px) rotateX(56deg) rotateZ(-360deg); }
        }
        @keyframes safe-orbit-c {
          from { transform: perspective(600px) rotateX(82deg) rotateZ(90deg); }
          to   { transform: perspective(600px) rotateX(82deg) rotateZ(450deg); }
        }
        @keyframes safe-float {
          0%,100% { transform: translateY(0px); }
          50%     { transform: translateY(-16px); }
        }
        @keyframes safe-breathe {
          0%,100% { opacity: 0.65; transform: scale(1); }
          50%     { opacity: 1;    transform: scale(1.12); }
        }
        @keyframes safe-pulse-dot {
          0%,100% { transform: scale(1); opacity: 0.9; }
          50%     { transform: scale(1.5); opacity: 0.4; }
        }
        .safe-orbit-a { animation: safe-orbit-a 16s linear infinite; }
        .safe-orbit-b { animation: safe-orbit-b 26s linear infinite; }
        .safe-orbit-c { animation: safe-orbit-c 20s linear infinite; }
        .safe-float   { animation: safe-float 7s ease-in-out infinite; }
        .safe-breathe { animation: safe-breathe 4.5s ease-in-out infinite; }
        .safe-scan    { animation: safe-orbit-a 5s linear infinite; }
      `}</style>

      <div
        className="relative select-none pointer-events-none"
        style={{ width: 300, height: 360 }}
        aria-hidden="true"
      >
        {/* Ambient radial glow — color-reactive */}
        <div
          className="absolute rounded-full safe-breathe"
          style={{
            width: 230, height: 230,
            top: 32, left: 35,
            background: `radial-gradient(ellipse at center, ${glowColor} 0%, transparent 68%)`,
            filter: 'blur(28px)',
            transition: 'background 1.4s ease',
          }}
        />

        {/* Orbit ring A — tight, steep angle */}
        <div
          className={`absolute rounded-full ${phase === 'scanning' ? 'safe-scan' : 'safe-orbit-a'}`}
          style={{
            width: 210, height: 210,
            top: 45, left: 45,
            border: `1px solid rgba(201,168,76,0.22)`,
            boxShadow: `0 0 8px rgba(201,168,76,0.08)`,
            transition: 'border-color 1.2s ease',
          }}
        />

        {/* Orbit ring B — wide, shallow angle */}
        <div
          className={`absolute rounded-full ${phase === 'scanning' ? 'safe-scan' : 'safe-orbit-b'}`}
          style={{
            width: 256, height: 256,
            top: 22, left: 22,
            border: `1px solid rgba(201,168,76,0.14)`,
            transition: 'border-color 1.2s ease',
          }}
        />

        {/* Orbit ring C — near horizontal, subtle */}
        <div
          className="absolute rounded-full safe-orbit-c"
          style={{
            width: 186, height: 186,
            top: 57, left: 57,
            border: `1px solid rgba(201,168,76,0.10)`,
          }}
        />

        {/* Ambient particles */}
        {PARTICLES.map(p => (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              width: p.s,
              height: p.s,
              top: 150,
              left: 150,
              marginTop: -p.s / 2,
              marginLeft: -p.s / 2,
              background: accentColor,
              boxShadow: `0 0 ${p.s * 2.5}px ${accentColor}`,
              willChange: 'transform, opacity',
              transition: 'background 1.2s ease, box-shadow 1.2s ease',
            }}
            animate={{
              x: [p.x, p.x + 7, p.x - 4, p.x],
              y: [p.y, p.y - 12, p.y + 6, p.y],
              opacity: [0.25, 0.62, 0.25],
            }}
            transition={{
              duration: p.dur,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: p.delay,
            }}
          />
        ))}

        {/* Shield body — floating */}
        <div
          className="absolute safe-float"
          style={{ top: 62, left: 85 }}
        >
          <div
            style={{
              width: 130,
              height: 158,
              clipPath: 'polygon(50% 0%, 100% 14%, 100% 62%, 76% 87%, 50% 100%, 24% 87%, 0% 62%, 0% 14%)',
              background: 'linear-gradient(155deg, rgba(8,16,48,0.92) 0%, rgba(4,10,32,0.96) 100%)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              boxShadow: `0 0 32px ${glowColor}, 0 0 64px ${glowColor}50, inset 0 1px 0 rgba(201,168,76,0.18)`,
              transition: 'box-shadow 1.4s ease',
            }}
          >
            {/* Top sheen */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '48%',
              background: 'linear-gradient(180deg, rgba(201,168,76,0.11) 0%, transparent 100%)',
              pointerEvents: 'none',
            }} />

            {/* Top edge glow line */}
            <div style={{
              position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
              background: `linear-gradient(90deg, transparent, ${accentColor}80, transparent)`,
              transition: 'background 1.2s ease',
            }} />

            {/* Scanning sweep */}
            <AnimatePresence>
              {phase === 'scanning' && (
                <motion.div
                  initial={{ top: '-4%' }}
                  animate={{ top: '108%' }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2.2, ease: 'linear' }}
                  style={{
                    position: 'absolute', left: 0, right: 0, height: 2,
                    background: `linear-gradient(90deg, transparent, ${GOLD}cc, transparent)`,
                    boxShadow: `0 0 12px ${GOLD}, 0 -4px 16px ${GOLD}40`,
                    pointerEvents: 'none',
                  }}
                />
              )}
            </AnimatePresence>

            {/* Shield SVG icon */}
            <motion.div
              animate={
                phase === 'revealed' && state
                  ? { scale: [1, 1.18, 1] }
                  : { scale: 1 }
              }
              transition={{ duration: 0.9, ease: 'easeOut' }}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                style={{
                  filter: `drop-shadow(0 0 9px ${accentColor}cc)`,
                  transition: 'filter 1.2s ease',
                }}
              >
                <path
                  d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V6L12 2Z"
                  fill={`${accentColor}1a`}
                  stroke={accentColor}
                  strokeWidth="1.4"
                  style={{ transition: 'stroke 1.2s ease, fill 1.2s ease' }}
                />
                <motion.path
                  d="M9 12l2 2 4-4"
                  stroke={accentColor}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ transition: 'stroke 1.2s ease' }}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: phase === 'scanning' ? 0 : 1 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </svg>
            </motion.div>

            {/* Brand text */}
            <div style={{ textAlign: 'center', lineHeight: 1 }}>
              <div style={{
                fontSize: 8.5,
                fontWeight: 800,
                letterSpacing: '0.20em',
                color: GOLD,
                textTransform: 'uppercase',
                textShadow: `0 0 10px ${GOLD}aa`,
              }}>
                SAFE‑T
              </div>
              <div style={{
                fontSize: 6.5,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'rgba(201,168,76,0.6)',
                marginTop: 1,
              }}>
                4LIFE™
              </div>
            </div>
          </div>
        </div>

        {/* Status label area */}
        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.p
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              style={{
                position: 'absolute',
                bottom: 14,
                left: 0, right: 0,
                textAlign: 'center',
                fontSize: 9,
                letterSpacing: '0.22em',
                color: 'rgba(201,168,76,0.42)',
                textTransform: 'uppercase',
              }}
            >
              Intelligence Active
            </motion.p>
          )}

          {phase === 'scanning' && (
            <motion.p
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.5, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                bottom: 14,
                left: 0, right: 0,
                textAlign: 'center',
                fontSize: 9,
                letterSpacing: '0.22em',
                color: GOLD,
                textTransform: 'uppercase',
              }}
            >
              Scanning…
            </motion.p>
          )}

          {phase === 'revealed' && state && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: 'absolute',
                bottom: 6,
                left: 12, right: 12,
              }}
            >
              <div style={{
                background: 'rgba(5,12,35,0.82)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: 11,
                border: `1px solid ${state.color}2a`,
                padding: '9px 13px',
                boxShadow: `0 0 20px ${state.glow}, 0 4px 24px rgba(0,0,0,0.4)`,
                textAlign: 'center',
              }}>
                {/* Indicator dot */}
                <div style={{
                  width: 6, height: 6,
                  borderRadius: '50%',
                  background: state.color,
                  boxShadow: `0 0 8px ${state.color}`,
                  margin: '0 auto 5px',
                  animation: 'safe-pulse-dot 2s ease-in-out infinite',
                }} />
                <p style={{
                  color: state.color,
                  fontSize: 11.5,
                  fontWeight: 700,
                  margin: 0,
                  lineHeight: 1.25,
                  letterSpacing: '0.03em',
                }}>
                  {state.label}
                </p>
                <p style={{
                  color: 'rgba(255,255,255,0.52)',
                  fontSize: 9.5,
                  margin: '4px 0 0',
                  lineHeight: 1.5,
                }}>
                  {state.sub}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}