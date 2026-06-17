import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import HowItWorksModal from './HowItWorksModal';
import ModeToggle from './ModeToggle';
import { usePlatformMode } from '@/context/PlatformModeContext';
import { BadgeCheck, Shield, Plane, Heart, ShieldCheck, Headphones, Building2, BarChart3, MapPin, HeartPulse } from 'lucide-react';
import { BRAND } from '@/lib/brandTokens';

const GOLD = BRAND.gold;
const GOLD_LIGHT = '#F4D66A';
const GOLD_DARK = '#B8941F';
const CYAN_GLOW = '#22d3ee';
const HERO_IMAGE = 'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/102642e19_generated_image.png';

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

      {/* Outer glow rings with luxury gold/cyan blend */}
      <div className="absolute w-[420px] h-[420px] rounded-full" style={{ border: `1px solid ${GOLD}25`, boxShadow: `0 0 80px ${GOLD}15 inset, 0 0 40px ${CYAN_GLOW}10 inset` }} />
      <div className="absolute w-[360px] h-[360px] rounded-full" style={{ border: `1px solid ${GOLD}40`, boxShadow: `0 0 60px ${GOLD}20 inset` }} />
      <div className="absolute w-[300px] h-[300px] rounded-full" style={{ border: `1px dashed ${GOLD}35` }} />
      <div className="absolute w-[240px] h-[240px] rounded-full" style={{ border: `1px solid ${GOLD}30`, boxShadow: `0 0 30px ${GOLD}12 inset` }} />

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

      {/* Orbit node badges with hover lift effect */}
      {ORBIT_NODES_COMPUTED.map(({ label, icon: NodeIcon, x, y }) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          whileHover={{ scale: 1.05, y: -3 }}
          className="absolute flex items-center gap-2 px-3 py-2.5 rounded-2xl text-[11px] font-medium whitespace-nowrap backdrop-blur-xl cursor-pointer"
          style={{ 
            left: `calc(50% + ${x}px)`, 
            top: `calc(50% + ${y}px)`, 
            background: 'linear-gradient(135deg, rgba(11,18,25,0.95) 0%, rgba(18,28,38,0.88) 100%)',
            border: `1px solid rgba(212,175,55,0.35)`,
            color: 'rgba(255,255,255,0.95)',
            boxShadow: `0 4px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,175,55,0.12) inset, 0 0 20px rgba(212,175,55,0.08)`
          }}>
          <NodeIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: GOLD, filter: `drop-shadow(0 0 8px ${GOLD}cc) drop-shadow(0 0 16px ${GOLD}66)` }} strokeWidth={1.5} />
          {label}
        </motion.div>
      ))}

      {/* Center SAFE-T4LIFE emblem with enhanced luxury styling */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: [1, 1.03, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: [0.45, 0, 0.55, 1], delay: 0.3 }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="absolute inset-0 flex items-center justify-center" style={{ filter: `drop-shadow(0 0 30px ${GOLD}55) drop-shadow(0 0 60px ${GOLD}33) drop-shadow(0 0 90px ${CYAN_GLOW}22)` }}>
          <svg viewBox="0 0 80 92" fill="none" className="w-[96px] h-[104px] relative z-10">
            <path d="M40 4L72 18V48C72 66 58 78 40 88C22 78 8 66 8 48V18L40 4Z" fill="none" stroke={GOLD} strokeWidth="1.5" opacity="0.5" />
            <path d="M40 8L70 20V48C70 64 58 74 40 84C22 74 10 64 10 48V20L40 8Z" fill={`url(#shieldGradientLux)`} stroke={GOLD} strokeWidth="2" />
            <defs>
              <linearGradient id="shieldGradientLux" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={GOLD_LIGHT} stopOpacity="0.25" />
                <stop offset="50%" stopColor={GOLD} stopOpacity="0.18" />
                <stop offset="100%" stopColor={GOLD_DARK} stopOpacity="0.12" />
              </linearGradient>
            </defs>
            <path d="M35 32H45V40H53V50H45V58H35V50H27V40H35V32Z" fill="white" opacity="1" style={{ filter: `drop-shadow(0 0 12px ${GOLD})` }} />
          </svg>
        </div>
        <p className="text-[11px] font-bold tracking-[0.35em] uppercase mt-5 relative z-10" style={{ color: GOLD_LIGHT, textShadow: `0 0 16px ${GOLD}aa, 0 0 32px ${GOLD}66` }}>SAFE-T4LIFE™</p>
        <p className="text-[8px] tracking-[0.25em] uppercase mt-2 relative z-10" style={{ color: CYAN_GLOW, textShadow: `0 0 10px ${CYAN_GLOW}aa` }}>Safety Intelligence Engine</p>
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
      <section className="relative min-h-screen overflow-hidden" style={{ background: '#060a0f', marginTop: '-68px' }}>
        {/* Full-bleed background with geometric pattern overlay */}
        <div className="absolute inset-0">
          <img src={HERO_IMAGE} alt="Premium medical travel with Safe-T4Life safety intelligence" className="w-full h-full object-cover"
            style={{ objectPosition: 'center center' }} loading="eager" fetchpriority="high" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #060a0f 0%, #060a0f 25%, rgba(6,10,15,0.88) 40%, rgba(6,10,15,0.5) 60%, transparent 100%)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #060a0f 0%, rgba(6,10,15,0.6) 8%, transparent 20%)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #060a0f 0%, rgba(6,10,15,0.85) 10%, transparent 25%)' }} />
          {/* Subtle geometric pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `repeating-linear-gradient(45deg, ${GOLD} 0px, ${GOLD} 1px, transparent 1px, transparent 40px),
                              repeating-linear-gradient(-45deg, ${GOLD} 0px, ${GOLD} 1px, transparent 1px, transparent 40px)`,
          }} />
          {/* Radial glow for depth */}
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 70% 50%, rgba(212,175,55,0.08) 0%, transparent 50%)' }} />
        </div>

        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-0 items-center min-h-screen py-24 lg:py-0" style={{ paddingTop: '68px' }}>

          {/* LEFT */}
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: 'easeOut' }} className="flex flex-col z-10 lg:pr-16">

            <div className="mb-7"><ModeToggle /></div>

            <AnimatePresence mode="wait">
              <motion.p key={`eyebrow-${mode}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}
                className="text-[11px] font-bold tracking-[0.32em] uppercase mb-6" style={{ color: GOLD }}>
                {content.eyebrow}
              </motion.p>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.h1 key={`headline-${mode}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                className="font-display text-white leading-[1.08] mb-7"
                style={{ fontSize: 'clamp(3rem, 5vw, 4.5rem)', letterSpacing: '-0.02em' }}>
                {content.headline}
              </motion.h1>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.p key={`body-${mode}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.35, delay: 0.1 }}
                className="text-[15px] text-white/60 leading-relaxed mb-11 max-w-[440px]">
                {content.body}
              </motion.p>
            </AnimatePresence>

            <div className="flex flex-wrap gap-4 mb-14">
              <Link to={content.cta.path}
                className="group relative inline-flex items-center gap-2.5 px-9 py-4 rounded-xl font-semibold text-[14px] overflow-hidden transition-all duration-400 hover:shadow-2xl hover:-translate-y-1"
                style={{ 
                  background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_LIGHT} 50%, ${GOLD_DARK} 100%)`, 
                  color: '#060B16', 
                  boxShadow: `0 12px 48px ${GOLD}50, 0 0 0 1px ${GOLD}80 inset`,
                  textShadow: '0 1px 2px rgba(255,255,255,0.25)'
                }}>
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400"
                  style={{ background: `linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)` }} />
                <span className="relative z-10">{content.cta.label}</span>
                <span className="relative z-10 transition-transform duration-400 group-hover:translate-x-1.5">→</span>
              </Link>
              {isMedical && (
                <button onClick={openModal}
                  className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl font-semibold text-[14px] text-white/90 border border-white/20 bg-white/[0.03] backdrop-blur-sm hover:bg-white/[0.08] hover:border-white/35 hover:-translate-y-0.5 transition-all duration-300">
                  <span className="w-6 h-6 rounded-full border border-white/25 flex items-center justify-center" style={{ fontSize: '9px' }}>▶</span>
                  How It Works
                </button>
              )}
            </div>

            {/* Gold divider line */}
            <div className="w-24 h-[1px] mb-8" style={{ background: `linear-gradient(90deg, transparent 0%, ${GOLD} 50%, transparent 100%)` }} />
            
            <AnimatePresence mode="wait">
              <motion.div key={`pills-${mode}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.4, delay: 0.15 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-5 pt-2">
                {content.trustPills.map(({ icon: Icon, label, sub }) => (
                  <motion.div 
                    key={label} 
                    className="flex flex-col gap-2 p-3 rounded-xl transition-all duration-300 hover:-translate-y-1"
                    style={{
                      background: `linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.02) 100%)`,
                      border: `1px solid ${GOLD}15`,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
                    }}
                    whileHover={{ 
                      boxShadow: `0 8px 24px ${GOLD}20`,
                      borderColor: `${GOLD}35`
                    }}
                  >
                    <Icon className="w-5 h-5" style={NODE_ICON_STYLE} strokeWidth={1.5} />
                    <p className="text-[12px] font-semibold text-white leading-tight tracking-wide">{label}</p>
                    <p className="text-[11px] text-white/60 tracking-wide">{sub}</p>
                  </motion.div>
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