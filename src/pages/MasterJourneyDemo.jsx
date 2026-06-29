import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Volume2, VolumeX, RotateCcw, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';

const GOLD  = '#D4AF37';
const DARK  = '#060B16';
const CARD  = '#0C1A1D';
const BORDER = '#2A3F4A';
const RED   = '#ef4444';
const GREEN = '#22c55e';
const BLUE  = '#60a5fa';

const STAGES = [
  {
    id: 'booking',
    phase: 'Before Travel',
    feature: 'Voice Booking',
    featureColor: GOLD,
    icon: '📞',
    speaker: 'M',
    text: "Hello James. I'm M — your Morales concierge. I've found Dr. Martinez in Tijuana — 1,247 procedures, 98.2% satisfaction. Your dental implants are booked for July 22nd. Payment link sent to Marcus. I'll handle everything from here.",
    visual: { type: 'otp', label: 'Phone OTP Login Active', color: GOLD },
    pause: 5500,
  },
  {
    id: 'trust',
    phase: 'Day of Travel',
    feature: 'Partner Trust Score',
    featureColor: BLUE,
    icon: '⭐',
    speaker: 'M',
    text: "James — Mario is 8 minutes away. He has completed 347 Morales trips. Zero complaints. 4.9 stars. Patients say he is always on time and very gentle. He will call your name at arrivals. He will not honk.",
    visual: { type: 'trust', label: 'Mario · 347 trips · 4.9★ · 0 complaints', color: BLUE },
    pause: 5000,
  },
  {
    id: 'airport',
    phase: 'Destination Arrival',
    feature: 'Guardian SMS — HS3',
    featureColor: GREEN,
    icon: '✈️',
    speaker: 'M',
    text: "James has landed safely at Tijuana Airport. I have just sent Sandra and Marcus a message: James has landed safely. He is in good hands. They do not need to call. They already know.",
    visual: { type: 'sms', label: 'Guardian notified: "James landed safely"', color: GREEN },
    pause: 4800,
  },
  {
    id: 'hotel',
    phase: 'Hotel Check-In',
    feature: 'Guardian SMS — HS4',
    featureColor: GREEN,
    icon: '🏨',
    speaker: 'M',
    text: "James has checked in safely at Hotel Lucerna. Room 412. I've updated the Hotel M Hub — staff are aware of James and his recovery needs. Sandra has been notified: James is comfortable and settling in.",
    visual: { type: 'sms', label: 'Hotel M Hub active · Guardian notified', color: GREEN },
    pause: 4800,
  },
  {
    id: 'silent',
    phase: 'On the Street',
    feature: 'Silent Mode — Shake 3×',
    featureColor: RED,
    icon: '🔇',
    speaker: 'M',
    text: "James noticed someone following him near the market. He shook his phone three times. Screen went dark. M activated silently — GPS transmitting every 5 seconds, security firm alerted, Safety Circle notified. The attacker saw nothing. M saw everything.",
    visual: { type: 'shake', label: '📳 📳 📳 → SILENT SOS ACTIVE', color: RED },
    pause: 5500,
  },
  {
    id: 'clinic',
    phase: 'Clinic Arrival',
    feature: 'Tap Protocol + Guardian SMS — HS5',
    featureColor: GOLD,
    icon: '🏥',
    speaker: 'M',
    text: "You are at the clinic now, James. Take a slow breath. You've come a very long way. Dr. Martinez is ready. I have notified Sandra: James has arrived safely at the clinic. His care team is ready. Two taps if you need me. Three taps for emergency.",
    visual: { type: 'tap', label: '2 taps = check-in · 3 taps = full cascade', color: GOLD },
    pause: 5500,
  },
  {
    id: 'procedure',
    phase: 'Procedure Complete',
    feature: 'Doctor Confirms · Recovery Mode',
    featureColor: GREEN,
    icon: '✅',
    speaker: 'M',
    text: "Dr. Martinez has confirmed the procedure is complete. I have sent Sandra a message: James's procedure is complete. The doctor has confirmed. He is now in recovery and being cared for. Recovery mode is active. Check-ins scheduled for Day 3, 7, 14, and 30.",
    visual: { type: 'procedure', label: 'Doctor confirmed · Recovery mode active · Guardian notified', color: GREEN },
    pause: 5500,
  },
  {
    id: 'golden',
    phase: 'Journey Complete',
    feature: 'The Golden M',
    featureColor: GOLD,
    icon: '👑',
    speaker: 'M',
    text: "Fourteen days ago you arrived nervous and alone. Today your dental implants are complete. Dr. Martinez says you healed faster than 89 percent of patients his age. You did this, James. Your smile is yours again. Welcome home. The Golden M is yours.",
    visual: { type: 'golden', label: '9 of 9 Handshakes Complete', color: GOLD },
    pause: 6000,
    golden: true,
  },
];

function speak(text, onEnd, muted) {
  if (muted || !window.speechSynthesis) { setTimeout(onEnd, 500); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.88; u.pitch = 1.05; u.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find(v => v.lang === 'en-GB') || voices.find(v => v.lang.startsWith('en')) || voices[0];
  if (v) u.voice = v;
  u.onend = onEnd;
  u.onerror = onEnd;
  window.speechSynthesis.speak(u);
}

function VisualPanel({ stage }) {
  const v = stage.visual;
  if (stage.golden) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 12, animation: 'pulse 2s ease infinite' }}>✨</div>
        <div style={{ fontSize: 48, color: GOLD, fontFamily: 'Georgia, serif', fontWeight: 400, textShadow: `0 0 32px ${GOLD}` }}>M</div>
        <p style={{ margin: '12px 0 0', fontSize: 13, color: GOLD, fontWeight: 700 }}>The Golden M — Journey Complete</p>
      </div>
    );
  }
  if (v.type === 'shake') {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
          {[1,2,3].map(n => <div key={n} style={{ width: 20, height: 20, borderRadius: '50%', background: RED, animation: `pulse ${0.5 + n * 0.2}s ease infinite` }} />)}
        </div>
        <p style={{ margin: 0, fontSize: 11, color: RED, fontWeight: 800, letterSpacing: '0.1em' }}>SILENT MODE ACTIVE</p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>GPS transmitting · Screen dark · Attacker sees nothing</p>
      </div>
    );
  }
  if (v.type === 'sms') {
    return (
      <div style={{ padding: '14px 16px', borderRadius: 12, background: `${GREEN}10`, border: `1px solid ${GREEN}30` }}>
        <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 800, color: GREEN, letterSpacing: '0.08em' }}>SMS SENT TO GUARDIAN</p>
        <p style={{ margin: 0, fontSize: 13, color: '#fff', lineHeight: 1.6 }}>{v.label}</p>
      </div>
    );
  }
  return (
    <div style={{ padding: '14px 16px', borderRadius: 12, background: `${v.color}10`, border: `1px solid ${v.color}30` }}>
      <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 800, color: v.color, letterSpacing: '0.08em' }}>ACTIVE FEATURE</p>
      <p style={{ margin: 0, fontSize: 13, color: '#fff', lineHeight: 1.6 }}>{v.label}</p>
    </div>
  );
}

export default function MasterJourneyDemo() {
  const [idx,     setIdx]     = useState(-1); // -1 = intro screen
  const [muted,   setMuted]   = useState(false);
  const [playing, setPlaying] = useState(false);
  const [done,    setDone]    = useState(false);
  const timerRef  = useRef(null);
  const mutableRef = useRef(false);
  mutableRef.current = muted;

  const runStage = useCallback((i) => {
    if (i >= STAGES.length) {
      setPlaying(false);
      setDone(true);
      confetti({ particleCount: 180, spread: 100, colors: [GOLD, '#FFE066', '#fff'], origin: { y: 0.5 } });
      setTimeout(() => confetti({ particleCount: 120, spread: 80, colors: [GOLD, '#FFE066'] }), 600);
      return;
    }
    setIdx(i);
    const stage = STAGES[i];
    speak(stage.text, () => {
      timerRef.current = setTimeout(() => runStage(i + 1), 800);
    }, mutableRef.current);
  }, []);

  const start = () => {
    clearTimeout(timerRef.current);
    window.speechSynthesis?.cancel();
    setDone(false);
    setPlaying(true);
    runStage(0);
  };

  const reset = () => {
    clearTimeout(timerRef.current);
    window.speechSynthesis?.cancel();
    setIdx(-1);
    setPlaying(false);
    setDone(false);
  };

  const next = () => {
    if (idx < STAGES.length - 1) {
      clearTimeout(timerRef.current);
      window.speechSynthesis?.cancel();
      runStage(idx + 1);
    }
  };

  useEffect(() => () => { clearTimeout(timerRef.current); window.speechSynthesis?.cancel(); }, []);

  const stage = idx >= 0 ? STAGES[idx] : null;
  const progress = idx >= 0 ? Math.round(((idx + 1) / STAGES.length) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', background: DARK, fontFamily: '"SF Pro Display", system-ui, sans-serif' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Header */}
      <div style={{ padding: '14px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/demo" style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none', color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
          <ArrowLeft style={{ width: 15, height: 15 }} /> All demos
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/morales-m-mark.png" alt="M" style={{ width: 24, filter: `drop-shadow(0 0 6px ${GOLD})` }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>M Complete Journey</span>
          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: `${GOLD}20`, color: GOLD, fontWeight: 800 }}>LIVE DEMO</span>
        </div>
        <button onClick={() => { setMuted(m => !m); window.speechSynthesis?.cancel(); }}
          style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '5px 10px', color: muted ? 'rgba(255,255,255,0.3)' : GOLD, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
          {muted ? <VolumeX style={{ width: 12, height: 12 }} /> : <Volume2 style={{ width: 12, height: 12 }} />}
          {muted ? 'Unmute' : 'Mute M'}
        </button>
      </div>

      {/* Intro */}
      {idx === -1 && !done && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 32px', textAlign: 'center', minHeight: 'calc(100vh - 57px)' }}>
          <img src="/morales-m-mark.png" alt="M" style={{ width: 64, filter: `drop-shadow(0 0 24px ${GOLD}80)`, marginBottom: 24 }} />
          <h1 style={{ margin: '0 0 12px', fontSize: 34, fontWeight: 800, color: '#fff', letterSpacing: '-0.025em', lineHeight: 1.2 }}>
            James's Complete Journey
          </h1>
          <p style={{ margin: '0 0 8px', fontSize: 15, color: 'rgba(255,255,255,0.5)', maxWidth: 500, lineHeight: 1.7 }}>
            Watch every M feature fire in real time — from booking to the Golden M. 8 features. 1 journey. No human intervention.
          </p>
          <p style={{ margin: '0 0 40px', fontSize: 12, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.04em' }}>
            TURN VOLUME UP · M WILL SPEAK · {STAGES.length} STAGES · ~3 MINUTES
          </p>
          <button onClick={start} style={{
            padding: '16px 48px', borderRadius: 16, cursor: 'pointer',
            background: `linear-gradient(135deg, ${GOLD}, #E8C85C)`,
            border: 'none', color: DARK, fontSize: 16, fontWeight: 800,
            boxShadow: `0 12px 40px rgba(212,175,55,0.45)`,
          }}>
            Begin James's Journey
          </button>
          <div style={{ display: 'flex', gap: 20, marginTop: 40, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['OTP Login', 'Voice Booking', 'Partner Trust', 'Guardian SMS', 'Silent Mode', 'Tap Protocol', 'Doctor Confirm', 'Golden M'].map(f => (
              <span key={f} style={{ fontSize: 10, padding: '4px 10px', borderRadius: 20, background: `${GOLD}10`, border: `1px solid ${GOLD}25`, color: GOLD, fontWeight: 700 }}>{f}</span>
            ))}
          </div>
        </div>
      )}

      {/* Active journey */}
      {idx >= 0 && !done && (
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px' }}>

          {/* Progress */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: GOLD, fontWeight: 700, letterSpacing: '0.06em' }}>{stage.phase.toUpperCase()}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Stage {idx + 1} of {STAGES.length}</span>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${GOLD}, #E8C85C)`, transition: 'width 0.5s ease', borderRadius: 2 }} />
            </div>
          </div>

          {/* Feature badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: `${stage.featureColor}18`, border: `1px solid ${stage.featureColor}40`, marginBottom: 20 }}>
            <span style={{ fontSize: 13 }}>{stage.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: stage.featureColor, letterSpacing: '0.06em' }}>{stage.feature.toUpperCase()}</span>
          </div>

          {/* M speech bubble */}
          <div key={idx} style={{ display: 'flex', gap: 12, marginBottom: 20, animation: 'fadeUp 0.35s ease' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: `${GOLD}18`, border: `1.5px solid ${GOLD}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: GOLD }}>M</div>
            <div style={{ flex: 1, padding: '14px 18px', borderRadius: '4px 18px 18px 18px', background: CARD, border: `1px solid ${stage.golden ? GOLD + '50' : BORDER}` }}>
              <p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 700, color: GOLD, letterSpacing: '0.08em' }}>M — MORALES CONCIERGE</p>
              <p style={{ margin: 0, fontSize: 14, color: '#fff', lineHeight: 1.7 }}>{stage.text}</p>
            </div>
          </div>

          {/* Visual panel */}
          <div style={{ padding: '18px 20px', borderRadius: 16, background: CARD, border: `1px solid ${BORDER}`, marginBottom: 20, animation: 'fadeUp 0.45s ease' }}>
            <VisualPanel stage={stage} />
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={reset} style={{ padding: '9px 16px', borderRadius: 10, background: 'none', border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
              <RotateCcw style={{ width: 12, height: 12 }} /> Restart
            </button>
            <button onClick={next} disabled={idx >= STAGES.length - 1} style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              Skip to next <ChevronRight style={{ width: 13, height: 13 }} />
            </button>
          </div>
        </div>
      )}

      {/* Done */}
      {done && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 32px', textAlign: 'center', minHeight: 'calc(100vh - 57px)' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>👑</div>
          <h2 style={{ margin: '0 0 10px', fontSize: 26, fontWeight: 800, color: '#fff' }}>Journey Complete</h2>
          <p style={{ margin: '0 0 32px', fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 440, lineHeight: 1.7 }}>
            Every feature fired. No human intervention. James traveled alone — blind, abroad — and M was with him every step.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32, textAlign: 'left', width: '100%', maxWidth: 360 }}>
            {STAGES.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 10, background: CARD, border: `1px solid ${BORDER}` }}>
                <span style={{ fontSize: 14 }}>{s.icon}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', flex: 1 }}>{s.feature}</span>
                <span style={{ fontSize: 14, color: GREEN }}>✓</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={reset} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 22px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <RotateCcw style={{ width: 13, height: 13 }} /> Replay Journey
            </button>
            <Link to="/demo" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 22px', borderRadius: 12, background: `linear-gradient(135deg, ${GOLD}, #E8C85C)`, border: 'none', color: DARK, fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>
              Explore all demos
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
