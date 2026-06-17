import React, { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import HowItWorksModal from './HowItWorksModal';
import ModeToggle from './ModeToggle';
import { usePlatformMode } from '@/context/PlatformModeContext';
import { BadgeCheck, Shield, Plane, Heart, ShieldCheck, Headphones, Building2, BarChart3, MapPin, HeartPulse } from 'lucide-react';

// ── Color Tokens ──────────────────────────────────────────────────────────────
const COLORS = {
  bg: '#0B1623',
  gold: '#C9A84C',
  cyan: '#00E5CC',
  white: '#FFFFFF',
  muted: '#A0AEC0',
  dim: '#6B7E93',
  surface: '#0F1E30',
  cardBg: 'rgba(11,22,35,0.88)',
  jetBody: '#1A2535',
};

// ── Orbit Nodes (unchanged structure, restyled visuals) ───────────────────────
const orbitNodes = [
  { label: 'Verified Specialists', icon: ShieldCheck, angle: 270, r: 155 },
  { label: '24/7 Support',         icon: Headphones,  angle: 195, r: 155 },
  { label: 'Safe Facilities',      icon: Building2,   angle: 345, r: 155 },
  { label: 'Risk Intelligence',    icon: BarChart3,   angle: 160, r: 155 },
  { label: 'Travel Coordination',  icon: Plane,       angle: 15,  r: 155 },
  { label: 'Recovery Care',        icon: HeartPulse,  angle: 105, r: 155 },
];

// ── Pre-computed positions (performance optimization) ──────────────────────────
const DEG2RAD = Math.PI / 180;
const ORBIT_NODES_COMPUTED = orbitNodes.map(node => ({
  ...node,
  x: node.r * Math.cos(node.angle * DEG2RAD),
  y: node.r * Math.sin(node.angle * DEG2RAD),
}));

const TRAIL_DEGS = [8, 20, 35, 52, 72];
const PRECOMPUTED_TRAILS = TRAIL_DEGS.map(deg => ({
  tx: 180 + 168 * Math.sin(deg * DEG2RAD),
  ty: 12 + 168 * (1 - Math.cos(deg * DEG2RAD)),
}));

const TRAIL_CONFIGS = [
  { anim: 'spin 18s linear infinite',  delay: undefined, radii: [1.8,1.52,1.24,0.96,0.68], baseOp: 0.55, star: { r: 3,   op: 0.95, r2: 5.5, op2: 0.18 } },
  { anim: 'spin-rev 24s linear infinite', delay: undefined, radii: [1.5,1.28,1.06,0.84,0.62], baseOp: 0.45, star: { r: 2.5, op: 0.8,  r2: 4.5, op2: 0.14 } },
  { anim: 'spin 30s linear infinite',  delay: '-8s',     radii: [1.3,1.12,0.94,0.76,0.58], baseOp: 0.38, star: { r: 2,   op: 0.65, r2: 4,   op2: 0.11 } },
];

// ── SafeTDiagram Component (restyled) ──────────────────────────────────────────
const SafeTDiagram = React.memo(function SafeTDiagram() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}@keyframes spin-rev{from{transform:rotate(0)}to{transform:rotate(-360deg)}}`}</style>

      {/* Glitter trails */}
      {TRAIL_CONFIGS.map(({ anim, delay, radii, baseOp, star }, si) => (
        <svg key={si} className="absolute w-[360px] h-[360px]" viewBox="0 0 360 360"
          style={{ animation: anim, animationDelay: delay }}>
          {PRECOMPUTED_TRAILS.map(({ tx, ty }, i) => (
            <circle key={i} cx={tx} cy={ty} r={radii[i]} fill={COLORS.gold} opacity={baseOp - i * 0.08} />
          ))}
          <circle cx="180" cy="12" r={star.r}  fill={COLORS.gold} opacity={star.op}  />
          <circle cx="180" cy="12" r={star.r2} fill={COLORS.gold} opacity={star.op2} />
        </svg>
      ))}

      {/* Outer rings - restyled with gold borders */}
      <div className="absolute w-[360px] h-[360px] rounded-full" style={{ border: `1px solid ${COLORS.gold}33` }} />
      <div className="absolute w-[300px] h-[300px] rounded-full" style={{ border: `1px solid ${COLORS.gold}1a` }} />

      {/* Endpoint dots */}
      <svg className="absolute" width="400" height="400" viewBox="-200 -200 400 400">
        {ORBIT_NODES_COMPUTED.map(({ x, y, label }) => (
          <g key={`dot-${label}`}>
            <circle cx={x} cy={y} r="5"   fill={COLORS.gold} opacity="0.12" />
            <circle cx={x} cy={y} r="2.5" fill={COLORS.gold} opacity="0.9" />
          </g>
        ))}
      </svg>

      {/* Orbit node badges - restyled */}
      {ORBIT_NODES_COMPUTED.map(({ label, icon: NodeIcon, x, y }, idx) => {
        const dotColor = idx % 2 === 0 ? COLORS.gold : COLORS.cyan;
        return (
          <div key={label} className="absolute flex items-center gap-2 px-3 py-2 rounded-2xl text-[13px] font-medium whitespace-nowrap"
            style={{ 
              left: `calc(50% + ${x}px)`, 
              top: `calc(50% + ${y}px)`,
              background: COLORS.cardBg,
              border: '1px solid rgba(255,255,255,0.14)',
              color: COLORS.white,
              backdropFilter: 'blur(16px)',
            }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }} />
            <NodeIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: dotColor }} strokeWidth={1.5} />
            {label}
          </div>
        );
      })}

      {/* Center shield - restyled */}
      <motion.div
        animate={{ scale: [1, 1.035, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="w-[78px] h-[78px] rounded-full flex items-center justify-center"
          style={{ 
            background: COLORS.surface,
            border: `2px solid ${COLORS.gold}`,
            boxShadow: `0 0 40px ${COLORS.gold}22`,
          }}>
          <Shield className="w-[52px] h-[52px]" style={{ color: COLORS.gold }} strokeWidth={1.5} />
        </div>
        <p className="text-[13px] font-bold tracking-[0.1em] uppercase mt-3 relative z-10" style={{ color: COLORS.gold }}>
          SAFE-T4LIFE™
        </p>
        <p className="text-[9px] tracking-[0.15em] uppercase mt-1 relative z-10" style={{ color: COLORS.dim }}>
          SAFETY INTELLIGENCE ENGINE
        </p>
      </motion.div>
    </div>
  );
});

// ── Content (unchanged text) ───────────────────────────────────────────────────
const CONTENT = {
  medical: {
    eyebrow: 'World-Class Care. Personalized For You.',
    headline: <>Premium Medical Travel.<br />Verified.{' '}<span style={{ color: COLORS.gold }}>Safe.</span>{' '}Seamless.</>,
    body: 'Morales coordinates every step of your dental or aesthetic care journey — from consultation to recovery. You focus on yourself. We handle the rest.',
    cta: { label: 'Book Your Consultation →', path: '/booking' },
    trustPills: [
      { icon: BadgeCheck, label: 'Verified Specialists', sub: 'World-class experts' },
      { icon: Shield,     label: 'Transparent Pricing',  sub: 'No hidden fees' },
      { icon: Plane,      label: 'End-to-End Concierge', sub: 'We handle everything' },
      { icon: Heart,      label: 'Recovery Support',     sub: "Until you're home" },
    ],
  },
  nonmedical: {
    eyebrow: 'Bespoke Travel. Effortlessly Arranged.',
    headline: <>The World,{' '}<span style={{ color: COLORS.gold }}>Curated</span>{' '}For You.</>,
    body: 'Flights, hotels, private transfers, personal companions, and real-time safety — all in one place. Travel your way, with white-glove support at every step.',
    cta: { label: 'Plan My Trip →', path: '/travel-concierge' },
    trustPills: [
      { icon: Plane,      label: '190+ Countries',       sub: 'Worldwide coverage' },
      { icon: BadgeCheck, label: 'Vetted Partners',       sub: 'Quality guaranteed' },
      { icon: MapPin,     label: 'Private Transfers',     sub: 'Door-to-door service' },
      { icon: Shield,     label: '24/7 Safety',           sub: 'SOS & monitoring' },
    ],
  },
};

// ── Private Jet Illustration Component ─────────────────────────────────────────
function PrivateJetIllustration() {
  return (
    <div className="absolute right-0 bottom-0 w-full h-full pointer-events-none select-none">
      <svg viewBox="0 0 500 400" className="absolute right-[-50px] bottom-[10%] w-[550px] h-[400px]" style={{ transform: 'rotate(-8deg)' }}>
        {/* Fuselage - sleek metallic body */}
        <ellipse cx="250" cy="200" rx="180" ry="45" 
          fill="url(#jetBodyGradient)" 
          stroke={COLORS.gold} 
          strokeWidth="0.8" 
          opacity="0.95" />
        
        {/* Cockpit window */}
        <path d="M 380 185 Q 410 190 420 200 L 425 205 Q 415 210 385 205 Z" 
          fill="#0F1E30" 
          stroke={COLORS.gold} 
          strokeWidth="0.6" 
          opacity="0.8" />
        
        {/* Main wing */}
        <path d="M 220 210 L 280 280 L 340 290 L 260 230 Z" 
          fill="url(#wingGradient)" 
          stroke={COLORS.gold} 
          strokeWidth="0.7" 
          opacity="0.85" />
        
        {/* Engine nacelle */}
        <ellipse cx="290" cy="245" rx="28" ry="14" 
          fill="url(#engineGradient)" 
          stroke={COLORS.gold} 
          strokeWidth="0.8" 
          opacity="0.9" />
        
        {/* Tail fin */}
        <path d="M 100 185 L 60 130 L 80 125 L 115 180 Z" 
          fill="url(#tailGradient)" 
          stroke={COLORS.gold} 
          strokeWidth="0.6" 
          opacity="0.8" />
        
        {/* Winglet */}
        <path d="M 335 288 L 345 275 L 350 280 L 340 292 Z" 
          fill={COLORS.jetBody} 
          stroke={COLORS.gold} 
          strokeWidth="0.5" 
          opacity="0.7" />
        
        {/* Subtle highlight along fuselage */}
        <path d="M 90 195 Q 180 188 350 192 Q 400 195 420 200" 
          fill="none" 
          stroke="rgba(255,255,255,0.15)" 
          strokeWidth="1" 
          opacity="0.7" />
        
        {/* Gradients */}
        <defs>
          <linearGradient id="jetBodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={COLORS.jetBody} />
            <stop offset="50%" stopColor="#2A3848" />
            <stop offset="100%" stopColor={COLORS.jetBody} />
          </linearGradient>
          <linearGradient id="wingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#152030" />
            <stop offset="100%" stopColor="#2A3848" />
          </linearGradient>
          <radialGradient id="engineGradient" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#2A3848" />
            <stop offset="100%" stopColor="#0F1E30" />
          </radialGradient>
          <linearGradient id="tailGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={COLORS.jetBody} />
            <stop offset="100%" stopColor="#0F1E30" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Cloud layers - soft ellipses for depth */}
      <div className="absolute right-[10%] top-[20%] w-[300px] h-[150px] rounded-full"
        style={{ background: 'rgba(255,255,255,0.04)', filter: 'blur(40px)' }} />
      <div className="absolute right-[5%] top-[35%] w-[250px] h-[120px] rounded-full"
        style={{ background: 'rgba(255,255,255,0.06)', filter: 'blur(50px)' }} />
      <div className="absolute right-[15%] top-[45%] w-[280px] h-[140px] rounded-full"
        style={{ background: 'rgba(255,255,255,0.05)', filter: 'blur(45px)' }} />
      <div className="absolute right-[20%] bottom-[30%] w-[200px] h-[100px] rounded-full"
        style={{ background: 'rgba(255,255,255,0.04)', filter: 'blur(35px)' }} />
      
      {/* Warm amber/gold glow beneath jet */}
      <div className="absolute right-[15%] bottom-[20%] w-[350px] h-[200px] rounded-full"
        style={{ 
          background: `radial-gradient(ellipse at center, ${COLORS.gold}26 0%, transparent 70%)`,
          filter: 'blur(60px)',
        }} />
    </div>
  );
}

// ── Main LuxuryHero Component ──────────────────────────────────────────────────
export default function LuxuryHero() {
  const [showModal, setShowModal] = useState(false);
  const { mode } = usePlatformMode();
  const isMedical = mode === 'medical';
  const content = isMedical ? CONTENT.medical : CONTENT.nonmedical;

  const openModal  = useCallback(() => setShowModal(true),  []);
  const closeModal = useCallback(() => setShowModal(false), []);

  return (
    <>
      <section className="relative min-h-screen overflow-hidden" style={{ background: COLORS.bg, marginTop: '-68px' }}>
        {/* Background layers */}
        <div className="absolute inset-0">
          {/* Deep space-navy base */}
          <div className="absolute inset-0" style={{ background: COLORS.bg }} />
          
          {/* Subtle gradient overlay for depth */}
          <div className="absolute inset-0" style={{ 
            background: 'radial-gradient(ellipse at 70% 60%, rgba(201,168,76,0.08) 0%, transparent 50%)' 
          }} />
        </div>

        {/* Private jet illustration on right side */}
        <PrivateJetIllustration />

        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-0 items-center min-h-screen py-24 lg:py-0" style={{ paddingTop: '68px' }}>

          {/* LEFT COLUMN */}
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: 'easeOut' }} className="flex flex-col z-10 lg:pr-16">

            <div className="mb-7"><ModeToggle /></div>

            {/* Eyebrow text */}
            <AnimatePresence mode="wait">
              <motion.p key={`eyebrow-${mode}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}
                className="text-[11px] font-bold tracking-[0.22em] uppercase mb-6" style={{ color: COLORS.gold }}>
                {content.eyebrow}
              </motion.p>
            </AnimatePresence>

            {/* Main headline */}
            <AnimatePresence mode="wait">
              <motion.h1 key={`headline-${mode}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}
                className="font-display text-white leading-[1.06] mb-6"
                style={{ fontSize: 'clamp(52px, 6vw, 72px)' }}>
                {content.headline}
              </motion.h1>
            </AnimatePresence>

            {/* Body copy */}
            <AnimatePresence mode="wait">
              <motion.p key={`body-${mode}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
                className="text-[16px] leading-[1.75] mb-10 max-w-[480px]" style={{ color: COLORS.muted }}>
                {content.body}
              </motion.p>
            </AnimatePresence>

            {/* CTA button */}
            <div className="flex flex-wrap gap-4 mb-12">
              <Link to={content.cta.path}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-[30px] font-bold text-[16px] transition-all duration-200 hover:opacity-90"
                style={{ background: COLORS.gold, color: COLORS.bg }}>
                {content.cta.label}
              </Link>
              {isMedical && (
                <button onClick={openModal}
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-[14px] text-white border border-white/25 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/40 transition-all duration-200">
                  <span className="w-6 h-6 rounded-full border border-white/30 flex items-center justify-center" style={{ fontSize: '10px' }}>▶</span>
                  How It Works
                </button>
              )}
            </div>

            {/* Stats bar */}
            <AnimatePresence mode="wait">
              <motion.div key={`pills-${mode}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.35 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-5 pt-8 border-t border-white/[0.1]">
                {content.trustPills.map(({ icon: Icon, label, sub }, idx) => (
                  <div key={label} className="flex flex-col gap-1.5">
                    <Icon className="w-4 h-4" style={{ color: COLORS.gold }} strokeWidth={1.5} />
                    <p className="text-[15px] font-semibold text-white leading-tight">{label}</p>
                    <p className="text-[12px]" style={{ color: COLORS.dim }}>{sub}</p>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* RIGHT COLUMN - SafeTDiagram */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.3 }}
            className="relative hidden lg:flex items-center justify-center" style={{ height: '100vh' }}>
            <SafeTDiagram />
          </motion.div>
        </div>
      </section>
      <HowItWorksModal isOpen={showModal} onClose={closeModal} />
    </>
  );
}