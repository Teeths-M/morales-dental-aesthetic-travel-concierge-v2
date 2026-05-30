import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Shield, Plane, Heart, Clock, Star, Globe, ArrowRight } from 'lucide-react';

/**
 * HeroTrustVisual
 * 
 * Premium emotional visual anchor for the right side of the hero section.
 * Creates immediate "wow" and trust through layered cinematic composition.
 */

export default function HeroTrustVisual({ loaded }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Trust cards data
  const trustCards = [
    {
      icon: CheckCircle2,
      title: 'Verified Specialist',
      color: '#3B82F6',
      delay: 0.3,
      x: [0, 15, -10, 0],
      y: [0, -8, 12, 0],
    },
    {
      icon: Heart,
      title: 'Recovery Tracking',
      color: '#C5A059',
      delay: 0.5,
      x: [0, -12, 8, 0],
      y: [0, 10, -6, 0],
    },
    {
      icon: Plane,
      title: 'Flight Coordination',
      color: '#3B82F6',
      delay: 0.7,
      x: [0, 10, -15, 0],
      y: [0, -12, 8, 0],
    },
    {
      icon: Shield,
      title: 'SAFE-T4LIFE™ Protection',
      color: '#C5A059',
      delay: 0.9,
      x: [0, -8, 12, 0],
      y: [0, 15, -10, 0],
    },
    {
      icon: Star,
      title: 'Luxury Stay Planning',
      color: '#3B82F6',
      delay: 1.1,
      x: [0, 12, -8, 0],
      y: [0, -10, 15, 0],
    },
  ];

  // Trust metrics data
  const trustMetrics = [
    { value: '98%', label: 'Satisfaction', icon: Star, color: '#C5A059' },
    { value: '24/7', label: 'Concierge Support', icon: Clock, color: '#3B82F6' },
    { value: '500+', label: 'Verified Specialists', icon: CheckCircle2, color: '#C5A059' },
    { value: '100%', label: 'End-to-End Recovery', icon: Heart, color: '#3B82F6' },
  ];

  return (
    <div className="absolute inset-y-0 right-0 w-full md:w-1/2 z-0 overflow-hidden">
      
      {/* Base gradient background */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(15,58,32,0.3) 50%, rgba(197,160,89,0.06) 100%)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
        }}
        initial={{ opacity: 0 }}
        animate={loaded ? { opacity: 1 } : {}}
        transition={{ duration: 1.5, delay: 0.3 }}
      />

      {/* LAYER 1: Animated World Travel Map */}
      <motion.div
        className="absolute inset-0 opacity-20"
        initial={{ opacity: 0 }}
        animate={loaded ? { opacity: 0.2 } : {}}
        transition={{ duration: 2, delay: 0.5 }}
      >
        <svg className="w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
          {/* Abstract world continents - very subtle */}
          <motion.path
            d="M100,150 Q200,120 300,180 T500,200 T700,150"
            fill="none"
            stroke="rgba(59,130,246,0.15)"
            strokeWidth="1"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
          />
          <motion.path
            d="M150,250 Q250,220 350,280 T550,300 T750,250"
            fill="none"
            stroke="rgba(197,160,89,0.15)"
            strokeWidth="1"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 3.5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: 0.5 }}
          />
          <motion.path
            d="M200,350 Q300,320 400,380 T600,400 T750,350"
            fill="none"
            stroke="rgba(59,130,246,0.15)"
            strokeWidth="1"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 4, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: 1 }}
          />
          
          {/* Glowing route lines with moving dots */}
          {[...Array(5)].map((_, i) => (
            <g key={`route-${i}`}>
              <motion.circle
                cx={150 + i * 120}
                cy={200 + (i % 3) * 80}
                r="3"
                fill="rgba(197,160,89,0.6)"
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: [0, 0.8, 0],
                  cx: [150 + i * 120, 200 + i * 120, 250 + i * 120],
                }}
                transition={{ 
                  duration: 4 + i, 
                  repeat: Infinity, 
                  ease: 'linear',
                  delay: i * 0.8 
                }}
              />
              <motion.circle
                cx={180 + i * 120}
                cy={220 + (i % 3) * 80}
                r="2"
                fill="rgba(59,130,246,0.5)"
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: [0, 0.6, 0],
                  cx: [180 + i * 120, 230 + i * 120, 280 + i * 120],
                }}
                transition={{ 
                  duration: 5 + i, 
                  repeat: Infinity, 
                  ease: 'linear',
                  delay: i * 0.6 + 0.4 
                }}
              />
            </g>
          ))}
        </svg>
      </motion.div>

      {/* LAYER 2: Central Abstract Care Visual - Elegant glowing orb */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: '400px',
          height: '400px',
        }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={loaded ? { scale: 1, opacity: 1 } : {}}
        transition={{ duration: 2, delay: 0.7, ease: 'easeOut' }}
      >
        {/* Multi-layered glowing orb */}
        <div className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
            filter: 'blur(20px)',
          }}
        />
        <motion.div
          className="absolute inset-8 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(197,160,89,0.12) 0%, transparent 70%)',
            filter: 'blur(15px)',
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.6, 0.8, 0.6],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-16 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
            filter: 'blur(10px)',
          }}
          animate={{
            rotate: 360,
            scale: [1, 1.05, 1],
          }}
          transition={{ 
            rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
            scale: { duration: 8, repeat: Infinity, ease: 'easeInOut' },
          }}
        />
        
        {/* Abstract human-care silhouette - soft waves */}
        <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 400 400">
          <motion.path
            d="M100,200 Q150,150 200,200 T300,200"
            fill="none"
            stroke="rgba(197,160,89,0.4)"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
          />
          <motion.path
            d="M120,250 Q170,200 220,250 T320,250"
            fill="none"
            stroke="rgba(59,130,246,0.3)"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 3.5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: 0.5 }}
          />
        </svg>
      </motion.div>

      {/* LAYER 3: Floating Glassmorphism Trust Cards */}
      <div className="absolute inset-0">
        {trustCards.map((card, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${15 + (i % 3) * 30}%`,
              top: `${15 + Math.floor(i / 3) * 35}%`,
            }}
            initial={{ opacity: 0, scale: 0.8, x: 0, y: 0 }}
            animate={loaded ? { 
              opacity: [0, 0.9, 0.85], 
              scale: [0.8, 1, 1],
              x: card.x,
              y: card.y,
            } : {}}
            transition={{
              opacity: { duration: 0.8, delay: card.delay },
              scale: { duration: 0.6, delay: card.delay },
              x: { duration: 8, repeat: Infinity, ease: 'easeInOut', delay: card.delay + 0.5 },
              y: { duration: 8, repeat: Infinity, ease: 'easeInOut', delay: card.delay + 0.5 },
            }}
          >
            <motion.div
              className="px-5 py-4 rounded-2xl backdrop-blur-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: `1px solid ${card.color}30`,
                boxShadow: `0 8px 32px ${card.color}20, inset 0 1px 0 rgba(255,255,255,0.1)`,
              }}
              whileHover={{
                scale: 1.05,
                background: 'rgba(255, 255, 255, 0.1)',
                borderColor: `${card.color}60`,
                boxShadow: `0 12px 48px ${card.color}30`,
              }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-3">
                <card.icon className="w-5 h-5" style={{ color: card.color }} />
                <span className="text-xs font-bold tracking-wide" style={{ color: card.color }}>
                  {card.title}
                </span>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* LAYER 4: Floating Trust Metrics - Bottom area */}
      <motion.div
        className="absolute bottom-8 left-8 right-8"
        initial={{ opacity: 0, y: 30 }}
        animate={loaded ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 1, delay: 1.5 }}
      >
        <div className="grid grid-cols-2 gap-4">
          {trustMetrics.map((metric, i) => (
            <motion.div
              key={i}
              className="px-4 py-3 rounded-xl backdrop-blur-lg"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${metric.color}25`,
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={loaded ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 1.7 + i * 0.15 }}
              whileHover={{
                scale: 1.03,
                background: 'rgba(255, 255, 255, 0.08)',
                borderColor: `${metric.color}50`,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <metric.icon className="w-4 h-4" style={{ color: metric.color }} />
                <span className="text-lg font-bold font-display" style={{ color: metric.color }}>
                  {metric.value}
                </span>
              </div>
              <p className="text-[10px] tracking-wide text-slate-400">{metric.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* LAYER 5: Ambient Premium Motion Elements */}
      
      {/* Soft floating particles */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute rounded-full"
          style={{
            background: i % 2 === 0 ? 'rgba(59,130,246,0.4)' : 'rgba(197,160,89,0.3)',
            width: i % 3 === 0 ? '4px' : i % 3 === 1 ? '2px' : '3px',
            height: i % 3 === 0 ? '4px' : i % 3 === 1 ? '2px' : '3px',
            filter: 'blur(1px)',
            left: `${10 + Math.random() * 80}%`,
            top: `${10 + Math.random() * 80}%`,
          }}
          animate={{
            x: [0, Math.random() * 60 - 30],
            y: [0, Math.random() * -80 - 40],
            opacity: [0, 0.5, 0.3, 0],
          }}
          transition={{
            duration: 12 + Math.random() * 8,
            repeat: Infinity,
            ease: 'linear',
            delay: i * 1.2,
          }}
        />
      ))}

      {/* Elegant glow transitions - sweeping light */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, transparent 0%, rgba(197,160,89,0.08) 50%, transparent 100%)',
        }}
        animate={{
          opacity: [0.3, 0.5, 0.3],
          backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Subtle parallax depth layers */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 70% 30%, rgba(59,130,246,0.06) 0%, transparent 60%)',
        }}
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Cinematic vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(15,58,32,0.4) 100%)',
        }}
      />
    </div>
  );
}