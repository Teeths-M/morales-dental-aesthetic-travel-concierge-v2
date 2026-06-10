import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BadgeCheck, Shield, Plane, Heart } from 'lucide-react';

const GOLD = '#D4AF37';
const HERO_IMAGE = 'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/7b4ea635d_ChatGPTImageJun1202608_35_37PM.png';

const trustPills = [
  { icon: BadgeCheck, label: 'Verified Specialists', sub: 'World-class experts' },
  { icon: Shield,     label: 'Transparent Pricing',  sub: 'No hidden fees' },
  { icon: Plane,      label: 'End-to-End Concierge', sub: 'We handle everything' },
  { icon: Heart,      label: 'Recovery Support',     sub: "Until you're home" },
];

const orbitNodes = [
  { label: 'Verified Specialists',  angle: 320, r: 148 },
  { label: '24/7 Support',          angle: 220, r: 148 },
  { label: 'Safe Facilities',       angle: 25,  r: 148 },
  { label: 'Risk Intelligence',     angle: 200, r: 148 },
  { label: 'Travel Coordinator',    angle: 45,  r: 148 },
  { label: 'Recovery Care',         angle: 135, r: 148 },
];

function deg2rad(d) { return (d * Math.PI) / 180; }

function SafeTDiagram() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
      {/* Outer rings */}
      <div className="absolute w-[320px] h-[320px] rounded-full" style={{ border: `1px solid ${GOLD}20` }} />
      <div className="absolute w-[260px] h-[260px] rounded-full" style={{ border: `1px solid ${GOLD}15` }} />

      {/* SVG lines from center to nodes */}
      <svg className="absolute" width="340" height="340" viewBox="-170 -170 340 340">
        {orbitNodes.map(({ angle, r }) => {
          const x = r * Math.cos(deg2rad(angle));
          const y = r * Math.sin(deg2rad(angle));
          return (
            <line
              key={angle}
              x1="0" y1="0"
              x2={x} y2={y}
              stroke={GOLD}
              strokeWidth="0.7"
              opacity="0.3"
            />
          );
        })}
        {/* Center glow circle */}
        <circle cx="0" cy="0" r="54" fill={GOLD} fillOpacity="0.06" />
        <circle cx="0" cy="0" r="42" fill={GOLD} fillOpacity="0.04" />
      </svg>

      {/* Orbit node badges */}
      {orbitNodes.map(({ label, angle, r }) => {
        const x = r * Math.cos(deg2rad(angle));
        const y = r * Math.sin(deg2rad(angle));
        return (
          <div
            key={label}
            className="absolute flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap"
            style={{
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              transform: 'translate(-50%, -50%)',
              background: 'rgba(6,11,22,0.85)',
              border: `1px solid ${GOLD}35`,
              color: 'rgba(255,255,255,0.82)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: GOLD }} />
            {label}
          </div>
        );
      })}

      {/* Center shield */}
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative z-10 flex flex-col items-center"
      >
        <div
          className="absolute w-28 h-28 rounded-full"
          style={{ background: `radial-gradient(circle, ${GOLD}22, transparent 70%)`, filter: 'blur(12px)' }}
        />
        <svg viewBox="0 0 80 92" fill="none" className="w-[72px] h-[84px]">
          <path
            d="M40 4L72 18V48C72 66 58 78 40 88C22 78 8 66 8 48V18L40 4Z"
            fill={`${GOLD}18`} stroke={GOLD} strokeWidth="1.5"
          />
          <path
            d="M34 34H46V42H54V54H46V62H34V54H26V42H34V34Z"
            fill="white" opacity="0.9"
          />
        </svg>
        <p className="text-[9px] font-bold tracking-[0.22em] uppercase mt-2" style={{ color: GOLD }}>SAFE-T4LIFE™</p>
        <p className="text-[7px] text-white/35 tracking-widest uppercase mt-0.5">Safety Intelligence Engine</p>
      </motion.div>
    </div>
  );
}

export default function LuxuryHero() {
  return (
    <section
      className="relative min-h-screen overflow-hidden"
      style={{ background: '#060B16', marginTop: '-68px' }}
    >
      {/* Full-bleed background image — covers entire section */}
      <div className="absolute inset-0">
        <img
          src={HERO_IMAGE}
          alt=""
          className="w-full h-full object-cover scale-105"
          style={{ objectPosition: '70% center' }}
        />
        {/* Left fade */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, #060B16 0%, #060B16 35%, rgba(6,11,22,0.88) 50%, rgba(6,11,22,0.45) 68%, rgba(6,11,22,0.1) 85%, transparent 100%)' }}
        />
        {/* Top fade */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #060B16 0%, rgba(6,11,22,0.4) 8%, transparent 18%)' }} />
        {/* Bottom fade */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #060B16 0%, rgba(6,11,22,0.7) 10%, transparent 25%)' }} />
        {/* Right edge fade */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to left, #060B16 0%, rgba(6,11,22,0.5) 6%, transparent 18%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-0 items-center min-h-screen py-24 lg:py-0" style={{ paddingTop: '68px' }}>

        {/* ── LEFT ── */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: 'easeOut' }}
          className="flex flex-col z-10 lg:pr-16"
        >
          {/* Eyebrow */}
          <p
            className="text-[11px] font-bold tracking-[0.28em] uppercase mb-8"
            style={{ color: GOLD }}
          >
            World-Class Care. Personalized For You.
          </p>

          {/* Headline */}
          <h1
            className="font-display text-white leading-[1.06] mb-7"
            style={{ fontSize: 'clamp(2.8rem, 4.5vw, 4rem)' }}
          >
            Premium Medical Travel.<br />
            Verified.{' '}
            <span style={{ color: GOLD }}>Safe.</span>{' '}
            Seamless.
          </h1>

          {/* Body */}
          <p className="text-[15px] text-white/55 leading-relaxed mb-10 max-w-[420px]">
            Morales coordinates every step of your dental or aesthetic care journey —
            from consultation to recovery. You focus on yourself. We handle the rest.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4 mb-12">
            <Link
              to="/booking"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-[14px] transition-all duration-200 hover:opacity-90"
              style={{ background: GOLD, color: '#060B16', boxShadow: `0 0 30px ${GOLD}30` }}
            >
              Book Your Consultation →
            </Link>
            <Link
              to="/how-it-works"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-[14px] text-white border border-white/25 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/40 transition-all duration-200"
            >
              <span
                className="w-6 h-6 rounded-full border border-white/30 flex items-center justify-center"
                style={{ fontSize: '10px' }}
              >▶</span>
              How It Works
            </Link>
          </div>

          {/* Trust pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 pt-8 border-t border-white/[0.08]">
            {trustPills.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex flex-col gap-1.5">
                <Icon className="w-4 h-4" style={{ color: GOLD, filter: `drop-shadow(0 0 5px ${GOLD}70)` }} strokeWidth={1.5} />
                <p className="text-[12px] font-medium text-white leading-tight tracking-wide">{label}</p>
                <p className="text-[11px] text-white/65 tracking-wide">{sub}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── RIGHT ── SAFE-T diagram overlaid on image */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="relative hidden lg:flex items-center justify-center"
          style={{ height: '100vh' }}
        >
          <SafeTDiagram />
        </motion.div>

      </div>
    </section>
  );
}