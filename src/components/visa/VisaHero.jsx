import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Sparkles, Globe2, Lock } from 'lucide-react';

export default function VisaHero() {
  return (
    <div className="relative overflow-hidden bg-[#0a0f1e] text-white">
      {/* Deep mesh gradient */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f1e] via-[#0d1a3a] to-[#071a2e]" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/8 rounded-full blur-3xl" />
        {/* Fine grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 lg:py-24">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          {/* System badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="inline-flex items-center gap-2.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-5 py-2 mb-8"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/70">SAFE-T VISA ASSIST™</span>
            <span className="w-px h-3 bg-white/20" />
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-emerald-400 font-medium">AI-Powered</span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="font-display text-4xl lg:text-6xl font-bold mb-5 leading-[1.1] tracking-tight"
          >
            Your Intelligent
            <span className="block bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
              Medical Travel Companion
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="text-white/50 text-base lg:text-lg max-w-xl mx-auto leading-relaxed mb-12"
          >
            Instant AI visa checks, personalized document checklists, and embassy guidance — so you can focus on your health journey.
          </motion.p>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="flex flex-wrap justify-center gap-px"
          >
            {[
              { icon: <Globe2 className="w-4 h-4" />, value: '194+', label: 'Countries' },
              { icon: <span className="text-sm">✈️</span>, value: '10', label: 'Destinations' },
              { icon: <Sparkles className="w-4 h-4" />, value: 'Instant', label: 'AI Visa Check' },
              { icon: <Lock className="w-4 h-4" />, value: '100%', label: 'Private & Secure' },
            ].map((s, i) => (
              <div key={s.label} className={`flex flex-col items-center px-8 py-4 ${i < 3 ? 'border-r border-white/10' : ''}`}>
                <div className="text-blue-400 mb-1.5">{s.icon}</div>
                <div className="text-xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-white/40 mt-0.5 tracking-wide">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-50 to-transparent" />
    </div>
  );
}