/**
 * VaultGraphic — animated vault scene for the "Secure & Confidential" brand slide.
 * Pure CSS + Framer Motion — no external images needed.
 * Vault door open, neon blue+gold glow, glowing documents floating in.
 */
import React from 'react';
import { motion } from 'framer-motion';

const GOLD  = '#D4AF37';
const BLUE  = '#3B82F6';
const NEON  = '#60A5FA';

/* ── Tiny document card ── */
function FloatingDoc({ delay, x, docType }) {
  const ICONS = { passport: '🛂', record: '🩺', consent: '📋' };
  return (
    <motion.div
      initial={{ y: 90, opacity: 0, scale: 0.8 }}
      animate={{ y: [-10, -80, -110], opacity: [0, 1, 0], scale: [0.85, 1, 0.6] }}
      transition={{ duration: 2.8, delay, repeat: Infinity, repeatDelay: 1.4, ease: 'easeInOut' }}
      style={{
        position:     'absolute',
        bottom:       '18%',
        left:         `calc(50% + ${x}px)`,
        width:        52,
        height:       68,
        borderRadius: 8,
        background:   'linear-gradient(160deg, #0a1628 0%, #0e2040 100%)',
        border:       `1.5px solid ${GOLD}80`,
        boxShadow:    `0 0 12px ${BLUE}60, 0 0 24px ${BLUE}30`,
        display:      'flex',
        flexDirection:'column',
        alignItems:   'center',
        justifyContent: 'center',
        gap:          4,
        overflow:     'hidden',
      }}
    >
      {/* Glow line top */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, transparent, ${GOLD}, transparent)` }} />
      {/* Icon */}
      <span style={{ fontSize: 18 }}>{ICONS[docType]}</span>
      {/* Lines suggesting content */}
      {[0,1,2].map(i => (
        <div key={i} style={{ width: 30 - i*4, height: 2, borderRadius: 2, background: `${NEON}${['80','55','35'][i]}` }} />
      ))}
    </motion.div>
  );
}

/* ── Particle dot ── */
function Particle({ x, delay, size }) {
  return (
    <motion.div
      initial={{ y: 0, opacity: 0 }}
      animate={{ y: [-20, -60, -80], opacity: [0, 0.8, 0] }}
      transition={{ duration: 2.2, delay, repeat: Infinity, repeatDelay: Math.random() * 2 + 0.5, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        bottom:   '34%',
        left:     `calc(50% + ${x}px)`,
        width:    size, height: size, borderRadius: '50%',
        background: Math.random() > 0.5 ? GOLD : NEON,
        boxShadow: `0 0 6px ${Math.random() > 0.5 ? GOLD : NEON}`,
      }}
    />
  );
}

export default function VaultGraphic() {
  return (
    <div style={{
      width:      '100%',
      height:     '100%',
      background: 'radial-gradient(ellipse at 50% 60%, #060d1a 0%, #030710 55%, #020409 100%)',
      position:   'relative',
      overflow:   'hidden',
      display:    'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>

      {/* ── Subtle grid background ── */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.07,
        backgroundImage: `linear-gradient(${GOLD}60 1px, transparent 1px), linear-gradient(90deg, ${GOLD}60 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
      }} />

      {/* ── Vault outer ring glow ── */}
      <motion.div
        animate={{ boxShadow: [
          `0 0 40px ${BLUE}40, 0 0 80px ${BLUE}20, 0 0 0 2px ${GOLD}30`,
          `0 0 60px ${BLUE}60, 0 0 120px ${BLUE}30, 0 0 0 2px ${GOLD}60`,
          `0 0 40px ${BLUE}40, 0 0 80px ${BLUE}20, 0 0 0 2px ${GOLD}30`,
        ] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position:     'absolute',
          width:        200, height: 200,
          borderRadius: '50%',
          border:       `3px solid ${GOLD}50`,
          background:   'transparent',
        }}
      />

      {/* ── Vault door ring — middle ── */}
      <div style={{
        position:     'absolute',
        width:        160, height: 160, borderRadius: '50%',
        border:       `6px solid ${GOLD}35`,
        background:   'transparent',
      }} />

      {/* ── 8 vault bolts ── */}
      {[0,45,90,135,180,225,270,315].map((angle, i) => (
        <div
          key={i}
          style={{
            position:     'absolute',
            width:        10, height: 10, borderRadius: '50%',
            background:   `radial-gradient(circle, ${GOLD} 0%, ${GOLD}60 100%)`,
            boxShadow:    `0 0 8px ${GOLD}80`,
            transform:    `rotate(${angle}deg) translateY(-94px)`,
          }}
        />
      ))}

      {/* ── Vault interior — neon blue+gold glow emanating ── */}
      <motion.div
        animate={{ opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position:     'absolute',
          width:        118, height: 118, borderRadius: '50%',
          background:   `radial-gradient(circle, #9fc8ff 0%, ${BLUE} 22%, #0a2a6e 50%, #030a1a 78%)`,
          boxShadow:    `0 0 30px ${BLUE}80, 0 0 60px ${BLUE}50, 0 0 100px ${BLUE}25, inset 0 0 30px ${NEON}40`,
        }}
      />

      {/* ── Gold shimmer inside vault ── */}
      <motion.div
        animate={{ opacity: [0.3, 0.7, 0.3], rotate: [0, 360] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        style={{
          position:     'absolute',
          width:        70, height: 70, borderRadius: '50%',
          background:   `conic-gradient(from 0deg, transparent 0%, ${GOLD}60 25%, transparent 50%, ${GOLD}40 75%, transparent 100%)`,
          filter:       'blur(6px)',
        }}
      />

      {/* ── Lock symbol in vault center ── */}
      <div style={{
        position: 'absolute', fontSize: 28,
        filter: `drop-shadow(0 0 8px ${NEON})`,
        zIndex: 2,
      }}>
        🔐
      </div>

      {/* ── Floating documents ── */}
      <FloatingDoc delay={0}   x={-32} docType="passport" />
      <FloatingDoc delay={1.1} x={4}   docType="record"   />
      <FloatingDoc delay={2.2} x={28}  docType="consent"  />

      {/* ── Particles ── */}
      {[
        { x: -50, delay: 0.3, size: 3 }, { x: -20, delay: 0.9, size: 2 },
        { x: 10,  delay: 0.5, size: 3 }, { x: 40,  delay: 1.5, size: 2 },
        { x: -35, delay: 2.0, size: 2 }, { x: 55,  delay: 1.8, size: 3 },
      ].map((p, i) => <Particle key={i} {...p} />)}

      {/* ── Bottom label ── */}
      <div style={{
        position:   'absolute',
        bottom:     20,
        left:       '50%',
        transform:  'translateX(-50%)',
        textAlign:  'center',
      }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', color: `${GOLD}80`, textTransform: 'uppercase' }}>
          Morales Vault · 256-bit AES
        </p>
      </div>

      <style>{`
        @keyframes vaultGlow {
          0%, 100% { filter: brightness(1); }
          50%       { filter: brightness(1.2); }
        }
      `}</style>
    </div>
  );
}
