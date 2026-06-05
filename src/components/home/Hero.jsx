import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, BadgeCheck, Plane, Users, Heart, Star, Phone, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import HeroGlobe from './HeroGlobe';
import { useAuth } from '@/lib/AuthContext';

const GOLD = '#C5A059';

// Journey pipeline steps
const STEPS = [
  { icon: '📋', label: 'Consultation' },
  { icon: '✈️', label: 'Travel' },
  { icon: '🏥', label: 'Treatment' },
  { icon: '🌿', label: 'Recovery' },
  { icon: '🏡', label: 'Return Home' },
];

// Right panel benefit cards
const BENEFITS = [
  { icon: Users,     title: 'Human Care',             desc: 'Real people, real support, when you need it most.' },
  { icon: Shield,    title: 'Safe Connections',        desc: 'Vetted specialists and trusted global partners.' },
  { icon: Heart,     title: 'Better Outcomes',         desc: 'Care designed around your safety and recovery.' },
  { icon: Plane,     title: 'Travel With Confidence',  desc: "From arrival to recovery, you're never alone." },
];

const TRUST_BADGES = [
  { icon: Shield,     label: 'SAFE-T 4LIFE™',       sub: 'AI-Powered Safety' },
  { icon: BadgeCheck, label: 'Verified Specialists', sub: 'Licensed & Trusted' },
  { icon: Plane,      label: 'Door-to-Door Care',    sub: 'Travel. Care. Recover.' },
];

// Stable Unsplash golden-hour image
const GOLDEN_IMAGE = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=85&auto=format&fit=crop';

const fadeUp   = { hidden: { opacity: 0, y: 22 },  show: { opacity: 1, y: 0  } };
const fadeLeft = { hidden: { opacity: 0, x: -24 }, show: { opacity: 1, x: 0  } };
const fadeRight= { hidden: { opacity: 0, x:  24 }, show: { opacity: 1, x: 0  } };

export default function Hero() {
  const { navigateToLogin } = useAuth();
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActiveStep(p => (p + 1) % STEPS.length), 1900);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative flex flex-col min-h-screen bg-[#060c17] overflow-hidden">
      {/* Subtle dot-grid texture */}
      <div className="absolute inset-0 pointer-events-none" style={{
        opacity: 0.022,
        backgroundImage: 'radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)',
        backgroundSize: '30px 30px',
      }} />

      {/* ════════════════════════════════════
          TOP NAVIGATION BAR
          ════════════════════════════════════ */}
      <header className="relative z-50 flex items-center justify-between px-4 sm:px-6 lg:px-10 py-3.5"
        style={{ background: 'rgba(6,12,23,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>

        {/* Brand */}
        <div className="flex items-center gap-3">
          <button className="lg:hidden p-1 text-white/50" aria-label="Menu">
            <div className="flex flex-col gap-1">
              <div className="w-5 h-0.5 bg-white/50 rounded" />
              <div className="w-5 h-0.5 bg-white/50 rounded" />
              <div className="w-5 h-0.5 bg-white/50 rounded" />
            </div>
          </button>
          <div>
            <p className="text-[11px] font-black text-white tracking-[0.14em] uppercase leading-none">Morales</p>
            <p className="text-[7.5px] font-semibold uppercase tracking-[0.12em] leading-tight mt-0.5" style={{ color: GOLD }}>
              Dental &amp; Aesthetic Travel Concierge
            </p>
          </div>
        </div>

        {/* Center — SAFE-T branding (hidden on mobile) */}
        <div className="hidden md:flex flex-col items-center absolute left-1/2 -translate-x-1/2">
          <span className="text-[11px] font-black tracking-[0.28em] uppercase" style={{ color: GOLD }}>SAFE-T4LIFE™</span>
          <span className="text-[8px] tracking-[0.16em] uppercase font-semibold" style={{ color: 'rgba(197,160,89,0.38)' }}>
            Safety Intelligence Engine
          </span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button className="hidden sm:flex w-9 h-9 rounded-full items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }} aria-label="Call">
            <Phone className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.55)' }} />
          </button>
          <button className="hidden sm:flex w-9 h-9 rounded-full items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }} aria-label="WhatsApp">
            <MessageCircle className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.55)' }} />
          </button>
          <Link to="/booking">
            <Button className="h-9 px-4 text-xs font-bold rounded-lg shadow-lg" style={{ background: GOLD, color: '#060c17' }}>
              Book a Consultation
            </Button>
          </Link>
        </div>
      </header>

      {/* ════════════════════════════════════
          MAIN HERO BODY
          ════════════════════════════════════ */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row">

        {/* ── LEFT PANEL ── */}
        <motion.div
          variants={fadeLeft} initial="hidden" animate="show"
          transition={{ duration: 0.8 }}
          className="flex items-center lg:w-[34%] xl:w-[32%] px-5 sm:px-7 lg:px-8 xl:px-10 py-8 lg:py-0"
        >
          <div className="w-full max-w-sm mx-auto lg:mx-0 rounded-[1.75rem] flex flex-col gap-5 p-6 xl:p-7"
            style={{
              background: 'rgba(10,22,40,0.70)',
              border: '1px solid rgba(197,160,89,0.10)',
              backdropFilter: 'blur(22px)',
              boxShadow: '0 28px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(197,160,89,0.07)',
            }}>

            {/* Headline */}
            <div>
              <h1 className="font-display text-[2.1rem] xl:text-[2.35rem] text-white leading-[1.06] mb-3">
                Your safe care<br />journey starts here.
              </h1>
              <p className="text-white/58 text-sm xl:text-[0.92rem] leading-relaxed mb-2">
                Verified specialists, travel coordination, and recovery support in one clear, human care plan.
              </p>
              <p className="text-sm font-medium italic" style={{ color: GOLD }}>
                "From consultation to the coast — your safety travels with you."
              </p>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-2.5">
              <Link to="/booking">
                <Button size="lg" className="h-11 px-5 font-semibold text-sm shadow-lg"
                  style={{ background: GOLD, color: '#060c17' }}>
                  Begin Your Journey →
                </Button>
              </Link>
              <Link to="/procedures">
                <Button size="lg" variant="outline"
                  className="h-11 px-5 font-semibold text-sm text-white hover:bg-white hover:text-foreground"
                  style={{ borderColor: 'rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.04)' }}>
                  Explore Treatments
                </Button>
              </Link>
            </div>

            {/* Trust badges — 3 columns */}
            <div className="grid grid-cols-3 gap-2">
              {TRUST_BADGES.map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex flex-col items-center text-center gap-1.5 rounded-xl p-2.5"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(197,160,89,0.09)' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(197,160,89,0.12)' }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: GOLD }} />
                  </div>
                  <p className="text-[8.5px] font-bold text-white leading-tight">{label}</p>
                  <p className="text-[7.5px] leading-tight" style={{ color: 'rgba(255,255,255,0.38)' }}>{sub}</p>
                </div>
              ))}
            </div>

            {/* Journey pipeline */}
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: 'rgba(255,255,255,0.32)' }}>
                Care, Coordinated For You
              </p>
              <p className="text-[10.5px] mb-3" style={{ color: 'rgba(255,255,255,0.42)' }}>
                Every detail handled. Every step supported.
              </p>
              <div className="flex items-center gap-1">
                {STEPS.map((s, i) => (
                  <React.Fragment key={s.label}>
                    <div className="flex flex-col items-center gap-1 transition-all duration-400"
                      style={{ opacity: activeStep === i ? 1 : 0.38, flexShrink: 0 }}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all"
                        style={{
                          background: activeStep === i ? 'rgba(197,160,89,0.16)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${activeStep === i ? 'rgba(197,160,89,0.42)' : 'rgba(255,255,255,0.07)'}`,
                        }}>
                        {s.icon}
                      </div>
                      <span style={{ fontSize: 6, fontWeight: 700, color: activeStep === i ? GOLD : 'rgba(255,255,255,0.30)', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div style={{ flex: 1, height: 1, background: 'rgba(197,160,89,0.18)', minWidth: 4 }} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Care Concierge widget */}
            <div className="flex items-center gap-3 rounded-2xl p-3"
              style={{ background: 'rgba(6,12,23,0.75)', border: '1px solid rgba(197,160,89,0.10)' }}>
              <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden"
                style={{ border: `2px solid ${GOLD}` }}>
                <img
                  src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=80&q=80&auto=format&fit=crop&crop=face"
                  alt="Care Concierge"
                  className="w-full h-full object-cover"
                  onError={e => { e.currentTarget.style.background = 'rgba(197,160,89,0.2)'; e.currentTarget.style.display='none'; }}
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-bold text-white">Care Concierge</span>
                  <span className="flex items-center gap-1" style={{ fontSize: 8.5, fontWeight: 600, color: '#4ade80' }}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
                    Online
                  </span>
                </div>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.42)', lineHeight: 1.5 }}>
                  We're here for you 24/7. Need help planning your perfect care journey?
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── CENTER — Globe ── */}
        <div className="flex items-center justify-center lg:flex-1 py-8 lg:py-6 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.25, delay: 0.45, ease: 'easeOut' }}
          >
            <HeroGlobe />
          </motion.div>
        </div>

        {/* ── RIGHT — Storytelling ── */}
        <motion.div
          variants={fadeRight} initial="hidden" animate="show"
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-col justify-center lg:w-[30%] xl:w-[28%] px-5 sm:px-7 lg:px-0 lg:pr-8 xl:pr-10 py-8 lg:py-6 gap-4"
        >
          {/* Cinematic golden-hour image */}
          <div className="relative rounded-[1.5rem] overflow-hidden flex-shrink-0"
            style={{ height: 200 }}>
            <img
              src={GOLDEN_IMAGE}
              alt="Premium healthcare travel — golden hour"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: 'center 30%' }}
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
            {/* Cinematic overlays */}
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(135deg, rgba(180,110,20,0.25) 0%, rgba(10,22,40,0.35) 55%, rgba(10,22,40,0.70) 100%)' }} />
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(6,12,23,0.85) 100%)' }} />
            {/* Subtle gradient fallback in case image fails */}
            <div className="absolute inset-0 -z-10"
              style={{ background: 'linear-gradient(135deg, #2d1a05 0%, #0b1e3a 50%, #06111f 100%)' }} />
          </div>

          {/* Benefit cards */}
          <div className="flex flex-col gap-2">
            {BENEFITS.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.6 + i * 0.09 }}
                className="flex items-center gap-3 rounded-2xl px-4 py-2.5"
                style={{
                  background: 'rgba(10,22,40,0.70)',
                  border: '1px solid rgba(197,160,89,0.09)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(197,160,89,0.11)', border: '1px solid rgba(197,160,89,0.20)' }}>
                  <Icon className="w-4 h-4" style={{ color: GOLD }} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-white leading-tight">{title}</p>
                  <p className="text-[9.5px] leading-snug mt-0.5" style={{ color: 'rgba(255,255,255,0.42)' }}>{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 1.0 }}
            className="flex items-center justify-between rounded-2xl px-4 py-3"
            style={{ background: 'rgba(10,22,40,0.70)', border: '1px solid rgba(197,160,89,0.09)', backdropFilter: 'blur(12px)' }}
          >
            <div>
              <p className="text-[8px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Trusted by Patients Worldwide
              </p>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                <span className="text-xs font-bold text-white ml-1.5">4.9</span>
              </div>
              <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.30)', marginTop: 2 }}>Based on 1,200+ journeys</p>
            </div>
            {/* Avatar stack */}
            <div className="flex -space-x-2 flex-shrink-0">
              {[
                'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=56&q=80&auto=format&fit=crop&crop=face',
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=56&q=80&auto=format&fit=crop&crop=face',
                'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=56&q=80&auto=format&fit=crop&crop=face',
                'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=56&q=80&auto=format&fit=crop&crop=face',
                'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=56&q=80&auto=format&fit=crop&crop=face',
              ].map((src, i) => (
                <div key={i} className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0"
                  style={{ border: '2px solid #060c17' }}>
                  <img src={src} alt="" className="w-full h-full object-cover"
                    onError={e => { e.currentTarget.style.display = 'none'; }} />
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* ════════════════════════════════════
          BOTTOM ANCHOR BAND
          ════════════════════════════════════ */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center py-6 px-4"
        style={{ background: 'rgba(6,12,23,0.80)', backdropFilter: 'blur(10px)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="w-6 h-6 rounded-full flex items-center justify-center mb-2.5"
          style={{ background: 'rgba(197,160,89,0.12)', border: '1px solid rgba(197,160,89,0.28)' }}>
          <Heart className="w-3 h-3" style={{ color: GOLD }} />
        </div>
        <h2 className="font-display text-lg sm:text-xl lg:text-2xl text-white mb-1">
          More Than a Journey — It's Peace of Mind
        </h2>
        <p className="text-sm max-w-md" style={{ color: 'rgba(255,255,255,0.42)' }}>
          Real people. Real care. Real support — before, during, and after your trip.
        </p>
      </div>
    </section>
  );
}