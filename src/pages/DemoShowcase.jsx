import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Shield, MapPin, Bell, Lock, Zap, CheckCircle2,
  AlertTriangle, ArrowRight, ChevronRight, Play, Users, Globe, Radio, Brain
} from 'lucide-react';
import TripProgressStepper from '@/components/journey/TripProgressStepper';
import EmergencyScenarioDemo from '@/pages/EmergencyScenarioDemo';
import NightlifeRobberyDemo from '@/pages/NightlifeRobberyDemo';
import { BRAND } from '@/lib/brandTokens';
import ProcedureStackingBlocker from '@/components/safety/ProcedureStackingBlocker';

const GOLD  = BRAND.gold;
const DARK  = BRAND.dark;
const GREEN = '#22c55e';

/* ── Static demo stats ───────────────────────────────────────────────────── */
const STATS = [
  { value: '9',    unit: 'Handshakes',    label: 'GPS-verified per journey' },
  { value: '195',  unit: 'Countries',     label: 'EVN-iQ400 global coverage' },
  { value: '24/7', unit: 'AI Protection', label: 'Behavioral + environmental' },
  { value: '5',    unit: 'Escalation',    label: 'Tiers — police at 9h' },
];

/* ── Feature cards ───────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Globe,
    color: '#60a5fa',
    title: 'EVN-iQ400™ Environmental Intelligence',
    badge: 'NEW',
    desc: 'Real-time area scanning in 195 countries. GPS triggers a neighbourhood risk assessment — live government advisories + AI. Fires an alert before danger strikes. Works offline and in airplane mode.',
  },
  {
    icon: Zap,
    color: '#f43f5e',
    title: 'MedGuard™ Behavioural Safety AI',
    desc: 'Behavioral prediction engine analyzes 6 real-time signals every 5 minutes — GPS silence, check-in patterns, activity anomalies — and dispatches security 45 minutes before a missed check-in.',
  },
  {
    icon: Zap,
    color: '#D4AF37',
    title: '9-Handshake Journey',
    desc: 'Every physical checkpoint GPS-confirmed — home pickup through home drop-off. SMS shortcode backup (HS1–HS9) for zero-signal situations. Golden M awarded on completion.',
  },
  {
    icon: Shield,
    color: '#34d399',
    title: 'Safe-T4life™ Check-In Protocol',
    desc: 'Mandatory 12-hour check-ins with a 5-tier escalation chain. Police and embassy engaged automatically at 9h no-response. Offline queue — never misses a sync.',
  },
  {
    icon: MapPin,
    color: '#a78bfa',
    title: 'Live GPS Beacon + Guardian Map',
    desc: 'Continuous watchPosition tracking with 25m movement threshold. Family members watch live in real-time — no login, no app download. Falls back to offline cache on disconnect.',
  },
  {
    icon: Lock,
    color: '#f97316',
    title: 'Passport Vault + Emergency PIN',
    desc: 'PBKDF2-SHA256 encrypted document vault. Emergency PIN unlocks safety features on any device — no internet, no login required. Wrong PIN = silent alarm dispatched.',
  },
  {
    icon: Bell,
    color: '#ec4899',
    title: 'Automated Escalation Chain',
    desc: '+2h SMS → +3h voice call + emergency contact → +5h private security dispatch → +9h police + embassy. Predictive escalation fires 45 min before the patient misses a check-in.',
  },
  {
    icon: Users,
    color: '#8b5cf6',
    title: 'AI Pre-Departure Briefing',
    badge: 'NEW',
    desc: 'Before every trip, the LLM generates a personalized safety briefing — destination threat level, specific precautions, emergency protocol, cultural tips. No other platform does this.',
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

/* ── MedGuard™ live simulation demo ─────────────────────────────────────── */
const MEDGUARD_SCENARIOS = [
  {
    label: 'SAFE', score: 12, color: '#22c55e',
    patient: 'Maria C.', dest: 'Caracas, Venezuela', phase: 'arrived',
    factors: [
      { key: 'Check-In Status',       pts: 0,  note: 'Last check-in 2h ago — on time' },
      { key: 'GPS Signal',            pts: 0,  note: 'Live location active' },
      { key: 'Night Alone Risk',      pts: 0,  note: 'Daytime — 2:30 PM local' },
      { key: 'Destination Risk',      pts: 15, note: 'High-risk country flag' },
      { key: 'App Activity',          pts: 0,  note: 'Active 8 min ago' },
      { key: 'Solo Protocol',         pts: 0,  note: 'Companion assigned' },
    ],
    response: null,
    badge: 'All systems normal. Standard monitoring active.',
  },
  {
    label: 'WATCH', score: 42, color: '#d97706',
    patient: 'Maria C.', dest: 'Caracas, Venezuela', phase: 'arrived',
    factors: [
      { key: 'Check-In Status',       pts: 0,  note: 'Last check-in 10h ago — on schedule' },
      { key: 'GPS Signal',            pts: 0,  note: 'Last update 1.5h ago' },
      { key: 'Night Alone Risk',      pts: 20, note: 'Late evening — 11:20 PM local' },
      { key: 'Destination Risk',      pts: 15, note: 'High-risk country flag' },
      { key: 'App Activity',          pts: 8,  note: 'No app activity for 3.2h' },
      { key: 'Solo Protocol',         pts: 0,  note: 'Companion assigned' },
    ],
    response: 'Increased monitoring frequency. Next check-in shortened to 4 hours.',
    badge: 'Monitoring closely. Patient appears active.',
  },
  {
    label: 'ALERT', score: 71, color: '#ea580c',
    patient: 'Maria C.', dest: 'Caracas, Venezuela', phase: 'recovery',
    factors: [
      { key: 'Check-In Status',       pts: 25, note: '⚠️ Solo check-in overdue by 2h 14m' },
      { key: 'GPS Signal',            pts: 16, note: '⚠️ GPS silent for 2h — last: Hotel Caracas' },
      { key: 'Night Alone Risk',      pts: 20, note: '🌙 1:45 AM local — alone at night' },
      { key: 'Destination Risk',      pts: 15, note: 'High-risk country flag' },
      { key: 'App Activity',          pts: 10, note: 'No activity for 4.5h' },
      { key: 'Solo Protocol',         pts: 0,  note: 'Companion assigned' },
    ],
    response: '🟠 Concierge notified. SMS sent: "Hi Maria, we noticed you haven\'t checked in. Reply SAFE or tap the app."',
    badge: 'Alert active. Concierge has contacted the patient.',
  },
  {
    label: 'CRITICAL', score: 89, color: '#dc2626',
    patient: 'Maria C.', dest: 'Caracas, Venezuela', phase: 'recovery',
    factors: [
      { key: 'Check-In Status',       pts: 50, note: '🚨 2 consecutive solo check-ins missed' },
      { key: 'GPS Signal',            pts: 24, note: '🚨 GPS silent for 3h — signal lost' },
      { key: 'Night Alone Risk',      pts: 20, note: '🌙 3:10 AM — alone in high-risk zone' },
      { key: 'Destination Risk',      pts: 15, note: 'Venezuela — Tier 4 advisory' },
      { key: 'App Activity',          pts: 10, note: 'No activity for 6h' },
      { key: 'Solo Protocol',         pts: 15, note: '🚨 Solo check-in protocol violated' },
    ],
    response: '🚨 SECURITY DISPATCHED. Blaze Security Agency alerted with GPS last-known coords. Local emergency protocols activated. Family emergency contact notified.',
    badge: 'Critical protocol active. Security en route.',
  },
];

const SCENE_LABEL_TO_IDX = { safe: 0, watch: 1, alert: 2, critical: 3 };

function MedGuardDemo({ initialScene = 0 }) {
  const [sceneIdx, setSceneIdx] = useState(initialScene);
  const [running,  setRunning]  = useState(initialScene === 0); // auto-play only when starting from SAFE
  const [keyHint,  setKeyHint]  = useState(true);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setSceneIdx(i => {
        if (i >= MEDGUARD_SCENARIOS.length - 1) { setRunning(false); return i; }
        return i + 1;
      });
    }, 3500);
    return () => clearInterval(t);
  }, [running]);

  // Space / arrow keys: presenter advances scenarios with clicker or keyboard
  useEffect(() => {
    function onKey(e) {
      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setRunning(false);
        setSceneIdx(i => Math.min(i + 1, MEDGUARD_SCENARIOS.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setRunning(false);
        setSceneIdx(i => Math.max(i - 1, 0));
      }
    }
    window.addEventListener('keydown', onKey);
    const t = setTimeout(() => setKeyHint(false), 4000);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(t); };
  }, []);

  // Score counter animation
  const scene    = MEDGUARD_SCENARIOS[sceneIdx];
  const [displayScore, setDisplayScore] = useState(scene.score);

  useEffect(() => {
    const target = scene.score;
    const step   = target > displayScore ? 2 : -2;
    const t = setInterval(() => {
      setDisplayScore(s => {
        if (Math.abs(s - target) <= 2) { clearInterval(t); return target; }
        return s + step;
      });
    }, 20);
    return () => clearInterval(t);
  }, [sceneIdx]);

  const restart = () => { setSceneIdx(0); setDisplayScore(12); setRunning(true); };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
          style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)' }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: GOLD }}>MedGuard™ Live Simulation</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Predicting risk <em style={{ color: GOLD }}>before</em> the patient calls for help.
        </h2>
        <p className="text-sm" style={{ color: '#64748b' }}>
          Watch as MedGuard analyzes Maria's behavioral signals in real time and escalates automatically.
        </p>
      </div>

      {/* Score dial */}
      <motion.div key={sceneIdx} initial={{ scale: 0.97, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }}
        className="rounded-2xl overflow-hidden"
        style={{ background: '#0C1A1D', border: `2px solid ${scene.color}50` }}>

        {/* Top bar */}
        <div style={{ height: 4, background: `linear-gradient(to right, ${scene.color}00, ${scene.color}, ${scene.color}00)`,
          boxShadow: `0 0 12px ${scene.color}` }} />

        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            {/* Patient info */}
            <div className="flex items-center gap-3">
              <img loading="lazy" decoding="async" src="https://i.pravatar.cc/150?img=47" alt="Maria" className="w-12 h-12 rounded-full object-cover"
                style={{ border: `2px solid ${scene.color}` }} />
              <div>
                <p className="text-base font-bold text-white">{scene.patient}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs" style={{ color: '#94a3b8' }}>📍 {scene.dest}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: scene.color }} />
                  <span className="text-xs font-semibold" style={{ color: scene.color }}>{scene.label}</span>
                </div>
              </div>
            </div>

            {/* Score */}
            <div className="text-right">
              <div className="text-5xl font-black leading-none" style={{ color: scene.color }}>
                {displayScore}
              </div>
              <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>/ 100</div>
              <div className="text-xs font-semibold mt-1 uppercase tracking-widest" style={{ color: scene.color }}>
                Risk Score
              </div>
            </div>
          </div>

          {/* Factor breakdown */}
          <div className="space-y-2.5 mb-5">
            {scene.factors.map((f, i) => (
              <motion.div key={f.key} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>{f.key}</span>
                  <span style={{ color: f.pts > 0 ? '#ef4444' : '#22c55e', fontWeight: 700 }}>
                    {f.pts > 0 ? `+${f.pts}` : '✓ Clear'}
                  </span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div className="h-1.5 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(f.pts * 2, 100)}%` }}
                    transition={{ duration: 0.5, delay: i * 0.06 }}
                    style={{ background: f.pts > 0 ? '#ef4444' : '#22c55e' }} />
                </div>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>{f.note}</p>
              </motion.div>
            ))}
          </div>

          {/* Automated response */}
          {scene.response && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="rounded-xl px-4 py-3"
              style={{ background: `${scene.color}15`, border: `1px solid ${scene.color}30` }}>
              <p className="text-xs font-semibold mb-1" style={{ color: scene.color }}>
                Automated Response Fired
              </p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                {scene.response}
              </p>
            </motion.div>
          )}

          {/* Badge */}
          <p className="text-xs mt-4 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {scene.badge}
          </p>
        </div>
      </motion.div>

      {/* Scene selector / controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {keyHint && (
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap' }}>
              Space / → to advance
            </span>
          )}
          {MEDGUARD_SCENARIOS.map((s, i) => (
            <button key={s.label} onClick={() => { setSceneIdx(i); setRunning(false); }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ background: sceneIdx === i ? `${s.color}25` : '#0C1A1D',
                       color: sceneIdx === i ? s.color : '#475569',
                       border: `1px solid ${sceneIdx === i ? s.color + '50' : '#2A3F4A'}` }}>
              {s.label}
            </button>
          ))}
        </div>  {/* end scene buttons */}
        <button onClick={restart}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{ background: running ? GOLD : '#0C1A1D', color: running ? DARK : GOLD,
                   border: `1px solid ${running ? 'transparent' : GOLD + '40'}` }}>
          {running ? '● Live' : '↺ Replay'}
        </button>
      </div>

      {/* Caption */}
      <div className="text-center">
        <p className="text-xs" style={{ color: '#334155' }}>
          MedGuard™ analyzes 6 behavioral signals every 5 minutes. No other medical travel platform does this.
        </p>
      </div>
    </div>
  );
}

/* ── Safe-T4life™ Interactive Block Demo ─────────────────────────────────── */
const DEMO_VIOLATION = {
  pairLabel: 'Tummy Tuck + Brazilian Butt Lift',
  reason: 'Tummy Tuck requires strict supine recovery. BBL requires the patient to avoid sitting or lying supine for 8 weeks to protect the transferred fat graft. These positions are mutually exclusive — this combination presents significant recovery conflicts that require review by a licensed physician before proceeding.',
  code: 'POSITIONING_CONFLICT',
  recommended: 'Tummy Tuck',
  recommendedReason: 'A Tummy Tuck alone delivers a powerful transformation. Your BBL can be planned as a dedicated second trip — and the results of each will be far more beautiful for it.',
};

const DEMO_PROCS = [
  { name: 'Tummy Tuck',          conflict: true  },
  { name: 'Brazilian Butt Lift', conflict: true  },
  { name: 'Rhinoplasty',         conflict: false },
  { name: 'Breast Augmentation', conflict: false },
];

function SafeTBlockDemo() {
  const [selected, setSelected] = useState(() => ['Tummy Tuck', 'Brazilian Butt Lift']);
  const [showBlock, setShowBlock] = useState(false);
  const [nudge,     setNudge]     = useState(null);

  const hasDangerCombo = selected.includes('Tummy Tuck') && selected.includes('Brazilian Butt Lift');

  function toggle(name) {
    setSelected(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
    setNudge(null);
  }

  function tryBook() {
    if (hasDangerCombo) { setShowBlock(true); return; }
    setNudge('Select both Tummy Tuck + Brazilian Butt Lift to see the Safe-T block in action.');
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">

      {/* Header */}
      <div className="text-center">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5"
          style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)' }}
        >
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#dc2626' }} />
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: GOLD }}>
            Safe-T4life™ · Interactive Demo
          </span>
        </div>
        <h2 className="text-3xl font-bold leading-tight mb-3" style={{ color: '#f8fafc', fontFamily: 'Georgia, serif' }}>
          The industry says <span style={{ color: '#ef4444' }}>yes.</span><br />
          <span style={{ color: GOLD }}>M knows when to say no.</span>
        </h2>
        <p className="text-sm max-w-md mx-auto" style={{ color: '#64748b' }}>
          Select your procedures below and press <strong style={{ color: '#fff' }}>Proceed to Booking.</strong> Watch what M does next.
        </p>
      </div>

      {/* Procedure picker */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl overflow-hidden"
        style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}
      >
        <div className="px-5 pt-5 pb-3">
          <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: GOLD }}>
            Choose your procedures
          </p>
          <div className="grid grid-cols-2 gap-3">
            {DEMO_PROCS.map(({ name, conflict }) => {
              const on = selected.includes(name);
              const danger = on && conflict && hasDangerCombo;
              return (
                <motion.button
                  key={name}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => toggle(name)}
                  className="py-3 px-4 rounded-xl text-sm font-semibold text-left transition-all"
                  style={{
                    background: danger ? 'rgba(239,68,68,0.1)' : on ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)',
                    border:     danger ? '1px solid rgba(239,68,68,0.5)' : on ? `1px solid ${GOLD}60` : '1px solid #2A3F4A',
                    color:      danger ? '#fca5a5' : on ? GOLD : '#64748b',
                  }}
                >
                  <span className="mr-2">{on ? '✓' : '+'}</span>{name}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Conflict warning */}
        <AnimatePresence>
          {hasDangerCombo && (
            <motion.div
              key="warn"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-5 mb-3 rounded-xl px-3 py-2 flex items-center gap-2"
              style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              <p className="text-xs" style={{ color: '#fca5a5' }}>
                Safe-T4life™ has detected a potential conflict in your selection.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA */}
        <div className="px-5 pb-5">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={tryBook}
            className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all"
            style={{
              background: hasDangerCombo
                ? 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)'
                : `linear-gradient(135deg, ${GOLD}, #E8C85C)`,
              color: '#fff',
              border: hasDangerCombo ? '1px solid #dc2626' : 'none',
              boxShadow: hasDangerCombo
                ? '0 4px 20px rgba(220,38,38,0.35)'
                : `0 4px 20px rgba(212,175,55,0.35)`,
            }}
          >
            {hasDangerCombo ? '⚠️  Proceed to Booking' : 'Proceed to Booking →'}
          </motion.button>
          {nudge && (
            <p className="text-center text-xs mt-2" style={{ color: '#475569' }}>{nudge}</p>
          )}
        </div>
      </motion.div>

      {/* Real-world context */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-2xl p-5"
        style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}
      >
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#ef4444' }}>
          Based on real events — Costa Rica, 2025
        </p>
        <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
          A patient died after a clinic booked her for a tummy tuck, liposuction, and fat transfer in a single session.
          The combined fat removal volume exceeded safe surgical limits. Her booking was confirmed. No platform reviewed the combination.{' '}
          <span style={{ color: '#fff', fontWeight: 600 }}>
            Morales flags this before payment is taken — the booking is blocked until a licensed physician approves the combination in writing.
          </span>
        </p>
      </motion.div>

      {/* The full block overlay */}
      {showBlock && (
        <ProcedureStackingBlocker
          violations={[DEMO_VIOLATION]}
          patientEmail={null}
          patientName="Demo Patient"
          consultationId={null}
          onBack={() => setShowBlock(false)}
        />
      )}
    </div>
  );
}

/* ── Main showcase page ──────────────────────────────────────────────────── */
const TABS = [
  { id: 'overview',   label: '🏥 Platform Overview' },
  { id: 'safe-t',     label: '🛑 Safe-T™ Block' },
  { id: 'medguard',   label: '🛡️ MedGuard™ Live' },
  { id: 'emergency',  label: '🚨 Kidnapping Scenario' },
  { id: 'nightlife',  label: '🔒 Vault Lockdown' },
  { id: 'pattern',  label: '🧠 Pattern Intel',    link: '/demo/medguard' },
  { id: 'recovery', label: '📡 Family Tracker',   link: '/demo/recovery' },
  { id: 'evn',      label: '🌍 EVN-iQ400',        link: '/demo/evn' },
  { id: 'james',    label: '🎤 James Voice',       link: '/demo/james' },
  { id: 'silent',   label: '🔇 Silent Mode',       link: '/demo/silent' },
  { id: 'trust',    label: '⭐ Trust Score',        link: '/demo/trust' },
  { id: 'tap',      label: '👆 Tap Protocol',      link: '/demo/tap' },
  { id: 'language', label: '🌐 Language Bridge',   link: '/demo/language' },
  { id: 'waiting',  label: '🏥 Waiting Room',      link: '/demo/waiting' },
  { id: 'weather',  label: '🌡️ Weather to Health', link: '/demo/weather' },
  { id: 'family',   label: '👩🏽 Mother\'s Eye',     link: '/demo/family' },
  { id: 'arrival',  label: '🏥 Arrival Intel',      link: '/demo/arrival' },
  { id: 'intelligence', label: '🔍 Doctor Intel',   link: '/demo/intelligence' },
  { id: 'situation-room', label: '🗺️ Situation Room', link: '/demo/situation-room' },
  { id: 'mission-control', label: '⚡ Mission Control', link: '/demo/mission-control' },
  { id: 'mesh-beacon', label: '📡 Mesh Beacon', link: '/demo/mesh-beacon' },
  { id: 'coverage',    label: '🗺️ M Covers Everything', link: '/demo/coverage' },
  { id: 'siobhan',          label: '🩺 Siobhan — Drop Mic',      link: '/demo/siobhan' },
  { id: 'recovery-cascade', label: '🏥 Recovery Cascade',         link: '/demo/recovery-cascade' },
];

const IN_PAGE_TAB_IDS = new Set(['overview', 'safe-t', 'medguard', 'emergency', 'nightlife']);

export default function DemoShowcase() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (() => {
    const t = searchParams.get('tab');
    return t && IN_PAGE_TAB_IDS.has(t) ? t : 'overview';
  })();
  const [activeTab, setActiveTab] = useState(initialTab);
  const initialScene = SCENE_LABEL_TO_IDX[searchParams.get('start')?.toLowerCase()] ?? 0;

  function switchTab(id) {
    setActiveTab(id);
    setSearchParams(id === 'overview' ? {} : { tab: id }, { replace: true });
    window.scrollTo(0, 0);
  }

  useEffect(() => {
    document.title = 'Morales Medical Travel Safety — Platform Demo';
    sessionStorage.setItem('morales_demo_session', '1');
    return () => { document.title = 'Morales Medical Travel Safety'; };
  }, []);

  return (
    <div style={{ background: DARK, minHeight: '100vh' }}>

      {/* ── NAV ── */}
      <nav className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
        style={{ background: 'rgba(6,11,22,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span className="font-bold text-white text-sm tracking-wide">MORALES</span>
        <div className="flex items-center gap-3">
          <Link to="/" className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ color: '#94a3b8' }}>
            Home
          </Link>
          <Link
            to="/demo/cheatsheet"
            className="text-xs font-semibold w-8 h-8 rounded-xl flex items-center justify-center"
            title="Presenter Cheat Sheet"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#64748b', border: '1px solid #2A3F4A' }}
          >
            ?
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
          tab.link ? (
            <Link
              key={tab.id}
              to={tab.link}
              className="flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: '#0C1A1D', color: '#64748b', border: '1px solid #2A3F4A', textDecoration: 'none' }}
            >
              {tab.label}
            </Link>
          ) : (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className="flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: activeTab === tab.id ? GOLD : '#0C1A1D',
                color: activeTab === tab.id ? DARK : '#64748b',
                border: activeTab === tab.id ? 'none' : '1px solid #2A3F4A',
              }}
            >
              {tab.label}
            </button>
          )
        ))}
      </div>

      {/* ── MEDGUARD TAB ── */}
      {activeTab === 'medguard' && (
        <div className="max-w-5xl mx-auto px-4 py-12">
          <MedGuardDemo initialScene={initialScene} />
        </div>
      )}

      {/* ── EMERGENCY TAB ── */}
      {activeTab === 'emergency' && <EmergencyScenarioDemo minimal />}

      {/* ── NIGHTLIFE TAB ── */}
      {activeTab === 'nightlife' && <NightlifeRobberyDemo minimal />}

      {/* ── SAFE-T BLOCK TAB ── */}
      {activeTab === 'safe-t' && <SafeTBlockDemo />}

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
              <span style={{ color: GOLD }}>Protected at Every Step.</span>
            </h1>
            <p className="text-lg max-w-2xl mx-auto mb-10" style={{ color: '#64748b' }}>
              The world's first complete medical travel protection stack — combining environmental intelligence, behavioural AI, GPS handshakes, and satellite SOS across 195 countries. Works offline. Works in airplane mode. Works when nothing else does.
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

          {/* Master Journey — full width gold CTA */}
          <Link
            to="/demo/journey"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-base mb-6"
            style={{ background: `linear-gradient(135deg, ${GOLD}, #E8C85C)`, color: DARK, boxShadow: `0 12px 40px rgba(212,175,55,0.45)` }}
          >
            👑 Watch James's Complete Journey
          </Link>

          {/* Coverage Matrix CTA */}
          <Link
            to="/demo/coverage"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-sm mb-3"
            style={{ background: 'rgba(212,175,55,0.08)', border: `2px solid ${GOLD}50`, color: GOLD }}
          >
            🗺️ "But what if…?" — M Covers Every Scenario
          </Link>

          {/* Action CTAs */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Link to="/intake" className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm" style={{ background: GOLD, color: DARK }}>
              Start Journey <ArrowRight style={{ width: 14, height: 14 }} />
            </Link>
            <Link to="/login" className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm" style={{ background: '#0C1A1D', color: '#94a3b8', border: '1px solid #2A3F4A' }}>
              Dashboard <ChevronRight style={{ width: 14, height: 14 }} />
            </Link>
          </div>

          {/* New CR demos — 2-column grid */}
          <p className="text-center text-xs font-bold mb-3" style={{ color: GOLD, letterSpacing: '0.1em' }}>CR ALIENWARE DEMOS</p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { to: '/demo/mesh-beacon', label: '📡 Mesh Beacon',       color: '#ef4444', border: '2px solid rgba(239,68,68,0.65)' },
              { to: '/demo/james',    label: '🎤 James Voice',        color: GOLD,     border: `2px solid ${GOLD}60` },
              { to: '/demo/silent',   label: '🔇 Silent Mode',        color: '#ef4444', border: '2px solid rgba(239,68,68,0.5)' },
              { to: '/demo/tap',      label: '👆 Tap Protocol',       color: GOLD,     border: `2px solid ${GOLD}70` },
              { to: '/demo/trust',    label: '⭐ Partner Trust',      color: GOLD,     border: `1px solid ${GOLD}40` },
              { to: '/demo/waiting',  label: '🏥 Waiting Room',       color: GOLD,     border: `1px solid ${GOLD}40` },
              { to: '/demo/language', label: '🌐 Language Bridge',    color: '#60a5fa', border: '1px solid rgba(96,165,250,0.4)' },
              { to: '/demo/weather',  label: '🌡️ Weather to Health',  color: '#60a5fa', border: '1px solid rgba(96,165,250,0.4)' },
              { to: '/demo/evn',      label: '🌍 EVN-iQ400',          color: '#60a5fa', border: '1px solid rgba(96,165,250,0.5)' },
              { to: '/demo/family',   label: '👩🏽 Mother\'s Eye',      color: '#f472b6', border: '1px solid rgba(244,114,182,0.4)' },
              { to: '/demo/arrival',       label: '🏥 Arrival Intel',       color: GREEN,     border: `1px solid ${GREEN}40` },
              { to: '/demo/intelligence', label: '🔍 Doctor Intel Scan',   color: '#a78bfa', border: '1px solid rgba(167,139,250,0.4)' },
              // NOTE: the Discharge AI Reader tile was removed here — it points to an
              // auth-gated, LLM-backed page, so on the public no-login demo it dead-ends
              // at the login screen. Show it from inside a logged-in dashboard instead.
            ].map(d => (
              <Link key={d.to} to={d.to}
                className="flex items-center justify-center py-3 px-2 rounded-xl font-semibold text-xs text-center"
                style={{ background: `${d.color}10`, border: d.border, color: d.color, minHeight: 52 }}
              >
                {d.label}
              </Link>
            ))}
          </div>

          {/* Scenario demos */}
          <p className="text-center text-xs font-bold mb-3" style={{ color: '#64748b', letterSpacing: '0.08em' }}>SCENARIO DEMOS</p>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => switchTab('safe-t')}
              className="flex items-center gap-2 py-3.5 px-4 rounded-xl font-bold text-sm justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(127,29,29,0.5), rgba(153,27,27,0.4))', border: '2px solid rgba(220,38,38,0.6)', color: '#fca5a5' }}
            >
              <Shield style={{ width: 14, height: 14 }} /> Safe-T4life™ — M Says No
            </button>
            <Link to="/demo/emergency" className="flex items-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm justify-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }}>
              <AlertTriangle style={{ width: 14, height: 14 }} /> Kidnapping — Auto Rescue
            </Link>
            <Link to="/demo/nightlife" className="flex items-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm justify-center" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.35)', color: GOLD }}>
              <Shield style={{ width: 14, height: 14 }} /> Drugged &amp; Robbed — Vault Lockdown
            </Link>
            <Link to="/demo/medguard" className="flex items-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm justify-center" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.35)', color: '#60a5fa' }}>
              <Brain style={{ width: 14, height: 14 }} /> Pattern Intelligence — Theon vs Maria
            </Link>
            <Link to="/demo/recovery" className="flex items-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm justify-center" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.35)', color: '#4ade80' }}>
              <Radio style={{ width: 14, height: 14 }} /> Family Tracker — Live View
            </Link>
          </div>

          {/* Admin Intelligence Suite */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/demo/situation-room"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm justify-center"
              style={{ background: 'linear-gradient(135deg, #0A1520, #0C1A2A)', border: `1px solid ${GOLD}50`, color: GOLD, boxShadow: `0 4px 20px rgba(212,175,55,0.2)` }}
            >
              🗺️ Situation Room — Global Tactical Display
            </Link>
            <Link
              to="/demo/mission-control"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm justify-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
            >
              ⚡ Mission Control — Operations Board
            </Link>
          </div>
        </section>

        {/* ── 9-HANDSHAKE INTERACTIVE DEMO ── */}
        <section>
          <SectionTitle sub="Tap through the full 9-checkpoint patient journey. Watch it turn gold at the end.">
            The 9-Handshake Journey — Live Demo
          </SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
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
            {FEATURES.map(({ icon: Icon, color, title, badge, desc }) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-2xl p-5"
                style={{ background: '#0C1A1D', border: `1px solid ${badge ? color + '40' : '#2A3F4A'}` }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                    <Icon style={{ width: 18, height: 18, color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-white leading-tight">{title}</p>
                      {badge && (
                        <span style={{ fontSize: 8, fontWeight: 800, padding: '2px 5px', borderRadius: 4, background: `${color}25`, color, letterSpacing: '0.08em', flexShrink: 0 }}>{badge}</span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>{desc}</p>
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
              { label: 'Backend', value: 'Base44 BaaS · 250+ Deno Edge Functions · Role-based RBAC' },
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
                to="/intake"
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
