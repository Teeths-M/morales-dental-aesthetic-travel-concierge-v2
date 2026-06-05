import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Shield, BadgeCheck, Plane, Users, Heart, Star, Phone, MessageCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HeroGlobe from './HeroGlobe';
import { useAuth } from '@/lib/AuthContext';

const GOLD = '#C5A059';
const NAVY = 'rgba(10,22,40,0.88)';

const JOURNEY_STEPS = [
  { icon: '📋', label: 'Consultation' },
  { icon: '✈️', label: 'Travel' },
  { icon: '🏥', label: 'Treatment' },
  { icon: '🌿', label: 'Recovery' },
  { icon: '🏡', label: 'Return Home' },
];

const RIGHT_BENEFITS = [
  {
    icon: Users,
    title: 'Human Care',
    desc: 'Real people, real support, when you need it most.',
  },
  {
    icon: Shield,
    title: 'Safe Connections',
    desc: 'Vetted specialists and trusted global partners.',
  },
  {
    icon: Heart,
    title: 'Better Outcomes',
    desc: 'Care designed around your safety and recovery.',
  },
  {
    icon: Plane,
    title: 'Travel With Confidence',
    desc: "From arrival to recovery, you're never alone.",
  },
];

const TRUST_BADGES = [
  { icon: Shield,    label: 'SAFE-T 4LIFE™',      sub: 'AI-Powered Safety' },
  { icon: BadgeCheck, label: 'Verified Specialists', sub: 'Licensed & Trusted' },
  { icon: Plane,     label: 'Door-to-Door Care',   sub: 'Travel. Care. Recover.' },
];

const GOLDEN_IMAGE =
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=85&auto=format&fit=crop';

export default function Hero() {
  const { navigateToLogin } = useAuth();
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActiveStep(p => (p + 1) % JOURNEY_STEPS.length), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative min-h-screen bg-[#060c17] overflow-hidden">
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.025,
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* ── TOP HEADER BAR ── */}
      <div className="relative z-50 flex items-center justify-between px-4 sm:px-6 lg:px-10 py-4 border-b border-white/[0.06]">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(197,160,89,0.15)', border: '1px solid rgba(197,160,89,0.35)' }}
          >
            <span className="text-sm font-black" style={{ color: GOLD }}>M</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-black text-white tracking-[0.12em] uppercase leading-none">Morales</p>
            <p className="text-[8px] font-semibold uppercase tracking-[0.14em] leading-tight mt-0.5" style={{ color: GOLD }}>
              Dental & Aesthetic Travel Concierge
            </p>
          </div>
        </div>

        {/* Center SAFE-T brand */}
        <div className="hidden md:flex flex-col items-center">
          <span className="text-[11px] font-black tracking-[0.26em] uppercase" style={{ color: GOLD }}>
            SAFE-T4LIFE™
          </span>
          <span className="text-[8px] tracking-[0.16em] uppercase text-white/35 font-semibold">
            Safety Intelligence Engine
          </span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            className="w-9 h-9 rounded-full hidden sm:flex items-center justify-center border border-white/15 bg-white/[0.04] hover:bg-white/10 transition-colors"
            aria-label="Phone"
          >
            <Phone className="w-3.5 h-3.5 text-white/60" />
          </button>
          <button
            className="w-9 h-9 rounded-full hidden sm:flex items-center justify-center border border-white/15 bg-white/[0.04] hover:bg-white/10 transition-colors"
            aria-label="WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5 text-white/60" />
          </button>
          <Link to="/booking">
            <Button
              className="h-9 px-4 font-semibold text-xs rounded-lg shadow-lg"
              style={{ background: GOLD, color: '#060c17' }}
            >
              Book a Consultation
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateToLogin(`${window.location.origin}/dashboard`)}
            className="text-white/55 hover:text-white text-xs hidden lg:flex"
          >
            Login
          </Button>
        </div>
      </div>

      {/* ── MOBILE HERO ── */}
      <div className="lg:hidden flex flex-col gap-8 px-5 pt-8 pb-16 max-w-xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <h1 className="font-display text-4xl sm:text-5xl text-white leading-[1.05] mb-4">
            Your safe care<br />journey starts here.
          </h1>
          <p className="text-white/60 text-base leading-relaxed mb-2">
            Verified specialists, travel coordination, and recovery support in one clear, human care plan.
          </p>
          <p className="text-sm italic font-medium mb-6" style={{ color: GOLD }}>
            "From consultation to the coast — your safety travels with you."
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Link to="/booking" className="flex-1">
              <Button size="lg" className="w-full font-semibold h-12" style={{ background: GOLD, color: '#060c17' }}>
                Begin Your Journey →
              </Button>
            </Link>
            <Link to="/procedures" className="flex-1">
              <Button size="lg" variant="outline" className="w-full h-12 font-semibold border-white/30 bg-white/5 text-white hover:bg-white hover:text-foreground">
                Explore Treatments
              </Button>
            </Link>
          </div>
          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-2">
            {TRUST_BADGES.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex flex-col items-center text-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(197,160,89,0.12)' }}>
                  <Icon className="w-3.5 h-3.5 text-accent" />
                </div>
                <p className="text-[9px] font-bold text-white leading-tight">{label}</p>
                <p className="text-[8px] text-white/40 leading-tight">{sub}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Globe */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, delay: 0.3 }}
          className="flex justify-center"
          style={{ transform: 'scale(0.88)', transformOrigin: 'center top' }}
        >
          <HeroGlobe />
        </motion.div>

        {/* Journey steps */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/38 mb-3">Care, Coordinated For You</p>
          <p className="text-xs text-white/50 mb-4">Every detail handled. Every step supported.</p>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {JOURNEY_STEPS.map((step, i) => (
              <React.Fragment key={step.label}>
                <div
                  className="flex flex-col items-center gap-1 flex-shrink-0 transition-all duration-300"
                  style={{ opacity: activeStep === i ? 1 : 0.45 }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-base transition-all duration-300"
                    style={{
                      background: activeStep === i ? 'rgba(197,160,89,0.18)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${activeStep === i ? 'rgba(197,160,89,0.45)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    {step.icon}
                  </div>
                  <span style={{ fontSize: 7.5, color: activeStep === i ? GOLD : 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {step.label}
                  </span>
                </div>
                {i < JOURNEY_STEPS.length - 1 && (
                  <div className="w-4 h-px flex-shrink-0" style={{ background: 'rgba(197,160,89,0.2)' }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* ── DESKTOP HERO ── */}
      <div className="hidden lg:grid h-[calc(100vh-65px)]" style={{ gridTemplateColumns: '1fr 1.1fr 0.9fr' }}>

        {/* LEFT PANEL */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.85 }}
          className="flex flex-col justify-center px-8 xl:px-12 py-8"
        >
          <div
            className="rounded-[1.75rem] flex flex-col gap-5 p-7 xl:p-8"
            style={{
              background: 'rgba(10,22,40,0.68)',
              border: '1px solid rgba(197,160,89,0.10)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 24px 56px rgba(0,0,0,0.35), inset 0 1px 0 rgba(197,160,89,0.06)',
            }}
          >
            {/* Headline */}
            <div>
              <h1 className="font-display text-4xl xl:text-[2.6rem] text-white leading-[1.05] mb-3">
                Your safe care<br />journey starts here.
              </h1>
              <p className="text-white/60 text-sm xl:text-base leading-relaxed">
                Verified specialists, travel coordination, and recovery support in one clear, human care plan.
              </p>
              <p className="text-sm italic font-medium mt-2" style={{ color: GOLD }}>
                "From consultation to the coast — your safety travels with you."
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-2.5">
              <Link to="/booking">
                <Button
                  size="lg"
                  className="font-semibold h-11 px-6 shadow-lg text-sm"
                  style={{ background: GOLD, color: '#060c17' }}
                >
                  Begin Your Journey →
                </Button>
              </Link>
              <Link to="/procedures">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-11 px-6 font-semibold text-sm border-white/25 bg-white/[0.04] text-white hover:bg-white hover:text-foreground"
                >
                  Explore Treatments
                </Button>
              </Link>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-2">
              {TRUST_BADGES.map(({ icon: Icon, label, sub }) => (
                <div
                  key={label}
                  className="flex flex-col items-center text-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.03] p-2.5"
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(197,160,89,0.12)' }}>
                    <Icon className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <p className="text-[9px] font-bold text-white leading-tight">{label}</p>
                  <p className="text-[8px] text-white/38 leading-tight">{sub}</p>
                </div>
              ))}
            </div>

            {/* Journey pipeline */}
            <div>
              <p className="text-[8.5px] font-bold uppercase tracking-[0.2em] text-white/35 mb-2">
                Care, Coordinated For You
              </p>
              <p className="text-[11px] text-white/45 mb-3">Every detail handled. Every step supported.</p>
              <div className="flex items-center gap-1.5">
                {JOURNEY_STEPS.map((step, i) => (
                  <React.Fragment key={step.label}>
                    <div
                      className="flex flex-col items-center gap-1 transition-all duration-400"
                      style={{ opacity: activeStep === i ? 1 : 0.42 }}
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all duration-300"
                        style={{
                          background: activeStep === i ? 'rgba(197,160,89,0.16)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${activeStep === i ? 'rgba(197,160,89,0.42)' : 'rgba(255,255,255,0.07)'}`,
                        }}
                      >
                        {step.icon}
                      </div>
                      <span style={{ fontSize: 6.5, color: activeStep === i ? GOLD : 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {step.label}
                      </span>
                    </div>
                    {i < JOURNEY_STEPS.length - 1 && (
                      <div className="flex-1 h-px" style={{ background: 'rgba(197,160,89,0.18)' }} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Care Concierge widget */}
            <div
              className="flex items-center gap-3 rounded-2xl p-3"
              style={{
                background: 'rgba(8,16,30,0.8)',
                border: '1px solid rgba(197,160,89,0.12)',
              }}
            >
              <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden ring-2" style={{ ringColor: GOLD, border: `2px solid ${GOLD}` }}>
                <img
                  src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=80&q=80&auto=format&fit=crop&crop=face"
                  alt="Care Concierge"
                  className="w-full h-full object-cover"
                  onError={e => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement.style.background = 'rgba(197,160,89,0.2)';
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-bold text-white">Care Concierge</span>
                  <span className="flex items-center gap-1 text-[8.5px] font-semibold text-green-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                    Online
                  </span>
                </div>
                <p className="text-[9px] text-white/45 leading-relaxed">
                  We're here for you 24/7. Need help planning your perfect care journey?
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CENTER — Globe */}
        <div className="flex flex-col items-center justify-center py-6 px-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.84 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.4, ease: 'easeOut' }}
          >
            <HeroGlobe />
          </motion.div>
        </div>

        {/* RIGHT — Storytelling panel */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.85, delay: 0.3 }}
          className="flex flex-col justify-center py-8 pr-8 xl:pr-12 gap-5"
        >
          {/* Cinematic image */}
          <div
            className="relative rounded-[1.5rem] overflow-hidden flex-shrink-0"
            style={{ height: 220 }}
          >
            <img
              src={GOLDEN_IMAGE}
              alt="Golden hour care journey"
              className="absolute inset-0 w-full h-full object-cover object-center"
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(180,110,20,0.30) 0%, rgba(10,22,40,0.40) 60%, rgba(10,22,40,0.72) 100%)' }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060c17]/80 via-transparent to-transparent" />
          </div>

          {/* Benefit cards */}
          <div className="flex flex-col gap-2.5">
            {RIGHT_BENEFITS.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.55, delay: 0.55 + i * 0.1 }}
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{
                  background: 'rgba(10,22,40,0.72)',
                  border: '1px solid rgba(197,160,89,0.10)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(197,160,89,0.12)', border: '1px solid rgba(197,160,89,0.22)' }}
                >
                  <Icon className="w-4 h-4" style={{ color: GOLD }} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white leading-tight">{title}</p>
                  <p className="text-[10px] text-white/45 leading-snug mt-0.5">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Social proof */}
          <div
            className="flex items-center justify-between rounded-2xl px-4 py-3"
            style={{
              background: 'rgba(10,22,40,0.72)',
              border: '1px solid rgba(197,160,89,0.10)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div>
              <p className="text-[9px] font-semibold text-white/38 uppercase tracking-[0.12em] mb-1">
                Trusted by Patients Worldwide
              </p>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                ))}
                <span className="text-xs font-bold text-white ml-1">4.9</span>
                <span className="text-[9px] text-white/38 ml-1">Based on 1,200+ journeys</span>
              </div>
            </div>
            {/* Avatar stack */}
            <div className="flex -space-x-2">
              {[
                'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&q=80&auto=format&fit=crop&crop=face',
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&q=80&auto=format&fit=crop&crop=face',
                'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=60&q=80&auto=format&fit=crop&crop=face',
                'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&q=80&auto=format&fit=crop&crop=face',
              ].map((src, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full overflow-hidden ring-2"
                  style={{ border: '2px solid #060c17' }}
                >
                  <img
                    src={src}
                    alt={`Patient ${i + 1}`}
                    className="w-full h-full object-cover"
                    onError={e => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── BOTTOM ANCHOR BAND ── */}
      <div
        className="relative z-10 flex flex-col items-center justify-center text-center py-7 px-4 border-t border-white/[0.06]"
        style={{ background: 'rgba(8,16,30,0.70)', backdropFilter: 'blur(12px)' }}
      >
        <div className="w-5 h-5 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(197,160,89,0.14)', border: '1px solid rgba(197,160,89,0.3)' }}>
          <Heart className="w-2.5 h-2.5" style={{ color: GOLD }} />
        </div>
        <h2 className="font-display text-xl sm:text-2xl text-white mb-1">
          More Than a Journey — It's Peace of Mind
        </h2>
        <p className="text-sm text-white/45 max-w-md">
          Real people. Real care. Real support — before, during, and after your trip.
        </p>
      </div>
    </section>
  );
}