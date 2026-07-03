import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, AlertTriangle, Heart, CheckCircle2, Brain, Shield } from 'lucide-react';

const GOLD   = '#D4AF37';
const DARK   = '#060B16';
const CARD   = '#0C1A1D';
const BORDER = '#2A3F4A';
const RED    = '#ef4444';
const GREEN  = '#22c55e';

const CONDITIONS = [
  { id: 'none',   label: 'No known conditions' },
  { id: 'bp',     label: 'High blood pressure' },
  { id: 'dm',     label: 'Type 2 Diabetes', trigger: true },
  { id: 'clots',  label: 'History of blood clots', trigger: true },
  { id: 'heart',  label: 'Heart condition', trigger: true },
  { id: 'kidney', label: 'Kidney disease' },
  { id: 'asthma', label: 'Asthma' },
];

const PROCEDURES = [
  {
    id: 'rhino',
    name: 'Rhinoplasty',
    emoji: '👃',
    anesthesia: '3 hrs',
    recovery: '14 days',
    note: 'Safer as a standalone — single anesthesia session reduces metabolic stress. Recommended scheduling 3+ months after diabetes is well-controlled.',
  },
  {
    id: 'lipo',
    name: 'Liposuction',
    emoji: '💪',
    anesthesia: '3 hrs',
    recovery: '14 days',
    note: 'Manageable alone — requires careful fluid management. Care team will add glucose monitoring checkpoints throughout recovery.',
  },
];

const STEPS = ['Contact', 'Travel', 'Health', 'Payment', 'Confirm'];

const ANALYZE_STEPS = [
  'Diabetes disclosure received…',
  'Cross-referencing with procedure profiles…',
  'Calculating combined anesthesia burden…',
  'Updating safety verdict…',
];

export default function SiobhanDemo() {
  const [phase, setPhase] = useState('form');
  const [checked, setChecked] = useState(new Set());
  const [chosen, setChosen] = useState(null);
  const triggered = React.useRef(false);

  function handleCheck(id, isTrigger) {
    if (id === 'none') {
      setChecked(new Set(['none']));
      return;
    }
    const next = new Set(checked);
    next.delete('none');
    next.has(id) ? next.delete(id) : next.add(id);
    setChecked(next);

    if (isTrigger && !triggered.current) {
      triggered.current = true;
      setTimeout(() => {
        setPhase('analyzing');
        setTimeout(() => setPhase('blocked'), 3000);
      }, 350);
    }
  }

  function pick(proc) {
    setChosen(proc);
    setPhase('resolved');
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: DARK, fontFamily: "'SF Pro Display', system-ui, sans-serif" }}>
      <div className="max-w-xl mx-auto space-y-5">

        <Link to="/demo" className="inline-flex items-center gap-2 text-xs font-semibold" style={{ color: '#64748b' }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Demo Hub
        </Link>

        {/* Title */}
        <div>
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase mb-1" style={{ color: GOLD }}>
            Live Demo · Adaptive Agentic Safety
          </p>
          <h1 className="text-2xl font-bold text-white">Siobhan's Booking</h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            Two procedures cleared through consultation. Health questionnaire — Step 3 of 5.
          </p>
        </div>

        {/* Booking summary */}
        <div className="rounded-2xl p-4 flex items-start gap-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)' }}
          >
            ✈️
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: GREEN, border: '1px solid rgba(34,197,94,0.3)' }}>
              CONSULTATION APPROVED
            </span>
            <p className="text-sm font-semibold text-white mt-2">Rhinoplasty + Liposuction</p>
            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>Tijuana, Mexico · July 14 · Solo Traveler</p>
            <div className="flex gap-4 mt-2">
              <span className="text-xs" style={{ color: '#475569' }}>
                Anesthesia: <span className="text-white font-medium">6 hrs combined</span>
              </span>
              <span className="text-xs" style={{ color: '#475569' }}>
                Recovery: <span className="text-white font-medium">14 days</span>
              </span>
            </div>
          </div>
        </div>

        {/* Step bar */}
        <div className="flex items-center">
          {STEPS.map((step, i) => (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: i < 2 ? 'rgba(34,197,94,0.2)' : i === 2 ? GOLD : 'rgba(42,63,74,0.5)',
                    border: `1px solid ${i < 2 ? 'rgba(34,197,94,0.5)' : i === 2 ? GOLD : BORDER}`,
                    color: i < 2 ? GREEN : i === 2 ? '#0a0f1a' : '#475569',
                  }}
                >
                  {i < 2 ? '✓' : i + 1}
                </div>
                <span className="text-[9px] font-medium" style={{ color: i === 2 ? GOLD : '#475569' }}>{step}</span>
              </div>
              {i < 4 && (
                <div className="flex-1 h-px mx-1 mb-4" style={{ background: i < 2 ? 'rgba(34,197,94,0.3)' : BORDER }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── Phases ── */}
        <AnimatePresence mode="wait">

          {/* FORM */}
          {phase === 'form' && (
            <motion.div key="form" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="rounded-2xl p-5 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <div>
                  <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: GOLD }}>
                    Health & Medical History
                  </p>
                  <p className="text-sm" style={{ color: '#64748b' }}>
                    Select all conditions that apply to you. M monitors your profile throughout the entire journey.
                  </p>
                </div>
                <div className="space-y-2">
                  {CONDITIONS.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleCheck(c.id, c.trigger)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                      style={{
                        background: checked.has(c.id) ? 'rgba(212,175,55,0.1)' : 'rgba(42,63,74,0.3)',
                        border: `1px solid ${checked.has(c.id) ? 'rgba(212,175,55,0.5)' : BORDER}`,
                      }}
                    >
                      <div
                        className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                        style={{
                          background: checked.has(c.id) ? GOLD : 'transparent',
                          border: `1.5px solid ${checked.has(c.id) ? GOLD : '#475569'}`,
                        }}
                      >
                        {checked.has(c.id) && (
                          <span style={{ fontSize: 8, color: '#0a0f1a', fontWeight: 900 }}>✓</span>
                        )}
                      </div>
                      <span className="text-sm font-medium" style={{ color: checked.has(c.id) ? '#fff' : '#94a3b8' }}>
                        {c.label}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-center" style={{ color: '#334155' }}>
                  M re-evaluates your safety plan whenever new health information is disclosed — even after consultation approval.
                </p>
              </div>
            </motion.div>
          )}

          {/* ANALYZING */}
          {phase === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl p-8 text-center space-y-5"
              style={{ background: CARD, border: '1px solid rgba(212,175,55,0.3)' }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 rounded-full mx-auto flex items-center justify-center"
                style={{ border: `2px solid ${GOLD}`, borderTopColor: 'transparent' }}
              >
                <Brain className="w-5 h-5" style={{ color: GOLD }} />
              </motion.div>
              <div>
                <p className="font-bold text-white text-sm">M is re-evaluating your safety plan</p>
                <p className="text-xs mt-1" style={{ color: '#64748b' }}>
                  New health information received — re-running compatibility analysis…
                </p>
              </div>
              <div className="text-left space-y-2.5">
                {ANALYZE_STEPS.map((step, i) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.6 }}
                    className="flex items-center gap-2"
                  >
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: GOLD }} />
                    <p
                      className="text-xs"
                      style={{ color: '#64748b', fontFamily: "'SF Mono','Cascadia Code',monospace" }}
                    >
                      {step}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* BLOCKED */}
          {phase === 'blocked' && (
            <motion.div key="blocked" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              {/* Header */}
              <div
                className="rounded-t-3xl px-5 py-4 flex items-center gap-4"
                style={{ background: 'linear-gradient(135deg,#7f1d1d,#991b1b)', border: '1px solid #dc2626' }}
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(239,68,68,0.25)', border: '1px solid rgba(239,68,68,0.5)' }}
                >
                  <AlertTriangle className="w-6 h-6 text-red-300" />
                </motion.div>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-red-400 mb-0.5">
                    Safety Re-Evaluation · New Information
                  </p>
                  <h2 className="text-white font-bold text-base leading-tight">Siobhan, we need to stop.</h2>
                  <p className="text-red-300 text-xs mt-0.5">Your health disclosure changed your safety picture</p>
                </div>
              </div>

              {/* Body */}
              <div
                className="rounded-b-3xl overflow-hidden"
                style={{ background: CARD, border: `1px solid ${BORDER}`, borderTop: 'none' }}
              >
                <div className="p-5 space-y-4">

                  {/* What M found */}
                  <div
                    className="rounded-xl p-4 space-y-3"
                    style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)' }}
                  >
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: RED }}>What M found</p>
                    <p className="text-sm" style={{ color: '#94a3b8' }}>
                      Rhinoplasty + Liposuction require{' '}
                      <span className="text-white font-semibold">6 hours of combined general anesthesia</span>.
                      With Type 2 Diabetes, this creates two critical conflicts:
                    </p>
                    <div className="space-y-2">
                      {[
                        {
                          code: 'METABOLIC',
                          text: 'Diabetes impairs anesthetic metabolism. 6 hrs under general anesthesia significantly elevates the risk of glucose instability, delayed awakening, and cardiac stress.',
                        },
                        {
                          code: 'HEALING',
                          text: 'Two active surgical sites on a diabetic patient doubles the infection risk and can severely delay wound closure at both locations — even in a clean surgical environment.',
                        },
                      ].map(({ code, text }) => (
                        <div key={code} className="flex items-start gap-2">
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
                            style={{ background: '#dc2626', color: '#fff' }}
                          >
                            {code}
                          </span>
                          <p className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>{text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pick one */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: GOLD }}>
                      Choose one procedure to continue safely
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {PROCEDURES.map(proc => (
                        <button
                          key={proc.id}
                          onClick={() => pick(proc)}
                          className="rounded-2xl p-4 text-left transition-all active:scale-95 space-y-2"
                          style={{
                            background: 'rgba(212,175,55,0.05)',
                            border: '1px solid rgba(212,175,55,0.25)',
                          }}
                        >
                          <span className="text-2xl">{proc.emoji}</span>
                          <p className="text-sm font-bold text-white">{proc.name}</p>
                          <p className="text-[10px]" style={{ color: '#64748b' }}>
                            {proc.anesthesia} · {proc.recovery}
                          </p>
                          <p className="text-[10px] leading-relaxed" style={{ color: '#475569' }}>{proc.note}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    className="flex items-start gap-2 px-3 py-3 rounded-xl"
                    style={{ background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.15)' }}
                  >
                    <Heart className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: GOLD }} />
                    <p className="text-xs leading-relaxed" style={{ color: GOLD }}>
                      M is not here to take your dream away. We are here to make sure you are alive to enjoy it.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* RESOLVED */}
          {phase === 'resolved' && chosen && (
            <motion.div
              key="resolved"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl p-6 text-center space-y-4"
              style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.3)' }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
                style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)' }}
              >
                <CheckCircle2 className="w-7 h-7" style={{ color: GREEN }} />
              </motion.div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: GREEN }}>
                  Safe Plan Confirmed
                </p>
                <h3 className="text-white font-bold text-lg">{chosen.name} — Cleared</h3>
                <p className="text-sm mt-1" style={{ color: '#64748b' }}>
                  M has updated Siobhan's care plan. Doctor and companion have been notified of the revised booking.
                </p>
              </div>
              <div
                className="rounded-xl p-4 text-left space-y-2"
                style={{ background: CARD, border: `1px solid ${BORDER}` }}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: GOLD }}>
                  What M did automatically
                </p>
                {[
                  `Removed conflicting procedure — combination risk resolved`,
                  `Updated care plan for ${chosen.name} with diabetes protocol`,
                  `Notified Dr. Martinez of revised procedure list`,
                  `Added glucose monitoring checkpoints to Siobhan's journey`,
                  `Companion briefed on post-op warning signs for diabetic patients`,
                ].map((action, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Shield className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: GREEN }} />
                    <p className="text-xs" style={{ color: '#94a3b8' }}>{action}</p>
                  </div>
                ))}
              </div>
              <Link
                to="/demo"
                className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl"
                style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: GOLD }}
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Demo Hub
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
