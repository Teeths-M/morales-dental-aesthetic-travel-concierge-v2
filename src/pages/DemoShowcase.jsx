import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Shield, MapPin, Bell, Lock, Zap, CheckCircle2,
  AlertTriangle, ArrowRight, ChevronRight, Play, Users, Globe, Radio
} from 'lucide-react';
import TripProgressStepper from '@/components/journey/TripProgressStepper';
import EmergencyScenarioDemo from '@/pages/EmergencyScenarioDemo';
import NightlifeRobberyDemo from '@/pages/NightlifeRobberyDemo';
import { BRAND } from '@/lib/brandTokens';

const GOLD = BRAND.gold;
const DARK = BRAND.dark;

/* ── Static demo stats ───────────────────────────────────────────────────── */
const STATS = [
  { value: '9',    unit: 'Handshakes',    label: 'Per Journey' },
  { value: '24/7', unit: 'Safe-T4life',   label: 'Protection' },
  { value: '188',  unit: 'Edge Functions', label: 'Backend APIs' },
  { value: '~94',  unit: 'Platform Score', label: '/ 100' },
];

/* ── Feature cards ───────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Zap,
    color: '#D4AF37',
    title: '9-Handshake Journey',
    desc: 'Every physical checkpoint confirmed — pickup, airport, hotel, clinic, and home drop-off. Sequential GPS-validated handshakes with offline queuing.',
  },
  {
    icon: Shield,
    color: '#34d399',
    title: 'Safe-T4life AI',
    desc: 'Mandatory 12-hour check-ins with a 5-tier escalation chain. 9h no-response triggers local authority notification automatically.',
  },
  {
    icon: MapPin,
    color: '#60a5fa',
    title: 'Live GPS Beacon',
    desc: 'Continuous watchPosition tracking with 25m movement threshold. Guardian map updates in real-time. Falls back to offline cache on disconnect.',
  },
  {
    icon: Lock,
    color: '#a78bfa',
    title: 'Passport Vault',
    desc: 'PBKDF2-SHA256 encrypted PIN vault. One-time-use guardian tokens. Offline emergency access via pre-loaded QR.',
  },
  {
    icon: Bell,
    color: '#f97316',
    title: 'Escalation Chain',
    desc: 'Miss a check-in → 2h SMS → 3h voice call → 5h private security dispatch → 9h police + embassy. Fully automated.',
  },
  {
    icon: Globe,
    color: '#ec4899',
    title: 'Country Arrival Detection',
    desc: 'GPS + Nominatim reverse-geocoding detects country on landing. Welcome modal with hotel, driver, and vault quick-actions appears automatically.',
  },
];

/* ── Journey steps for the live demo ────────────────────────────────────── */
const JOURNEY_STEPS = [
  { n: 1, label: 'Driver Pickup',      icon: '🚗', phase: 'Home → Airport' },
  { n: 2, label: 'Airport Drop-off',   icon: '✈️', phase: 'Origin' },
  { n: 3, label: 'Destination Pickup', icon: '🛬', phase: 'Arrivals' },
  { n: 4, label: 'Hotel Check-in',     icon: '🏨', phase: 'Accommodation' },
  { n: 5, label: 'Clinic Arrival',     icon: '🏥', phase: 'Procedure' },
  { n: 6, label: 'Companion Meal',     icon: '🍽️', phase: 'Recovery' },
  { n: 7, label: 'Return Transport',   icon: '🚕', phase: 'Hotel → Airport' },
  { n: 8, label: 'Home Airport',       icon: '🛫', phase: 'Departures' },
  { n: 9, label: 'Home Drop-off',      icon: '🏠', phase: 'Journey Complete' },
];

/* ── Escalation timeline ─────────────────────────────────────────────────── */
const ESCALATIONS = [
  { time: '0h',   label: 'Check-in due',          color: '#94a3b8', icon: Radio },
  { time: '+2h',  label: 'SMS reminder sent',      color: '#fb923c', icon: Bell },
  { time: '+3h',  label: 'Voice call + contact',   color: '#f87171', icon: Users },
  { time: '+5h',  label: 'Security dispatched',    color: '#ef4444', icon: Shield },
  { time: '+9h',  label: 'Police + Embassy alert', color: '#991b1b', icon: AlertTriangle },
];

function SectionTitle({ children, sub }) {
  return (
    <div className="text-center mb-10">
      <h2 className="text-3xl font-bold mb-2" style={{ color: '#f1f5f9', letterSpacing: '-0.03em' }}>
        {children}
      </h2>
      {sub && <p className="text-sm" style={{ color: '#64748b' }}>{sub}</p>}
    </div>
  );
}

/* ── Interactive handshake demo ──────────────────────────────────────────── */
function HandshakeDemo() {
  const [step, setStep] = useState(0);
  const [showGolden, setShowGolden] = useState(false);

  function advance() {
    if (step >= 9) return;
    const next = step + 1;
    setStep(next);
    if (next === 9) {
      setTimeout(() => {
        setShowGolden(true);
        confetti({ particleCount: 120, spread: 100, origin: { y: 0.5 }, colors: [GOLD, '#FFE066', '#fff'] });
        setTimeout(() => confetti({ particleCount: 80, spread: 80, origin: { y: 0.5 }, colors: [GOLD, '#FFE066'] }), 500);
      }, 300);
    }
  }

  function reset() {
    setStep(0);
    setShowGolden(false);
  }

  const nextStep = JOURNEY_STEPS[step];
  const isDone = step >= 9;

  return (
    <div className="rounded-2xl p-6 space-y-5" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
      <TripProgressStepper currentStep={step} isComplete={isDone} />

      <AnimatePresence mode="wait">
        {showGolden ? (
          <motion.div
            key="golden"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-6"
          >
            {/* Real Morales M mark */}
            <div className="relative flex flex-col items-center mb-4">
              <div className="absolute" style={{
                width: 180, height: 180, top: '50%', left: '50%',
                transform: 'translate(-50%, -60%)',
                background: 'radial-gradient(circle, rgba(212,175,55,0.25) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />
              <img
                src="/morales-m-mark.png"
                alt="Morales M"
                style={{
                  width: 90,
                  height: 'auto',
                  filter: 'drop-shadow(0 0 20px rgba(212,175,55,0.9)) drop-shadow(0 0 40px rgba(212,175,55,0.4))',
                  position: 'relative', zIndex: 1,
                }}
              />
              {/* Gold line */}
              <div style={{
                width: 130, height: 1, marginTop: 12,
                background: 'linear-gradient(to right, transparent, #D4AF37, #F0D060, #D4AF37, transparent)',
                boxShadow: '0 0 6px rgba(212,175,55,0.7)',
                position: 'relative', zIndex: 1,
              }} />
            </div>
            <p className="text-base font-bold mb-0.5 tracking-widest uppercase" style={{ color: GOLD, letterSpacing: '0.2em', fontSize: '0.7rem' }}>MORALES</p>
            <p className="text-lg font-bold mb-1" style={{ color: GOLD, fontFamily: 'Georgia, serif' }}>Journey Complete.</p>
            <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>
              The Golden M is yours. SMS sent to patient.
            </p>
            <button
              onClick={reset}
              className="text-xs font-semibold px-4 py-2 rounded-xl"
              style={{ background: '#1e2d35', color: '#94a3b8', border: '1px solid #2A3F4A' }}
            >
              Reset demo
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="step"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {nextStep && (
              <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: '#0a1420', border: '1px solid #1e3040' }}>
                <span className="text-2xl">{nextStep.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white">Next: HS{nextStep.n} — {nextStep.label}</p>
                  <p className="text-xs" style={{ color: '#64748b' }}>{nextStep.phase}</p>
                </div>
              </div>
            )}
            <button
              onClick={advance}
              className="w-full py-3 rounded-2xl font-semibold text-sm transition-all active:scale-95"
              style={{
                background: GOLD, color: DARK,
                boxShadow: '0 4px 16px rgba(212,175,55,0.3)',
              }}
            >
              {step === 0 ? 'Start — Tap Handshake 1' : `Confirm HS${step + 1}: ${JOURNEY_STEPS[step]?.label}`}
            </button>
            {step > 0 && (
              <p className="text-center text-xs" style={{ color: '#475569' }}>
                Or text <span style={{ color: GOLD }}>HS{step + 1}</span> to the Morales shortcode
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Escalation timeline visual ─────────────────────────────────────────── */
function EscalationTimeline() {
  return (
    <div className="rounded-2xl p-6" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
      <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: GOLD }}>
        Miss a Check-In → Automatic Response
      </p>
      <div className="space-y-3">
        {ESCALATIONS.map(({ time, label, color, icon: Icon }, i) => (
          <motion.div
            key={time}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-3"
          >
            <div
              className="flex items-center justify-center rounded-lg flex-shrink-0"
              style={{ width: 36, height: 36, background: `${color}18`, border: `1px solid ${color}40` }}
            >
              <Icon style={{ width: 16, height: 16, color }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{label}</p>
            </div>
            <span className="text-xs font-mono font-semibold" style={{ color }}>
              {time}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Main showcase page ──────────────────────────────────────────────────── */
const TABS = [
  { id: 'overview',   label: '🏥 Platform Overview' },
  { id: 'emergency',  label: '🚨 Kidnapping Scenario' },
  { id: 'nightlife',  label: '🔒 Vault Lockdown' },
];

export default function DemoShowcase() {
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    document.title = 'Morales Concierge — Platform Demo';
    return () => { document.title = 'Morales Dental & Aesthetic Travel Concierge'; };
  }, []);

  return (
    <div style={{ background: DARK, minHeight: '100vh' }}>

      {/* ── NAV ── */}
      <nav className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
        style={{ background: 'rgba(6,11,22,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span className="font-bold text-white text-sm tracking-wide">MORALES CONCIERGE</span>
        <div className="flex items-center gap-3">
          <Link to="/" className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ color: '#94a3b8' }}>
            Home
          </Link>
          <Link
            to="/login"
            className="text-xs font-semibold px-4 py-2 rounded-xl"
            style={{ background: GOLD, color: DARK }}
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* ── TAB BAR ── */}
      <div className="flex gap-2 px-4 pt-4 max-w-5xl mx-auto overflow-x-auto pb-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: activeTab === tab.id ? GOLD : '#0C1A1D',
              color: activeTab === tab.id ? DARK : '#64748b',
              border: activeTab === tab.id ? 'none' : '1px solid #2A3F4A',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── EMERGENCY TAB ── */}
      {activeTab === 'emergency' && <EmergencyScenarioDemo minimal />}

      {/* ── NIGHTLIFE TAB ── */}
      {activeTab === 'nightlife' && <NightlifeRobberyDemo minimal />}

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && <div className="max-w-5xl mx-auto px-4 py-16 space-y-24">

        {/* ── HERO ── */}
        <section className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 text-xs font-semibold"
              style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}40`, color: GOLD }}
            >
              <Play style={{ width: 10, height: 10 }} />
              Live Platform Demo — No Login Required
            </div>
            <h1
              className="text-5xl font-bold mb-4 leading-tight"
              style={{ color: '#f8fafc', letterSpacing: '-0.04em', fontFamily: 'Georgia, serif' }}
            >
              Medical Tourism,<br />
              <span style={{ color: GOLD }}>Engineered for Safety.</span>
            </h1>
            <p className="text-lg max-w-2xl mx-auto mb-10" style={{ color: '#64748b' }}>
              Morales is the only medical travel concierge with a 9-handshake physical journey spine,
              offline-first emergency protection, and a real-time guardian safety net.
            </p>
          </motion.div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            {STATS.map(({ value, unit, label }) => (
              <div key={label} className="rounded-2xl p-4 text-center"
                style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
                <p className="text-2xl font-bold" style={{ color: GOLD }}>{value}</p>
                <p className="text-xs font-semibold text-white mt-0.5">{unit}</p>
                <p className="text-[10px] mt-0.5" style={{ color: '#475569' }}>{label}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-3 flex-wrap">
            <Link
              to="/consultation"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm"
              style={{ background: GOLD, color: DARK }}
            >
              Start Your Journey <ArrowRight style={{ width: 16, height: 16 }} />
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm"
              style={{ background: '#0C1A1D', color: '#94a3b8', border: '1px solid #2A3F4A' }}
            >
              View Live Dashboard <ChevronRight style={{ width: 16, height: 16 }} />
            </Link>
          </div>

          {/* Emergency scenario CTAs */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/demo/emergency"
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm justify-center"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }}
            >
              <AlertTriangle style={{ width: 15, height: 15 }} />
              Kidnapping — Auto Rescue Demo
            </Link>
            <Link
              to="/demo/nightlife"
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm justify-center"
              style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.35)', color: '#D4AF37' }}
            >
              <Shield style={{ width: 15, height: 15 }} />
              Drugged & Robbed — Vault Lockdown Demo
            </Link>
          </div>
        </section>

        {/* ── 9-HANDSHAKE INTERACTIVE DEMO ── */}
        <section>
          <SectionTitle sub="Tap through the full 9-checkpoint patient journey. Watch it turn gold at the end.">
            The 9-Handshake Journey — Live Demo
          </SectionTitle>
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <HandshakeDemo />
            <div className="space-y-4">
              {JOURNEY_STEPS.map(({ n, icon, label, phase }) => (
                <div key={n} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
                  <span className="text-xl w-8 text-center">{icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">HS{n} — {label}</p>
                    <p className="text-xs" style={{ color: '#475569' }}>{phase}</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: `${GOLD}18`, color: GOLD }}>
                    GPS
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SAFETY ESCALATION ── */}
        <section>
          <SectionTitle sub="No other medical travel platform automates this chain. Zero human intervention needed.">
            5-Tier Safety Escalation — Fully Automated
          </SectionTitle>
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <EscalationTimeline />
            <div className="space-y-4">
              <div className="rounded-2xl p-5" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
                <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: '#60a5fa' }}>
                  What Triggers It
                </p>
                <ul className="space-y-2 text-sm" style={{ color: '#94a3b8' }}>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-400 flex-shrink-0" />Missed 12-hour solo check-in window</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-400 flex-shrink-0" />No GPS update for &gt;30 minutes (alone traveler)</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-400 flex-shrink-0" />Manual emergency trigger from patient app</li>
                </ul>
              </div>
              <div className="rounded-2xl p-5" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
                <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: GOLD }}>
                  Offline-First Safety
                </p>
                <ul className="space-y-2 text-sm" style={{ color: '#94a3b8' }}>
                  <li className="flex items-start gap-2"><Shield className="w-4 h-4 mt-0.5 text-yellow-400 flex-shrink-0" />Check-ins queue locally when offline, sync on reconnect</li>
                  <li className="flex items-start gap-2"><Shield className="w-4 h-4 mt-0.5 text-yellow-400 flex-shrink-0" />Guardian link works without patient account</li>
                  <li className="flex items-start gap-2"><Shield className="w-4 h-4 mt-0.5 text-yellow-400 flex-shrink-0" />Emergency PIN vault readable offline</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURE GRID ── */}
        <section>
          <SectionTitle sub="Every feature built for the real constraints of international medical travel.">
            Platform Capabilities
          </SectionTitle>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, color, title, desc }) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-2xl p-5"
                style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                    <Icon style={{ width: 18, height: 18, color }} />
                  </div>
                  <p className="font-semibold text-sm text-white">{title}</p>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>{desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── PLATFORM STACK ── */}
        <section>
          <SectionTitle sub="Built on production-grade infrastructure. Not a prototype.">
            Technical Foundation
          </SectionTitle>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: 'Frontend', value: 'React 18 · Vite · TanStack Query v5 · Tailwind · Radix UI' },
              { label: 'Backend', value: 'Base44 BaaS · 188 Deno Edge Functions · Role-based RBAC' },
              { label: 'Safety', value: 'PBKDF2-SHA256 vault · SHA-256 audit hash chain · Rate limiting · CSP headers' },
              { label: 'Offline', value: 'localStorage queue · GPS cache · Offline check-in sync · Emergency bypass routes' },
              { label: 'Integrations', value: 'Twilio SMS · Stripe payments · Nominatim geocoding · canvas-confetti' },
              { label: 'Auth', value: 'JWT sessions · Google SSO · Guardian one-time tokens · Offline fallback user' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl p-5 flex gap-4"
                style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
                <div className="w-1 rounded-full flex-shrink-0" style={{ background: GOLD, opacity: 0.6 }} />
                <div>
                  <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: GOLD }}>{label}</p>
                  <p className="text-sm" style={{ color: '#94a3b8' }}>{value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="text-center pb-8">
          <div className="rounded-3xl p-10"
            style={{ background: '#0C1A1D', border: `1px solid ${GOLD}40` }}>
            <div
              className="mx-auto flex items-center justify-center rounded-full font-bold mb-6"
              style={{
                width: 72, height: 72,
                background: GOLD, color: DARK,
                fontSize: 36, fontFamily: 'Georgia, serif',
                boxShadow: `0 0 30px rgba(212,175,55,0.4)`,
              }}
            >
              M
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#f8fafc', fontFamily: 'Georgia, serif' }}>
              Ready to experience it?
            </h2>
            <p className="text-sm mb-8" style={{ color: '#64748b' }}>
              Book a consultation or log in to see the full patient journey live.
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              <Link
                to="/consultation"
                className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold"
                style={{ background: GOLD, color: DARK }}
              >
                Book a Consultation <ArrowRight style={{ width: 16, height: 16 }} />
              </Link>
              <Link
                to="/login"
                className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold"
                style={{ background: '#1a2535', color: '#cbd5e1', border: '1px solid #2A3F4A' }}
              >
                Sign In to Dashboard
              </Link>
            </div>
          </div>
        </section>

      </div>
      } {/* end overview tab */}
    </div>
  );
}
