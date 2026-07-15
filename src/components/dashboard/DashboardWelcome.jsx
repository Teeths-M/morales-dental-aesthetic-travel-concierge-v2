import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Shield, ArrowRight, Lock, Heart } from 'lucide-react';
import { BRAND } from '@/lib/brandTokens';

/**
 * DashboardWelcome — the first-load experience for users with no consultations yet.
 *
 * Replaces the generic EmptyState with a warm, single-CTA welcome that:
 * - Greets the user by name
 * - Explains what Morales does in one sentence
 * - Has ONE primary action: "Start Your Journey" → /intake
 * - Has a secondary "Browse All Features" link → /dashboard/features
 *
 * Design: calm/teal, mobile-first, 44px+ touch targets, 16px+ fonts.
 */
export default function DashboardWelcome({ user }) {
  const displayName = user?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-10 text-center">
      {/* ── Shield emblem ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{
          background: 'hsl(156 28% 24% / 0.08)',
          border: '1px solid hsl(156 28% 24% / 0.15)',
        }}
      >
        <Shield className="w-8 h-8 text-primary" strokeWidth={1.5} />
      </motion.div>

      {/* ── Greeting ── */}
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="font-display text-3xl sm:text-4xl text-foreground mb-3"
        style={{ letterSpacing: '-0.03em', lineHeight: 1.1 }}
      >
        Welcome, {displayName}
      </motion.h1>

      {/* ── One-sentence value prop ── */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-muted-foreground text-base sm:text-lg max-w-md mb-8"
        style={{ lineHeight: 1.6 }}
      >
        Travel abroad for world-class medical care — and come home safely.
        Morales watches over every checkpoint, so your family never worries.
      </motion.p>

      {/* ── Primary CTA ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="w-full max-w-xs"
      >
        <Link to="/intake">
          <button
            className="w-full min-h-[56px] rounded-full text-base font-semibold transition-all duration-200 active:scale-[0.98]"
            style={{
              background: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
            }}
          >
            <span className="flex items-center justify-center gap-2">
              Start Your Journey
              <ArrowRight className="w-5 h-5" />
            </span>
          </button>
        </Link>

        {/* ── Secondary link ── */}
        <Link to="/dashboard/features">
          <button className="w-full mt-3 min-h-[48px] rounded-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Browse All Features
          </button>
        </Link>
      </motion.div>

      {/* ── Trust signals ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-10"
      >
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
          <span className="text-xs text-muted-foreground font-medium">Zero-knowledge encrypted vault</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
          <span className="text-xs text-muted-foreground font-medium">9-checkpoint safety protocol</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
          <span className="text-xs text-muted-foreground font-medium">Family tracking included</span>
        </div>
      </motion.div>
    </div>
  );
}