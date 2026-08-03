import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Mic, MicOff, Volume2, ArrowLeft, RotateCcw, Mail, Printer } from 'lucide-react';

const GOLD  = '#D4AF37';
const DARK  = '#060B16';
const CARD  = '#0C1A1D';
const BORDER = '#2A3F4A';

// Full James journey — M speaks, James responds
const SCRIPT = [
  {
    speaker: 'M',
    text: "Hello James. I'm M — your Morales concierge. I'll be with you every step of your journey. Where are you traveling to?",
    pause: 3200,
  },
  {
    speaker: 'James',
    text: "I'm going to Tijuana, Mexico for my dental implants.",
    pause: 2400,
  },
  {
    speaker: 'M',
    text: "Perfect. Dr. Martinez in Tijuana is verified — 1,247 procedures, 98.2% satisfaction. Your procedure is 5 days. I'll coordinate everything. What date works for you?",
    pause: 3000,
  },
  {
    speaker: 'James',
    text: "July 22nd.",
    pause: 1800,
  },
  {
    speaker: 'M',
    text: "July 22nd confirmed. Your package is two thousand five hundred USD. Would you like to pay in full, or half now and half before departure?",
    pause: 2800,
  },
  {
    speaker: 'James',
    text: "Half now. My friend Marcus will pay from his card.",
    pause: 2200,
  },
  {
    speaker: 'M',
    text: "I'm sending a secure payment link to Marcus now. It expires in 24 hours and shows only the payment — nothing else from your file. I'll call you when he confirms.",
    pause: 3200,
  },
  {
    speaker: 'M',
    text: "James — Marcus has paid your deposit. One thousand two hundred and fifty dollars confirmed. You are booked.",
    pause: 2800,
  },
  {
    speaker: 'James',
    text: "Thank you. Will someone be with me? I can't see very well.",
    pause: 2200,
  },
  {
    speaker: 'M',
    text: "Maria is your assigned companion. She has completed 89 companion assignments and specialises in post-operative dental care. She is patient, warm, and speaks English. She will hold your arm from the moment you land.",
    pause: 3800,
  },
  {
    speaker: 'M',
    text: "Mario is your driver. He will call your name when you arrive at arrivals. He will not honk or wave — he will walk to you and say your name clearly. He has done this 347 times.",
    pause: 3400,
  },
  {
    speaker: 'James',
    text: "That's exactly what I needed to hear.",
    pause: 2000,
  },
  {
    speaker: 'M',
    text: "James, before you fly — a few things about Tijuana. The people are warm. Greetings may include a gentle shoulder pat. Meals are social — no rush. The weather will be 32 degrees. I have asked Maria to bring a cool cloth for your recovery.",
    pause: 4000,
  },
  {
    speaker: 'M',
    text: "You are at the clinic now. Dr. Martinez is ready. Take a slow breath. You have come a very long way. You are in excellent hands. I am right here.",
    pause: 3600,
  },
  {
    speaker: 'James',
    text: "I'm nervous.",
    pause: 1800,
  },
  {
    speaker: 'M',
    text: "That is completely normal, James. Dr. Martinez knows you are nervous. He will explain every step before he does it. Nothing will happen without your say-so. I will check on you in one hour.",
    pause: 3600,
  },
  {
    speaker: 'M',
    text: "James — your procedure is complete. Dr. Martinez says you healed faster than 89 percent of patients his age. Your implants are in. Your smile is yours again.",
    pause: 3800,
  },
  {
    speaker: 'James',
    text: "I made it.",
    pause: 2000,
  },
  {
    speaker: 'M',
    text: "You made it. Welcome home, James. Your Golden M has been awarded. Fourteen days ago you arrived nervous and alone. Today you are safe, healed, and heading home. You did this.",
    pause: 4200,
    golden: true,
  },
  {
    speaker: 'M',
    text: "Maria has a surprise waiting downstairs. She wouldn't tell me what it is.",
    pause: 2000,
    end: true,
  },
];

// Real recorded narration (public/audio/james-voice-demo/{scriptIndex}.mp3)
// instead of the browser's built-in speech synthesis, which sounded
// different (often robotic/unfriendly) depending on the visitor's own
// device — the same fix already applied to the homepage's How It Works
// walkthrough. Only 'M' lines have a recording; James's lines are text-only.

export default function JamesVoiceDemo() {
  const [lines,      setLines]      = useState([]);
  const [playing,    setPlaying]    = useState(false);
  const [done,       setDone]       = useState(false);
  const [muted,      setMuted]      = useState(false);
  const [_golden,     setGolden]     = useState(false);
  const [step,       setStep]       = useState(0);
  const bottomRef    = useRef(null);
  const timerRef     = useRef(null);
  const mutedRef     = useRef(false);
  const audioRef     = useRef(null);

  mutedRef.current = muted;

  const runStep = useCallback((idx) => {
    if (idx >= SCRIPT.length) { setPlaying(false); setDone(true); return; }
    const line = SCRIPT[idx];
    setStep(idx);
    setLines(prev => [...prev, line]);
    if (line.golden) setGolden(true);

    const next = () => {
      timerRef.current = setTimeout(() => runStep(idx + 1), line.pause);
    };

    if (!mutedRef.current && audioRef.current && line.speaker === 'M') {
      audioRef.current.pause();
      audioRef.current.src = `/audio/james-voice-demo/${idx}.mp3`;
      audioRef.current.currentTime = 0;
      audioRef.current.onended = next;
      audioRef.current.play().catch(next);
    } else {
      timerRef.current = setTimeout(next, line.pause);
    }
  }, []);

  const start = () => {
    setLines([]);
    setStep(0);
    setDone(false);
    setGolden(false);
    setPlaying(true);
    audioRef.current?.pause();
    runStep(0);
  };

  const reset = () => {
    clearTimeout(timerRef.current);
    audioRef.current?.pause();
    setLines([]);
    setPlaying(false);
    setDone(false);
    setGolden(false);
    setStep(0);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  useEffect(() => () => { clearTimeout(timerRef.current); audioRef.current?.pause(); }, []);

  const progress = SCRIPT.length > 0 ? Math.round((step / (SCRIPT.length - 1)) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', background: DARK, fontFamily: '"SF Pro Display", system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <audio ref={audioRef} style={{ display: 'none' }} />

      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/demo" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
          <ArrowLeft style={{ width: 16, height: 16 }} /> Back to demos
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/morales-m-mark.png" alt="M" style={{ width: 28, filter: `drop-shadow(0 0 6px ${GOLD})` }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>The James Standard</span>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${GOLD}20`, color: GOLD, fontWeight: 700, letterSpacing: '0.06em' }}>VOICE DEMO</span>
        </div>
        <button
          onClick={() => { setMuted(m => !m); if (!muted) audioRef.current?.pause(); }}
          style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '6px 12px', color: muted ? 'rgba(255,255,255,0.35)' : GOLD, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
        >
          {muted ? <MicOff style={{ width: 14, height: 14 }} /> : <Volume2 style={{ width: 14, height: 14 }} />}
          {muted ? 'Unmute M' : 'Mute M'}
        </button>
      </div>

      {/* Intro (before start) */}
      {!playing && !done && lines.length === 0 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: `${GOLD}15`, border: `2px solid ${GOLD}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Mic style={{ width: 28, height: 28, color: GOLD }} />
          </div>
          <h1 style={{ margin: '0 0 12px', fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            Meet James
          </h1>
          <p style={{ margin: '0 0 8px', fontSize: 16, color: 'rgba(255,255,255,0.55)', maxWidth: 480, lineHeight: 1.7 }}>
            James is visually impaired. He is traveling alone from Trinidad to Tijuana for dental implants.
          </p>
          <p style={{ margin: '0 0 40px', fontSize: 14, color: 'rgba(255,255,255,0.35)', maxWidth: 440, lineHeight: 1.7 }}>
            M guides him from booking to Golden M — entirely by voice. No apps. No forms. No confusion.
          </p>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.04em' }}>
            TURN YOUR VOLUME UP · M WILL SPEAK
          </p>
          <button
            onClick={start}
            style={{
              padding: '16px 40px', borderRadius: 16, cursor: 'pointer',
              background: `linear-gradient(135deg, ${GOLD} 0%, #E8C85C 100%)`,
              border: 'none', color: DARK, fontSize: 16, fontWeight: 800, letterSpacing: '0.02em',
              boxShadow: `0 12px 32px rgba(212,175,55,0.4)`,
            }}
          >
            Begin James's Journey
          </button>
          <p style={{ margin: '16px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
            Real recorded narration · The same voice for every listener
          </p>
        </div>
      )}

      {/* Conversation */}
      {(playing || done || lines.length > 0) && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 720, width: '100%', margin: '0 auto', padding: '24px 20px', overflowY: 'auto' }}>

          {/* Progress bar */}
          {playing && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${GOLD}, #E8C85C)`, transition: 'width 0.6s ease', borderRadius: 2 }} />
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'right' }}>
                Step {step + 1} of {SCRIPT.length}
              </p>
            </div>
          )}

          {/* Chat bubbles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {lines.map((line, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: line.speaker === 'M' ? 'row' : 'row-reverse',
                  alignItems: 'flex-end',
                  gap: 10,
                  animation: 'fadeUp 0.35s ease',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: line.speaker === 'M' ? `${GOLD}20` : 'rgba(255,255,255,0.08)',
                  border: `1px solid ${line.speaker === 'M' ? GOLD + '50' : BORDER}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800, color: line.speaker === 'M' ? GOLD : 'rgba(255,255,255,0.5)',
                }}>
                  {line.speaker === 'M' ? 'M' : 'J'}
                </div>

                {/* Bubble */}
                <div style={{
                  maxWidth: '75%',
                  padding: '12px 16px',
                  borderRadius: line.speaker === 'M' ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                  background: line.speaker === 'M'
                    ? (line.golden ? `linear-gradient(135deg, ${GOLD}25, ${GOLD}10)` : CARD)
                    : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${line.speaker === 'M' ? (line.golden ? GOLD + '60' : BORDER) : 'rgba(255,255,255,0.08)'}`,
                }}>
                  <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: line.speaker === 'M' ? GOLD : 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>
                    {line.speaker === 'M' ? 'M — MORALES CONCIERGE' : 'JAMES'}
                  </p>
                  <p style={{ margin: 0, fontSize: 14, color: '#fff', lineHeight: 1.65 }}>
                    {line.text}
                  </p>
                  {line.golden && (
                    <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: `${GOLD}20`, border: `1px solid ${GOLD}40`, textAlign: 'center' }}>
                      <span style={{ fontSize: 20 }}>✨</span>
                      <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 800, color: GOLD, letterSpacing: '0.08em' }}>GOLDEN M AWARDED</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Typing indicator */}
          {playing && step < SCRIPT.length - 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${GOLD}20`, border: `1px solid ${GOLD}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: GOLD }}>M</div>
              <div style={{ display: 'flex', gap: 4, padding: '10px 14px', background: CARD, borderRadius: '4px 16px 16px 16px', border: `1px solid ${BORDER}` }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, opacity: 0.6, animation: `bounce 1s ease ${i * 0.18}s infinite` }} />
                ))}
              </div>
            </div>
          )}

          {/* End state */}
          {done && (
            <div style={{ marginTop: 32, borderRadius: 20, overflow: 'hidden', border: `1px solid ${GOLD}30` }}>
              {/* End card */}
              <div style={{ padding: 28, background: `${GOLD}10`, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>👑</div>
                <p style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#fff' }}>Journey Complete</p>
                <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
                  James traveled alone, blind, to a foreign country — and M was with him every step.<br />
                  That's The James Standard. If it works for James, it works for everyone.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={reset} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    <RotateCcw style={{ width: 14, height: 14 }} /> Replay
                  </button>
                  <Link to="/demo" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 12, background: `linear-gradient(135deg, ${GOLD}, #E8C85C)`, border: 'none', color: DARK, fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>
                    See full platform demo
                  </Link>
                </div>
              </div>

              {/* Emergency Medical Brief — file backup */}
              <div style={{ padding: '20px 28px', background: CARD, borderTop: `1px solid ${BORDER}` }}>
                <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 800, color: GOLD, letterSpacing: '0.1em' }}>EMERGENCY MEDICAL BRIEF — SYSTEM DOWN BACKUP</p>
                <p style={{ margin: '0 0 14px', fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                  M generates this brief for every patient. Save it to email or print it — a doctor in Mexico can use it even if the system is offline.
                </p>

                {/* Brief card */}
                <div style={{ padding: '16px 20px', borderRadius: 12, background: '#fff', color: '#111', fontSize: 12, lineHeight: 1.8, fontFamily: 'Arial, sans-serif' }} id="james-brief">
                  <div style={{ borderBottom: '2px solid #D4AF37', paddingBottom: 10, marginBottom: 14 }}>
                    <strong style={{ fontSize: 15, color: '#060B16' }}>MORALES CONCIERGE — PATIENT EMERGENCY BRIEF</strong><br />
                    <span style={{ color: '#888', fontSize: 11 }}>Generated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px' }}>
                    {[
                      ['PATIENT', 'James Emmanuel Williams'],
                      ['DOB', 'March 19, 1987'],
                      ['BLOOD TYPE', 'O+'],
                      ['PROCEDURE', 'Dental Implants (Day 4 post-op)'],
                      ['CONDITIONS', 'Asthma, Type 2 Diabetes'],
                      ['MEDICATIONS', 'Metformin 500mg, Ventolin inhaler'],
                      ['ALLERGIES', 'Shellfish (anaphylaxis), Penicillin'],
                      ['DOCTOR', 'Dr. Martinez — Tijuana Clinic'],
                      ['COMPANION', 'Maria — +52 664 000 0000'],
                      ['EMERGENCY CONTACT', 'Sandra — +1 868 000 0000'],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <span style={{ color: '#888', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }}>{label}</span><br />
                        <span style={{ fontWeight: 700, color: '#111' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid #eee', color: '#888', fontSize: 10 }}>
                    MORALES CONCIERGE 24/7 HOTLINE — concierge@morales-dental.com · This document is valid for this journey only.
                  </div>
                </div>

                {/* Save/print actions */}
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button
                    onClick={() => window.print()}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    <Printer style={{ width: 13, height: 13 }} /> Print Brief
                  </button>
                  <a
                    href={`mailto:?subject=James%20Williams%20—%20Emergency%20Medical%20Brief&body=MORALES%20CONCIERGE%20EMERGENCY%20BRIEF%0A%0APatient%3A%20James%20Emmanuel%20Williams%0ADOB%3A%20March%2019%2C%201987%0ABlood%20Type%3A%20O%2B%0AProcedure%3A%20Dental%20Implants%20(Day%204%20post-op)%0AConditions%3A%20Asthma%2C%20Type%202%20Diabetes%0AMedications%3A%20Metformin%20500mg%2C%20Ventolin%20inhaler%0AAllergies%3A%20Shellfish%20(anaphylaxis)%2C%20Penicillin%0ADoctor%3A%20Dr.%20Martinez%20—%20Tijuana%20Clinic%0ACompanion%3A%20Maria%20—%20%2B52%20664%20000%200000%0AEmergency%20Contact%3A%20Sandra%20—%20%2B1%20868%20000%200000%0A%0AMorales%20Concierge%2024%2F7%3A%20concierge%40morales-dental.com`}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 10, background: `${GOLD}15`, border: `1px solid ${GOLD}40`, color: GOLD, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
                  >
                    <Mail style={{ width: 13, height: 13 }} /> Email Brief
                  </a>
                </div>
                <p style={{ margin: '10px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
                  Works offline · No system access needed · Doctor in Mexico can read this without internet
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      `}</style>
    </div>
  );
}
