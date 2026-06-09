import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BadgeCheck, Shield, Plane, Heart } from 'lucide-react';

const GOLD = '#D4AF37';
const HERO_IMAGE = 'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/7b4ea635d_ChatGPTImageJun1202608_35_37PM.png';

const trustFeatures = [
  { icon: BadgeCheck, label: 'Verified Specialists', sub: 'World-class experts' },
  { icon: Shield, label: 'Transparent Pricing', sub: 'No hidden fees' },
  { icon: Plane, label: 'End-to-End Concierge', sub: 'We handle everything' },
  { icon: Heart, label: 'Recovery Support', sub: "Until you're home" },
];

const orbitBadges = [
  { label: 'Verified Specialists', x: 0, y: -145 },
  { label: '24/7 Support', x: 125, y: -72 },
  { label: 'Safe Facilities', x: 125, y: 72 },
  { label: 'Risk Intelligence', x: 0, y: 145 },
  { label: 'Travel Coordination', x: -125, y: 72 },
  { label: 'Recovery Care', x: -125, y: -72 },
];

function ShieldVisualization() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Orbit rings */}
      <div className="absolute w-80 h-80 rounded-full" style={{ border: `1px solid ${GOLD}18` }} />
      <div className="absolute w-64 h-64 rounded-full" style={{ border: `1px solid ${GOLD}10` }} />

      {/* Shield center */}
      <motion.div
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="absolute w-32 h-32 rounded-full opacity-20" style={{ background: `radial-gradient(circle, ${GOLD}, transparent)`, filter: 'blur(20px)' }} />
        <svg viewBox="0 0 80 92" fill="none" className="w-20 h-24" xmlns="http://www.w3.org/2000/svg">
          <path d="M40 4L72 18V48C72 66 58 78 40 88C22 78 8 66 8 48V18L40 4Z"
            fill={`${GOLD}1A`} stroke={GOLD} strokeWidth="1.5" />
          <path d="M34 34H46V42H54V54H46V62H34V54H26V42H34V34Z" fill="white" opacity="0.92" />
        </svg>
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase mt-2" style={{ color: GOLD }}>SAFE-T4LIFE™</p>
        <p className="text-[8px] text-white/35 tracking-widest uppercase mt-0.5">Safety Intelligence Engine</p>
      </motion.div>

      {/* Orbit badges */}
      {orbitBadges.map(({ label, x, y }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.12 + 0.6, duration: 0.4 }}
          className="absolute flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium pointer-events-none"
          style={{
            transform: `translate(calc(${x}px - 50%), calc(${y}px - 50%))`,
            left: '50%',
            top: '50%',
            background: 'rgba(6, 11, 22, 0.88)',
            border: `1px solid ${GOLD}3A`,
            color: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(12px)',
            whiteSpace: 'nowrap',
            boxShadow: `0 0 16px rgba(0,0,0,0.5)`,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: GOLD }} />
          {label}
        </motion.div>
      ))}
    </div>
  );
}

export default function LuxuryHero() {
  return (
    <section
      className="relative -mt-20 lg:-mt-24 min-h-screen flex items-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #060B16 0%, #0D1322 100%)' }}
    >
      <div className="w-full max-w-[1400px] mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-8 lg:gap-12 items-center pt-32 pb-16 lg:pt-0 lg:pb-0">

        {/* ── LEFT COLUMN ── */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="flex flex-col"
        >
          {/* Micro label */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-[11px] font-bold tracking-[0.28em] uppercase mb-7"
            style={{ color: GOLD }}
          >
            World-Class Care. Personally Coordinated.
          </motion.p>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-display leading-[1.05] mb-7 text-white"
            style={{ fontSize: 'clamp(2.6rem, 5vw, 4.2rem)' }}
          >
            Premium Medical Travel.<br />
            Verified.{' '}
            <span style={{ color: GOLD }}>Safe.</span>{' '}
            Seamless.
          </motion.h1>

          {/* Sub-paragraph */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-base lg:text-lg text-white/55 leading-relaxed max-w-[480px] mb-10"
          >
            Morales coordinates every detail of your dental and aesthetic care journey — from consultation to recovery. You focus on yourself. We handle the rest.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap gap-4 mb-14"
          >
            <Link
              to="/booking"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-[15px] transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
              style={{ background: GOLD, color: '#060B16', boxShadow: `0 0 24px ${GOLD}33` }}
            >
              Book Your Consultation →
            </Link>
            <Link
              to="/how-it-works"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl font-semibold text-[15px] text-white border border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/35 transition-all duration-200"
            >
              <span className="w-5 h-5 rounded-full border border-white/35 flex items-center justify-center text-[10px]">▶</span>
              How It Works
            </Link>
          </motion.div>

          {/* Trust badges row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-t pt-10"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}
          >
            {trustFeatures.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex flex-col gap-2">
                <Icon className="w-5 h-5" style={{ color: GOLD }} strokeWidth={1.5} />
                <p className="text-[13px] font-semibold text-white leading-tight">{label}</p>
                <p className="text-[11px] text-white/40">{sub}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* ── RIGHT COLUMN ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.25 }}
          className="relative hidden lg:block"
          style={{ height: '680px' }}
        >
          {/* Image container */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden">
            <img
              src={HERO_IMAGE}
              alt="Premium medical travel"
              className="w-full h-full object-cover"
              style={{ objectPosition: '68% center' }}
            />
            {/* Gradient overlays */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(6,11,22,0.72) 0%, rgba(6,11,22,0.15) 45%, rgba(6,11,22,0.45) 100%)' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(6,11,22,0.35) 0%, transparent 35%, rgba(6,11,22,0.6) 100%)' }} />
          </div>

          {/* Shield visualization overlay */}
          <ShieldVisualization />
        </motion.div>

      </div>

      {/* Subtle bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, #060B16)' }} />
    </section>
  );
}