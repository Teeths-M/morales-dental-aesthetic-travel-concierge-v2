import React, { useRef, useState, useEffect } from 'react';
import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion';

export default function CinematicIntro({ onComplete }) {
  const [exiting, setExiting] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef(null);

  // Parallax motion values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Parallax transforms with different intensities for depth
  const backgroundX = useTransform(mouseX, [-1, 1], [-5, 5]);
  const backgroundY = useTransform(mouseY, [-1, 1], [-5, 5]);
  
  const textX = useTransform(mouseX, [-1, 1], [-15, 15]);
  const textY = useTransform(mouseY, [-1, 1], [-15, 15]);
  
  const foregroundX = useTransform(mouseX, [-1, 1], [-25, 25]);
  const foregroundY = useTransform(mouseY, [-1, 1], [-25, 25]);

  const frameControls = useAnimation();
  const frameRef = useRef(null);
  const planeRef = useRef(null);
  const doctorRef = useRef(null);
  const doorRef = useRef(null);

  useEffect(() => {
    setLoaded(true);
  }, []);

  const handleMouseMove = (e) => {
    if (exiting || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    
    mouseX.set(dx);
    mouseY.set(dy);

    // Frame parallax
    frameControls.start({
      rotateY: dx * 8,
      rotateX: -dy * 6,
      transition: { type: 'spring', stiffness: 100, damping: 15 },
    });
  };

  const handleMouseLeave = () => {
    if (exiting) return;
    mouseX.set(0);
    mouseY.set(0);
    frameControls.start({ rotateY: 0, rotateX: 0, transition: { duration: 0.8 } });
  };

  const handleBegin = async () => {
    setExiting(true);
    
    // Exit animations
    await Promise.all([
      frameControls.start({
        scale: 3,
        opacity: 0,
        transition: { duration: 1.5, ease: 'easeInOut' },
      }),
      doorRef.current?.animate({
        x: 400,
        opacity: 0,
        scale: 1.3,
        transition: { duration: 1.2, ease: 'easeInOut' }
      }),
      doctorRef.current?.animate({
        x: 500,
        opacity: 0,
        scale: 1.2,
        transition: { duration: 1.2, ease: 'easeInOut' }
      }),
      planeRef.current?.animate({
        x: -600,
        y: -200,
        opacity: 0,
        transition: { duration: 1, ease: 'easeIn' }
      })
    ]);
    
    onComplete();
  };

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen w-full overflow-hidden flex items-center justify-center bg-[#0a1f1a]"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* LAYER 1 — Deep Background (z-0): Tropical Beach Sunset */}
      <motion.div
        style={{ x: backgroundX, y: backgroundY }}
        className="absolute inset-0 z-0 overflow-hidden"
      >
        {/* Stunning tropical beach sunset */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a4d3e] via-[#0f3a2e] to-[#0a2f24]">
          <img
            src="https://images.unsplash.com/photo-1590523741831-ab7e8b2f7c25?auto=format&fit=crop&w=2400&q=80"
            alt="Tropical Paradise Coast"
            className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay"
          />
        </div>
        
        {/* Animated floating plane in upper-middle sky */}
        <motion.div
          ref={planeRef}
          initial={{ x: 300, y: -50, opacity: 0, scale: 0.7 }}
          animate={loaded ? { 
            x: [300, 150, 180], 
            y: [0, 0, 0], 
            opacity: [0, 0.7, 0.7], 
            scale: [0.7, 0.85, 0.85] 
          } : {}}
          transition={{ 
            duration: 4, 
            ease: 'easeOut',
            delay: 0.5,
            x: { repeat: Infinity, repeatType: 'reverse', duration: 8 }
          }}
          className="absolute top-[15%] right-[25%] w-48 h-48 z-0"
        >
          <img
            src="https://images.unsplash.com/photo-1540962351504-03099e0a754b?auto=format&fit=crop&w=600&q=80"
            alt="Luxury Private Jet"
            className="w-full h-full object-contain"
            style={{ 
              filter: 'drop-shadow(0 20px 60px rgba(0,0,0,0.6))',
              opacity: 0.8
            }}
          />
          {/* Contrail effect */}
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={loaded ? { opacity: 0.3, width: 200 } : {}}
            transition={{ duration: 2, delay: 1 }}
            className="absolute top-1/2 right-full h-0.5 bg-gradient-to-r from-transparent via-white to-transparent"
          />
        </motion.div>

        {/* Ambient light rays */}
        <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-[#C5A059]/20" />
      </motion.div>

      {/* LAYER 2 — Midground UI (z-10): Left-Aligned Typography */}
      <motion.div
        style={{ x: textX, y: textY }}
        className="absolute inset-0 z-10 flex items-center justify-start pointer-events-none"
      >
        <div className="w-full max-w-4xl px-12 md:px-24 lg:px-32">
          {/* Brand mark */}
          <motion.p
            initial={{ opacity: 0, x: -30 }}
            animate={loaded ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-[10px] font-bold tracking-[0.4em] text-[#C5A059] uppercase mb-6"
          >
            SAFE-T 4LIFE™ · Medical Travel Concierge
          </motion.p>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, x: -40 }}
            animate={loaded ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 1, delay: 0.5 }}
            className="font-display text-5xl sm:text-6xl lg:text-7xl leading-tight mb-6"
          >
            <span className="text-white drop-shadow-2xl" style={{ textShadow: '0 4px 40px rgba(0,0,0,0.8)' }}>
              Your Journey to
            </span>
            <br />
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={loaded ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, delay: 0.8 }}
              className="inline-block"
              style={{ 
                color: '#C5A059',
                textShadow: '0 4px 40px rgba(197,160,89,0.4)'
              }}
            >
              Care Begins Here
            </motion.span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, x: -30 }}
            animate={loaded ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="text-slate-300 text-lg sm:text-xl max-w-xl leading-relaxed mb-10"
          >
            An elite concierge service transforming medical travel into a first-class journey — 
            from consultation through recovery in paradise.
          </motion.p>

          {/* CTA Button */}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={loaded ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.9 }}
            onClick={handleBegin}
            disabled={exiting}
            className="group relative px-12 py-5 rounded-full text-base font-bold tracking-widest uppercase transition-all duration-300 disabled:pointer-events-none pointer-events-auto"
            style={{
              background: 'linear-gradient(135deg, #0F3A20 0%, #1a5c35 100%)',
              border: '2px solid #C5A059',
              color: '#C5A059',
              boxShadow: '0 0 40px rgba(197,160,89,0.3)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = '0 0 70px rgba(197,160,89,0.6)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = '0 0 40px rgba(197,160,89,0.3)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <span className="relative z-10 flex items-center gap-3">
              Begin Exploration
              <motion.span
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                →
              </motion.span>
            </span>
          </motion.button>

          {/* Scroll hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={loaded ? { opacity: 0.4 } : {}}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="mt-12 flex flex-col items-start gap-3"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-px h-10 bg-[#C5A059]"
            />
            <p className="text-[10px] tracking-widest text-[#C5A059] uppercase">
              Scroll to discover your journey
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* LAYER 3 — Foreground (z-20): Doctor + Ornate Door Frame */}
      <motion.div
        ref={frameRef}
        style={{ x: foregroundX, y: foregroundY, perspective: 1400 }}
        className="absolute inset-0 z-20 pointer-events-none"
      >
        {/* Ornate door frame on right edge */}
        <motion.div
          ref={doorRef}
          initial={{ x: 150, opacity: 0, rotateY: -15 }}
          animate={loaded ? { x: 0, opacity: 1, rotateY: 0 } : {}}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.4 }}
          className="absolute right-0 top-0 bottom-0 w-[40%] max-w-md"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Rich dark wood frame with gold trim */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, #2a1810 0%, #1a0f0a 100%)',
              borderLeft: '3px solid #C5A059',
              boxShadow: 'inset 0 0 80px rgba(0,0,0,0.8), 0 0 60px rgba(197,160,89,0.2)',
            }}
          >
            {/* Gold inner border */}
            <div
              className="absolute inset-4"
              style={{
                borderLeft: '2px solid #C5A059',
                borderTop: '2px solid #C5A059',
                borderBottom: '2px solid #C5A059',
                borderRadius: '4px',
              }}
            />
            
            {/* Ornamental corner details */}
            {['top-8 left-8', 'bottom-8 left-8'].map((pos, i) => (
              <div
                key={i}
                className={`absolute ${pos} w-12 h-12`}
                style={{
                  borderLeft: '4px solid #C5A059',
                  borderTop: i === 0 ? '4px solid #C5A059' : 'none',
                  borderBottom: i === 1 ? '4px solid #C5A059' : 'none',
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Welcoming female medical professional stepping through */}
        <motion.div
          ref={doctorRef}
          initial={{ x: 200, opacity: 0, scale: 0.92 }}
          animate={loaded ? { x: 0, opacity: 1, scale: 1.02 } : {}}
          transition={{ duration: 1.8, ease: 'easeOut', delay: 0.6 }}
          className="absolute right-0 bottom-0 w-[35%] max-w-sm z-30"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <img
            src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=80"
            alt="Welcoming Medical Professional"
            className="w-full h-full object-contain object-bottom"
            style={{ 
              filter: 'drop-shadow(0 0 50px rgba(197,160,89,0.3)) brightness(1.05)',
              mixBlendMode: 'normal'
            }}
          />
          {/* Subtle glow around professional */}
          <div
            className="absolute inset-0 rounded-full opacity-30 blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(197,160,89,0.4) 0%, transparent 70%)' }}
          />
        </motion.div>

        {/* Floating ambient particles */}
        <div className="absolute inset-0 z-40 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 0, x: 0 }}
              animate={{ 
                opacity: [0, 0.4, 0],
                y: [0, -120, -240],
                x: [0, Math.random() * 60 - 30, Math.random() * 80 - 40]
              }}
              transition={{ 
                duration: 10 + Math.random() * 5,
                repeat: Infinity,
                delay: i * 1.2,
                ease: 'easeInOut'
              }}
              className="absolute w-1.5 h-1.5 bg-[#C5A059] rounded-full"
              style={{
                left: `${60 + Math.random() * 30}%`,
                top: `${20 + (i % 4) * 18}%`,
                filter: 'blur(3px)'
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Cinematic vignette overlay */}
      <div className="absolute inset-0 z-50 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/60" />
      <div className="absolute inset-0 z-50 pointer-events-none bg-gradient-to-r from-black/30 via-transparent to-black/50" />
    </div>
  );
}