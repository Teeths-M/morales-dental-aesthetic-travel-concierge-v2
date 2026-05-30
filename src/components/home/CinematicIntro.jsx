import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import PremiumAmbientBackground from './PremiumAmbientBackground';

export default function CinematicIntro({ onComplete }) {
  const [loaded, setLoaded] = useState(false);
  const [exiting, setExiting] = useState(false);
  
  // Spring configuration for smooth mouse parallax
  const springConfig = { stiffness: 80, damping: 25, mass: 0.5 };

  useEffect(() => {
    setLoaded(true);
  }, []);

  const handleBegin = async () => {
    setExiting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    onComplete();
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      
      {/* Premium Ambient Background - Multi-layered cinematic animation */}
      <PremiumAmbientBackground />
      
      {/* Responsive Container - Mobile-first column, desktop row */}
      <div className="absolute inset-0 flex flex-col md:flex-row">
        
        {/* LEFT TEXT CONTAINER (z-10) - Full width on mobile, half on desktop */}
        <div className="relative w-full md:w-1/2 flex flex-col justify-center z-10 px-6 md:px-8 lg:pl-20 lg:pr-6 text-white py-12 md:py-0">
          
          {/* Trust Badges - Mobile horizontal scroll, desktop grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={loaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex overflow-x-auto snap-x snap-mandatory gap-3 scrollbar-none pb-4 mb-6 md:grid md:grid-cols-2 md:gap-3 md:overflow-visible md:pb-0"
          >
            {[
              { text: 'Verified Specialists', icon: '✓' },
              { text: 'Secure Planning', icon: '✓' },
              { text: 'Recovery Support', icon: '✓' },
              { text: 'SAFE-T4LIFE™', icon: '✓' },
            ].map((badge, i) => (
              <motion.div
                key={i}
                className="snap-start flex-shrink-0 px-4 py-2 rounded-full text-[10px] font-bold tracking-wider uppercase backdrop-blur-sm md:snap-none"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#C5A059',
                }}
                whileHover={{ 
                  scale: 1.05, 
                  background: 'rgba(197,160,89,0.15)',
                  borderColor: 'rgba(197,160,89,0.4)',
                }}
                transition={{ duration: 0.2 }}
              >
                <span className="mr-1.5">{badge.icon}</span>
                {badge.text}
              </motion.div>
            ))}
          </motion.div>

          {/* Brand label with blue-gold gradient */}
          <motion.p
            initial={{ opacity: 0, x: -30 }}
            animate={loaded ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="text-[10px] font-bold tracking-[0.35em] uppercase mb-4 md:mb-6"
            style={{
              background: 'linear-gradient(90deg, #3B82F6, #C5A059)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Morales Dental & Aesthetic Travel Concierge
          </motion.p>

          {/* Main headline - Responsive typography scaling */}
          <motion.h1
            initial={{ opacity: 0, x: -40 }}
            animate={loaded ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 1, delay: 0.6 }}
            className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl leading-tight mb-4 md:mb-6"
          >
            <motion.span
              initial={{ opacity: 0, y: 30 }}
              animate={loaded ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.9, delay: 0.8 }}
              className="block text-white"
            >
              Trusted Care.
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 30 }}
              animate={loaded ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.9, delay: 1 }}
              className="block text-white"
            >
              Comfortable Travel.
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 30 }}
              animate={loaded ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.9, delay: 1.2 }}
              className="block italic mt-2 text-shimmer"
              style={{ 
                background: 'linear-gradient(90deg, #3B82F6, #C5A059)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: '0 4px 30px rgba(197,160,89,0.4)'
              }}
            >
              Peace of Mind.
            </motion.span>
          </motion.h1>

          {/* Subheadline - Responsive text sizing */}
          <motion.p
            initial={{ opacity: 0, x: -30 }}
            animate={loaded ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 1 }}
            className="text-slate-300 text-sm sm:text-base md:text-lg max-w-full md:max-w-lg leading-relaxed mb-6 md:mb-8"
          >
            Premium healthcare travel coordination with verified specialists, 
            comfort-first planning, and SAFE-T4LIFE™ protection. Experience 
            world-class care with luxury concierge support from consultation 
            through recovery.
          </motion.p>

          {/* CTA Buttons - Full width on mobile, row on desktop */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={loaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 1.2 }}
            className="flex flex-col gap-3 mb-8 md:gap-4 md:mb-10"
          >
            {/* Primary CTA - Full width on mobile */}
            <motion.button
              onClick={handleBegin}
              disabled={exiting}
              className="group relative w-full md:w-auto px-8 py-4 rounded-full text-sm font-bold tracking-widest uppercase transition-all duration-500 disabled:pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #C5A059 100%)',
                color: '#ffffff',
                boxShadow: '0 8px 40px rgba(59,130,246,0.35), 0 8px 40px rgba(197,160,89,0.2)',
              }}
              whileHover={{ 
                boxShadow: '0 15px 70px rgba(59,130,246,0.55), 0 15px 70px rgba(197,160,89,0.35)',
                scale: 1.03,
              }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                Get My Personalized Care Plan
                <motion.span
                  animate={{ x: [0, 8, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="text-lg"
                >
                  →
                </motion.span>
              </span>
              {/* Elegant glow effect on hover */}
              <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-500"
                style={{
                  background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)',
                }}
              />
            </motion.button>

            {/* Secondary CTA - Full width on mobile */}
            <motion.button
              onClick={handleBegin}
              disabled={exiting}
              className="group w-full md:w-auto px-8 py-4 rounded-full text-sm font-bold tracking-widest uppercase backdrop-blur-sm transition-all duration-500 disabled:pointer-events-none"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(197,160,89,0.4)',
                color: '#C5A059',
              }}
              whileHover={{ 
                background: 'rgba(197,160,89,0.15)',
                borderColor: 'rgba(197,160,89,0.7)',
                scale: 1.02,
              }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                Explore Treatments
                <motion.span
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                >
                  ↓
                </motion.span>
              </span>
            </motion.button>
          </motion.div>

          {/* Scroll indicator - Hidden on mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={loaded ? { opacity: 0.6 } : {}}
            transition={{ duration: 0.7, delay: 1 }}
            className="hidden md:flex flex-col items-start gap-3"
          >
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-px h-10 bg-[#C5A059]"
            />
            <p className="text-[10px] tracking-[0.25em] text-slate-400 uppercase">Scroll to explore</p>
          </motion.div>
        </div>

        {/* RIGHT HERO VISUAL LAYER (z-10) - Hidden on mobile, visible on desktop */}
        <motion.div
          className="hidden md:block absolute inset-y-0 right-0 w-1/2 z-10 overflow-hidden"
          style={{ willChange: 'transform', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          {/* Background Imagery: Luxury Resort Sunset */}
          <motion.div
            className="absolute inset-0 will-change-transform transform-gpu"
            initial={{ opacity: 0 }}
            animate={loaded ? { opacity: 1 } : {}}
            transition={{ duration: 1.5, delay: 0.3 }}
            style={{
              backgroundImage: `linear-gradient(to right, rgba(2, 6, 23, 0.95) 0%, rgba(2, 6, 23, 0.7) 40%, transparent 80%), url('https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=2938&auto=format&fit=crop')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          />

          {/* Floating Premium Airplane Silhouette */}
          <motion.div
            className="absolute w-16 h-16 text-white opacity-50"
            animate={{
              x: ['-20%', '120%'],
              y: ['60%', '20%', '80%'],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              x: { duration: 25, repeat: Infinity, ease: 'linear' },
              y: { duration: 15, repeat: Infinity, ease: 'easeInOut' },
              rotate: { duration: 20, repeat: Infinity, ease: 'easeInOut' },
            }}
            style={{ top: '10%', left: '-20%', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', willChange: 'transform' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12h20"/><path d="M13 5v7"/><path d="M13 12l7 7"/><path d="M13 12l-7 7"/>
            </svg>
          </motion.div>

          {/* Glassmorphism Badges Grid */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center p-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={loaded ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 1.2, delay: 0.8 }}
            style={{ willChange: 'transform', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <div className="grid grid-cols-2 gap-6 max-w-lg">
              {[
                { title: 'Verified Specialists', icon: '✓' },
                { title: 'Recovery Tracking', icon: '♥' },
                { title: 'Flight Coordination', icon: '✈' },
                { title: 'SAFE-T4LIFE™ Protection', icon: '🛡' },
              ].map((badge, i) => (
                <motion.div
                  key={i}
                  className="relative bg-white/5 backdrop-blur-md border border-[#C5A059]/30 text-[#C5A059] rounded-xl px-6 py-4 shadow-xl text-center flex flex-col items-center justify-center will-change-transform transform-gpu"
                  whileHover={{
                    scale: 1.05,
                    borderColor: 'rgba(197,160,89,0.7)',
                    boxShadow: '0 8px 40px rgba(197,160,89,0.4)',
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="text-3xl mb-2">{badge.icon}</span>
                  <p className="text-sm font-bold tracking-wide">{badge.title}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}