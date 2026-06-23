import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import HowItWorksModal from './HowItWorksModal';
import ModeToggle from './ModeToggle';
import { usePlatformMode } from '@/context/PlatformModeContext';
import { BadgeCheck, Shield, Plane, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BRAND } from '@/lib/brandTokens';

const GOLD = BRAND.gold;
const HERO_IMAGE = 'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/102642e19_generated_image.png';

const CONTENT = {
  medical: {
    eyebrow: 'Your Journey. Perfected.',
    headline: (
      <>
        World-Class Dental & Aesthetic Care.<br />
        <span style={{ color: GOLD }}>Zero Compromises.</span>
      </>
    ),
    body: 'From consultation to recovery, Morales orchestrates every detail. Exceptional results, zero stress.',
    cta: { label: 'Start Your Journey →', path: '/booking' },
    trustPills: [
      { icon: BadgeCheck, label: 'Verified Experts', sub: 'Top 1% specialists' },
      { icon: Shield, label: 'All-Inclusive Pricing', sub: 'No surprises' },
      { icon: Heart, label: 'End-to-End Care', sub: '24/7 until home' },
    ],
  },
  nonmedical: {
    eyebrow: 'Travel Without Limits.',
    headline: (
      <>
        The World,{' '}
        <span style={{ color: GOLD }}>Effortlessly Yours.</span>
      </>
    ),
    body: 'Private jets, exclusive hotels, personal companions — seamlessly integrated. Travel designed entirely around you.',
    cta: { label: 'Plan My Journey →', path: '/travel-concierge' },
    trustPills: [
      { icon: Plane, label: 'Global Access', sub: '190+ countries' },
      { icon: BadgeCheck, label: 'Vetted Partners', sub: 'Excellence guaranteed' },
      { icon: Heart, label: 'White-Glove Care', sub: 'Every detail handled' },
    ],
  },
};

export default function LuxuryHero() {
  const [showModal, setShowModal] = useState(false);
  const { mode } = usePlatformMode();
  const isMedical = mode === 'medical';
  const content = isMedical ? CONTENT.medical : CONTENT.nonmedical;

  const prefersReducedMotion = useReducedMotion();
  const openModal = useCallback(() => setShowModal(true), []);
  const closeModal = useCallback(() => setShowModal(false), []);

  return (
    <>
      <section className="relative min-h-screen overflow-hidden" style={{ background: '#0b1219', marginTop: '-72px' }}>
        {/* Full-bleed background with parallax effect */}
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
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 25, ease: 'linear', repeat: Infinity, repeatType: 'reverse' }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #0b1219 0%, #0b1219 35%, rgba(11,18,25,0.88) 50%, rgba(11,18,25,0.5) 70%, transparent 100%)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #0b1219 0%, rgba(11,18,25,0.6) 15%, transparent 35%)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #0b1219 0%, rgba(11,18,25,0.85) 15%, transparent 35%)' }} />
          {/* Subtle animated shimmer overlay */}
          <motion.div 
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 65% 50%, rgba(212,175,55,0.04) 0%, transparent 65%)' }}
            animate={prefersReducedMotion ? { opacity: 0.4 } : { opacity: [0.3, 0.6, 0.3] }}
            transition={prefersReducedMotion ? {} : { duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="relative z-10 w-full max-w-[1440px] mx-auto px-8 lg:px-16 grid grid-cols-1 lg:grid-cols-2 gap-0 items-center min-h-screen py-20 lg:py-0" style={{ paddingTop: '72px' }}>

          {/* LEFT CONTENT */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }} 
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} 
            className="flex flex-col z-10 lg:pr-16"
          >
            <AnimatePresence mode="wait">
              <motion.p 
                key={`eyebrow-${mode}`} 
                initial={{ opacity: 0, y: 12 }} 
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }} 
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="font-body uppercase mb-9" 
                style={{ 
                  color: GOLD, 
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.35em',
                  textShadow: `0 0 24px ${GOLD}44`
                }}
              >
                {content.eyebrow}
              </motion.p>
            </AnimatePresence>

            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mb-7 lg:hidden"
            >
              <ModeToggle />
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.h1 
                key={`headline-${mode}`} 
                initial={{ opacity: 0, y: 16 }} 
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }} 
                transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="font-display text-white mb-8"
                style={{ 
                  fontSize: 'clamp(2.25rem, 7vw, 5rem)',
                  lineHeight: 1.02,
                  letterSpacing: '-0.03em',
                  fontWeight: 400,
                  textShadow: '0 4px 60px rgba(0,0,0,0.6)',
                  fontSmooth: 'antialiased'
                }}>
                {content.headline}
              </motion.h1>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.p 
                key={`body-${mode}`} 
                initial={{ opacity: 0, y: 8 }} 
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} 
                transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="text-white/65 mb-8 max-w-[480px]"
                style={{ 
                  fontSize: '18px',
                  lineHeight: 1.8,
                  fontWeight: 300,
                  letterSpacing: '0.01em',
                  fontSmooth: 'antialiased'
                }}
              >
                {content.body}
              </motion.p>
            </AnimatePresence>

            {/* CTA Button */}
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-10"
            >
              <Link to={content.cta.path}>
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative h-14 px-10 rounded-xl text-base font-semibold overflow-hidden"
                  style={{ 
                    background: `linear-gradient(135deg, ${GOLD} 0%, ${BRAND.goldLight} 100%)`, 
                    color: '#060B16',
                    boxShadow: `0 8px 40px ${GOLD}40, 0 0 0 1px ${GOLD}33 inset`,
                    textShadow: '0 1px 2px rgba(255,255,255,0.2)'
                  }}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {content.cta.label}
                    <motion.span 
                      className="inline-block"
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    >→</motion.span>
                  </span>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `linear-gradient(135deg, ${BRAND.goldLight} 0%, ${GOLD} 100%)` }} 
                  />
                </motion.button>
              </Link>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mb-7 hidden lg:block"
            >
              <ModeToggle />
            </motion.div>



            <AnimatePresence mode="wait">
              <motion.div 
                key={`pills-${mode}`} 
                initial={{ opacity: 0, y: 16 }} 
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }} 
                transition={{ duration: 0.5, delay: 0.2 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-10 border-t border-white/[0.06]"
              >
                {content.trustPills.map(({ icon: Icon, label, sub }) => (
                  <motion.div 
                    key={label} 
                    className="flex flex-col gap-2"
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Icon className="w-5 h-5" style={{ color: GOLD, filter: `drop-shadow(0 0 6px ${GOLD}88)` }} strokeWidth={1.3} />
                    <p className="text-[12px] font-medium text-white leading-tight tracking-wide">{label}</p>
                    <p className="text-[11px] text-white/50 tracking-wide">{sub}</p>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* RIGHT — Clean space for jet imagery */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ duration: 1, delay: 0.3 }}
            className="relative hidden lg:block" 
            style={{ height: '100vh' }}
          />
        </div>
      </section>
      <HowItWorksModal isOpen={showModal} onClose={closeModal} />
    </>
  );
}