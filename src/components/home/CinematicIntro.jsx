import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

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
    <div className="relative h-screen w-full overflow-hidden bg-gradient-to-r from-[#0F3A20] via-[#0d2f3e] to-[#1a2e22]">
      
      {/* Blue-gold ambient overlay for brand integration */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, transparent 50%, rgba(197,160,89,0.06) 100%)' }} />
      
      {/* LEFT TEXT CONTAINER (z-10) */}
      <div className="absolute inset-y-0 left-0 w-full md:w-1/2 flex flex-col justify-center z-10 pl-8 md:pl-20 pr-6 text-white">
        {/* Brand label with blue-gold gradient */}
        <motion.p
          initial={{ opacity: 0, x: -30 }}
          animate={loaded ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-[10px] font-bold tracking-[0.35em] uppercase mb-6"
          style={{
            background: 'linear-gradient(90deg, #3B82F6, #C5A059)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          SAFE-T 4LIFE™ · Medical Travel Concierge
        </motion.p>

        {/* Main headline with blue-gold accent */}
        <motion.h1
          initial={{ opacity: 0, x: -40 }}
          animate={loaded ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.9, delay: 0.4 }}
          className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl leading-tight mb-6"
        >
          <span className="block text-white">Your Journey</span>
          <span className="block text-white">to Care</span>
          <motion.span
            initial={{ opacity: 0, y: 25 }}
            animate={loaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="block italic mt-2"
            style={{ 
              background: 'linear-gradient(90deg, #3B82F6, #C5A059)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 4px 20px rgba(197,160,89,0.3)'
            }}
          >
            Begins Here
          </motion.span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, x: -30 }}
          animate={loaded ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="text-slate-300 text-base sm:text-lg max-w-lg leading-relaxed mb-10"
        >
          World-class medical care meets luxury concierge service. 
          From consultation through recovery, we coordinate every detail 
          so you can focus on what matters most.
        </motion.p>

        {/* CTA Button with blue-gold gradient */}
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={loaded ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.7 }}
          onClick={handleBegin}
          disabled={exiting}
          className="group relative px-12 py-4 rounded-full text-sm font-bold tracking-widest uppercase transition-all duration-300 disabled:pointer-events-none self-start"
          style={{
            background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #C5A059 100%)',
            color: '#ffffff',
            boxShadow: '0 8px 40px rgba(59,130,246,0.35), 0 8px 40px rgba(197,160,89,0.2)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = '0 12px 60px rgba(59,130,246,0.55), 0 12px 60px rgba(197,160,89,0.35)';
            e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = '0 8px 40px rgba(59,130,246,0.35), 0 8px 40px rgba(197,160,89,0.2)';
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
          }}
        >
          <span className="relative z-10 flex items-center gap-3">
            Get Your Free Plan
            <motion.span
              animate={{ x: [0, 6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              →
            </motion.span>
          </span>
        </motion.button>

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

      {/* RIGHT HERO VISUAL LAYER (z-0) */}
      <div className="absolute inset-y-0 right-0 w-full md:w-1/2 z-0 hidden md:block">
        <motion.div
          initial={{ opacity: 0, scale: 1.05 }}
          animate={loaded ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }}
          className="w-full h-full relative"
        >
          {/* Luxury clinic/resort interior */}
          <img
            src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80"
            alt="Luxury Medical Facility"
            className="w-full h-full object-cover object-center"
            style={{ 
              clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0% 100%)',
              filter: 'brightness(1.05) contrast(1.05)'
            }}
          />
          
          {/* Soft left shadow mask for smooth blend */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, rgba(15,58,32,0.95) 0%, rgba(15,58,32,0.7) 25%, transparent 50%)',
            }}
          />
          
          {/* Premium blue-gold overlay accent */}
          <div 
            className="absolute inset-0 opacity-25"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(197,160,89,0.15) 100%)',
            }}
          />
        </motion.div>
      </div>

      {/* Subtle ambient particles for depth - blue and gold */}
      <div className="absolute inset-0 z-5 pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 0 }}
            animate={{ 
              opacity: [0, 0.3, 0],
              y: [0, -80, -160],
            }}
            transition={{ 
              duration: 10 + Math.random() * 5,
              repeat: Infinity,
              delay: i * 1.2,
              ease: 'easeInOut'
            }}
            className="absolute w-0.5 h-0.5 rounded-full"
            style={{
              background: i % 2 === 0 ? '#3B82F6' : '#C5A059',
              left: `${20 + Math.random() * 60}%`,
              top: `${20 + (i % 5) * 16}%`,
              filter: 'blur(1px)'
            }}
          />
        ))}
      </div>
    </div>
  );
}