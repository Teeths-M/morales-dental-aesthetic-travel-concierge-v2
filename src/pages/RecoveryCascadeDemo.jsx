import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, RotateCcw, Zap, Heart, AlertTriangle } from 'lucide-react';

const GOLD   = '#D4AF37';
const DARK   = '#060B16';
const CARD   = '#0C1A1D';
const BORDER = '#2A3F4A';
const GREEN  = '#22c55e';
const RED    = '#ef4444';

const PATIENT = {
  name: 'Maria C.',
  procedure: 'Rhinoplasty',
  doctor: 'Dr. Alejandro Martinez',
  clinic: 'ISSSTECALI Dental & Aesthetic Clinic, Tijuana',
  date: 'July 14, 2026',
  companion: 'Sofia R.',
  guardian: '+1 (868) 555-0182',
};

const CASCADE = [
  { icon: '📱', title: 'Guardian SMS sent',           detail: `"Maria's procedure is complete and successful. M has begun monitoring her recovery. No action needed right now."`, delay: 400 },
  { icon: '🩺', title: 'Recovery mode activated',     detail: 'Post-operative monitoring protocol started. M watches for warning signs automatically based on procedure complexity.', delay: 1000 },
  { icon: '📅', title: 'Day 3 check-in scheduled',    detail: 'Secure SMS link queued — Maria rates her recovery, pain level, and flags any concerns. Takes under 60 seconds.', delay: 1700 },
  { icon: '📅', title: 'Day 7 check-in scheduled',    detail: 'Week 1 follow-up queued. M flags responses showing infection risk or healing delay automatically.', delay: 2400 },
  { icon: '📅', title: 'Day 14 check-in scheduled',   detail: 'Two-week milestone. If all clear, M begins tapering monitoring frequency.', delay: 3000 },
  { icon: '👥', title: 'Companion briefed via WhatsApp', detail: 'Sofia R. received post-op care protocol: swelling watch, medication reminders, red-flag signs to escalate.', delay: 3600 },
  { icon: '📋', title: 'Case record updated',         detail: "Dr. Martinez's procedure notes encrypted and logged. Audit hash updated. Family tracker link generated.", delay: 4200 },
  { icon: '🔗', title: 'Family tracker activated',    detail: "Zero-login share link live. Maria's family checks her recovery status in real time — no app required.", delay: 4800 },
];

const SCHEDULE_ROWS = [
  { type: 'Minor',    count: '1',  freq: 'Every 12 hrs', window: '24 hrs', checkins: '2' },
  { type: 'Moderate', count: '2',  freq: 'Every 8 hrs',  window: '48 hrs', checkins: '6' },
  { type: 'Major',    count: '3+', freq: 'Every 4 hrs',  window: '72 hrs', checkins: '18' },
];

const CHECKIN_QUESTIONS = [
  { q: 'How are you feeling overall?', a: 'Scale 1–5 (Not well → Excellent)' },
  { q: 'Pain level right now?',        a: 'Scale 0–10' },
  { q: 'Any concerns?',                a: 'Swelling, bleeding, infection, allergic reaction, other' },
  { q: 'Optional note',                a: 'Free text — sent directly to care team' },
];

const ESCALATION = [
  { trigger: 'No response to check-in',  action: 'Companion + coordinator alerted within 1 hour' },
  { trigger: 'Pain level ≥ 8',           action: 'Doctor notified immediately' },
  { trigger: 'Infection / bleeding flag', action: 'Care team escalated + emergency protocol opens' },
  { trigger: '2 missed check-ins',        action: 'Guardian SMS + admin mission control alert' },
];

function InfoPanel() {
  return (
    <div className="space-y-4 sticky top-8">

      {/* Real system badge */}
      <div
        className="rounded-xl px-4 py-3 flex items-center gap-2"
        style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.3)' }}
      >
        <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#f59e0b' }} />
        <p className="text-xs font-bold" style={{ color: '#f59e0b' }}>
          Representative showcase — live engine runs on real patient data
        </p>
      </div>

      {/* Check-in frequency table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
        <div className="px-4 py-3" style={{ background: 'rgba(212,175,55,0.07)', borderBottom: `1px solid ${BORDER}` }}>
          <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: GOLD }}>
            How Often M Checks In
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: '#64748b' }}>Auto-calculated from procedure count</p>
        </div>
        <div style={{ background: CARD }}>
          <div className="grid grid-cols-4 px-4 py-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
            {['Type', 'Procs', 'Frequency', 'Checks'].map(h => (
              <p key={h} className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#475569' }}>{h}</p>
            ))}
          </div>
          {SCHEDULE_ROWS.map((row, i) => (
            <div
              key={row.type}
              className="grid grid-cols-4 px-4 py-2.5"
              style={{
                borderBottom: i < SCHEDULE_ROWS.length - 1 ? `1px solid ${BORDER}` : 'none',
                background: row.type === 'Minor' ? 'rgba(212,175,55,0.04)' : 'transparent',
              }}
            >
              <p className="text-xs font-semibold text-white">{row.type}</p>
              <p className="text-xs" style={{ color: '#94a3b8' }}>{row.count}</p>
              <p className="text-xs font-medium" style={{ color: GOLD }}>{row.freq}</p>
              <p className="text-xs" style={{ color: '#94a3b8' }}>{row.checkins}</p>
            </div>
          ))}
        </div>
        <div className="px-4 py-2" style={{ background: 'rgba(212,175,55,0.03)', borderTop: `1px solid ${BORDER}` }}>
          <p className="text-[10px]" style={{ color: '#475569' }}>
            Maria = Rhinoplasty (1 procedure) → <span style={{ color: GOLD }}>every 12 hrs</span>
          </p>
        </div>
      </div>

      {/* What a check-in asks */}
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
        <div className="px-4 py-3" style={{ background: 'rgba(212,175,55,0.07)', borderBottom: `1px solid ${BORDER}` }}>
          <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: GOLD }}>
            What Each Check-In Asks
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: '#64748b' }}>SMS link — under 60 seconds, no app</p>
        </div>
        <div className="divide-y" style={{ background: CARD, borderColor: BORDER }}>
          {CHECKIN_QUESTIONS.map((item, i) => (
            <div key={i} className="px-4 py-2.5" style={{ borderColor: BORDER }}>
              <p className="text-xs font-semibold text-white">{item.q}</p>
              <p className="text-[10px] mt-0.5" style={{ color: '#64748b' }}>{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* If no response */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(239,68,68,0.25)' }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.06)', borderBottom: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: RED }} />
          <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: RED }}>
            If Something Is Wrong
          </p>
        </div>
        <div className="divide-y" style={{ background: CARD, borderColor: 'rgba(239,68,68,0.15)' }}>
          {ESCALATION.map((row, i) => (
            <div key={i} className="px-4 py-2.5" style={{ borderColor: 'rgba(239,68,68,0.15)' }}>
              <p className="text-[10px] font-semibold" style={{ color: '#fca5a5' }}>{row.trigger}</p>
              <p className="text-[10px] mt-0.5" style={{ color: '#64748b' }}>{row.action}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Edge function note */}
      <div className="rounded-xl px-4 py-3 space-y-1" style={{ background: 'rgba(42,63,74,0.3)', border: `1px solid ${BORDER}` }}>
        <p className="text-[9px] font-bold tracking-widest uppercase" style={{ color: '#475569' }}>Under the hood</p>
        <p className="text-[10px] leading-relaxed" style={{ color: '#475569' }}>
          <span className="font-mono" style={{ color: '#64748b' }}>logProcedureComplete</span> edge function fires on doctor confirm → creates{' '}
          <span className="font-mono" style={{ color: '#64748b' }}>RecoverySession</span> entity → schedules check-ins →
          triggers Twilio SMS + Base44 email. Zero human dispatcher.
        </p>
      </div>

    </div>
  );
}

export default function RecoveryCascadeDemo() {
  const [phase, setPhase]     = useState('doctor');
  const [visible, setVisible] = useState([]);
  const [notes, setNotes]     = useState('Rhinoplasty completed successfully. No complications. Patient stable and alert.');

  function confirm() {
    setPhase('firing');
    CASCADE.forEach((action, i) => {
      setTimeout(() => {
        setVisible(prev => [...prev, i]);
        if (i === CASCADE.length - 1) setTimeout(() => setPhase('active'), 600);
      }, action.delay);
    });
  }

  function reset() {
    setPhase('doctor');
    setVisible([]);
    setNotes('Rhinoplasty completed successfully. No complications. Patient stable and alert.');
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: DARK, fontFamily: "'SF Pro Display', system-ui, sans-serif" }}>
      <div className="max-w-5xl mx-auto">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/demo" className="inline-flex items-center gap-2 text-xs font-semibold" style={{ color: '#64748b' }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Demo Hub
          </Link>
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-95"
            style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', color: GOLD }}
          >
            <RotateCcw className="w-3 h-3" /> Restart
          </button>
        </div>

        {/* Two-column layout */}
        <div className="grid gap-8" style={{ gridTemplateColumns: '1fr 320px', alignItems: 'start' }}>

          {/* LEFT — demo */}
          <div className="space-y-5">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase mb-1" style={{ color: GOLD }}>
                Live Demo · Event-Triggered Cascade
              </p>
              <h1 className="text-2xl font-bold text-white">Recovery Protocol Launch</h1>
              <p className="text-sm mt-1" style={{ color: '#64748b' }}>
                Doctor confirms procedure complete → M autonomously activates 8-action recovery protocol.
              </p>
            </div>

            {/* Patient card */}
            <div className="rounded-2xl p-4 flex items-start gap-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)' }}
              >
                🏥
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{PATIENT.name} — {PATIENT.procedure}</p>
                <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{PATIENT.clinic}</p>
                <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{PATIENT.doctor} · {PATIENT.date}</p>
                <div className="flex gap-3 mt-2">
                  <span className="text-[10px]" style={{ color: '#475569' }}>Companion: <span className="text-white">{PATIENT.companion}</span></span>
                  <span className="text-[10px]" style={{ color: '#475569' }}>Guardian: <span className="text-white">{PATIENT.guardian}</span></span>
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">

              {phase === 'doctor' && (
                <motion.div key="doctor" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="rounded-2xl p-5 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                    <p className="text-xs font-bold tracking-widest uppercase" style={{ color: GOLD }}>
                      Doctor — Procedure Notes
                    </p>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none"
                      style={{ background: 'rgba(42,63,74,0.4)', border: `1px solid ${BORDER}`, color: '#e2e8f0', fontFamily: 'inherit' }}
                    />
                    <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(212,175,55,0.04)', border: '2px solid rgba(212,175,55,0.3)' }}>
                      <p className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: GOLD }}>Procedure Complete?</p>
                      <p className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>
                        Pressing this button will notify the patient's guardian, activate recovery mode, and schedule all post-operative check-ins automatically.
                      </p>
                      <button
                        onClick={confirm}
                        className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                        style={{ background: 'linear-gradient(135deg,#D4AF37,#E8C85C)', color: '#060B16', boxShadow: '0 8px 24px rgba(212,175,55,0.35)', border: 'none', cursor: 'pointer' }}
                      >
                        ✅ Confirm Procedure Complete — Notify Guardian
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {(phase === 'firing' || phase === 'active') && (
                <motion.div key="cascade" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <div
                    className="rounded-2xl px-5 py-4 flex items-center gap-3 mb-4"
                    style={{
                      background: phase === 'active' ? 'rgba(34,197,94,0.07)' : 'rgba(212,175,55,0.07)',
                      border: `1px solid ${phase === 'active' ? 'rgba(34,197,94,0.35)' : 'rgba(212,175,55,0.35)'}`,
                    }}
                  >
                    {phase === 'firing' ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                        className="w-8 h-8 rounded-full flex-shrink-0"
                        style={{ border: `2px solid ${GOLD}`, borderTopColor: 'transparent' }}
                      />
                    ) : (
                      <CheckCircle2 className="w-7 h-7 flex-shrink-0" style={{ color: GREEN }} />
                    )}
                    <div>
                      <p className="text-sm font-bold" style={{ color: phase === 'active' ? GREEN : GOLD }}>
                        {phase === 'firing' ? 'M is launching recovery protocol…' : 'Recovery protocol fully active'}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                        {phase === 'firing'
                          ? 'Autonomous actions firing — no human dispatcher required'
                          : `${CASCADE.length} autonomous actions completed · monitoring live`}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {CASCADE.map((action, i) => (
                      <AnimatePresence key={i}>
                        {visible.includes(i) && (
                          <motion.div
                            initial={{ opacity: 0, x: -10, height: 0 }}
                            animate={{ opacity: 1, x: 0, height: 'auto' }}
                            transition={{ duration: 0.3 }}
                            className="rounded-xl px-4 py-3 flex items-start gap-3"
                            style={{ background: CARD, border: `1px solid ${BORDER}` }}
                          >
                            <span className="text-base flex-shrink-0 mt-0.5">{action.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-bold text-white">{action.title}</p>
                                <Zap className="w-3 h-3 flex-shrink-0" style={{ color: GOLD }} />
                              </div>
                              <p className="text-[11px] leading-relaxed mt-0.5" style={{ color: '#64748b' }}>{action.detail}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    ))}
                  </div>

                  {phase === 'active' && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="rounded-2xl p-4 mt-4 flex items-start gap-3"
                      style={{ background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.2)' }}
                    >
                      <Heart className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: GOLD }} />
                      <p className="text-xs leading-relaxed" style={{ color: GOLD }}>
                        Dr. Martinez pressed one button. M did the rest. Maria's family is informed, her companion is briefed, and her recovery is monitored automatically.
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* RIGHT — always-visible info panel */}
          <InfoPanel />
        </div>
      </div>
    </div>
  );
}