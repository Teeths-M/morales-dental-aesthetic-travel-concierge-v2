import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * PremiumAmbientBackground
 * 
 * A multi-layered, cinematic ambient background for luxury healthcare travel.
 * Features:
 * - Slow-moving elegant gradients with breathing motion
 * - Soft ambient light glows
 * - Subtle floating glassmorphism elements
 * - Delicate travel path lines (abstract network patterns)
 * - Soft glowing location points
 * - Smooth premium particles drifting slowly
 * - Subtle depth/parallax movement
 * 
 * Optimized for performance and future video replacement.
 */

export default function PremiumAmbientBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      
      {/* LAYER 1: Base Deep Gradient (slowest movement - furthest back) */}
      <motion.div
        className="absolute inset-0 will-change-transform transform-gpu"
        style={{
          background: 'linear-gradient(135deg, #0F3A20 0%, #0d2f3e 35%, #1a2e22 70%, #0a1f29 100%)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
        animate={{
          background: [
            'linear-gradient(135deg, #0F3A20 0%, #0d2f3e 35%, #1a2e22 70%, #0a1f29 100%)',
            'linear-gradient(140deg, #0F3A20 0%, #0d2f3e 35%, #1a2e22 70%, #0a1f29 100%)',
            'linear-gradient(135deg, #0F3A20 0%, #0d2f3e 35%, #1a2e22 70%, #0a1f29 100%)',
          ],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />

      {/* LAYER 2: Slow-Moving Elegant Gradient Overlays */}
      <motion.div
        className="absolute inset-0 opacity-40 will-change-transform transform-gpu"
        style={{
          background: 'radial-gradient(circle at 30% 40%, rgba(59,130,246,0.08) 0%, transparent 50%)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.35, 0.45, 0.35],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      <motion.div
        className="absolute inset-0 opacity-30 will-change-transform transform-gpu"
        style={{
          background: 'radial-gradient(circle at 70% 60%, rgba(197,160,89,0.06) 0%, transparent 50%)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.25, 0.35, 0.25],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      {/* LAYER 3: Soft Ambient Light Glows (breathing effect) */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={`glow-${i}`}
          className="absolute rounded-full blur-3xl"
          style={{
            background: i % 2 === 0 
              ? 'radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(197,160,89,0.03) 0%, transparent 70%)',
            width: `${400 + i * 100}px`,
            height: `${400 + i * 100}px`,
            left: `${10 + i * 20}%`,
            top: `${15 + i * 15}%`,
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 12 + i * 2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 1.5,
          }}
        />
      ))}

      {/* LAYER 4: Abstract Travel Network Lines (faint airport route patterns) */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
        {/* Abstract airplane trail lines - very subtle */}
        <motion.path
          d="M100,200 Q300,150 500,250 T900,200"
          fill="none"
          stroke="url(#lineGradient1)"
          strokeWidth="1"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.03 }}
          transition={{ duration: 8, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        />
        <motion.path
          d="M150,400 Q400,350 600,450 T950,400"
          fill="none"
          stroke="url(#lineGradient2)"
          strokeWidth="1"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.03 }}
          transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: 1 }}
        />
        <motion.path
          d="M200,600 Q450,550 650,650 T900,600"
          fill="none"
          stroke="url(#lineGradient3)"
          strokeWidth="1"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.03 }}
          transition={{ duration: 9, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: 2 }}
        />
        <motion.path
          d="M100,800 Q350,750 550,850 T950,800"
          fill="none"
          stroke="url(#lineGradient4)"
          strokeWidth="1"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.03 }}
          transition={{ duration: 11, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: 3 }}
        />
        
        <defs>
          <linearGradient id="lineGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0" />
            <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#C5A059" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C5A059" stopOpacity="0" />
            <stop offset="50%" stopColor="#C5A059" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0" />
            <stop offset="50%" stopColor="#C5A059" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGradient4" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C5A059" stopOpacity="0" />
            <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#C5A059" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* LAYER 5: Soft Glowing Location Points */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`point-${i}`}
          className="absolute rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(197,160,89,0.4) 0%, transparent 70%)',
            width: '8px',
            height: '8px',
            left: `${15 + i * 12}%`,
            top: `${20 + (i % 4) * 18}%`,
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.8,
          }}
        />
      ))}

      {/* LAYER 6: Floating Glassmorphism Elements */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={`glass-${i}`}
          className="absolute rounded-lg"
          style={{
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            width: `${60 + i * 10}px`,
            height: `${60 + i * 10}px`,
            left: `${20 + i * 15}%`,
            top: `${25 + (i % 3) * 20}%`,
          }}
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -20, 30, 0],
            rotate: [0, 5, -5, 0],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 18 + i * 2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 2,
          }}
        />
      ))}

      {/* LAYER 7: Premium Particles (light streaks - very subtle) */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute rounded-full"
          style={{
            background: i % 3 === 0 ? '#3B82F6' : i % 3 === 1 ? '#C5A059' : '#ffffff',
            width: i % 2 === 0 ? '2px' : '1px',
            height: i % 2 === 0 ? '2px' : '1px',
            filter: 'blur(0.5px)',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            x: [0, Math.random() * 100 - 50],
            y: [0, -Math.random() * 150 - 50],
            opacity: [0, 0.4, 0.6, 0],
          }}
          transition={{
            duration: 15 + Math.random() * 10,
            repeat: Infinity,
            ease: 'linear',
            delay: i * 0.8,
          }}
        />
      ))}

      {/* LAYER 8: Medical-Inspired Geometric Pattern (very faint overlay) */}
      <motion.div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(59,130,246,0.3) 1px, transparent 1px),
            radial-gradient(circle at 50% 50%, rgba(197,160,89,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px, 80px 80px',
          backgroundPosition: '0 0, 20px 20px',
        }}
        animate={{
          backgroundPosition: ['0 0, 20px 20px', '60px 60px, 100px 100px'],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      />

      {/* LAYER 9: Calming Luxury Atmosphere (top-to-bottom gradient sweep) */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(15,58,32,0.15) 50%, transparent 100%)',
        }}
        animate={{
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}