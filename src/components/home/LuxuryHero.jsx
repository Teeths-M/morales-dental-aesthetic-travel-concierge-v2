import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import HowItWorksModal from './HowItWorksModal';
import ModeToggle from './ModeToggle';
import { usePlatformMode } from '@/context/PlatformModeContext';
import { BadgeCheck, Shield, Plane, Heart, ShieldCheck, Headphones, Building2, BarChart3, MapPin, HeartPulse } from 'lucide-react';
import { BRAND } from '@/lib/brandTokens';

const GOLD = BRAND.gold;
const CYAN_GLOW = '#22d3ee';
const HERO_IMAGE = 'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/f28c3ff3f_generated_image.png';

const orbitNodes = [
  { label: 'Verified Specialists', icon: ShieldCheck, angle: 270, r: 155 },
  { label: '24/7 Support',         icon: Headphones,  angle: 195, r: 155 },
  { label: 'Safe Facilities',      icon: Building2,   angle: 345, r: 155 },
  { label: 'Risk Intelligence',    icon: BarChart3,   angle: 160, r: 155 },
  { label: 'Travel Coordination',  icon: Plane,       angle: 15,  r: 155 },
  { label: 'Recovery Care',        icon: HeartPulse,  angle: 105, r: 155 },
];

// ── All expensive calculations done ONCE at module load, never at render time ──
const DEG2RAD = Math.PI / 180;

// Pre-compute orbit node (x,y) positions — trig runs 6 times total, ever
const ORBIT_NODES_COMPUTED = orbitNodes.map(node => ({
  ...node,
  x: node.r * Math.cos(node.angle * DEG2RAD),
  y: node.r * Math.sin(node.angle * DEG2RAD),
}));

// Pre-compute glitter trail dot positions — 3 configs × 5 dots = 15 trig calls, ever
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

// Stable style objects — hoisted to avoid new object allocation per render
const NODE_BADGE_STYLE = {
  transform: 'translate(-50%, -50%)',
  background: 'rgba(5,9,18,0.82)',
  border: '1px solid rgba(212,175,55,0.28)',
  color: 'rgba(255,255,255,0.88)',
  backdropFilter: 'blur(16px)',
  boxShadow: '0 2px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.06) inset',
};
const NODE_ICON_STYLE = {
  color: GOLD,
  filter: `drop-shadow(0 0 8px ${GOLD}dd) drop-shadow(0 0 16px ${GOLD}88)`,
};

const CYAN_NODE_STYLE = {
  color: CYAN_GLOW,
  filter: `drop-shadow(0 0 8px ${CYAN_GLOW}dd) drop-shadow(0 0 16px ${CYAN_GLOW}88)`,
};

// SafeTDiagram never needs to re-render — all animations are CSS-driven
// React.memo prevents re-render when LuxuryHero re-renders on mode toggle
const SafeTDiagram = React.memo(function SafeTDiagram() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}@keyframes spin-rev{from{transform:rotate(0)}to{transform:rotate(-360deg)}}@keyframes pulse-glow{0%,100%{opacity:0.6;transform:scale(1)}50%{opacity:1;transform:scale(1.05)}}`}</style>

      {/* Outer glow rings with cyan accent */}
      <div className="absolute w-[420px] h-[420px] rounded-full" style={{ border: `1px solid ${CYAN_GLOW}33`, boxShadow: `0 0 60px ${CYAN_GLOW}22 inset` }} />
      <div className="absolute w-[360px] h-[360px] rounded-full" style={{ border: `1px solid ${GOLD}44`, boxShadow: `0 0 40px ${GOLD}18 inset` }} />
      <div className="absolute w-[300px] h-[300px] rounded-full" style={{ border: `1px dashed ${GOLD}33` }} />
      <div className="absolute w-[240px] h-[240px] rounded-full" style={{ border: `1px solid ${CYAN_GLOW}22` }} />

      {/* Glitter trails */}
      {TRAIL_CONFIGS.map(({ anim, delay, radii, baseOp, star }, si) => (
        <svg key={si} className="absolute w-[400px] h-[400px]" viewBox="0 0 400 400"
          style={{ animation: anim, animationDelay: delay }}>
          {PRECOMPUTED_TRAILS.map(({ tx, ty }, i) => (
            <circle key={i} cx={tx + 20} cy={ty + 20} r={radii[i]} fill={GOLD} opacity={baseOp - i * 0.08} />
          ))}
          <circle cx="200" cy="20" r={star.r}  fill={GOLD} opacity={star.op}  />
          <circle cx="200" cy="20" r={star.r2} fill={GOLD} opacity={star.op2} />
        </svg>
      ))}

      {/* Connection lines to nodes */}
      <svg className="absolute" width="500" height="500" viewBox="-250 -250 500 500">
        {ORBIT_NODES_COMPUTED.map(({ x, y }) => (
          <line key={`line-${x}-${y}`} x1="0" y1="0" x2={x} y2={y} stroke={CYAN_GLOW} strokeWidth="0.5" opacity="0.15" />
        ))}
      </svg>

      {/* Endpoint dots with cyan glow */}
      <svg className="absolute" width="500" height="500" viewBox="-250 -250 500 500">
        {ORBIT_NODES_COMPUTED.map(({ x, y, label }) => (
          <g key={`dot-${label}`}>
            <circle cx={x} cy={y} r="6" fill={CYAN_GLOW} opacity="0.08" />
            <circle cx={x} cy={y} r="3" fill={CYAN_GLOW} opacity="0.85" style={{ filter: `drop-shadow(0 0 6px ${CYAN_GLOW})` }} />
          </g>
        ))}
      </svg>

      {/* Orbit node badges with cyan/gold hybrid styling */}
      {ORBIT_NODES_COMPUTED.map(({ label, icon: NodeIcon, x, y }) => (
        <div key={label} className="absolute flex items-center gap-2 px-3 py-2.5 rounded-2xl text-[11px] font-medium whitespace-nowrap backdrop-blur-xl"
          style={{ 
            left: `calc(50% + ${x}px)`, 
            top: `calc(50% + ${y}px)`, 
            background: 'rgba(11,18,25,0.85)',
            border: `1px solid rgba(34,211,238,0.25)`,
            color: 'rgba(255,255,255,0.9)',
            boxShadow: `0 2px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(34,211,238,0.08) inset`
          }}>
          <NodeIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: CYAN_GLOW, filter: `drop-shadow(0 0 6px ${CYAN_GLOW}cc)` }} strokeWidth={1.5} />
          {label}
        </div>
      ))}

      {/* Center SAFE-T4LIFE emblem with enhanced glow */}
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
        className="relative z-10 flex flex-col items-center"
      >
        {/* Outer glow */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ filter: `drop-shadow(0 0 20px ${CYAN_GLOW}66) drop-shadow(0 0 40px ${GOLD}44)` }}>
          <svg viewBox="0 0 80 92" fill="none" className="w-[88px] h-[96px] relative z-10">
            <path d="M40 4L72 18V48C72 66 58 78 40 88C22 78 8 66 8 48V18L40 4Z" fill="none" stroke={CYAN_GLOW} strokeWidth="2" opacity="0.4" />
            <path d="M40 8L70 20V48C70 64 58 74 40 84C22 74 10 64 10 48V20L40 8Z" fill={`url(#shieldGradient)`} stroke={GOLD} strokeWidth="1.5" />
            <defs>
              <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={CYAN_GLOW} stopOpacity="0.2" />
                <stop offset="100%" stopColor={GOLD} stopOpacity="0.15" />
              </linearGradient>
            </defs>
            <path d="M35 32H45V40H53V50H45V58H35V50H27V40H35V32Z" fill="white" opacity="0.95" style={{ filter: `drop-shadow(0 0 8px white)` }} />
          </svg>
        </div>
        <p className="text-[10px] font-bold tracking-[0.28em] uppercase mt-4 relative z-10" style={{ color: GOLD, textShadow: `0 0 12px ${GOLD}88` }}>SAFE-T4LIFE™</p>
        <p className="text-[7px] tracking-[0.2em] uppercase mt-1.5 relative z-10" style={{ color: CYAN_GLOW, textShadow: `0 0 8px ${CYAN_GLOW}88` }}>Safety Intelligence Engine</p>
      </motion.div>
    </div>
  );
});

const CONTENT = {
  medical: {
    eyebrow: 'World-Class Care. Personalized For You.',
    headline: <>Premium Medical Travel.<br />Verified.{' '}<span style={{ color: GOLD }}>Safe.</span>{' '}Seamless.</>,
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
    headline: <>The World,{' '}<span style={{ color: GOLD }}>Curated</span>{' '}For You.</>,
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

export default function LuxuryHero() {
  const [showModal, setShowModal] = useState(false);
  const { mode } = usePlatformMode();
  const isMedical = mode === 'medical';
  const content = isMedical ? CONTENT.medical : CONTENT.nonmedical;

  // Stable callback — doesn't change between renders
  const openModal  = useCallback(() => setShowModal(true),  []);
  const closeModal = useCallback(() => setShowModal(false), []);

  return (
    <>
      <section className="relative min-h-screen overflow-hidden" style={{ background: '#0b1219', marginTop: '-68px' }}>
        {/* Full-bleed background */}
        <div className="absolute inset-0">
          <img src={HERO_IMAGE} alt="Premium medical travel with Safe-T4Life safety intelligence" className="w-full h-full object-cover"
            style={{ objectPosition: 'center center' }} loading="eager" fetchpriority="high" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #0b1219 0%, #0b1219 30%, rgba(11,18,25,0.85) 45%, rgba(11,18,25,0.4) 65%, transparent 100%)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #0b1219 0%, rgba(11,18,25,0.5) 10%, transparent 25%)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #0b1219 0%, rgba(11,18,25,0.8) 12%, transparent 30%)' }} />
        </div>

        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-0 items-center min-h-screen py-24 lg:py-0" style={{ paddingTop: '68px' }}>

          {/* LEFT */}
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: 'easeOut' }} className="flex flex-col z-10 lg:pr-16">

            <div className="mb-7"><ModeToggle /></div>

            <AnimatePresence mode="wait">
              <motion.p key={`eyebrow-${mode}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}
                className="text-[11px] font-bold tracking-[0.28em] uppercase mb-6" style={{ color: GOLD }}>
                {content.eyebrow}
              </motion.p>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.h1 key={`headline-${mode}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}
                className="font-display text-white leading-[1.06] mb-6"
                style={{ fontSize: 'clamp(2.8rem, 4.5vw, 4rem)' }}>
                {content.headline}
              </motion.h1>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.p key={`body-${mode}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
                className="text-[15px] text-white/55 leading-relaxed mb-10 max-w-[420px]">
                {content.body}
              </motion.p>
            </AnimatePresence>

            <div className="flex flex-wrap gap-4 mb-12">
              <Link to={content.cta.path}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-[14px] transition-all duration-200 hover:opacity-90"
                style={{ background: GOLD, color: '#060B16', boxShadow: `0 0 30px ${GOLD}30` }}>
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

            <AnimatePresence mode="wait">
              <motion.div key={`pills-${mode}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.35 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-5 pt-8 border-t border-white/[0.08]">
                {content.trustPills.map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="flex flex-col gap-1.5">
                    <Icon className="w-4 h-4" style={NODE_ICON_STYLE} strokeWidth={1.5} />
                    <p className="text-[12px] font-medium text-white leading-tight tracking-wide">{label}</p>
                    <p className="text-[11px] text-white/65 tracking-wide">{sub}</p>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* RIGHT — SafeTDiagram is memoized, never re-renders on mode toggle */}
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