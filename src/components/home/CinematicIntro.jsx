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
    await new Promise(resolve => setTimeout(resolve, 1200));
    onComplete();
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#faf6f0]">
      
      {/* LAYER 1 — DEEP BACKGROUND (z-0): Beach Sunset */}
      <div className="absolute inset-0 w-full h-full object-cover opacity-80 z-0">
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2400&q=80"
          alt="Golden Sunset Beach"
          className="w-full h-full object-cover"
        />
        {/* Warm overlay tint */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#ffd4a3]/60 via-[#ffc894]/40 to-[#f5e6d3]/50" />
      </div>

      {/* LAYER 2 — TEXT & CTAs (z-10): Left-Aligned Container */}
      <div className="absolute inset-y-0 left-0 w-full md:w-1/2 flex flex-col justify-center z-10 pl-8 md:pl-16 pr-4 pointer-events-auto">
        {/* Brand label */}
        <motion.p
          initial={{ opacity: 0, x: -30 }}
          animate={loaded ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-sm font-semibold tracking-widest text-slate-700 uppercase mb-4"
        >
          Medical Travel Concierge
        </motion.p>

        {/* Main headline */}
        <motion.h1
          initial={{ opacity: 0, x: -40 }}
          animate={loaded ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 1, delay: 0.4 }}
          className="font-display text-5xl sm:text-6xl lg:text-7xl leading-tight mb-6"
        >
          <span className="text-slate-900 block">Your Journey</span>
          <span className="text-slate-900 block">to Care</span>
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={loaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.9, delay: 0.7 }}
            className="block italic"
            style={{ 
              color: '#D4A574',
              textShadow: '0 2px 8px rgba(212,165,116,0.3)'
            }}
          >
            Begins Here
          </motion.span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, x: -30 }}
          animate={loaded ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-slate-800 text-lg max-w-xl leading-relaxed mb-8"
        >
          World-Class Care. Total Confidence. Completely Coordinated.
          <br />
          We make your medical travel safe, simple, and stress-free.
        </motion.p>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={loaded ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.7 }}
          onClick={handleBegin}
          disabled={exiting}
          className="group relative px-10 py-3.5 rounded-full text-sm font-bold tracking-widest uppercase transition-all duration-300 disabled:pointer-events-none self-start shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #1a3a2e 0%, #2d5a4f 100%)',
            border: '1.5px solid #D4A574',
            color: '#D4A574',
            boxShadow: '0 8px 32px rgba(212,165,116,0.25)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = '0 12px 48px rgba(212,165,116,0.45)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(212,165,116,0.25)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span className="relative z-10">Get Your Free Plan</span>
        </motion.button>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={loaded ? { opacity: 0.5 } : {}}
          transition={{ duration: 0.8, delay: 1 }}
          className="mt-14 flex flex-col items-start gap-3"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-px h-8 bg-slate-700"
          />
          <p className="text-xs tracking-widest text-slate-600 uppercase">Scroll to explore</p>
        </motion.div>
      </div>

      {/* LAYER 3 — FOREGROUND VISUALS (z-20) */}
      
      {/* Private Jet floating in sky */}
      <motion.div
        initial={{ x: -100, y: 50, opacity: 0, scale: 0.7 }}
        animate={loaded ? { 
          x: 0, 
          y: 0, 
          opacity: 0.9, 
          scale: 1 
        } : {}}
        transition={{ duration: 3, ease: 'easeOut', delay: 0.3 }}
        className="absolute top-12 right-[45%] w-72 object-contain hidden md:block z-20 pointer-events-none"
      >
        <img
          src="https://images.unsplash.com/photo-1540962351504-03099e0a754b?auto=format&fit=crop&w=800&q=80"
          alt="Luxury Private Jet"
          className="w-full h-auto object-contain"
          style={{ filter: 'drop-shadow(0 15px 45px rgba(100,70,30,0.4))' }}
        />
      </motion.div>

      {/* Doctor standing on right side */}
      <motion.div
        initial={{ x: 100, opacity: 0, scale: 0.9 }}
        animate={loaded ? { x: 0, opacity: 1, scale: 1.02 } : {}}
        transition={{ duration: 1.6, ease: 'easeOut', delay: 0.5 }}
        className="absolute bottom-0 right-0 h-[75vh] w-auto object-contain z-20 pointer-events-none"
      >
        <img
          src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=80"
          alt="Welcoming Medical Professional"
          className="h-full w-auto object-contain object-bottom"
          style={{ filter: 'drop-shadow(0 0 60px rgba(212,165,116,0.4)) brightness(1.08)' }}
        />
      </motion.div>

      {/* Subtle vignette overlay for polish */}
      <div className="absolute inset-0 z-30 pointer-events-none bg-gradient-to-r from-[#f5e6d3]/30 via-transparent to-[#d4a574]/15" />
    </div>
  );
}