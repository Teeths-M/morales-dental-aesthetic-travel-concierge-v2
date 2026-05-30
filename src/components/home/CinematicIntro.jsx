import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

export default function CinematicIntro({ onComplete }) {
  const [exiting, setExiting] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef(null);

  // Parallax motion values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Parallax transforms with different intensities for depth
  const backgroundX = useTransform(mouseX, [-1, 1], [-8, 8]);
  const backgroundY = useTransform(mouseY, [-1, 1], [-8, 8]);
  
  const planeX = useTransform(mouseX, [-1, 1], [-12, 12]);
  const planeY = useTransform(mouseY, [-1, 1], [-12, 12]);
  
  const textX = useTransform(mouseX, [-1, 1], [-15, 15]);
  const textY = useTransform(mouseY, [-1, 1], [-15, 15]);
  
  const doctorX = useTransform(mouseX, [-1, 1], [-20, 20]);
  const doctorY = useTransform(mouseY, [-1, 1], [-20, 20]);

  const doorRef = useRef(null);
  const doctorRef = useRef(null);
  const planeRef = useRef(null);

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
  };

  const handleMouseLeave = () => {
    if (exiting) return;
    mouseX.set(0);
    mouseY.set(0);
  };

  const handleBegin = async () => {
    setExiting(true);
    
    await Promise.all([
      doorRef.current?.animate({
        x: 600,
        opacity: 0,
        scale: 1.4,
        rotateY: 25,
        transition: { duration: 1.4, ease: 'easeInOut' }
      }),
      doctorRef.current?.animate({
        x: 700,
        opacity: 0,
        scale: 1.3,
        transition: { duration: 1.4, ease: 'easeInOut' }
      }),
      planeRef.current?.animate({
        x: -800,
        y: -400,
        opacity: 0,
        transition: { duration: 1.2, ease: 'easeIn' }
      })
    ]);
    
    onComplete();
  };

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen w-full overflow-hidden flex items-center justify-start"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* LAYER 1 — Stunning Sunset Background */}
      <motion.div
        style={{ x: backgroundX, y: backgroundY }}
        className="absolute inset-0 z-0"
      >
        <div className="absolute inset-0">
          {/* Golden sunset gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#ffd4a3] via-[#ffc894] to-[#f5e6d3]" />
          
          {/* Beach/horizon imagery */}
          <img
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2400&q=80"
            alt="Golden Hour Sunset Beach"
            className="absolute inset-0 w-full h-full object-cover opacity-45 mix-blend-multiply"
          />
          
          {/* Warm light rays overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#d4a574]/40 via-transparent to-[#fff8e7]/30" />
        </div>

        {/* Animated luxury airplane in flight */}
        <motion.div
          ref={planeRef}
          style={{ x: planeX, y: planeY }}
          initial={{ x: -200, y: 100, opacity: 0, scale: 0.6 }}
          animate={loaded ? { 
            x: [0, 80, 60],
            y: [-20, -40, -30],
            opacity: [0, 0.85, 0.8],
            scale: [0.6, 0.95, 0.92]
          } : {}}
          transition={{ 
            duration: 3.5, 
            ease: 'easeOut',
            delay: 0.4
          }}
          className="absolute top-[18%] left-[30%] w-80 h-60 z-5"
        >
          <img
            src="https://images.unsplash.com/photo-1540962351504-03099e0a754b?auto=format&fit=crop&w=800&q=80"
            alt="Luxury Private Jet in Flight"
            className="w-full h-full object-contain"
            style={{ 
              filter: 'drop-shadow(0 15px 45px rgba(100,70,30,0.4))',
              opacity: 0.95
            }}
          />
        </motion.div>
      </motion.div>

      {/* LAYER 2 — Left-Side Typography Container */}
      <motion.div
        style={{ x: textX, y: textY }}
        className="absolute left-0 top-0 bottom-0 z-10 flex flex-col justify-center pointer-events-none"
      >
        <div className="w-full max-w-2xl px-12 md:px-20 lg:px-32">
          {/* Brand label */}
          <motion.p
            initial={{ opacity: 0, x: -40 }}
            animate={loaded ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-sm font-semibold tracking-widest text-slate-700 uppercase mb-4"
          >
            Medical Travel Concierge
          </motion.p>

          {/* Main headline with styled "Begins Here" */}
          <motion.h1
            initial={{ opacity: 0, x: -50 }}
            animate={loaded ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 1, delay: 0.4 }}
            className="font-display text-6xl sm:text-7xl lg:text-8xl leading-tight mb-8"
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
            initial={{ opacity: 0, x: -40 }}
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
            className="group relative px-10 py-3.5 rounded-full text-sm font-bold tracking-widest uppercase transition-all duration-300 disabled:pointer-events-none pointer-events-auto shadow-lg"
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
      </motion.div>

      {/* LAYER 3 — Right Side: Professional + Door Frame */}
      <motion.div
        style={{ x: doctorX, y: doctorY }}
        className="absolute right-0 top-0 bottom-0 z-20 w-[50%] max-w-2xl flex items-center justify-end pointer-events-none"
      >
        {/* Ornate door frame backdrop */}
        <motion.div
          ref={doorRef}
          initial={{ x: 120, opacity: 0, rotateY: -20 }}
          animate={loaded ? { x: 0, opacity: 1, rotateY: 0 } : {}}
          transition={{ duration: 1.6, ease: 'easeOut', delay: 0.3 }}
          className="absolute right-0 top-0 bottom-0 w-full max-w-2xl"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Warm luxury interior frame */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, #e8d4b8 0%, #f5e6d3 50%, #d9c5a8 100%)',
              boxShadow: 'inset 0 0 120px rgba(0,0,0,0.15), 0 0 80px rgba(212,165,116,0.3)',
            }}
          >
            {/* Inner wooden frame detail */}
            <div
              className="absolute inset-8"
              style={{
                borderLeft: '4px solid rgba(138,101,60,0.6)',
                borderRight: '4px solid rgba(200,160,110,0.5)',
                borderTop: '4px solid rgba(200,160,110,0.5)',
                borderBottom: '4px solid rgba(138,101,60,0.6)',
                boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.8)',
              }}
            />
            
            {/* Gold accent corners */}
            {['top-12 left-12', 'top-12 right-12', 'bottom-12 left-12', 'bottom-12 right-12'].map((pos, i) => (
              <div
                key={i}
                className={`absolute ${pos} w-16 h-16`}
                style={{
                  borderLeft: i % 2 === 0 ? '3px solid #D4A574' : 'none',
                  borderRight: i % 2 !== 0 ? '3px solid #D4A574' : 'none',
                  borderTop: i < 2 ? '3px solid #D4A574' : 'none',
                  borderBottom: i >= 2 ? '3px solid #D4A574' : 'none',
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Professional stepping through */}
        <motion.div
          ref={doctorRef}
          initial={{ x: 150, opacity: 0, scale: 0.9 }}
          animate={loaded ? { x: 0, opacity: 1, scale: 1.05 } : {}}
          transition={{ duration: 1.8, ease: 'easeOut', delay: 0.5 }}
          className="relative w-full h-full flex items-center justify-end pr-8 md:pr-16 z-30"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <img
            src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=80"
            alt="Welcoming Medical Professional"
            className="h-[95%] object-contain object-bottom"
            style={{ 
              filter: 'drop-shadow(0 0 60px rgba(212,165,116,0.4)) brightness(1.08)',
              mixBlendMode: 'normal'
            }}
          />
          
          {/* Subtle luminous glow */}
          <div
            className="absolute inset-0 rounded-full opacity-25 blur-3xl pointer-events-none"
            style={{ background: 'radial-gradient(circle at 60% 40%, rgba(212,165,116,0.5) 0%, transparent 60%)' }}
          />
        </motion.div>

        {/* Floating ambient particles for elegance */}
        <div className="absolute inset-0 z-25 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 0 }}
              animate={{ 
                opacity: [0, 0.35, 0],
                y: [0, -100, -200],
                x: [0, Math.random() * 40 - 20, Math.random() * 60 - 30]
              }}
              transition={{ 
                duration: 12 + Math.random() * 6,
                repeat: Infinity,
                delay: i * 1.8,
                ease: 'easeInOut'
              }}
              className="absolute w-1 h-1 bg-[#D4A574] rounded-full"
              style={{
                right: `${15 + Math.random() * 35}%`,
                top: `${15 + (i % 3) * 25}%`,
                filter: 'blur(2px)'
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Vignette overlays */}
      <div className="absolute inset-0 z-50 pointer-events-none bg-gradient-to-r from-[#f5e6d3]/40 via-transparent to-[#d4a574]/20" />
      <div className="absolute inset-0 z-50 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-[#f5e6d3]/20" />
    </div>
  );
}