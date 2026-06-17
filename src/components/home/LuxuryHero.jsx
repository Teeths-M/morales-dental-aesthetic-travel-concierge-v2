import React, { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Brain, Plane, Heart, ShieldCheck, Headphones, Building2, BarChart3 } from 'lucide-react';
import ModeToggle from './ModeToggle';
import HowItWorksModal from './HowItWorksModal';

// ── Brand Colors ──────────────────────────────────────────────────────────────
const COLORS = {
  bg: '#0B1623',
  surface: '#0F1E30',
  gold: '#E3B463',
  goldButton: '#E8B946',
  cyan: '#00F0FF',
  white: '#FFFFFF',
  muted: '#A0A0A0',
  dim: '#6B7E93',
};

// ── Orbit Nodes with positions ───────────────────────────────────────────────
const orbitNodes = [
  { label: 'Verified Specialists', icon: ShieldCheck, angle: 270, r: 155 },
  { label: '24/7 Support',         icon: Headphones,  angle: 195, r: 155 },
  { label: 'Safe Facilities',      icon: Building2,   angle: 345, r: 155 },
  { label: 'Risk Intelligence',    icon: BarChart3,   angle: 160, r: 155 },
  { label: 'Travel Coordination',  icon: Plane,       angle: 15,  r: 155 },
  { label: 'Recovery Care',        icon: Heart,       angle: 105, r: 155 },
];

// Pre-compute positions
const DEG2RAD = Math.PI / 180;
const ORBIT_NODES_COMPUTED = orbitNodes.map(node => ({
  ...node,
  x: node.r * Math.cos(node.angle * DEG2RAD),
  y: node.r * Math.sin(node.angle * DEG2RAD),
}));

// ── SafeTDiagram Component ────────────────────────────────────────────────────
const SafeTDiagram = React.memo(function SafeTDiagram() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes pulse-glow { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }
      `}</style>

      {/* Main orbital ring */}
      <div className="w-[520px] h-[520px] rounded-full absolute"
        style={{ border: `1.5px solid ${COLORS.cyan}40` }} />

      {/* Inner decorative ring */}
      <div className="w-[440px] h-[440px] rounded-full absolute"
        style={{ border: `1px solid ${COLORS.cyan}20` }} />

      {/* Orbit dots */}
      <svg className="absolute w-[520px] h-[520px]" viewBox="0 0 520 520">
        {ORBIT_NODES_COMPUTED.map(({ x, y }, idx) => {
          const dotColor = idx < 3 ? COLORS.gold : COLORS.cyan;
          return (
            <g key={`orbit-dot-${idx}`}>
              <circle cx={260 + x} cy={260 + y} r="4" fill={dotColor} opacity="0.9" />
              <circle cx={260 + x} cy={260 + y} r="8" fill={dotColor} opacity="0.2" />
            </g>
          );
        })}
      </svg>

      {/* Abstract constellation/graph at top */}
      <svg className="absolute w-[280px] h-[180px]" style={{ top: '12%', left: '50%', transform: 'translateX(-50%)' }} viewBox="0 0 280 180">
        <ellipse cx="140" cy="90" rx="120" ry="70" fill="none" stroke={COLORS.cyan} strokeWidth="0.8" opacity="0.3" />
        <path d="M 60 90 L 100 70 L 140 85 L 180 65 L 220 90" fill="none" stroke={COLORS.cyan} strokeWidth="1.2" opacity="0.6" />
        <circle cx="60" cy="90" r="3" fill={COLORS.cyan} opacity="0.8" />
        <circle cx="100" cy="70" r="2.5" fill={COLORS.cyan} opacity="0.7" />
        <circle cx="140" cy="85" r="3.5" fill={COLORS.cyan} opacity="0.9" />
        <circle cx="180" cy="65" r="2.5" fill={COLORS.cyan} opacity="0.7" />
        <circle cx="220" cy="90" r="3" fill={COLORS.cyan} opacity="0.8" />
      </svg>

      {/* Wireframe jet (minimalist thin-line style) */}
      <svg className="absolute w-[320px] h-[220px]" style={{ bottom: '8%', right: '12%' }} viewBox="0 0 320 220">
        {/* Fuselage outline */}
        <ellipse cx="160" cy="110" rx="120" ry="35" fill="none" stroke={COLORS.gold} strokeWidth="1" opacity="0.5" />
        {/* Cockpit */}
        <path d="M 250 105 Q 275 110 285 115 L 280 118 Q 260 115 250 112" fill="none" stroke={COLORS.gold} strokeWidth="0.8" opacity="0.5" />
        {/* Wing */}
        <path d="M 140 120 L 180 165 L 210 170 L 170 135 Z" fill="none" stroke={COLORS.gold} strokeWidth="0.9" opacity="0.45" />
        {/* Tail */}
        <path d="M 70 105 L 50 75 L 60 72 L 78 102 Z" fill="none" stroke={COLORS.gold} strokeWidth="0.8" opacity="0.45" />
        {/* Engine */}
        <ellipse cx="185" cy="135" rx="18" ry="10" fill="none" stroke={COLORS.gold} strokeWidth="0.7" opacity="0.4" />
      </svg>

      {/* Center SAFE-T Badge */}
      <motion.div
        animate={{ scale: [1, 1.025, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
        className="relative z-10 flex flex-col items-center"
        style={{ animation: 'float 6s ease-in-out infinite' }}
      >
        <div className="w-[82px] h-[82px] rounded-full flex items-center justify-center"
          style={{ 
            background: 'rgba(15,30,48,0.95)',
            border: `2.5px solid ${COLORS.gold}`,
            boxShadow: `0 0 50px ${COLORS.gold}33`,
          }}>
          <Shield className="w-[56px] h-[56px]" style={{ color: COLORS.gold }} strokeWidth={1.3} />
        </div>
        <p className="text-[14px] font-bold tracking-[0.12em] uppercase mt-3.5" style={{ color: COLORS.gold }}>
          SAFE-T4LIFE™
        </p>
        <p className="text-[9px] tracking-[0.18em] uppercase mt-1.5" style={{ color: COLORS.dim }}>
          SAFETY INTELLIGENCE ENGINE
        </p>
      </motion.div>

      {/* Floating label badges */}
      {ORBIT_NODES_COMPUTED.map(({ label, icon: NodeIcon, x, y }, idx) => {
        const dotColor = idx < 3 ? COLORS.gold : COLORS.cyan;
        return (
          <div key={label} className="absolute flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-[12.5px] font-medium whitespace-nowrap"
            style={{ 
              left: `calc(50% + ${x}px + ${x > 0 ? '12' : '-12'}px)`, 
              top: `calc(50% + ${y}px)`,
              background: 'rgba(11,22,35,0.92)',
              border: `1px solid ${COLORS.cyan}25`,
              color: COLORS.white,
              backdropFilter: 'blur(12px)',
            }}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
            <NodeIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: dotColor }} strokeWidth={1.5} />
            {label}
          </div>
        );
      })}

      {/* Corner lock icon buttons */}
      <div className="absolute bottom-8 right-8 flex flex-col gap-3 z-20 pointer-events-auto">
        <button className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105"
          style={{ background: `rgba(0,240,255,0.15)`, border: `1px solid ${COLORS.cyan}40` }}>
          <svg className="w-5 h-5" style={{ color: COLORS.cyan }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </button>
        <button className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105"
          style={{ background: 'rgba(15,30,48,0.8)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <Shield className="w-5 h-5" style={{ color: COLORS.gold }} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
});

// ── Private Jet Illustration ─────────────────────────────────────────────────
function PrivateJetIllustration() {
  return (
    <div className="absolute right-0 bottom-0 w-full h-full pointer-events-none select-none">
      <svg viewBox="0 0 500 400" className="absolute right-[-50px] bottom-[10%] w-[550px] h-[400px]" style={{ transform: 'rotate(-8deg)' }}>
        {/* Fuselage */}
        <ellipse cx="250" cy="200" rx="180" ry="45" 
          fill="url(#jetBodyGrad)" 
          stroke={COLORS.gold} 
          strokeWidth="0.8" 
          opacity="0.95" />
        
        {/* Cockpit window */}
        <path d="M 380 185 Q 410 190 420 200 L 425 205 Q 415 210 385 205 Z" 
          fill={COLORS.surface} 
          stroke={COLORS.gold} 
          strokeWidth="0.6" 
          opacity="0.8" />
        
        {/* Main wing */}
        <path d="M 220 210 L 280 280 L 340 290 L 260 230 Z" 
          fill="url(#wingGrad)" 
          stroke={COLORS.gold} 
          strokeWidth="0.7" 
          opacity="0.85" />
        
        {/* Engine nacelle */}
        <ellipse cx="290" cy="245" rx="28" ry="14" 
          fill="url(#engineGrad)" 
          stroke={COLORS.gold} 
          strokeWidth="0.8" 
          opacity="0.9" />
        
        {/* Tail fin */}
        <path d="M 100 185 L 60 130 L 80 125 L 115 180 Z" 
          fill="url(#tailGrad)" 
          stroke={COLORS.gold} 
          strokeWidth="0.6" 
          opacity="0.8" />
        
        {/* Winglet */}
        <path d="M 335 288 L 345 275 L 350 280 L 340 292 Z" 
          fill={COLORS.surface} 
          stroke={COLORS.gold} 
          strokeWidth="0.5" 
          opacity="0.7" />
        
        {/* Fuselage highlight */}
        <path d="M 90 195 Q 180 188 350 192 Q 400 195 420 200" 
          fill="none" 
          stroke="rgba(255,255,255,0.15)" 
          strokeWidth="1" 
          opacity="0.7" />
        
        {/* Gradients */}
        <defs>
          <linearGradient id="jetBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={COLORS.surface} />
            <stop offset="50%" stopColor="#2A3848" />
            <stop offset="100%" stopColor={COLORS.surface} />
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
      
      {/* Digital Brain (cyan circuit board style) */}
      <div className="absolute right-[18%] top-[18%] w-[280px] h-[200px]" style={{ animation: 'glow 4s ease-in-out infinite' }}>
        <svg viewBox="0 0 280 200" className="w-full h-full">
          {/* Brain outline */}
          <ellipse cx="140" cy="100" rx="100" ry="70" 
            fill="none" 
            stroke={COLORS.cyan} 
            strokeWidth="1.5" 
            opacity="0.6" />
          
          {/* Circuit lines */}
          <path d="M 80 100 L 120 100 M 140 80 L 140 120 M 160 100 L 200 100" 
            stroke={COLORS.cyan} strokeWidth="1" opacity="0.5" />
          <circle cx="100" cy="100" r="3" fill={COLORS.cyan} opacity="0.8" />
          <circle cx="140" cy="100" r="4" fill={COLORS.cyan} opacity="0.9" />
          <circle cx="180" cy="100" r="3" fill={COLORS.cyan} opacity="0.8" />
          
          {/* Neural nodes */}
          {[60, 100, 140, 180, 220].map((x, i) => (
            <circle key={i} cx={x} cy={80 + (i % 2) * 40} r="2" fill={COLORS.cyan} opacity="0.7" />
          ))}
          
          {/* Connection lines */}
          <path d="M 60 80 L 100 100 L 140 80 L 180 100 L 220 80" 
            stroke={COLORS.cyan} strokeWidth="0.8" opacity="0.4" fill="none" />
        </svg>
      </div>
      
      {/* Cloud layers */}
      <div className="absolute right-[10%] top-[20%] w-[300px] h-[150px] rounded-full"
        style={{ background: 'rgba(255,255,255,0.04)', filter: 'blur(40px)' }} />
      <div className="absolute right-[5%] top-[35%] w-[250px] h-[120px] rounded-full"
        style={{ background: 'rgba(255,255,255,0.06)', filter: 'blur(50px)' }} />
      
      {/* Gold glow beneath jet */}
      <div className="absolute right-[15%] bottom-[20%] w-[350px] h-[200px] rounded-full"
        style={{ 
          background: `radial-gradient(ellipse at center, ${COLORS.gold}1A 0%, transparent 70%)`,
          filter: 'blur(60px)',
        }} />
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
        {/* Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0" style={{ background: COLORS.bg }} />
          <div className="absolute inset-0" style={{ 
            background: 'radial-gradient(ellipse at 70% 60%, rgba(227,180,99,0.08) 0%, transparent 50%)' 
          }} />
        </div>

        {/* Jet + Brain */}
        <PrivateJetIllustration />

        {/* Content */}
        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-0 items-center min-h-screen py-24 lg:py-0" style={{ paddingTop: '68px' }}>
          
          {/* LEFT COLUMN */}
          <motion.div 
            initial={{ opacity: 0, y: 28 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: 'easeOut' }} 
            className="flex flex-col z-10 lg:pr-16"
          >
            {/* Mode Toggle */}
            <div className="mb-7"><ModeToggle /></div>

            {/* Eyebrow */}
            <motion.p 
              initial={{ opacity: 0, y: 6 }} 
              animate={{ opacity: 1, y: 0 }}
              className="text-[11px] font-bold tracking-[0.22em] uppercase mb-6" 
              style={{ color: COLORS.gold }}
            >
              WORLD-CLASS CARE. PERSONALIZED FOR YOU.
            </motion.p>

            {/* Headline */}
            <motion.h1 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="font-serif text-white leading-[1.06] mb-6"
              style={{ fontSize: 'clamp(48px, 5vw, 64px)' }}
            >
              Premium Medical Travel.<br />
              <span style={{ color: COLORS.gold, fontStyle: 'italic' }}>Verified. Safe. Seamless.</span>
            </motion.h1>

            {/* Body */}
            <motion.p 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="text-[16px] leading-[1.75] mb-10 max-w-[520px]" 
              style={{ color: COLORS.muted }}
            >
              Morales coordinates your entire medical journey — from verified specialist matching and travel logistics to recovery care — with white-glove concierge support at every step.
            </motion.p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 mb-12">
              <Link 
                to="/booking"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-[30px] font-bold text-[16px] transition-all duration-200 hover:opacity-90"
                style={{ background: COLORS.goldButton, color: '#0B1623' }}
              >
                Book Your Consultation →
              </Link>
              <button 
                onClick={openModal}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-[14px] text-white border border-white/25 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/40 transition-all duration-200"
              >
                <span className="w-6 h-6 rounded-full border border-white/30 flex items-center justify-center" style={{ fontSize: '10px' }}>▶</span>
                How It Works
              </button>
            </div>

            {/* Value Props Bar */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.2 }}
              className="flex flex-wrap gap-6 pt-8 border-t border-white/[0.1]"
            >
              {['Verified Specialists', 'Transparent Pricing', 'End-to-End Concierge', 'Recovery Support'].map((item, idx) => (
                <React.Fragment key={item}>
                  <span className="text-[14px] font-medium" style={{ color: COLORS.white }}>{item}</span>
                  {idx < 3 && <span className="text-[14px]" style={{ color: COLORS.dim }}>·</span>}
                </React.Fragment>
              ))}
            </motion.div>
          </motion.div>

          {/* RIGHT COLUMN - SafeTDiagram */}
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
      <HowItWorksModal isOpen={showModal} onClose={closeModal} />
    </>
  );
}