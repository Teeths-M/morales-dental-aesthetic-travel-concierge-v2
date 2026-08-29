import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MSAFE_PALETTE as C } from '../msafePlusConfig';

// Layered warm-gold hologram platform beneath the robot: three concentric
// translucent gold rings (slow counter-rotating), a soft white/gold bloom,
// a faint reflection, sparse slow gold dust, and a very subtle ambient pulse.
// Respects prefers-reduced-motion (static fallback, no motion).
const PARTICLES = [
  { top: '12%', left: '18%', d: 0, s: 2.5 },
  { top: '8%', left: '68%', d: 0.8, s: 2 },
  { top: '40%', left: '4%', d: 1.4, s: 1.8 },
  { top: '52%', left: '92%', d: 0.4, s: 2.2 },
  { top: '30%', left: '84%', d: 1.1, s: 1.5 },
  { top: '64%', left: '30%', d: 1.8, s: 1.6 },
  { top: '74%', left: '74%', d: 0.6, s: 2 },
  { top: '20%', left: '46%', d: 1.2, s: 1.4 },
];

export default function HologramPlatform({ size = 280 }) {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const w = size;
  const ringDef = [
    { scale: 1.0, opacity: 0.55, dur: 26, dir: 1, color: C.goldDeep },
    { scale: 0.72, opacity: 0.45, dur: 20, dir: -1, color: C.goldMid },
    { scale: 0.46, opacity: 0.7, dur: 14, dir: 1, color: C.goldLight },
  ];

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        bottom: `-${Math.round(size * 0.04)}px`,
        left: '50%',
        transform: 'translateX(-50%)',
        width: w * 1.5,
        height: w * 0.62,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {/* Soft white/gold bloom under the robot */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '78%',
          height: '78%',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.goldLight}cc 0%, ${C.goldMid}55 35%, transparent 72%)`,
          filter: 'blur(14px)',
          opacity: reduced ? 0.5 : undefined,
        }}
        className={!reduced ? 'msafe-bloom' : undefined}
      />

      {/* Faint reflection of the robot */}
      <div
        style={{
          position: 'absolute',
          top: '38%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '34%',
          height: '12%',
          borderRadius: '50%',
          background: `radial-gradient(ellipse, ${C.goldLight}66 0%, transparent 70%)`,
          filter: 'blur(6px)',
          opacity: 0.6,
        }}
      />

      {/* Concentric gold rings — flattened ellipses so rotation reads */}
      <div
        style={{
          position: 'absolute',
          top: '36%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: w,
          height: w * 0.42,
        }}
      >
        {ringDef.map((r, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: `${r.scale * 100}%`,
              height: `${r.scale * 100}%`,
              marginLeft: `-${r.scale * 50}%`,
              marginTop: `-${r.scale * 50}%`,
              borderRadius: '50%',
              border: `1.5px solid ${r.color}`,
              opacity: r.opacity,
              boxShadow: `0 0 18px ${r.color}55, inset 0 0 12px ${r.color}33`,
            }}
          >
            {!reduced && (
              <motion.div
                style={{ position: 'absolute', inset: 0, borderRadius: '50%' }}
                animate={{ rotate: 360 * r.dir }}
                transition={{ duration: r.dur, repeat: Infinity, ease: 'linear' }}
              />
            )}
          </div>
        ))}

        {/* Innermost solid stand ring */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '30%',
            height: '30%',
            marginLeft: '-15%',
            marginTop: '-15%',
            borderRadius: '50%',
            border: `1.5px solid ${C.goldMid}`,
            opacity: 0.5,
          }}
        />
      </div>

      {/* Sparse slow gold dust */}
      {!reduced && PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          style={{
            position: 'absolute',
            top: p.top,
            left: p.left,
            width: p.s,
            height: p.s,
            borderRadius: '50%',
            background: C.goldPlus,
            boxShadow: `0 0 4px ${C.goldPlus}aa`,
          }}
          animate={{ opacity: [0.1, 0.7, 0.1], y: [3, -7, 3] }}
          transition={{ duration: 3 + i * 0.3, repeat: Infinity, ease: 'easeInOut', delay: p.d }}
        />
      ))}

      <style>{`
        .msafe-bloom { animation: msafe-bloom-pulse 5s ease-in-out infinite; }
        @keyframes msafe-bloom-pulse {
          0%, 100% { opacity: 0.55; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.06); }
        }
      `}</style>
    </div>
  );
}