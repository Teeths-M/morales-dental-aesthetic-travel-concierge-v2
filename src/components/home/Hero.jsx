import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, BadgeCheck, Plane, HeartPulse } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeTGlobe from './SafeTGlobe';
import { useAuth } from '@/lib/AuthContext';

const GOLD = '#C5A059';

const TRUST_INDICATORS = [
  { icon: BadgeCheck, label: 'Verified Specialists' },
  { icon: Plane, label: 'Travel Coordinated' },
  { icon: HeartPulse, label: 'Recovery Support' },
  { icon: Shield, label: 'SAFE-T4LIFE Guidance' },
];

const JOURNEY_STAGES = [
  {
    label: 'Concern',
    icon: '💭',
    desc: 'You have questions. You need guidance. We listen and understand your goals before anything else.',
  },
  {
    label: 'Guidance',
    icon: '🤝',
    desc: 'Our care coordinators match you with verified specialists and build your personal care plan.',
  },
  {
    label: 'Treatment',
    icon: '🏥',
    desc: 'You meet your specialist with full support. Every detail is prepared for your comfort and safety.',
  },
  {
    label: 'Recovery',
    icon: '🌿',
    desc: 'Post-procedure care is as important as the procedure. We stay with you through every recovery milestone.',
  },
  {
    label: 'Confidence',
    icon: '✨',
    desc: 'You return home with clarity, support, and a care team still behind you.',
  },
];

export default function Hero() {
  const { navigateToLogin } = useAuth();
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActiveStage(p => (p + 1) % JOURNEY_STAGES.length), 3200);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative overflow-hidden bg-[#060e18] min-h-screen">
      {/* Dot grid texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '36px 36px',
        }}
      />
      {/* Left ambient */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[#0A1628]/70 via-[#0A1628]/10 to-transparent" />

      {/* Auth pill */}
      <div className="absolute right-4 top-5 z-50 flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] p-1.5 shadow-2xl backdrop-blur-xl sm:right-6 lg:right-10">
        <Button
          variant="outline"
          onClick={() => navigateToLogin(`${window.location.origin}/register-role`)}
          className="h-8 rounded-full border-white/50 bg-white/90 px-3 text-xs font-bold text-primary shadow hover:bg-white"
        >
          Register
        </Button>
        <Button
          onClick={() => navigateToLogin(`${window.location.origin}/dashboard`)}
          className="h-8 rounded-full bg-accent px-3 text-xs font-bold text-accent-foreground shadow hover:bg-accent/90"
        >
          Login
        </Button>
      </div>

      {/* ============================
          MOBILE LAYOUT (< lg)
          ============================ */}
      <div className="lg:hidden flex flex-col pt-24 pb-16 px-5 gap-10 max-w-xl mx-auto">
        {/* Headline + CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-px bg-accent" />
            <span className="text-[10px] font-bold text-accent uppercase tracking-[0.22em]">
              Premium Care Concierge
            </span>
          </div>
          <h1 className="font-display text-[2.4rem] sm:text-5xl text-white leading-[1.05] mb-4">
            Trusted Care<br />Beyond Borders.
          </h1>
          <p className="text-white/62 text-base sm:text-lg leading-relaxed mb-7">
            We coordinate verified specialists, travel, accommodation, and recovery support so your care journey feels safe, simple, and fully supported.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/booking" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground font-semibold h-12 px-6 shadow-lg shadow-accent/20"
              >
                Begin Your Care Journey
              </Button>
            </Link>
            <Link to="/procedures" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-12 px-6 font-semibold border-white/30 bg-white/[0.05] text-white hover:bg-white hover:text-foreground"
              >
                Explore Treatments
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* SAFE-T Globe */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, delay: 0.4, ease: 'easeOut' }}
          className="flex justify-center"
          style={{ transform: 'scale(0.92)', transformOrigin: 'center top' }}
        >
          <SafeTGlobe />
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="grid grid-cols-2 gap-2"
        >
          {TRUST_INDICATORS.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-3"
            >
              <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-accent" />
              </div>
              <span className="text-xs font-semibold text-white/72">{label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ============================
          DESKTOP LAYOUT (lg+)
          ============================ */}
      <div className="hidden lg:grid min-h-screen" style={{ gridTemplateColumns: '42% 32% 26%' }}>

        {/* ── LEFT: Trust Panel ── */}
        <motion.div
          initial={{ opacity: 0, x: -28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9 }}
          className="flex items-center px-8 xl:px-14 py-24"
        >
          <div
            className="w-full max-w-md rounded-[2rem] border border-white/[0.09] p-8 xl:p-10"
            style={{
              background: 'rgba(10,22,40,0.72)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 32px 64px rgba(0,0,0,0.38), inset 0 1px 0 rgba(197,160,89,0.07)',
            }}
          >
            {/* Eyebrow */}
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-7 h-px" style={{ background: GOLD }} />
              <span
                className="text-[10px] font-bold uppercase tracking-[0.22em]"
                style={{ color: GOLD }}
              >
                Premium Care Concierge
              </span>
            </div>

            <h1 className="font-display text-4xl xl:text-[2.8rem] text-white leading-[1.05] mb-5">
              Trusted Care<br />Beyond Borders.
            </h1>

            <p className="text-white/62 text-base xl:text-[1.05rem] leading-relaxed mb-8">
              We coordinate verified specialists, travel, accommodation, and recovery support so your care journey feels safe, simple, and fully supported.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 mb-8">
              <Link to="/booking">
                <Button
                  size="lg"
                  className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold h-12 px-7 shadow-lg shadow-accent/20"
                >
                  Begin Your Care Journey
                </Button>
              </Link>
              <Link to="/procedures">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-7 font-semibold border-white/28 bg-white/[0.04] text-white hover:bg-white hover:text-foreground"
                >
                  Explore Treatments
                </Button>
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="grid grid-cols-2 gap-2.5">
              {TRUST_INDICATORS.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 rounded-xl border border-white/[0.09] bg-white/[0.04] p-3"
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(197,160,89,0.14)' }}>
                    <Icon className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <span className="text-xs font-semibold text-white/72 leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── CENTER: SAFE-T Globe ── */}
        <div className="flex items-center justify-center py-24">
          <motion.div
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.3, delay: 0.5, ease: 'easeOut' }}
          >
            <SafeTGlobe />
          </motion.div>
        </div>

        {/* ── RIGHT: Storytelling Visual ── */}
        <motion.div
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.35 }}
          className="flex items-center py-24 pr-8 xl:pr-12"
        >
          <div
            className="w-full rounded-[2rem] border border-white/[0.09] overflow-hidden flex flex-col"
            style={{
              background: 'rgba(10,22,40,0.65)',
              backdropFilter: 'blur(14px)',
              minHeight: 500,
              boxShadow: '0 24px 56px rgba(0,0,0,0.35)',
            }}
          >
            {/* Cinematic image/scene area */}
            <div className="relative flex-1 min-h-[260px] overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&q=80&auto=format&fit=crop"
                alt="Premium healthcare travel care"
                className="absolute inset-0 w-full h-full object-cover"
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
              {/* Gradient scene fallback + overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(180,120,30,0.22) 0%, rgba(10,22,40,0.55) 50%, rgba(15,40,70,0.40) 100%)',
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#060e18]/90" />
              {/* Subtle warm overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-900/15 via-transparent to-transparent" />
              {/* Label */}
              <div className="absolute bottom-4 left-4">
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.16em]"
                  style={{ color: 'rgba(197,160,89,0.75)' }}
                >
                  Your Journey
                </span>
              </div>
            </div>

            {/* Journey stages */}
            <div className="p-4 flex flex-col gap-3">
              {/* Stage tabs */}
              <div className="flex items-stretch gap-1">
                {JOURNEY_STAGES.map((stage, i) => (
                  <button
                    key={stage.label}
                    onClick={() => setActiveStage(i)}
                    className="flex flex-col items-center gap-1 flex-1 rounded-xl py-2 px-1 transition-all duration-300"
                    style={{
                      background: activeStage === i ? 'rgba(197,160,89,0.14)' : 'transparent',
                      border: `1px solid ${activeStage === i ? 'rgba(197,160,89,0.32)' : 'transparent'}`,
                    }}
                    aria-label={stage.label}
                    aria-pressed={activeStage === i}
                  >
                    <span style={{ fontSize: 14 }}>{stage.icon}</span>
                    <span
                      style={{
                        fontSize: 7.5,
                        fontWeight: 700,
                        color: activeStage === i ? GOLD : 'rgba(255,255,255,0.30)',
                        letterSpacing: '0.07em',
                        textTransform: 'uppercase',
                        lineHeight: 1.2,
                        transition: 'color 0.3s ease',
                      }}
                    >
                      {stage.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Stage description */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStage}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.38 }}
                  className="rounded-xl p-3.5"
                  style={{
                    background: 'rgba(197,160,89,0.06)',
                    border: '1px solid rgba(197,160,89,0.11)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span style={{ fontSize: 13 }}>{JOURNEY_STAGES[activeStage].icon}</span>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: GOLD,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {JOURNEY_STAGES[activeStage].label}
                    </span>
                  </div>
                  <p className="text-xs text-white/58 leading-relaxed">
                    {JOURNEY_STAGES[activeStage].desc}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}