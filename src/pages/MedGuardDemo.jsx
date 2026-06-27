/**
 * MedGuardDemo — Live interactive demo of MedGuard Pattern Intelligence.
 * Designed for investor / buildathon presentations.
 * Route: /demo/medguard  (public, no login required)
 *
 * Shows Theon vs Maria — same event, different fingerprints, different responses.
 * Auto-advances through 5 scenarios every 6 seconds.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain } from 'lucide-react';

const GOLD  = '#D4AF37';
const GREEN = '#22c55e';
const AMBER = '#f59e0b';
const RED   = '#ef4444';
const BLUE  = '#3b82f6';

// ── Behavioral Fingerprints ──────────────────────────────────────────────────

const THEON = {
  name: 'Theon',
  avatar: '👨🏽',
  tag: 'Night owl · Reliable · Active',
  color: BLUE,
  fp: {
    app_opens:    80,
    sleep_start:  '10:00 PM',
    sleep_end:    '9:00 AM',
    charge_time:  '10 PM – midnight',
    offline_avg:  '22 min',
    reliability:  '95%',
    checkin_delay: '3 min avg',
  },
};

const MARIA = {
  name: 'Maria',
  avatar: '👩🏻',
  tag: 'Early bird · Sporadic · Flexible',
  color: '#a855f7',
  fp: {
    app_opens:    30,
    sleep_start:  '11:00 PM',
    sleep_end:    '6:30 AM',
    charge_time:  '6 PM – 8 PM',
    offline_avg:  '2.5 hrs',
    reliability:  '60%',
    checkin_delay: '28 min avg',
  },
};

// ── Scenarios ────────────────────────────────────────────────────────────────

const SCENARIOS = [
  {
    id: 1,
    icon: '📵',
    event: 'Phone offline — 10:45 PM',
    context: 'Signal lost. No GPS. App closed.',
    theon: {
      score: 0,
      action: 'normal',
      label: 'Sleep window',
      explanation: '10 PM is Theon\'s sleep start. This is 100% expected. No action taken.',
      message: '💤 Rest well. Resuming watch at 9 AM.',
      color: GREEN,
    },
    maria: {
      score: 42,
      action: 'soft_ping',
      label: 'Soft ping',
      explanation: 'Maria sleeps at 11 PM. 10:45 PM is still her active window.',
      message: '👋 "Your phone went offline a bit earlier than usual. All good?"',
      color: AMBER,
    },
  },
  {
    id: 2,
    icon: '⏰',
    event: '3:15 PM — Phone silent for 2h 30min',
    context: 'GPS stale. No app activity.',
    theon: {
      score: 68,
      action: 'check_in_requested',
      label: 'Check-in requested',
      explanation: 'Theon opens his phone 80x/day. His avg offline is 22 min. 150 min = 6.8× his normal.',
      message: '🛡️ "We noticed your pattern changed — just checking in. Tap 👍 if you\'re okay."',
      color: AMBER,
    },
    maria: {
      score: 8,
      action: 'normal',
      label: 'Normal for Maria',
      explanation: 'Maria regularly goes 2–3 hours without activity during the day. This is inside her fingerprint.',
      message: '✅ Within her normal offline window. No action.',
      color: GREEN,
    },
  },
  {
    id: 3,
    icon: '🤝',
    event: 'Check-in missed — 52 minutes late',
    context: 'Handshake HS5 (Clinic Appointment) overdue.',
    theon: {
      score: 88,
      action: 'escalated',
      label: 'ESCALATED',
      explanation: 'Theon\'s check-in reliability is 95%. When he\'s late, it\'s only 3 minutes. 52 minutes = critical.',
      message: '🚨 Guardian notified. Admin alert. Last known: Clinic district.',
      color: RED,
    },
    maria: {
      score: 24,
      action: 'soft_ping',
      label: 'Soft ping',
      explanation: 'Maria is late 40% of the time by 28 minutes on average. 52 minutes is slightly unusual but not alarming.',
      message: '👋 "Check-in is overdue. Tap \'I\'m Safe\' when you can."',
      color: AMBER,
    },
  },
  {
    id: 4,
    icon: '🔋',
    event: '12:04 AM — Phone reconnects after 94 min',
    context: 'Device came back online.',
    theon: {
      score: 4,
      action: 'normal',
      label: 'Charge cycle',
      explanation: 'Theon typically charges between 10 PM–midnight. 94 min offline = standard charge cycle for his device.',
      message: '🔋 "Normal charge cycle. Monitoring resumed. Sleep well."',
      color: GREEN,
    },
    maria: {
      score: 6,
      action: 'normal',
      label: 'Expected',
      explanation: 'Maria charges 6–8 PM. Midnight reconnect matches a known secondary charge in her fingerprint.',
      message: '✅ Reconnected. Resuming watch.',
      color: GREEN,
    },
  },
  {
    id: 5,
    icon: '🏥',
    event: 'Day 2 post-surgery — 7 hours stationary',
    context: 'No movement. GPS fixed. App barely opened.',
    theon: {
      score: 6,
      action: 'normal',
      label: 'Recovery context',
      explanation: 'iQ200 flags journey phase as RECOVERY_PHASE. Immobility is 100% expected. Score drops 20pts automatically.',
      message: '🏥 "You haven\'t moved in 7 hours — that\'s expected after surgery. Rest well. We\'re watching."',
      color: GREEN,
    },
    maria: {
      score: 5,
      action: 'normal',
      label: 'Recovery context',
      explanation: 'Same recovery flag applied. Extended immobility is the expected pattern post-procedure for all patients.',
      message: '🏥 "Recovery mode active. No action needed unless you need help."',
      color: GREEN,
    },
  },
];

// ── Score Bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score, color, label, action }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    setDisplay(0);
    let frame;
    const start = performance.now();
    const duration = 900;
    function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(score * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const barColor = action === 'escalated' ? RED : action === 'check_in_requested' ? AMBER : action === 'soft_ping' ? AMBER : GREEN;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Anomaly Score
        </span>
        <span style={{ fontSize: 22, fontWeight: 900, color: barColor, fontVariantNumeric: 'tabular-nums' }}>
          {display}
        </span>
      </div>
      <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: '100%', borderRadius: 99, background: barColor, boxShadow: `0 0 8px ${barColor}80` }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>0 — Safe</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>100 — Critical</span>
      </div>
    </div>
  );
}

// ── User Response Card ────────────────────────────────────────────────────────

function UserCard({ user, result, scenarioId }) {
  const actionColors = { normal: GREEN, soft_ping: AMBER, check_in_requested: AMBER, escalated: RED };
  const actionColor  = actionColors[result.action] || GREEN;

  return (
    <motion.div
      key={`${user.name}-${scenarioId}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: `1px solid ${user.color}30`, borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* User header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 36 }}>{user.avatar}</span>
        <div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#fff' }}>{user.name}</p>
          <p style={{ margin: 0, fontSize: 11, color: user.color, fontWeight: 600 }}>{user.tag}</p>
        </div>
        <div style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: 99, background: `${actionColor}20`, border: `1px solid ${actionColor}50` }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: actionColor, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {result.label}
          </span>
        </div>
      </div>

      {/* Fingerprint snapshot */}
      <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: '10px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
        {Object.entries(user.fp).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Score */}
      <ScoreBar score={result.score} action={result.action} />

      {/* Explanation */}
      <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
        {result.explanation}
      </p>

      {/* System response */}
      <div style={{ background: `${actionColor}12`, border: `1px solid ${actionColor}30`, borderRadius: 12, padding: '10px 14px' }}>
        <p style={{ margin: 0, fontSize: 12, color: '#fff', lineHeight: 1.6, fontStyle: 'italic' }}>
          {result.message}
        </p>
      </div>
    </motion.div>
  );
}

// ── Main Demo Page ────────────────────────────────────────────────────────────

export default function MedGuardDemo() {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [progress,    setProgress]    = useState(0);
  const [paused,      setPaused]      = useState(false);
  const intervalRef   = useRef(null);
  const progressRef   = useRef(null);

  const scenario = SCENARIOS[scenarioIdx];
  const DURATION = 6000;

  useEffect(() => {
    if (paused) { clearInterval(intervalRef.current); clearInterval(progressRef.current); return; }

    setProgress(0);
    progressRef.current = setInterval(() => {
      setProgress(p => Math.min(100, p + (100 / (DURATION / 50))));
    }, 50);

    intervalRef.current = setTimeout(() => {
      setScenarioIdx(i => (i + 1) % SCENARIOS.length);
    }, DURATION);

    return () => { clearInterval(progressRef.current); clearTimeout(intervalRef.current); };
  }, [scenarioIdx, paused]);

  return (
    <div style={{ minHeight: '100vh', background: '#060B16', padding: '32px 24px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Back button */}
        <div style={{ marginBottom: 24 }}>
          <Link to="/demo" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>
            <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Demo
          </Link>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Brain style={{ width: 28, height: 28, color: GOLD }} />
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.25em', color: GOLD, textTransform: 'uppercase' }}>
              MedGuard Pattern Intelligence™
            </span>
            <Brain style={{ width: 28, height: 28, color: GOLD }} />
          </div>
          <h1 style={{ margin: '0 0 8px', fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
            Same Event. Different Fingerprint.
          </h1>
          <p style={{ margin: 0, fontSize: 16, color: 'rgba(255,255,255,0.45)' }}>
            MedGuard doesn't watch you. It learns you. And when you stop being you, it asks why.
          </p>
        </div>

        {/* Scenario display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={scenario.id}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.35 }}
            style={{ background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 20, padding: '20px 28px', marginBottom: 24, textAlign: 'center' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <span style={{ fontSize: 32 }}>{scenario.icon}</span>
              <div>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>{scenario.event}</p>
                <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{scenario.context}</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Side-by-side user cards */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
          <AnimatePresence mode="wait">
            <UserCard key={`theon-${scenario.id}`} user={THEON} result={scenario.theon} scenarioId={scenario.id} />
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <UserCard key={`maria-${scenario.id}`} user={MARIA} result={scenario.maria} scenarioId={scenario.id} />
          </AnimatePresence>
        </div>

        {/* Progress + controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          {/* Progress bar */}
          <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 99 }}>
            <div style={{ height: '100%', width: `${progress}%`, background: GOLD, borderRadius: 99, transition: 'width 0.05s linear' }} />
          </div>

          <button
            onClick={() => setPaused(p => !p)}
            style={{ padding: '8px 20px', borderRadius: 99, background: paused ? GOLD : 'rgba(255,255,255,0.08)', border: `1px solid ${paused ? GOLD : 'rgba(255,255,255,0.12)'}`, color: paused ? '#060B16' : '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}
          >
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
        </div>

        {/* Scenario dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 40 }}>
          {SCENARIOS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { setScenarioIdx(i); setProgress(0); }}
              style={{ width: i === scenarioIdx ? 28 : 10, height: 10, borderRadius: 99, background: i === scenarioIdx ? GOLD : 'rgba(255,255,255,0.18)', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', padding: 0 }}
            />
          ))}
        </div>

        {/* How it works strip */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '20px 28px' }}>
          <p style={{ margin: '0 0 16px', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            How the fingerprint is built
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              { icon: '📱', label: 'Phase 1 (72h)', desc: 'Silent observation. Records every app open, session, charge cycle. No alerts.' },
              { icon: '🧠', label: 'Fingerprint Built', desc: 'Exponential moving average across 200+ data points. Unique to each person.' },
              { icon: '🔍', label: 'Live Comparison', desc: 'Every 5 minutes — current behavior vs baseline. Score computed client-side.' },
              { icon: '🛡️', label: 'Gentle Response', desc: 'Soft nudge → check-in request → guardian alert. Never panic. Always context.' },
            ].map((step, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 28, display: 'block', marginBottom: 8 }}>{step.icon}</span>
                <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: GOLD }}>{step.label}</p>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer tagline */}
        <p style={{ textAlign: 'center', marginTop: 32, fontSize: 14, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
          "MedGuard doesn't watch you. It learns you. And when you stop being you, it asks why." — Morales Medical 🛡️
        </p>

      </div>
    </div>
  );
}
