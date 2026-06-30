import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import HowItWorksModal from './HowItWorksModal';
import ModeToggle from './ModeToggle';
import { usePlatformMode } from '@/context/PlatformModeContext';
import { BadgeCheck, Shield, CheckCircle, Play, Heart } from 'lucide-react';
import { BRAND } from '@/lib/brandTokens';

const GOLD       = BRAND.gold;
const HERO_IMAGE = 'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/102642e19_generated_image.png';

/* ── Content by mode ──────────────────────────────────────────────────────── */
const CONTENT = {
  medical: {
    headline:    'YOUR JOURNEY.\nPERFECTED.',
    subheadline: 'Travel abroad for world-class dental & aesthetic surgery — and come home safely.',
    body:        'Your driver picks you up at home. Your verified doctor is waiting. Your family tracks every checkpoint in real time. And if anything goes wrong — we dispatch help, automatically.',
    cta:         { label: 'Start Your Journey', path: '/booking' },
  },
  nonmedical: {
    headline:    'THE WORLD,\nEFFORTLESSLY YOURS.',
    subheadline: '24/7 protection — even at 35,000 feet.',
    body:        'Wherever you land, Morales is already there. Verified transfers, vetted hotels, personal companions, and a safety net that follows you across every border and time zone.',
    cta:         { label: 'Plan My Journey', path: '/travel-concierge' },
  },
};

/* ── Trust badges (ISO, surgeons, concierge) ──────────────────────────────── */
const TRUST_BADGES = [
  { icon: BadgeCheck, label: 'ISO 21101 Certified' },
  { icon: BadgeCheck, label: '100+ Verified Surgeons' },
  { icon: Heart,      label: 'Safe-T4life™ Protected' },
];

/* ── Feature cards below hero ─────────────────────────────────────────────── */
const FEATURES = [
  { icon: Heart,       title: 'Your Family Stays Close',    desc: 'Share a zero-login link and they watch every checkpoint in real time — like a flight tracker, but for your surgery.' },
  { icon: Shield,      title: '9-Point Safety System',      desc: 'Miss a check-in and we escalate automatically — SMS, voice call, security dispatch, police. You are never alone.' },
  { icon: CheckCircle, title: 'Verified Specialists Only',  desc: 'Every doctor is screened for credentials, procedure history, and patient outcomes. Only the top 1% earn the Morales badge.' },
];


/* ── Hero ─────────────────────────────────────────────────────────────────── */
const QUICK_PROCEDURES = ['Dental Implants', 'Veneers', 'Rhinoplasty', 'Liposuction'];

export default function LuxuryHero() {
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { mode }    = usePlatformMode();
  const isMedical   = mode === 'medical';
  const content     = isMedical ? CONTENT.medical : CONTENT.nonmedical;
  const prefersReducedMotion = useReducedMotion();
  const openModal   = useCallback(() => setShowModal(true), []);
  const closeModal  = useCallback(() => setShowModal(false), []);
  const navigate    = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/providers${searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : ''}`);
  };

  return (
    <>
      {/* ── HERO SECTION ── */}
      <section
        data-hero
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

            {/* ── LEADERSHIP BADGE ── */}
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20, alignSelf: 'flex-start' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 99, background: `rgba(212,175,55,0.12)`, border: `1px solid rgba(212,175,55,0.35)` }}>
                <img src="/morales-m-mark.png" alt="M" style={{ width: 14, filter: 'drop-shadow(0 0 4px rgba(212,175,55,0.8))' }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: '#D4AF37', letterSpacing: '0.15em', textTransform: 'uppercase' }}>The Golden Standard for Medical Travel</span>
              </div>
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

            {/* ── FEAR ACKNOWLEDGMENT — medical mode only ── */}
            {isMedical && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.08 }}
                className="mb-5"
                style={{
                  fontSize:    '14px',
                  fontStyle:   'italic',
                  color:       `${GOLD}90`,
                  lineHeight:  1.6,
                  fontFamily:  'Georgia, serif',
                  letterSpacing: '0.01em',
                }}
              >
                Going abroad for surgery is the bravest thing you'll do for yourself.<br />
                Morales was designed for that exact moment.
              </motion.p>
            )}

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

            {/* ── CTA ROW — primary + demo side by side ── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8"
            >
              {/* Primary: gold pill */}
              <Link to={content.cta.path}>
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative w-full sm:w-auto h-14 px-10 rounded-full text-[15px] font-semibold overflow-hidden transition-shadow duration-300"
                  style={{
                    background:    `linear-gradient(135deg, ${GOLD} 0%, ${BRAND.goldLight} 100%)`,
                    color:         '#060B16',
                    boxShadow:     `0 8px 36px ${BRAND.goldAlpha(0.35)}, 0 0 0 1px ${BRAND.goldAlpha(0.2)} inset`,
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
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"
                    style={{ background: `linear-gradient(135deg, ${BRAND.goldLight} 0%, ${GOLD} 100%)` }}
                  />
                </motion.button>
              </Link>

              {/* Secondary: glass demo pill */}
              <Link to="/demo">
                <motion.button
                  whileHover={{ scale: 1.02, y: -2, boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(212,175,55,0.5)` }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto h-14 px-8 rounded-full text-[14px] font-semibold flex items-center justify-center gap-2.5 transition-all duration-200"
                  style={{
                    background:    'rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border:        `1px solid rgba(212,175,55,0.38)`,
                    color:         GOLD,
                    letterSpacing: '0.02em',
                    boxShadow:     '0 4px 20px rgba(0,0,0,0.3)',
                  }}
                >
                  <Play style={{ width: 14, height: 14, fill: GOLD, flexShrink: 0 }} />
                  Live Demo
                </motion.button>
              </Link>
            </motion.div>

            {/* ── SEARCH BAR — medical mode ── */}
            {isMedical && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mb-8 max-w-[480px]"
              >
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search procedure or country…"
                    style={{
                      flex: 1, height: 46, padding: '0 18px', borderRadius: 99,
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.18)',
                      color: '#fff', fontSize: 13, outline: 'none',
                      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                    }}
                  />
                  <button type="submit" style={{
                    height: 46, padding: '0 20px', borderRadius: 99,
                    background: GOLD, color: '#060B16',
                    fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', flexShrink: 0,
                  }}>Find Doctors</button>
                </form>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {QUICK_PROCEDURES.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => navigate(`/providers?q=${encodeURIComponent(p)}`)}
                      style={{
                        padding: '5px 13px', borderRadius: 99,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.13)',
                        color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 500, cursor: 'pointer',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => navigate('/providers')}
                    style={{
                      padding: '5px 13px', borderRadius: 99,
                      background: `rgba(212,175,55,0.10)`,
                      border: `1px solid rgba(212,175,55,0.3)`,
                      color: GOLD, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    All Doctors →
                  </button>
                </div>
              </motion.div>
            )}

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
