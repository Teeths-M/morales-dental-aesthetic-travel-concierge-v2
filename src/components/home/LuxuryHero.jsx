import React, { useState } from 'react';
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

function deg2rad(d) { return (d * Math.PI) / 180; }

function SafeTDiagram() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">

      {/* Orbiting golden stars with glitter trails */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin-rev { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
      `}</style>

      {/* Star 1 — 18s */}
      <svg className="absolute w-[360px] h-[360px]" viewBox="0 0 360 360" style={{ animation: 'spin 18s linear infinite' }}>
        {/* Glitter trail: fading dots behind the star */}
        {[8, 20, 35, 52, 72].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const tx = 180 + 168 * Math.sin(rad);
          const ty = 12 + 168 * (1 - Math.cos(rad));
          return <circle key={i} cx={tx} cy={ty} r={1.8 - i * 0.28} fill={GOLD} opacity={0.55 - i * 0.1} />;
        })}
        <circle cx="180" cy="12" r="3" fill={GOLD} opacity="0.95" />
        <circle cx="180" cy="12" r="5.5" fill={GOLD} opacity="0.18" />
      </svg>

      {/* Star 2 — 24s reverse */}
      <svg className="absolute w-[360px] h-[360px]" viewBox="0 0 360 360" style={{ animation: 'spin-rev 24s linear infinite' }}>
        {[8, 20, 35, 52, 72].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const tx = 180 + 168 * Math.sin(rad);
          const ty = 12 + 168 * (1 - Math.cos(rad));
          return <circle key={i} cx={tx} cy={ty} r={1.5 - i * 0.22} fill={GOLD} opacity={0.45 - i * 0.08} />;
        })}
        <circle cx="180" cy="12" r="2.5" fill={GOLD} opacity="0.8" />
        <circle cx="180" cy="12" r="4.5" fill={GOLD} opacity="0.14" />
      </svg>

      {/* Star 3 — 30s, offset */}
      <svg className="absolute w-[360px] h-[360px]" viewBox="0 0 360 360" style={{ animation: 'spin 30s linear infinite', animationDelay: '-8s' }}>
        {[8, 20, 35, 52, 72].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const tx = 180 + 168 * Math.sin(rad);
          const ty = 12 + 168 * (1 - Math.cos(rad));
          return <circle key={i} cx={tx} cy={ty} r={1.3 - i * 0.18} fill={GOLD} opacity={0.38 - i * 0.06} />;
        })}
        <circle cx="180" cy="12" r="2" fill={GOLD} opacity="0.65" />
        <circle cx="180" cy="12" r="4" fill={GOLD} opacity="0.11" />
      </svg>

      {/* Outer decorative rings */}
      <div className="absolute w-[360px] h-[360px] rounded-full" style={{ border: `1px solid ${GOLD}55`, boxShadow: `0 0 40px ${GOLD}18 inset` }} />
      <div className="absolute w-[300px] h-[300px] rounded-full" style={{ border: `1px dashed ${GOLD}44` }} />
      <div className="absolute w-[220px] h-[220px] rounded-full" style={{ border: `1px solid ${GOLD}33` }} />

      {/* SVG: dashed connector lines + glowing dots at endpoints */}
      <svg className="absolute" width="400" height="400" viewBox="-200 -200 400 400">
        <defs>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0.18" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
          </radialGradient>
        </defs>





        {/* Glowing endpoint dots */}
        {orbitNodes.map(({ angle, r, label }) => {
          const x = r * Math.cos(deg2rad(angle));
          const y = r * Math.sin(deg2rad(angle));
          return (
            <g key={`dot-${label}`}>
              <circle cx={x} cy={y} r="5" fill={GOLD} opacity="0.12" />
              <circle cx={x} cy={y} r="2.5" fill={GOLD} opacity="0.9" />
            </g>
          );
        })}
      </svg>

      {/* Orbit node badges */}
      {orbitNodes.map(({ label, icon: NodeIcon, angle, r }) => {
        const x = r * Math.cos(deg2rad(angle));
        const y = r * Math.sin(deg2rad(angle));
        return (
          <div
            key={label}
            className="absolute flex items-center gap-2 px-3 py-2 rounded-2xl text-[11px] font-medium whitespace-nowrap"
            style={{
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              transform: 'translate(-50%, -50%)',
              background: 'rgba(5,9,18,0.82)',
              border: `1px solid rgba(212,175,55,0.28)`,
              color: 'rgba(255,255,255,0.88)',
              backdropFilter: 'blur(16px)',
              boxShadow: `0 2px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.06) inset`,
            }}
          >
            <NodeIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: GOLD, filter: `drop-shadow(0 0 6px ${GOLD}cc) drop-shadow(0 0 12px ${GOLD}66)` }} strokeWidth={1.5} />
            {label}
          </div>
        );
      })}

      {/* Center shield */}
      <motion.div
        animate={{ scale: [1, 1.035, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
        className="relative z-10 flex flex-col items-center"
      >

        {/* Shield SVG — refined with double stroke */}
        <svg viewBox="0 0 80 92" fill="none" className="w-[78px] h-[90px] relative z-10">
          {/* Outer glow stroke */}
          <path
            d="M40 4L72 18V48C72 66 58 78 40 88C22 78 8 66 8 48V18L40 4Z"
            fill="none"
            stroke={GOLD}
            strokeWidth="3"
            opacity="0.12"
          />
          {/* Main shield */}
          <path
            d="M40 6L70 19V48C70 65 57 76 40 86C23 76 10 65 10 48V19L40 6Z"
            fill={`${GOLD}14`}
            stroke={GOLD}
            strokeWidth="1.2"
          />
          {/* Plus / cross */}
          <path
            d="M35 31H45V39H53V49H45V57H35V49H27V39H35V31Z"
            fill="white"
            opacity="0.92"
          />
        </svg>
        <p className="text-[9.5px] font-bold tracking-[0.24em] uppercase mt-3 relative z-10" style={{ color: GOLD }}>SAFE-T4LIFE™</p>
        <p className="text-[7px] tracking-[0.18em] uppercase mt-1 relative z-10" style={{ color: 'rgba(255,255,255,0.38)' }}>Safety Intelligence Engine</p>
      </motion.div>
    </div>
  );
}

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

  return (
    <>
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
          {/* Mode Toggle */}
          <div className="mb-7">
            <ModeToggle />
          </div>

          {/* Eyebrow */}
          <AnimatePresence mode="wait">
            <motion.p
              key={`eyebrow-${mode}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="text-[11px] font-bold tracking-[0.28em] uppercase mb-6"
              style={{ color: GOLD }}
            >
              {content.eyebrow}
            </motion.p>
          </AnimatePresence>

          {/* Headline */}
          <AnimatePresence mode="wait">
            <motion.h1
              key={`headline-${mode}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="font-display text-white leading-[1.06] mb-6"
              style={{ fontSize: 'clamp(2.8rem, 4.5vw, 4rem)' }}
            >
              {content.headline}
            </motion.h1>
          </AnimatePresence>

          {/* Body */}
          <AnimatePresence mode="wait">
            <motion.p
              key={`body-${mode}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-[15px] text-white/55 leading-relaxed mb-10 max-w-[420px]"
            >
              {content.body}
            </motion.p>
          </AnimatePresence>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4 mb-12">
            <Link
              to={content.cta.path}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-[14px] transition-all duration-200 hover:opacity-90"
              style={{ background: GOLD, color: '#060B16', boxShadow: `0 0 30px ${GOLD}30` }}
            >
              {content.cta.label}
            </Link>
            {isMedical && (
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-[14px] text-white border border-white/25 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/40 transition-all duration-200"
              >
                <span
                  className="w-6 h-6 rounded-full border border-white/30 flex items-center justify-center"
                  style={{ fontSize: '10px' }}
                >▶</span>
                How It Works
              </button>
            )}
          </div>

          {/* Trust pills */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`pills-${mode}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-5 pt-8 border-t border-white/[0.08]"
            >
              {content.trustPills.map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex flex-col gap-1.5">
                  <Icon className="w-4 h-4" style={{ color: GOLD, filter: `drop-shadow(0 0 8px ${GOLD}99) drop-shadow(0 0 16px ${GOLD}55)` }} strokeWidth={1.5} />
                  <p className="text-[12px] font-medium text-white leading-tight tracking-wide">{label}</p>
                  <p className="text-[11px] text-white/65 tracking-wide">{sub}</p>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
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
      <HowItWorksModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}