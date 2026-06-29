import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';

const GOLD  = '#D4AF37';
const DARK  = '#060B16';
const CARD  = '#0C1A1D';
const BORDER = '#2A3F4A';

const PROCEDURE_MESSAGES = {
  dental: "The team is setting up your treatment room. Dr. Martinez has performed this procedure 1,247 times. You are in expert hands. You are almost there.",
  aesthetic: "Your transformation begins today. The team has everything prepared. You deserve this moment.",
  joint: "The surgical team is fully prepared. Your safety is their only priority. You are not alone.",
};

const STAGES = [
  { delay: 0,    text: "James — you are safe.", pause: 2200 },
  { delay: 2200, text: "The team is preparing for you. Everything is ready.", pause: 2800 },
  { delay: 5000, text: "Take a slow breath.", pause: 2000 },
  { delay: 7000, text: "You have come a very long way.", pause: 2400 },
  { delay: 9400, text: "You are almost there.", pause: 2000 },
  { delay: 11400, text: PROCEDURE_MESSAGES.dental, pause: 4500 },
  { delay: 15900, text: "Maria is right outside. I am right here. You are not alone.", pause: 3800 },
];

function speak(text, onEnd, muted) {
  if (muted || !window.speechSynthesis) { setTimeout(onEnd || (() => {}), 300); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.82; u.pitch = 1.05; u.volume = 0.9;
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find(v => v.lang === 'en-GB') || voices.find(v => v.lang.startsWith('en')) || voices[0];
  if (v) u.voice = v;
  if (onEnd) { u.onend = onEnd; u.onerror = onEnd; }
  window.speechSynthesis.speak(u);
}

export default function WaitingRoomDemo() {
  const [running,  setRunning]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [muted,    setMuted]    = useState(false);
  const [shown,    setShown]    = useState([]);   // which lines have appeared
  const [current,  setCurrent]  = useState(-1);   // which line M is speaking
  const [dots,     setDots]     = useState('');
  const timers     = useRef([]);
  const mutableRef = useRef(false);
  mutableRef.current = muted;

  // Animated dots while M is about to speak
  useEffect(() => {
    if (!running || done) return;
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(t);
  }, [running, done]);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const start = () => {
    clearTimers();
    window.speechSynthesis?.cancel();
    setShown([]);
    setCurrent(-1);
    setDone(false);
    setRunning(true);

    STAGES.forEach((stage, i) => {
      const t = setTimeout(() => {
        setShown(s => [...s, i]);
        setCurrent(i);
        speak(stage.text, () => {
          setCurrent(-1);
          if (i === STAGES.length - 1) {
            setDone(true);
            setRunning(false);
          }
        }, mutableRef.current);
      }, stage.delay);
      timers.current.push(t);
    });
  };

  const reset = () => {
    clearTimers();
    window.speechSynthesis?.cancel();
    setShown([]);
    setCurrent(-1);
    setRunning(false);
    setDone(false);
  };

  useEffect(() => () => { clearTimers(); window.speechSynthesis?.cancel(); }, []);

  return (
    <div style={{ minHeight: '100vh', background: DARK, fontFamily: '"SF Pro Display", system-ui, sans-serif' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes breathe { 0%,100%{transform:scale(1);opacity:0.6} 50%{transform:scale(1.08);opacity:1} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      {/* Header */}
      <div style={{ padding: '14px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/demo" style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none', color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
          <ArrowLeft style={{ width: 15, height: 15 }} /> All demos
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/morales-m-mark.png" alt="M" style={{ width: 24, filter: `drop-shadow(0 0 6px ${GOLD})` }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>Waiting Room Voice</span>
          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: `${GOLD}20`, color: GOLD, fontWeight: 800 }}>CR 23</span>
        </div>
        <button
          onClick={() => { setMuted(m => !m); window.speechSynthesis?.cancel(); }}
          style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '5px 10px', color: muted ? 'rgba(255,255,255,0.3)' : GOLD, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          {muted ? <VolumeX style={{ width: 12, height: 12 }} /> : <Volume2 style={{ width: 12, height: 12 }} />}
          {muted ? 'Unmute' : 'Mute M'}
        </button>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '40px 24px' }}>

        {/* Scenario */}
        <div style={{ padding: '18px 22px', borderRadius: 16, background: `${GOLD}08`, border: `1px solid ${GOLD}25`, marginBottom: 28, textAlign: 'center' }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 800, color: GOLD, letterSpacing: '0.1em' }}>THE MOMENT NOBODY THOUGHT ABOUT — CR 23</p>
          <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>
            James is sitting alone in a foreign clinic waiting room.<br />
            Blind. Nervous. Nobody next to him.<br />
            <strong style={{ color: '#fff' }}>M speaks — without being asked.</strong>
          </p>
        </div>

        {/* Waiting room visual */}
        <div style={{
          borderRadius: 20, overflow: 'hidden', marginBottom: 28,
          background: '#080D14', border: `1px solid ${BORDER}`,
        }}>
          {/* Clinic scene header */}
          <div style={{ padding: '16px 20px', background: '#0A1020', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: running && !done ? '#22c55e' : BORDER, animation: running && !done ? 'pulse 1.5s ease infinite' : 'none' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>TIJUANA DENTAL CLINIC — WAITING ROOM</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>10:00 AM</span>
          </div>

          {/* Room visual */}
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
            {/* James figure */}
            <div style={{ fontSize: 52, marginBottom: 12, animation: running ? 'breathe 4s ease infinite' : 'none' }}>🧑🏾</div>
            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#fff' }}>James</p>
            <p style={{ margin: '0 0 24px', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Waiting alone · 10 minutes · No movement</p>

            {/* M voice lines */}
            <div style={{ minHeight: 140, display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
              {shown.map((i) => (
                <div key={i} style={{ display: 'flex', gap: 10, animation: 'fadeUp 0.4s ease' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: `${GOLD}18`, border: `1.5px solid ${current === i ? GOLD : GOLD + '40'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800, color: GOLD,
                    animation: current === i ? 'pulse 1s ease infinite' : 'none',
                  }}>M</div>
                  <div style={{
                    flex: 1, padding: '10px 14px', borderRadius: '4px 14px 14px 14px',
                    background: current === i ? `${GOLD}12` : CARD,
                    border: `1px solid ${current === i ? GOLD + '40' : BORDER}`,
                    transition: 'all 0.3s',
                  }}>
                    <p style={{ margin: 0, fontSize: 14, color: '#fff', lineHeight: 1.65 }}>
                      {STAGES[i].text}
                    </p>
                  </div>
                </div>
              ))}

              {/* Typing dots */}
              {running && !done && shown.length < STAGES.length && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${GOLD}18`, border: `1px solid ${GOLD}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: GOLD }}>M</div>
                  <div style={{ padding: '10px 14px', borderRadius: '4px 14px 14px 14px', background: CARD, border: `1px solid ${BORDER}` }}>
                    <span style={{ fontSize: 14, color: GOLD, letterSpacing: '0.2em' }}>{dots || '.'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CTA */}
        {!running && !done && (
          <button onClick={start} style={{
            width: '100%', padding: '14px 0', borderRadius: 14, cursor: 'pointer', marginBottom: 16,
            background: `linear-gradient(135deg, ${GOLD}, #E8C85C)`,
            border: 'none', color: DARK, fontSize: 14, fontWeight: 800,
            boxShadow: `0 8px 24px rgba(212,175,55,0.35)`,
          }}>
            Hear M speak to James
          </button>
        )}

        {done && (
          <div style={{ padding: '20px 24px', borderRadius: 16, background: `${GOLD}08`, border: `1px solid ${GOLD}25`, textAlign: 'center', marginBottom: 16 }}>
            <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 800, color: '#fff' }}>James is ready.</p>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
              M spoke without being asked. James didn't tap. Didn't call.<br />
              <strong style={{ color: GOLD }}>M knew he needed to hear a voice. So M spoke.</strong>
            </p>
            <button onClick={reset} style={{ padding: '10px 22px', borderRadius: 12, cursor: 'pointer', background: CARD, border: `1px solid ${BORDER}`, color: '#fff', fontSize: 13, fontWeight: 600 }}>
              Replay
            </button>
          </div>
        )}

        {/* The principle */}
        <div style={{ padding: '16px 20px', borderRadius: 14, background: CARD, border: `1px solid ${BORDER}`, textAlign: 'center' }}>
          <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 800, color: GOLD, letterSpacing: '0.08em' }}>HOW M KNOWS WHEN TO SPEAK</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['GPS confirms clinic location', 'Appointment within 30 minutes', 'No movement for 10+ minutes'].map(t => (
              <span key={t} style={{ fontSize: 10, padding: '4px 10px', borderRadius: 20, background: `${GOLD}10`, border: `1px solid ${GOLD}25`, color: 'rgba(255,255,255,0.6)' }}>{t}</span>
            ))}
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
            Nobody thinks about the anxiety of a foreign waiting room.<br />
            <strong style={{ color: GOLD }}>M does. M always does.</strong>
          </p>
        </div>

      </div>
    </div>
  );
}
