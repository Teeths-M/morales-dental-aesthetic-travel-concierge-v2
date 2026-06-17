import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import HowItWorksModal from './HowItWorksModal';
import ModeToggle from './ModeToggle';
import { usePlatformMode } from '@/context/PlatformModeContext';
import { BadgeCheck, Shield, Plane, Heart, ShieldCheck, Headphones, Building2, BarChart3, MapPin, HeartPulse } from 'lucide-react';
import { BRAND } from '@/lib/brandTokens';

const GOLD = BRAND.gold;
const HERO_IMAGE = 'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/e35e484d5_generated_image.png';

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
  filter: `drop-shadow(0 0 6px ${GOLD}cc) drop-shadow(0 0 12px ${GOLD}66)`,
};

// SafeTDiagram never needs to re-render — all animations are CSS-driven
// React.memo prevents re-render when LuxuryHero re-renders on mode toggle
const SafeTDiagram = React.memo(function SafeTDiagram() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
      {/* CSS keyframes injected once via index.css or here as a static string */}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}@keyframes spin-rev{from{transform:rotate(0)}to{transform:rotate(-360deg)}}`}</style>

      {TRAIL_CONFIGS.map(({ anim, delay, radii, baseOp, star }, si) => (
        <svg key={si} className="absolute w-[360px] h-[360px]" viewBox="0 0 360 360"
          style={{ animation: anim, animationDelay: delay }}>
          {PRECOMPUTED_TRAILS.map(({ tx, ty }, i) => (
            <circle key={i} cx={tx} cy={ty} r={radii[i]} fill={GOLD} opacity={baseOp - i * 0.08} />
          ))}
          <circle cx="180" cy="12" r={star.r}  fill={GOLD} opacity={star.op}  />
          <circle cx="180" cy="12" r={star.r2} fill={GOLD} opacity={star.op2} />
        </svg>
      ))}

      {/* Decorative rings */}
      <div className="absolute w-[360px] h-[360px] rounded-full" style={{ border: `1px solid ${GOLD}55`, boxShadow: `0 0 40px ${GOLD}18 inset` }} />
      <div className="absolute w-[300px] h-[300px] rounded-full" style={{ border: `1px dashed ${GOLD}44` }} />
      <div className="absolute w-[220px] h-[220px] rounded-full" style={{ border: `1px solid ${GOLD}33` }} />

      {/* Single SVG for all endpoint dots — uses pre-computed positions */}
      <svg className="absolute" width="400" height="400" viewBox="-200 -200 400 400">
        {ORBIT_NODES_COMPUTED.map(({ x, y, label }) => (
          <g key={`dot-${label}`}>
            <circle cx={x} cy={y} r="5"   fill={GOLD} opacity="0.12" />
            <circle cx={x} cy={y} r="2.5" fill={GOLD} opacity="0.9" />
          </g>
        ))}
      </svg>

      {/* Orbit node badges — pre-computed positions, stable style object */}
      {ORBIT_NODES_COMPUTED.map(({ label, icon: NodeIcon, x, y }) => (
        <div key={label} className="absolute flex items-center gap-2 px-3 py-2 rounded-2xl text-[11px] font-medium whitespace-nowrap"
          style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`, ...NODE_BADGE_STYLE }}>
          <NodeIcon className="w-3.5 h-3.5 flex-shrink-0" style={NODE_ICON_STYLE} strokeWidth={1.5} />
          {label}
        </div>
      ))}

      {/* Center shield — subtle pulse, no state */}
      <motion.div
        animate={{ scale: [1, 1.035, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
        className="relative z-10 flex flex-col items-center"
      >
        <svg viewBox="0 0 80 92" fill="none" className="w-[78px] h-[90px] relative z-10">
          <path d="M40 4L72 18V48C72 66 58 78 40 88C22 78 8 66 8 48V18L40 4Z" fill="none" stroke={GOLD} strokeWidth="3" opacity="0.12" />
          <path d="M40 6L70 19V48C70 65 57 76 40 86C23 76 10 65 10 48V19L40 6Z" fill={`${GOLD}14`} stroke={GOLD} strokeWidth="1.2" />
          <path d="M35 31H45V39H53V49H45V57H35V49H27V39H35V31Z" fill="white" opacity="0.92" />
        </svg>
        <p className="text-[9.5px] font-bold tracking-[0.24em] uppercase mt-3 relative z-10" style={{ color: GOLD }}>SAFE-T4LIFE™</p>
        <p className="text-[7px] tracking-[0.18em] uppercase mt-1 relative z-10" style={{ color: 'rgba(255,255,255,0.38)' }}>Safety Intelligence Engine</p>
      </motion.div>
    </div>
  );
});

const VIDEO_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_091828_e240eb17-6edc-4129-ad9d-98678e3fd238.mp4';
const POSTER_URL = 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1920&q=80';

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
  skyelite: {
    eyebrow: 'PRIVATE JETS',
    headline: (
      <>
        <span style={{ color: '#9CA3AF' }}>Premium.</span>
        <br />
        <span style={{ color: '#202A36', marginTop: '-12px', display: 'block' }}>Accessible.</span>
      </>
    ),
    body: 'Your dedication deserves recognition. Experience luxury private jet travel with SkyElite — where premium service meets accessible pricing.',
    cta: { label: 'Discover', path: '/private-jets' },
    ctaSecondary: { label: 'Book Now', path: '/booking' },
    trustPills: [
      { icon: Plane,      label: 'Premium Fleet',        sub: 'Latest aircraft' },
      { icon: BadgeCheck, label: 'Verified Pilots',      sub: 'Certified experts' },
      { icon: Shield,     label: 'Safety First',         sub: 'ISO certified' },
      { icon: Heart,      label: '24/7 Support',         sub: 'Always available' },
    ],
  },
};

export default function LuxuryHero() {
  const [showModal, setShowModal] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const { mode, isSkyElite } = usePlatformMode();
  const isMedical = mode === 'medical';
  const content = isSkyElite ? CONTENT.skyelite : (isMedical ? CONTENT.medical : CONTENT.nonmedical);

  // Stable callback — doesn't change between renders
  const openModal  = useCallback(() => setShowModal(true),  []);
  const closeModal = useCallback(() => setShowModal(false), []);

  return (
    <>
      <section className="relative min-h-screen overflow-hidden" style={{ background: isSkyElite ? '#000' : '#060B16', marginTop: '-68px' }}>
        {/* Full-bleed background */}
        <div className="absolute inset-0">
          {isSkyElite ? (
            <>
              {!videoError ? (
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                  poster={POSTER_URL}
                  className="w-full h-full object-cover"
                  onError={() => setVideoError(true)}
                >
                  <source src={VIDEO_URL} type="video/mp4" />
                </video>
              ) : null}
              <div 
                className="w-full h-full object-cover"
                style={{ 
                  backgroundImage: `url(${POSTER_URL})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
              <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} />
            </>
          ) : (
            <>
              <img src={HERO_IMAGE} alt="" className="w-full h-full object-cover scale-105"
                style={{ objectPosition: '70% center' }} loading="eager" fetchpriority="high" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #060B16 0%, #060B16 35%, rgba(6,11,22,0.88) 50%, rgba(6,11,22,0.45) 68%, rgba(6,11,22,0.1) 85%, transparent 100%)' }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #060B16 0%, rgba(6,11,22,0.4) 8%, transparent 18%)' }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #060B16 0%, rgba(6,11,22,0.7) 10%, transparent 25%)' }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to left, #060B16 0%, rgba(6,11,22,0.5) 6%, transparent 18%)' }} />
            </>
          )}
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
                className={`inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-[14px] transition-all duration-200 hover:opacity-90 ${
                  isSkyElite ? 'bg-gray-300 text-gray-900 hover:bg-gray-400' : ''
                }`}
                style={isSkyElite ? {} : { background: GOLD, color: '#060B16', boxShadow: `0 0 30px ${GOLD}30` }}>
                {content.cta.label}
              </Link>
              {content.ctaSecondary && (
                <Link to={content.ctaSecondary.path}
                  className={`inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-[14px] transition-all duration-200 hover:opacity-90 ${
                    isSkyElite ? 'bg-brand-dark text-white hover:bg-brand-darkHover' : ''
                  }`}
                  style={isSkyElite ? {} : { background: GOLD, color: '#060B16', boxShadow: `0 0 30px ${GOLD}30` }}>
                  {content.ctaSecondary.label}
                </Link>
              )}
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
          {!isSkyElite && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.3 }}
              className="relative hidden lg:flex items-center justify-center" style={{ height: '100vh' }}>
              <SafeTDiagram />
            </motion.div>
          )}
        </div>
      </section>
      <HowItWorksModal isOpen={showModal} onClose={closeModal} />
    </>
  );
}