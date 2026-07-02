import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  X, Shield, Plane, HeartPulse, BadgeCheck, MapPin, Home,
  ChevronRight, ChevronLeft, Play, Pause, Volume2, VolumeX,
  RotateCcw, Captions, CaptionsOff
} from 'lucide-react';

const GOLD = '#D4AF37';

const scenes = [
  {
    id: 1,
    tag: 'THE CHALLENGE',
    headline: 'You deserve world-class care.',
    sub: 'But navigating international treatment alone feels overwhelming. We built Morales to remove every barrier.',
    emotion: '"Can I really trust this?"',
    icon: HeartPulse,
    bg: 'from-[#060B16] to-[#0a1020]',
    accent: '#60a5fa',
    visual: 'problem',
  },
  {
    id: 2,
    tag: 'STEP 1 — CONSULTATION',
    headline: 'Tell us your goals.',
    sub: 'A dedicated care coordinator guides you through a simple consultation. No medical jargon. No pressure. Just clarity.',
    emotion: '"This feels easy."',
    icon: BadgeCheck,
    bg: 'from-[#060B16] to-[#0d1218]',
    accent: GOLD,
    visual: 'consultation',
  },
  {
    id: 3,
    tag: 'STEP 2 — SAFETY REVIEW',
    headline: 'We prioritize safety first.',
    sub: "Our proprietary intelligence engine evaluates every procedure combination for risk — before anything is booked.",
    emotion: '"They protect me."',
    icon: Shield,
    bg: 'from-[#060B16] to-[#0c1115]',
    accent: GOLD,
    visual: 'safet',
  },
  {
    id: 4,
    tag: 'STEP 3 — VERIFIED SPECIALISTS',
    headline: 'Matched with trusted specialists.',
    sub: 'Only board-certified, background-checked physicians in accredited facilities. Every credential verified.',
    emotion: '"I can trust this doctor."',
    icon: BadgeCheck,
    bg: 'from-[#060B16] to-[#0d1220]',
    accent: GOLD,
    visual: 'specialists',
  },
  {
    id: 5,
    tag: 'STEP 4 — TRAVEL COORDINATION',
    headline: 'We coordinate every detail.',
    sub: 'Flights, luxury hotel, airport transfers — all arranged. You receive a complete itinerary. Zero logistics stress.',
    emotion: '"Everything is handled."',
    icon: Plane,
    bg: 'from-[#060B16] to-[#0d1018]',
    accent: GOLD,
    visual: 'travel',
  },
  {
    id: 6,
    tag: 'STEP 5 — ARRIVAL & CARE',
    headline: 'Supported from arrival to recovery.',
    sub: 'A personal companion greets you at the airport. Your care coordinator is available 24/7 throughout your stay.',
    emotion: '"I am not alone."',
    icon: MapPin,
    bg: 'from-[#060B16] to-[#0a1018]',
    accent: GOLD,
    visual: 'arrival',
  },
  {
    id: 7,
    tag: 'STEP 6 — RECOVERY & RETURN',
    headline: 'Your care journey never travels alone.',
    sub: 'Recovery check-ins, follow-up care, and safe return home. Morales stays with you until you are fully recovered.',
    emotion: '"Peace of mind."',
    icon: Home,
    bg: 'from-[#060B16] to-[#0d1015]',
    accent: GOLD,
    visual: 'recovery',
  },
  {
    id: 8,
    tag: 'YOUR JOURNEY BEGINS',
    headline: 'Trusted Care. Comfortable Travel. Peace of Mind.',
    sub: 'Join 1,200+ patients who transformed their health through Morales — with confidence, safety, and world-class support.',
    emotion: null,
    icon: Shield,
    bg: 'from-[#060B16] to-[#0a0d12]',
    accent: GOLD,
    visual: 'final',
  },
];

const SUBTITLES = [
  "You've been researching. You're ready for something better.",
  "Share your goals in minutes. Your coordinator does the rest.",
  "We screen every procedure combination for medical risk before anything is booked.",
  "Board-certified specialists. Accredited clinics. Every credential verified.",
  "Flights, hotels, transfers — one seamless itinerary, zero stress.",
  "Personal companion. 24/7 coordination. You are never alone.",
  "Recovery check-ins. Follow-up care. Safe return home.",
  "Over 1,200 journeys completed. Yours is next.",
];

function ProblemVisual() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 w-full h-full">
      {['Can I trust this?', 'How do I plan this?', 'What if something goes wrong?'].map((q, i) => (
        <motion.div
          key={q}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 + i * 0.3 }}
          className="px-5 py-3 rounded-2xl text-[13px] text-white/70 border border-white/10"
          style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)' }}
        >
          {q}
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.4 }}
        className="mt-4 px-6 py-3 rounded-2xl text-[13px] font-semibold"
        style={{ background: `${GOLD}20`, border: `1px solid ${GOLD}55`, color: GOLD }}
      >
        ✦ Morales changes this.
      </motion.div>
    </div>
  );
}

function ConsultationVisual() {
  const steps = ['Personal Information', 'Procedure Goals', 'Medical History', 'Travel Preferences'];
  return (
    <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
      {steps.map((s, i) => (
        <motion.div
          key={s}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 + i * 0.2 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold" style={{ background: `${GOLD}25`, color: GOLD }}>
            {i + 1}
          </div>
          <span className="text-white/80 text-[13px]">{s}</span>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8 + i * 0.2 }}
            className="ml-auto w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: `${GOLD}30` }}
          >
            <span style={{ color: GOLD, fontSize: '9px' }}>✓</span>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}

function SafeTVisual() {
  const checks = [
    { label: 'Rhinoplasty + Liposuction', status: 'safe', color: '#22c55e' },
    { label: 'Facelift + Breast Surgery', status: 'review', color: '#f59e0b' },
    { label: 'Triple Procedure (High-Risk)', status: 'blocked', color: '#ef4444' },
  ];
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <motion.div
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="w-16 h-16 flex items-center justify-center rounded-full mb-2"
        style={{ background: `${GOLD}18`, border: `2px solid ${GOLD}55`, boxShadow: `0 0 30px ${GOLD}30` }}
      >
        <Shield className="w-8 h-8" style={{ color: GOLD }} />
      </motion.div>
      {checks.map(({ label, status, color }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + i * 0.3 }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl w-full max-w-xs"
          style={{ background: `${color}12`, border: `1px solid ${color}40` }}
        >
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
          <span className="text-white/80 text-[12px] flex-1">{label}</span>
          <span className="text-[11px] font-semibold capitalize" style={{ color }}>
            {status === 'safe' ? '✓ Safe' : status === 'review' ? '⚠ Review' : '✕ Blocked'}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function SpecialistsVisual() {
  const docs = [
    { name: 'Dr. Rodríguez', spec: 'Dental Surgery', country: '🇻🇪', rating: '4.9' },
    { name: 'Dr. Müller', spec: 'Aesthetics', country: '🇩🇪', rating: '5.0' },
    { name: 'Dr. Santos', spec: 'Orthopedics', country: '🇧🇷', rating: '4.8' },
  ];
  return (
    <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
      {docs.map((d, i) => (
        <motion.div
          key={d.name}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + i * 0.25 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${GOLD}25` }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: `${GOLD}18` }}>
            {d.country}
          </div>
          <div className="flex-1">
            <p className="text-white text-[13px] font-medium">{d.name}</p>
            <p className="text-white/50 text-[11px]">{d.spec}</p>
          </div>
          <div className="flex items-center gap-1">
            <span style={{ color: GOLD }} className="text-[11px]">★</span>
            <span className="text-white/70 text-[12px]">{d.rating}</span>
          </div>
          <BadgeCheck className="w-4 h-4" style={{ color: GOLD }} />
        </motion.div>
      ))}
    </div>
  );
}

function TravelVisual() {
  const items = [
    { icon: '✈️', label: 'Flight booked', detail: 'Round-trip confirmed' },
    { icon: '🏨', label: 'Hotel reserved', detail: '5-star comfort' },
    { icon: '🚗', label: 'Transfer arranged', detail: 'Private chauffeur' },
  ];
  return (
    <div className="flex flex-col gap-4 w-full max-w-xs mx-auto">
      {items.map(({ icon, label, detail }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 + i * 0.28 }}
          className="flex items-center gap-4 px-4 py-3 rounded-xl"
          style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}30` }}
        >
          <span className="text-2xl">{icon}</span>
          <div>
            <p className="text-white font-medium text-[13px]">{label}</p>
            <p className="text-white/50 text-[11px]">{detail}</p>
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8 + i * 0.2 }}
            className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: `${GOLD}20`, color: GOLD }}
          >
            ✓
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}

function ArrivalVisual() {
  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-5xl"
      >✈️</motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col items-center gap-1"
      >
        <p className="text-white/80 text-[13px]">Your personal companion awaits</p>
        <p className="text-[11px] text-white/40">Airport → Clinic → Hotel → Recovery</p>
      </motion.div>
      <div className="flex gap-3 mt-2">
        {['🤝 Greeted', '🏥 Clinic', '🛏 Recovery'].map((s, i) => (
          <motion.div
            key={s}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9 + i * 0.25 }}
            className="px-3 py-1.5 rounded-xl text-[11px] text-white/75"
            style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}30` }}
          >
            {s}
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.7 }}
        className="px-4 py-2 rounded-xl text-[12px] font-medium"
        style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', color: '#4ade80' }}
      >
        24/7 care coordinator active
      </motion.div>
    </div>
  );
}

function RecoveryVisual() {
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {[
        { day: 'Day 1–3', label: 'Post-procedure monitoring', done: true },
        { day: 'Day 4–7', label: 'Recovery support & meals', done: true },
        { day: 'Day 8', label: 'Final check-up', done: true },
        { day: 'Day 9', label: 'Safe return home ✈️', done: false },
      ].map(({ day, label, done }, i) => (
        <motion.div
          key={day}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 + i * 0.25 }}
          className="flex items-center gap-3 w-full max-w-xs"
        >
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: done ? '#22c55e' : GOLD, boxShadow: `0 0 8px ${done ? '#22c55e' : GOLD}` }}
          />
          <div className="flex-1">
            <span className="text-white/40 text-[11px]">{day}  </span>
            <span className="text-white/80 text-[12px]">{label}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function FinalVisual() {
  const partners = [
    { label: 'You', emoji: '🧑' },
    { label: 'Doctor', emoji: '👨‍⚕️' },
    { label: 'Agency', emoji: '✈️' },
    { label: 'Driver', emoji: '🚗' },
    { label: 'Companion', emoji: '🤝' },
  ];
  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="flex gap-4 flex-wrap justify-center">
        {partners.map(({ label, emoji }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.15, type: 'spring', stiffness: 200 }}
            className="flex flex-col items-center gap-1"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
              style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}45` }}
            >
              {emoji}
            </div>
            <p className="text-white/60 text-[10px]">{label}</p>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.1 }}
        className="flex flex-col items-center gap-1"
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: `${GOLD}20`, border: `2px solid ${GOLD}`, boxShadow: `0 0 40px ${GOLD}40` }}
        >
          <span className="font-display text-3xl font-semibold" style={{ color: GOLD }}>M</span>
        </div>
        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mt-1" style={{ color: GOLD }}>MORALES</p>
      </motion.div>
    </div>
  );
}

function SceneVisual({ visual }) {
  switch (visual) {
    case 'problem': return <ProblemVisual />;
    case 'consultation': return <ConsultationVisual />;
    case 'safet': return <SafeTVisual />;
    case 'specialists': return <SpecialistsVisual />;
    case 'travel': return <TravelVisual />;
    case 'arrival': return <ArrivalVisual />;
    case 'recovery': return <RecoveryVisual />;
    case 'final': return <FinalVisual />;
    default: return null;
  }
}

export default function HowItWorksModal({ isOpen, onClose }) {
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [subtitles, setSubtitles] = useState(true);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const progressRef = useRef(null);

  const speak = (text) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.92;
    utt.pitch = 1.05;
    // Prefer a female voice
    const voices = window.speechSynthesis.getVoices();
    const female = voices.find(v => /female|woman|zira|samantha|karen|victoria|moira|fiona|tessa|susan|emily|aria|jenny/i.test(v.name));
    if (female) utt.voice = female;
    window.speechSynthesis.speak(utt);
  };

  const stopSpeech = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };
  const SCENE_DURATION = 6000; // 6s per scene
  const TICK = 50;

  const totalScenes = scenes.length;

  const clearTimers = () => {
    clearTimeout(timerRef.current);
    clearInterval(progressRef.current);
  };

  const startScene = (idx) => {
    clearTimers();
    setProgress(0);
    setScene(idx);
    if (!muted) {
      // Slight delay so voices are loaded
      setTimeout(() => speak(SUBTITLES[idx]), 300);
    }
    if (!playing) return;

    let elapsed = 0;
    progressRef.current = setInterval(() => {
      elapsed += TICK;
      setProgress(Math.min((elapsed / SCENE_DURATION) * 100, 100));
    }, TICK);

    timerRef.current = setTimeout(() => {
      clearInterval(progressRef.current);
      if (idx < totalScenes - 1) {
        startScene(idx + 1);
      }
    }, SCENE_DURATION);
  };

  useEffect(() => {
    if (isOpen) {
      setScene(0);
      setPlaying(true);
      startScene(0);
    } else {
      clearTimers();
      setScene(0);
      setProgress(0);
    }
    return clearTimers;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (playing) {
      startScene(scene);
    } else {
      clearTimers();
    }
  }, [playing]);

  const goTo = (idx) => {
    startScene(idx);
    setPlaying(true);
  };

  const handleClose = () => {
    clearTimers();
    stopSpeech();
    setScene(0);
    setProgress(0);
    setPlaying(true);
    onClose();
  };

  const handleReplay = () => {
    setPlaying(true);
    startScene(0);
  };

  const current = scenes[scene];
  const SceneIcon = current.icon;
  const isFinal = scene === totalScenes - 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ backdropFilter: 'blur(18px)', background: 'rgba(4,8,16,0.92)' }}
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-3xl mx-4 rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #07111F 0%, #060B16 60%, #08101A 100%)',
              border: `1px solid rgba(212,175,55,0.18)`,
              boxShadow: `0 0 0 1px rgba(255,255,255,0.04) inset, 0 40px 120px rgba(0,0,0,0.7), 0 0 80px rgba(212,175,55,0.06)`,
              minHeight: '580px',
              maxHeight: '92vh',
            }}
          >
            {/* Top progress bar */}
            <div className="flex gap-1 px-5 pt-5 pb-0">
              {scenes.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className="flex-1 h-[3px] rounded-full overflow-hidden cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.10)' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      background: GOLD,
                      width: i < scene ? '100%' : i === scene ? `${progress}%` : '0%',
                      transition: i === scene ? 'none' : 'width 0.2s ease',
                      boxShadow: i === scene ? `0 0 6px ${GOLD}` : 'none',
                    }}
                  />
                </button>
              ))}
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-3 pb-0">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: `${GOLD}20`, border: `1px solid ${GOLD}40` }}
                >
                  <span className="font-display text-sm font-semibold" style={{ color: GOLD }}>M</span>
                </div>
                <span className="text-white/50 text-[11px] font-medium tracking-widest uppercase">How It Works</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const nowMuted = !muted;
                    setMuted(nowMuted);
                    if (nowMuted) {
                      stopSpeech();
                    } else {
                      setTimeout(() => speak(SUBTITLES[scene]), 100);
                    }
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.06]"
                  title={muted ? 'Unmute' : 'Mute'}
                >
                  {muted
                    ? <VolumeX className="w-3.5 h-3.5 text-white/40" />
                    : <Volume2 className="w-3.5 h-3.5 text-white/70" />}
                </button>
                <button
                  onClick={() => setSubtitles(!subtitles)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.06]"
                  title="Toggle subtitles"
                >
                  {subtitles
                    ? <Captions className="w-3.5 h-3.5" style={{ color: GOLD }} />
                    : <CaptionsOff className="w-3.5 h-3.5 text-white/40" />}
                </button>
                <button
                  onClick={handleReplay}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.06]"
                  title="Replay"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-white/40 hover:text-white/70" />
                </button>
                <button
                  onClick={() => setPlaying(!playing)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.06]"
                  title={playing ? 'Pause' : 'Play'}
                >
                  {playing
                    ? <Pause className="w-3.5 h-3.5 text-white/60" />
                    : <Play className="w-3.5 h-3.5 text-white/60" />}
                </button>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.08]"
                  style={{ border: '1px solid rgba(255,255,255,0.10)' }}
                >
                  <X className="w-3.5 h-3.5 text-white/60" />
                </button>
              </div>
            </div>

            {/* Scene content */}
            <div className="flex flex-col lg:flex-row gap-0 px-5 pt-6 pb-5 min-h-[440px]">

              {/* Left — text */}
              <div className="flex-1 flex flex-col justify-center pr-0 lg:pr-8 mb-8 lg:mb-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`text-${scene}`}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="flex flex-col"
                  >
                    <p
                      className="text-[9px] font-semibold tracking-[0.3em] uppercase mb-4"
                      style={{ color: GOLD }}
                    >
                      {current.tag}
                    </p>

                    <h2
                      className="font-display text-white leading-[1.12] mb-4"
                      style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.2rem)' }}
                    >
                      {current.headline}
                    </h2>

                    <div className="w-7 h-[1.5px] mb-4" style={{ background: GOLD }} />

                    <p className="text-white/65 text-[14px] leading-relaxed mb-5">
                      {current.sub}
                    </p>

                    {current.emotion && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        className="text-[12.5px] italic"
                        style={{ color: `${GOLD}cc` }}
                      >
                        {current.emotion}
                      </motion.p>
                    )}

                    {subtitles && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-4 px-3 py-2 rounded-xl text-[11px] text-white/50 italic"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        {SUBTITLES[scene]}
                      </motion.div>
                    )}

                    {isFinal && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="mt-6 flex gap-3"
                      >
                        <Link
                          to="/booking"
                          onClick={handleClose}
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-[14px] transition-all duration-200 hover:opacity-90"
                          style={{ background: GOLD, color: '#060B16', boxShadow: `0 0 30px ${GOLD}35` }}
                        >
                          Start My Journey →
                        </Link>
                        <button
                          onClick={handleReplay}
                          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-[13px] text-white/70 border border-white/15 hover:bg-white/[0.05] transition-all duration-200"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Replay
                        </button>
                      </motion.div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Right — visual */}
              <div
                className="w-full lg:w-[300px] flex-shrink-0 rounded-2xl flex items-center justify-center p-6"
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  minHeight: '200px',
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`visual-${scene}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.4 }}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <SceneVisual visual={current.visual} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Lady Narrator */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`narrator-${scene}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="mx-5 mb-4 flex items-end gap-3"
              >
                {/* Avatar */}
                <motion.div
                  animate={{ scale: [1, 1.06, 1, 1.04, 1] }}
                  transition={{ duration: 1.2, repeat: 2, ease: 'easeInOut' }}
                  className="flex-shrink-0 relative"
                >
                  <div
                    className="w-10 h-10 rounded-full overflow-hidden"
                    style={{ border: `2px solid ${GOLD}60`, boxShadow: `0 0 14px ${GOLD}30` }}
                  >
                    <img
                      src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop&crop=face"
                      alt="Care coordinator"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Talking dot */}
                  <motion.div
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 0.6, repeat: 3, ease: 'easeInOut' }}
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center"
                    style={{ background: '#22c55e', border: '1.5px solid #060B16' }}
                  />
                </motion.div>

                {/* Speech bubble */}
                <div
                  className="relative flex-1 px-4 py-2.5 rounded-2xl rounded-bl-sm text-[12px] text-white/75 leading-relaxed italic"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <span style={{ color: GOLD, fontStyle: 'normal', fontWeight: 600, fontSize: 10 }} className="block mb-0.5 not-italic tracking-wide uppercase">Sofia · Care Coordinator</span>
                  {SUBTITLES[scene]}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Bottom nav */}
            <div className="flex items-center justify-between px-5 pb-5 pt-0">
              <button
                onClick={() => goTo(Math.max(0, scene - 1))}
                disabled={scene === 0}
                className="flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/70 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>

              <div className="flex gap-1.5">
                {scenes.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                    style={{ background: i === scene ? GOLD : 'rgba(255,255,255,0.2)', transform: i === scene ? 'scale(1.4)' : 'scale(1)' }}
                  />
                ))}
              </div>

              {!isFinal ? (
                <button
                  onClick={() => goTo(Math.min(totalScenes - 1, scene + 1))}
                  className="flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/70 transition-colors"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <Link
                  to="/booking"
                  onClick={handleClose}
                  className="flex items-center gap-1.5 text-[12px] font-semibold transition-colors"
                  style={{ color: GOLD }}
                >
                  Begin <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}