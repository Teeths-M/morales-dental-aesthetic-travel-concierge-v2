import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Globe, Sparkles } from 'lucide-react';

export default function VisaHero() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-emerald-600 text-white">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-8 left-8 w-32 h-32 rounded-full border-2 border-white/40" />
        <div className="absolute top-4 right-16 w-20 h-20 rounded-full border border-white/30" />
        <div className="absolute bottom-4 left-1/3 w-16 h-16 rounded-full border border-white/20" />
        <div className="absolute -bottom-8 right-8 w-40 h-40 rounded-full border-2 border-white/20" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-4 py-1.5 mb-5">
            <Shield className="w-3.5 h-3.5 text-emerald-300" />
            <span className="text-xs font-bold tracking-widest uppercase text-white/90">SAFE-T VISA ASSIST™</span>
            <Sparkles className="w-3 h-3 text-yellow-300" />
          </div>

          <h1 className="font-display text-3xl lg:text-5xl font-bold mb-4 leading-tight">
            Your Intelligent Medical<br />Travel Companion
          </h1>
          <p className="text-blue-100 text-base lg:text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            We make international healthcare travel simple, safe, and stress-free. Check your visa requirements, prepare your documents, and travel with confidence.
          </p>

          {/* Stats row */}
          <div className="flex flex-wrap justify-center gap-6">
            {[
              { emoji: '🌍', value: '194+', label: 'Countries Covered' },
              { emoji: '✈️', value: '10', label: 'Medical Destinations' },
              { emoji: '⚡', value: 'Instant', label: 'AI Visa Check' },
              { emoji: '🛡️', value: '100%', label: 'Secure & Private' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-xl mb-0.5">{s.emoji}</div>
                <div className="text-lg font-bold text-white">{s.value}</div>
                <div className="text-xs text-blue-200">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}