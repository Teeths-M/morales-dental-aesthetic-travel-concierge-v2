import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Plane, HeartPulse, UserCheck, Building2, Stethoscope } from 'lucide-react';

const ORBIT_R = 138;
const INNER_R = 82;
const CENTER = 185;
const SIZE = 370;

const NODES = [
  { icon: Plane,        label: 'Travel'   },
  { icon: Shield,       label: 'Safe-T'   },
  { icon: Stethoscope,  label: 'Doctor'   },
  { icon: HeartPulse,   label: 'Recovery' },
  { icon: Building2,    label: 'Hotel'    },
  { icon: UserCheck,    label: 'Patient'  },
];

const GOLD  = '#C5A059';
const DARK  = 'rgba(7,15,11,0.82)';

export default function SentinelOrbit() {
  return (
    <div className="relative select-none" style={{ width: SIZE, height: SIZE }}>
      {/* Ambient glow */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(197,160,89,0.18) 0%, transparent 68%)',
          filter: 'blur(28px)',
        }}
      />

      {/* Static SVG rings */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={SIZE} height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
      >
        {/* Outer dashed orbit ring */}
        <circle
          cx={CENTER} cy={CENTER} r={ORBIT_R}
          fill="none"
          stroke="rgba(197,160,89,0.38)"
          strokeWidth="1.5"
          strokeDasharray="6 10"
        />
        {/* Inner decorative ring */}
        <circle
          cx={CENTER} cy={CENTER} r={INNER_R}
          fill="none"
          stroke="rgba(197,160,89,0.16)"
          strokeWidth="1"
        />
      </svg>

      {/* Rotating group — nodes orbit the center */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 55, repeat: Infinity, ease: 'linear' }}
      >
        {NODES.map((node, i) => {
          const angle = (i / NODES.length) * 2 * Math.PI - Math.PI / 2;
          const x = CENTER + ORBIT_R * Math.cos(angle);
          const y = CENTER + ORBIT_R * Math.sin(angle);
          const Icon = node.icon;
          return (
            <motion.div
              key={node.label}
              className="absolute"
              style={{ left: x - 26, top: y - 26 }}
              animate={{ rotate: -360 }}
              transition={{ duration: 55, repeat: Infinity, ease: 'linear' }}
            >
              <div
                className="w-[52px] h-[52px] rounded-full flex flex-col items-center justify-center"
                style={{
                  background: DARK,
                  border: `1px solid rgba(197,160,89,0.55)`,
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 0 16px rgba(197,160,89,0.22)',
                }}
              >
                <Icon style={{ color: GOLD, width: 16, height: 16 }} />
                <span style={{ fontSize: 7, color: 'rgba(197,160,89,0.85)', marginTop: 3, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {node.label}
                </span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Center badge — stays upright */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="flex flex-col items-center justify-center rounded-full"
          style={{
            width: 122,
            height: 122,
            background: DARK,
            border: `2px solid rgba(197,160,89,0.42)`,
            backdropFilter: 'blur(14px)',
            boxShadow: '0 0 48px rgba(197,160,89,0.18)',
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: '0.28em', textTransform: 'uppercase' }}>IQ</span>
          <span className="font-display" style={{ fontSize: 40, fontWeight: 700, color: '#ffffff', lineHeight: 1 }}>200</span>
          <span style={{ fontSize: 8, color: 'rgba(197,160,89,0.6)', letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: 3 }}>Engine</span>
        </motion.div>
      </div>

      {/* SAFE-T pill at bottom */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.2 }}
        className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full px-4 py-1.5"
        style={{
          bottom: 14,
          background: DARK,
          border: `1px solid rgba(197,160,89,0.32)`,
          backdropFilter: 'blur(8px)',
        }}
      >
        <Shield style={{ color: GOLD, width: 9, height: 9 }} />
        <span style={{ fontSize: 9, color: GOLD, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          SAFE-T 4LIFE™
        </span>
      </motion.div>
    </div>
  );
}