import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import PremiumAmbientBackground from './PremiumAmbientBackground';

export default function CinematicIntro({ onComplete }) {
  const [loaded, setLoaded] = useState(false);
  const [exiting, setExiting] = useState(false);

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
      
      {/* LEFT TEXT CONTAINER (z-10) */}
      <div className="absolute inset-y-0 left-0 w-full md:w-1/2 flex flex-col justify-center z-10 pl-8 md:pl-20 pr-6 text-white">
        
        {/* Trust Badges - Floating */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={loaded ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-wrap gap-3 mb-8"
        >
          {[
            { text: 'Verified Specialists', icon: '✓' },
            { text: 'Secure Planning', icon: '✓' },
            { text: 'Recovery Support', icon: '✓' },
            { text: 'SAFE-T4LIFE™', icon: '✓' },
          ].map((badge, i) => (
            <motion.div
              key={i}
              className="px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase backdrop-blur-sm"
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
          className="text-[10px] font-bold tracking-[0.35em] uppercase mb-6"
          style={{
            background: 'linear-gradient(90deg, #3B82F6, #C5A059)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Morales Dental & Aesthetic Travel Concierge
        </motion.p>

        {/* Main headline - Emotionally powerful, premium, memorable */}
        <motion.h1
          initial={{ opacity: 0, x: -40 }}
          animate={loaded ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 1, delay: 0.6 }}
          className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl leading-tight mb-6"
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
            className="block italic mt-2"
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

        {/* Subheadline - Verified specialists, travel coordination, comfort-first, SAFE-T4LIFE™ */}
        <motion.p
          initial={{ opacity: 0, x: -30 }}
          animate={loaded ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8, delay: 1 }}
          className="text-slate-300 text-base sm:text-lg max-w-lg leading-relaxed mb-10"
        >
          Premium healthcare travel coordination with verified specialists, 
          comfort-first planning, and SAFE-T4LIFE™ protection. Experience 
          world-class care with luxury concierge support from consultation 
          through recovery.
        </motion.p>

        {/* CTA Buttons - Premium styling with subtle hover animation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={loaded ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 1.2 }}
          className="flex flex-col sm:flex-row gap-4 mb-10"
        >
          {/* Primary CTA - High-converting, action-driven */}
          <motion.button
            onClick={handleBegin}
            disabled={exiting}
            className="group relative px-10 py-4 rounded-full text-sm font-bold tracking-widest uppercase transition-all duration-500 disabled:pointer-events-none"
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
            <span className="relative z-10 flex items-center gap-3">
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

          {/* Secondary CTA - Low-pressure exploration */}
          <motion.button
            onClick={handleBegin}
            disabled={exiting}
            className="group px-10 py-4 rounded-full text-sm font-bold tracking-widest uppercase backdrop-blur-sm transition-all duration-500 disabled:pointer-events-none"
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
            <span className="relative z-10 flex items-center gap-2">
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

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={loaded ? { opacity: 0.6 } : {}}
          transition={{ duration: 0.7, delay: 1 }}
          className="mt-16 flex flex-col items-start gap-3"
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-px h-10 bg-[#C5A059]"
          />
          <p className="text-[10px] tracking-[0.25em] text-slate-400 uppercase">Scroll to explore</p>
        </motion.div>
      </div>

      {/* RIGHT HERO VISUAL LAYER (z-0) - Abstract luxury atmosphere */}
      <div className="absolute inset-y-0 right-0 w-full md:w-1/2 z-0 hidden md:block">
        <motion.div
          initial={{ opacity: 0, scale: 1.05 }}
          animate={loaded ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 1.6, ease: 'easeOut', delay: 0.5 }}
          className="w-full h-full relative"
        >
          {/* Abstract luxury hotel/clinic atmosphere - subtle and elegant */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(15,58,32,0.4) 50%, rgba(197,160,89,0.06) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          />
          
          {/* Soft glowing accent - represents care and warmth */}
          <motion.div
            className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(197,160,89,0.15) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.4, 0.6, 0.4],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          
          {/* Subtle vertical light streaks - premium travel aesthetic */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={`streak-${i}`}
              className="absolute w-px h-96"
              style={{
                background: 'linear-gradient(180deg, transparent 0%, rgba(197,160,89,0.2) 50%, transparent 100%)',
                left: `${30 + i * 25}%`,
                top: '5%',
              }}
              animate={{
                opacity: [0.2, 0.4, 0.2],
                scaleY: [0.95, 1.05, 0.95],
              }}
              transition={{
                duration: 6 + i * 2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 1.5,
              }}
            />
          ))}
          
          {/* Soft left shadow mask for smooth blend with text */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, rgba(15,58,32,0.98) 0%, rgba(15,58,32,0.6) 30%, transparent 60%)',
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}