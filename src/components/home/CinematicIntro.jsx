import React, { useRef, useState } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';

export default function CinematicIntro({ onComplete }) {
  const [exiting, setExiting] = useState(false);
  const frameControls = useAnimation();
  const frameRef = useRef(null);

  const handleMouseMove = (e) => {
    if (exiting) return;
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    frameControls.start({
      rotateY: dx * 6,
      rotateX: -dy * 4,
      transition: { type: 'spring', stiffness: 120, damping: 20 },
    });
  };

  const handleMouseLeave = () => {
    if (exiting) return;
    frameControls.start({ rotateY: 0, rotateX: 0, transition: { duration: 0.6 } });
  };

  const handleBegin = async () => {
    setExiting(true);
    await frameControls.start({
      scale: 2.5,
      opacity: 0,
      transition: { duration: 1.2, ease: 'easeInOut' },
    });
    onComplete();
  };

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden flex items-center justify-center bg-[#050f09]"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Layer 1 — Background sanctuary */}
      <div className="absolute inset-0 z-0 flex items-center justify-end overflow-hidden bg-emerald-950">
        <img
          src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1600&q=80"
          alt="Luxury Medical Sanctuary"
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay filter blur-sm"
        />
        <img
          src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80"
          alt="Welcoming Professional"
          className="relative z-10 h-full max-h-[85vh] object-contain object-right-bottom pr-4 md:pr-12 lg:pr-24 mix-blend-normal transform scale-105"
        />
        {/* warm cinematic vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
      </div>

      {/* Layer 2 — Shadowbox parallax frame */}
      <motion.div
        ref={frameRef}
        animate={frameControls}
        initial={{ scale: 1, opacity: 1, rotateX: 0, rotateY: 0 }}
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ perspective: 1200, transformStyle: 'preserve-3d' }}
      >
        {/* Door-frame borders */}
        <div
          className="absolute inset-0"
          style={{
            border: '28px solid #0F3A20',
            boxShadow: 'inset 0 0 60px rgba(15,58,32,0.8), 0 0 80px rgba(15,58,32,0.5)',
          }}
        />
        {/* Inner gold accent line */}
        <div
          className="absolute"
          style={{
            inset: 28,
            border: '2px solid #C5A059',
            opacity: 0.7,
          }}
        />
        {/* Corner ornaments */}
        {['top-7 left-7', 'top-7 right-7', 'bottom-7 left-7', 'bottom-7 right-7'].map((pos, i) => (
          <div
            key={i}
            className={`absolute ${pos} w-8 h-8`}
            style={{
              borderTop: i < 2 ? '3px solid #C5A059' : 'none',
              borderBottom: i >= 2 ? '3px solid #C5A059' : 'none',
              borderLeft: i % 2 === 0 ? '3px solid #C5A059' : 'none',
              borderRight: i % 2 !== 0 ? '3px solid #C5A059' : 'none',
            }}
          />
        ))}
      </motion.div>

      {/* Layer 3 — Copy + CTA */}
      <motion.div
        className="relative z-20 text-center px-6 max-w-3xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: exiting ? 0 : 1, y: 0 }}
        transition={{ duration: 1, delay: 0.3 }}
      >
        {/* Brand mark */}
        <p className="text-xs font-bold tracking-[0.35em] text-[#C5A059] uppercase mb-6">
          SAFE-T 4LIFE™ · Medical Travel Concierge
        </p>

        <h1
          className="font-display text-4xl sm:text-5xl lg:text-6xl text-white leading-tight mb-6 drop-shadow-2xl"
          style={{ textShadow: '0 4px 30px rgba(0,0,0,0.7)' }}
        >
          World-Class Care.<br />
          <span style={{ color: '#C5A059' }}>Paradise Recovery.</span><br />
          Seamlessly Handled.
        </h1>

        <p className="text-slate-300 text-base sm:text-lg mb-10 max-w-xl mx-auto leading-relaxed">
          An elite concierge service that transforms medical travel into a first-class journey — from consultation to recovery.
        </p>

        <button
          onClick={handleBegin}
          disabled={exiting}
          className="group relative px-10 py-4 rounded-full text-base font-bold tracking-widest uppercase transition-all duration-300 disabled:pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, #0F3A20 0%, #1a5c35 100%)',
            border: '1px solid #C5A059',
            color: '#C5A059',
            boxShadow: '0 0 30px rgba(197,160,89,0.2)',
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 50px rgba(197,160,89,0.5)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 30px rgba(197,160,89,0.2)'}
        >
          <span className="relative z-10">Begin Exploration</span>
        </button>

        {/* Scroll hint */}
        <div className="mt-10 flex flex-col items-center gap-2 opacity-40">
          <div className="w-px h-8 bg-white animate-pulse" />
          <p className="text-[10px] tracking-widest text-white uppercase">Scroll to discover</p>
        </div>
      </motion.div>
    </div>
  );
}