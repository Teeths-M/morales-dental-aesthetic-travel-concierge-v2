import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import HowItWorksModal from './HowItWorksModal';
import ModeToggle from './ModeToggle';
import { usePlatformMode } from '@/context/PlatformModeContext';
import { BadgeCheck, Shield, Map, CheckCircle } from 'lucide-react';
import { BRAND } from '@/lib/brandTokens';

const GOLD       = BRAND.gold;
const HERO_IMAGE = 'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/102642e19_generated_image.png';

/* ── Content by mode ──────────────────────────────────────────────────────── */
const CONTENT = {
  medical: {
    headline:    'YOUR JOURNEY.\nPERFECTED.',
    subheadline: 'World-Class Dental & Aesthetic Care. Zero Compromises.',
    body:        'From consultation to recovery, Morales orchestrates every detail. Exceptional results, zero stress.',
    cta:         { label: 'Start Your Journey', path: '/booking' },
  },
  nonmedical: {
    headline:    'THE WORLD,\nEFFORTLESSLY YOURS.',
    subheadline: 'Private jets. Exclusive hotels. Personal companions.',
    body:        'Travel designed entirely around you — seamlessly integrated, impeccably executed.',
    cta:         { label: 'Plan My Journey', path: '/travel-concierge' },
  },
};

/* ── Trust badges (ISO, surgeons, concierge) ──────────────────────────────── */
const TRUST_BADGES = [
  { icon: BadgeCheck, label: 'ISO 21101 Certified' },
  { icon: BadgeCheck, label: '100+ Verified Surgeons' },
  { icon: Shield,     label: '24/7 Global Concierge' },
];

/* ── Feature cards below hero ─────────────────────────────────────────────── */
const FEATURES = [
  { icon: Map,         title: 'End-to-End Concierge',   desc: 'Every logistics detail handled from departure to return.' },
  { icon: Shield,      title: 'Offline Safety Net',     desc: 'Safe-T4life protection works even without internet.' },
  { icon: CheckCircle, title: 'Verified Specialists',   desc: 'Only the top 1% of surgeons and aesthetic doctors.' },
];


/* ── Hero ─────────────────────────────────────────────────────────────────── */
export default function LuxuryHero() {
  const [showModal, setShowModal] = useState(false);
  const { mode }    = usePlatformMode();
  const isMedical   = mode === 'medical';
  const content     = isMedical ? CONTENT.medical : CONTENT.nonmedical;
  const prefersReducedMotion = useReducedMotion();
  const openModal   = useCallback(() => setShowModal(true), []);
  const closeModal  = useCallback(() => setShowModal(false), []);

  return (
    <>
      {/* ── HERO SECTION ── */}
      <section
        className="relative overflow-hidden"
        style={{ background: '#0b1219', marginTop: '-72px', minHeight: '100svh' }}
      >
        {/* Full-bleed background — slow parallax zoom */}
        <div className="absolute inset-0">
          <motion.img
            src={HERO_IMAGE}
            alt="Premium medical travel concierge"
            className="w-full h-full object-cover"
            style={{ objectPosition: '65% center' }}
            loading="eager"
            fetchPriority="high"
            initial={prefersReducedMotion ? false : { scale: 1.08 }}
            animate={{ scale: 1 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 28, ease: 'linear', repeat: Infinity, repeatType: 'reverse' }}
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #0b1219 0%, #0b1219 32%, rgba(11,18,25,0.88) 50%, rgba(11,18,25,0.45) 72%, transparent 100%)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #0b1219 0%, rgba(11,18,25,0.55) 12%, transparent 32%)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #0b1219 0%, rgba(11,18,25,0.8) 12%, transparent 32%)' }} />
          {/* Gold shimmer */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(circle at 65% 50%, ${BRAND.goldAlpha(0.04)} 0%, transparent 65%)` }}
            animate={prefersReducedMotion ? { opacity: 0.4 } : { opacity: [0.25, 0.55, 0.25] }}
            transition={prefersReducedMotion ? {} : { duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* ── CONTENT GRID ── */}
        <div
          className="relative z-10 w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-16 grid grid-cols-1 lg:grid-cols-2 gap-0 items-center"
          style={{ minHeight: '100svh', paddingTop: '72px' }}
        >
          <motion.div
            initial={{ opacity: 0, x: -28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col z-10 lg:pr-20 py-20 lg:py-0"
          >
            {/* Mode toggle — mobile only, above headline */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-10 lg:hidden"
            >
              <ModeToggle />
            </motion.div>

            {/* ── COMMANDING HEADLINE ── */}
            <AnimatePresence mode="wait">
              <motion.h1
                key={`headline-${mode}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                className="text-white mb-6"
                style={{
                  fontSize:      'clamp(2.6rem, 8.5vw, 6.2rem)',
                  fontWeight:    900,
                  lineHeight:    1.0,
                  letterSpacing: '-0.03em',
                  fontFamily:    '"SF Pro Display", system-ui, -apple-system, sans-serif',
                  textTransform: 'uppercase',
                  whiteSpace:    'pre-line',
                  textShadow:    '0 2px 40px rgba(0,0,0,0.5)',
                }}
              >
                {content.headline}
              </motion.h1>
            </AnimatePresence>

            {/* ── SUBHEADLINE ── */}
            <AnimatePresence mode="wait">
              <motion.p
                key={`sub-${mode}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="mb-3"
                style={{
                  fontSize:      'clamp(1.1rem, 2.5vw, 1.35rem)',
                  fontWeight:    400,
                  color:         'rgba(255,255,255,0.72)',
                  lineHeight:    1.5,
                  letterSpacing: '-0.01em',
                }}
              >
                {content.subheadline}
              </motion.p>
            </AnimatePresence>

            {/* Body text */}
            <AnimatePresence mode="wait">
              <motion.p
                key={`body-${mode}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="mb-9 max-w-[440px]"
                style={{ fontSize: '16px', lineHeight: 1.75, fontWeight: 300, color: 'rgba(255,255,255,0.48)', letterSpacing: '0.01em' }}
              >
                {content.body}
              </motion.p>
            </AnimatePresence>

            {/* ── CTA BUTTON — pill style ── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mb-5"
            >
              <Link to={content.cta.path} className="block w-full sm:w-auto">
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative w-full sm:w-auto h-14 px-10 rounded-full text-[15px] font-semibold overflow-hidden transition-shadow duration-300"
                  style={{
                    background:  `linear-gradient(135deg, ${GOLD} 0%, ${BRAND.goldLight} 100%)`,
                    color:       '#060B16',
                    boxShadow:   `0 8px 36px ${BRAND.goldAlpha(0.35)}, 0 0 0 1px ${BRAND.goldAlpha(0.2)} inset`,
                    letterSpacing: '0.02em',
                  }}
                >
                  <span className="relative z-10 flex items-center gap-2.5">
                    {content.cta.label}
                    <motion.span
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                      className="inline-block"
                    >
                      →
                    </motion.span>
                  </span>
                  {/* Hover overlay */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"
                    style={{ background: `linear-gradient(135deg, ${BRAND.goldLight} 0%, ${GOLD} 100%)` }}
                  />
                </motion.button>
              </Link>
            </motion.div>

            {/* Secondary CTA — platform demo */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.32 }}
              className="mb-8"
            >
              <Link
                to="/demo"
                style={{ fontSize: '13px', fontWeight: 500, color: GOLD, opacity: 0.75, letterSpacing: '0.03em' }}
                className="hover:opacity-100 transition-opacity"
              >
                See how it works — interactive demo →
              </Link>
            </motion.div>

            {/* ── TRUST BADGES — inline row ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-10"
            >
              {TRUST_BADGES.map(({ icon: Icon, label }, i) => (
                <div key={label} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-white/15 mr-1 hidden sm:inline">·</span>}
                  <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD }} strokeWidth={2} />
                  <span style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>
                    {label}
                  </span>
                </div>
              ))}
            </motion.div>

            {/* Mode toggle — desktop, below badges */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="hidden lg:block"
            >
              <ModeToggle />
            </motion.div>
          </motion.div>

          {/* Right column — pure visual real estate for the hero image */}
          <div className="hidden lg:block" />
        </div>
      </section>

      {/* ── FEATURE GRID — below hero ── */}
      <section
        className="w-full"
        style={{ background: '#060B16', borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-16 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-10">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col gap-3 p-6 rounded-2xl border transition-all duration-300 hover:border-[#D4AF37]/25 group cursor-default"
                style={{
                  background:   'rgba(12,26,29,0.6)',
                  border:       '1px solid rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: `${BRAND.goldAlpha(0.1)}`,
                    border:     `1px solid ${BRAND.goldAlpha(0.2)}`,
                  }}
                >
                  <Icon
                    className="w-5 h-5 transition-all duration-300 group-hover:scale-110"
                    style={{ color: GOLD, filter: `drop-shadow(0 0 6px ${BRAND.goldAlpha(0.5)})` }}
                    strokeWidth={1.5}
                  />
                </div>
                <p
                  style={{
                    fontSize: '15px', fontWeight: 600, color: '#FFFFFF',
                    letterSpacing: '-0.01em', lineHeight: 1.2,
                  }}
                >
                  {title}
                </p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>
                  {desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <HowItWorksModal isOpen={showModal} onClose={closeModal} />
    </>
  );
}
