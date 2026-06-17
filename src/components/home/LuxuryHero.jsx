import React, { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Brain, Plane, Heart, ShieldCheck, Headphones, Building2, BarChart3, CheckCircle } from 'lucide-react';
import ModeToggle from './ModeToggle';
import HowItWorksModal from './HowItWorksModal';

// ── Brand Colors (from screenshot) ────────────────────────────────────────────
const COLORS = {
  bg: '#0a1521',
  surface: '#0F1E30',
  gold: '#e3b463',
  goldButton: '#e3b463',
  cyan: '#00e5ff',
  white: '#f8f9fa',
  muted: '#a0aec0',
  dim: '#6B7E93',
};

// ── Feature Labels with positions ─────────────────────────────────────────────
const featureLabels = [
  { label: 'Verified Specialists', icon: ShieldCheck, x: 280, y: 80 },
  { label: 'Safe Facilities', icon: Building2, x: 420, y: 140 },
  { label: 'Travel Coordination', icon: Plane, x: 380, y: 220 },
  { label: 'Risk Intelligence', icon: BarChart3, x: 200, y: 200 },
  { label: '24/7 Support', icon: Headphones, x: 140, y: 140 },
  { label: 'Recovery Care', icon: Heart, x: 240, y: 260 },
];

// ── SafeT Diagram Component ───────────────────────────────────────────────────
const SafeTDiagram = React.memo(function SafeTDiagram() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes glow { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 0.5; } 100% { transform: scale(1.3); opacity: 0; } }
      `}</style>

      {/* Glowing rings */}
      <div className="absolute w-[400px] h-[400px] rounded-full" style={{ border: `1px solid ${COLORS.cyan}33` }} />
      <div className="absolute w-[320px] h-[320px] rounded-full" style={{ border: `1px solid ${COLORS.cyan}22` }} />
      <div className="absolute w-[240px] h-[240px] rounded-full" style={{ border: `1px solid ${COLORS.cyan}11` }} />

      {/* Connection lines to features */}
      <svg className="absolute w-[500px] h-[500px]" viewBox="0 0 500 500">
        {featureLabels.map(({ x, y }, idx) => (
          <line
            key={idx}
            x1="250"
            y1="250"
            x2={x + 50}
            y2={y + 50}
            stroke={COLORS.cyan}
            strokeWidth="0.5"
            opacity="0.2"
            strokeDasharray="4 4"
          />
        ))}
      </svg>

      {/* Feature badges */}
      {featureLabels.map(({ label, icon: Icon, x, y }, idx) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 + idx * 0.1 }}
          className="absolute flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium whitespace-nowrap"
          style={{
            left: x,
            top: y,
            background: 'rgba(10,21,33,0.92)',
            border: `1px solid ${COLORS.cyan}44`,
            color: COLORS.white,
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="w-2 h-2 rounded-full" style={{ background: COLORS.cyan, boxShadow: `0 0 8px ${COLORS.cyan}` }} />
          <Icon className="w-3.5 h-3.5" style={{ color: COLORS.cyan }} strokeWidth={1.5} />
          {label}
        </motion.div>
      ))}

      {/* Digital Brain */}
      <motion.div
        className="absolute top-[15%] left-1/2 -translate-x-1/2"
        style={{ animation: 'glow 4s ease-in-out infinite' }}
      >
        <svg viewBox="0 0 200 140" className="w-[200px] h-[140px]">
          {/* Brain outline */}
          <ellipse cx="100" cy="70" rx="70" ry="50" fill="none" stroke={COLORS.cyan} strokeWidth="1.2" opacity="0.7" />
          
          {/* Circuit pattern */}
          <path d="M 50 70 L 80 70 M 100 50 L 100 90 M 120 70 L 150 70" stroke={COLORS.cyan} strokeWidth="0.8" opacity="0.6" />
          <circle cx="65" cy="70" r="2.5" fill={COLORS.cyan} opacity="0.9" />
          <circle cx="100" cy="70" r="3" fill={COLORS.cyan} opacity="1" />
          <circle cx="135" cy="70" r="2.5" fill={COLORS.cyan} opacity="0.9" />
          
          {/* Neural connections */}
          {[40, 70, 100, 130, 160].map((x, i) => (
            <circle key={i} cx={x} cy={50 + (i % 2) * 40} r="1.5" fill={COLORS.cyan} opacity="0.7" />
          ))}
          
          {/* Connection paths */}
          <path d="M 40 50 L 70 70 L 100 50 L 130 70 L 160 50" stroke={COLORS.cyan} strokeWidth="0.6" opacity="0.4" fill="none" />
        </svg>
        <p className="text-[10px] font-bold tracking-[0.2em] text-center mt-2" style={{ color: COLORS.cyan }}>SAFE-T4LIFE</p>
      </motion.div>

      {/* Central SAFE-T Badge */}
      <motion.div
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
        className="relative z-10 flex flex-col items-center"
        style={{ animation: 'float 6s ease-in-out infinite' }}
      >
        <div className="w-[90px] h-[90px] rounded-full flex items-center justify-center"
          style={{
            background: COLORS.surface,
            border: `2px solid ${COLORS.gold}`,
            boxShadow: `0 0 50px ${COLORS.gold}33`,
          }}>
          <Shield className="w-[60px] h-[60px]" style={{ color: COLORS.gold }} strokeWidth={1.5} />
        </div>
        <p className="text-[14px] font-bold tracking-[0.15em] uppercase mt-3" style={{ color: COLORS.gold }}>SAFE-T</p>
      </motion.div>
    </div>
  );
});

// ── Private Jet Illustration ──────────────────────────────────────────────────
function PrivateJetIllustration() {
  return (
    <div className="absolute right-0 bottom-0 w-full h-full pointer-events-none select-none">
      <svg viewBox="0 0 600 450" className="absolute right-[-80px] bottom-[5%] w-[680px] h-[450px]" style={{ transform: 'rotate(-6deg)' }}>
        {/* Fuselage with gold stripe */}
        <ellipse cx="300" cy="225" rx="240" ry="60" fill="url(#jetBodyGrad)" stroke={COLORS.gold} strokeWidth="1" opacity="0.95" />
        
        {/* Gold pinstripe along fuselage */}
        <path d="M 80 220 Q 200 215 420 220 Q 500 225 530 230" fill="none" stroke={COLORS.gold} strokeWidth="1.5" opacity="0.8" />
        
        {/* Cockpit */}
        <path d="M 500 210 Q 545 218 560 230 L 565 238 Q 550 243 505 238 Z" fill={COLORS.surface} stroke={COLORS.gold} strokeWidth="0.8" opacity="0.85" />
        
        {/* Main wing */}
        <path d="M 280 240 L 380 350 L 470 370 L 350 270 Z" fill="url(#wingGrad)" stroke={COLORS.gold} strokeWidth="0.9" opacity="0.88" />
        
        {/* Engine */}
        <ellipse cx="380" cy="295" rx="40" ry="20" fill="url(#engineGrad)" stroke={COLORS.gold} strokeWidth="0.9" opacity="0.92" />
        
        {/* Tail fin */}
        <path d="M 140 210 L 80 125 L 110 118 L 165 195 Z" fill="url(#tailGrad)" stroke={COLORS.gold} strokeWidth="0.7" opacity="0.82" />
        
        {/* Winglet */}
        <path d="M 465 365 L 482 345 L 490 352 L 473 371 Z" fill={COLORS.surface} stroke={COLORS.gold} strokeWidth="0.6" opacity="0.75" />
        
        {/* Gradients */}
        <defs>
          <linearGradient id="jetBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a2639" />
            <stop offset="50%" stopColor="#2A3848" />
            <stop offset="100%" stopColor="#1a2639" />
          </linearGradient>
          <linearGradient id="wingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#152030" />
            <stop offset="100%" stopColor="#2A3848" />
          </linearGradient>
          <radialGradient id="engineGrad" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#2A3848" />
            <stop offset="100%" stopColor={COLORS.bg} />
          </radialGradient>
          <linearGradient id="tailGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={COLORS.surface} />
            <stop offset="100%" stopColor={COLORS.bg} />
          </linearGradient>
        </defs>
      </svg>

      {/* Cloud layers */}
      <div className="absolute right-[8%] top-[25%] w-[350px] h-[180px] rounded-full"
        style={{ background: 'rgba(255,255,255,0.03)', filter: 'blur(50px)' }} />
      <div className="absolute right-[3%] top-[40%] w-[300px] h-[150px] rounded-full"
        style={{ background: 'rgba(255,255,255,0.04)', filter: 'blur(60px)' }} />
      <div className="absolute right-[18%] bottom-[25%] w-[280px] h-[140px] rounded-full"
        style={{ background: 'rgba(255,255,255,0.03)', filter: 'blur(55px)' }} />

      {/* Cyan glow accent */}
      <div className="absolute right-[20%] top-[20%] w-[400px] h-[300px] rounded-full"
        style={{ background: `radial-gradient(ellipse at center, ${COLORS.cyan}0D 0%, transparent 70%)`, filter: 'blur(70px)' }} />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function LuxuryHero() {
  const [showModal, setShowModal] = useState(false);

  const openModal = useCallback(() => setShowModal(true), []);
  const closeModal = useCallback(() => setShowModal(false), []);

  return (
    <>
      <section className="relative min-h-screen overflow-hidden" style={{ background: COLORS.bg, fontFamily: 'Inter, sans-serif' }}>
        {/* Background gradient */}
        <div className="absolute inset-0">
          <div className="absolute inset-0" style={{ background: COLORS.bg }} />
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse at 65% 55%, rgba(227,180,99,0.06) 0%, transparent 60%)'
          }} />
        </div>

        {/* Jet + Diagram */}
        <PrivateJetIllustration />

        {/* Content Container */}
        <div className="relative z-10 w-full max-w-[1440px] mx-auto px-8 lg:px-16 grid grid-cols-1 lg:grid-cols-2 gap-0 items-center min-h-screen py-20 lg:py-0" style={{ paddingTop: '88px' }}>

          {/* LEFT COLUMN - Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col z-10 lg:pr-12"
          >
            {/* Mode Toggle */}
            <div className="mb-6"><ModeToggle /></div>

            {/* Eyebrow */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-[11px] font-bold tracking-[0.25em] uppercase mb-5"
              style={{ color: COLORS.gold }}
            >
              WORLD-CLASS CARE. PERSONALIZED FOR YOU.
            </motion.p>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="font-serif text-white leading-[1.08] mb-5"
              style={{ fontSize: 'clamp(52px, 6vw, 72px)' }}
            >
              Premium Medical Travel.<br />
              <span style={{ color: COLORS.gold, fontStyle: 'italic' }}>Verified. Safe. Seamless.</span>
            </motion.h1>

            {/* Subtitle badge */}
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 w-fit"
              style={{ background: 'rgba(227,180,99,0.08)', border: `1px solid ${COLORS.gold}33` }}
            >
              <ShieldCheck className="w-4 h-4" style={{ color: COLORS.gold }} strokeWidth={1.5} />
              <span className="text-[13px] font-medium" style={{ color: COLORS.gold }}>SAFE-T4LIFE™ Protection</span>
            </motion.div>

            {/* Body */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-[16px] leading-[1.8] mb-10 max-w-[560px]"
              style={{ color: COLORS.muted }}
            >
              Morales coordinates your entire medical journey — from verified specialist matching and travel logistics to recovery care — with white-glove concierge support at every step.
            </motion.p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 mb-12">
              <Link
                to="/booking"
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-[32px] font-bold text-[15px] transition-all duration-300 hover:opacity-90 hover:shadow-lg"
                style={{ background: COLORS.goldButton, color: '#0a1521', boxShadow: `0 4px 20px ${COLORS.gold}44` }}
              >
                Book Your Consultation →
              </Link>
              <button
                onClick={openModal}
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-semibold text-[14px] text-white border border-white/20 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/35 transition-all duration-300"
              >
                <span className="w-7 h-7 rounded-full border border-white/25 flex items-center justify-center" style={{ fontSize: '11px' }}>▶</span>
                How It Works
              </button>
            </div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap gap-5 pt-8 border-t border-white/[0.08]"
            >
              {[
                { label: 'Verified Specialists', icon: CheckCircle },
                { label: 'Transparent Pricing', icon: CheckCircle },
                { label: 'End-to-End Concierge', icon: CheckCircle },
                { label: 'Recovery Support', icon: CheckCircle },
              ].map(({ label, icon: Icon }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" style={{ color: COLORS.gold }} strokeWidth={1.5} />
                  <span className="text-[14px] font-medium" style={{ color: COLORS.white }}>{label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* RIGHT COLUMN - SafeT Diagram */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.4 }}
            className="relative hidden lg:flex items-center justify-center"
            style={{ height: '100vh' }}
          >
            <SafeTDiagram />
          </motion.div>
        </div>
      </section>
      <HowItWorksModal isOpen={showModal} onClose={closeModal} />
    </>
  );
}