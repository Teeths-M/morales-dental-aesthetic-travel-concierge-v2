import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Volume2, VolumeX, Phone, MapPin, Hotel, UserCheck, Stethoscope, Shield, X } from 'lucide-react';
import { useTapProtocol } from '@/hooks/useTapProtocol';

const GOLD   = '#D4AF37';
const DARK   = '#060B16';
const CARD   = '#0C1A1D';
const BORDER = '#2A3F4A';
const RED    = '#ef4444';
const GREEN  = '#22c55e';

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.9; u.pitch = 1.05;
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find(v => v.lang === 'en-GB') || voices.find(v => v.lang.startsWith('en')) || voices[0];
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

// The cascade fires when 3 taps detected — all parties simultaneously
const CASCADE = [
  { icon: Shield,      color: RED,      label: 'Security dispatched',    detail: 'Private security firm alerted. GPS locked and transmitting every 5 seconds.' },
  { icon: UserCheck,   color: '#f472b6', label: 'Guardian notified',     detail: 'Sandra + Marcus received alert: "James needs help. Location shared."' },
  { icon: Stethoscope, color: GREEN,    label: 'Doctor briefed',         detail: 'Dr. Martinez notified. Emergency medical brief transmitted.' },
  { icon: Hotel,       color: '#60a5fa', label: 'Hotel M Hub alerted',   detail: 'Hotel Lucerna front desk: "Guest in Room 412 may need assistance."' },
  { icon: MapPin,      color: GOLD,     label: 'GPS beacon active',      detail: 'Coordinates transmitted. Accuracy: 8 metres. Updating every 5 seconds.' },
  { icon: Phone,       color: '#a78bfa', label: 'Concierge on standby',  detail: '24/7 coordinator reviewing alert. Ready to call emergency services.' },
];

function CheckModal({ onClose, muted }) {
  const options = [
    { emoji: '🩺', label: 'I need medical help' },
    { emoji: '🚗', label: 'I need my driver' },
    { emoji: '🍽️', label: 'I need food or water' },
    { emoji: '💬', label: 'I need to talk to someone' },
    { emoji: '✅', label: 'I am okay — false alarm' },
  ];

  const handleSelect = (opt) => {
    if (!muted) speak(`Understood. ${opt.label}. M is arranging this for you now. Stay with me James.`);
    onClose();
  };

  if (!muted) speak('James — I felt two taps. What do you need? I am listening.');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,11,22,0.96)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${GOLD}20`, border: `2px solid ${GOLD}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: GOLD }}>M</div>
          <div>
            <p style={{ margin: 0, fontSize: 10, color: GOLD, fontWeight: 700, letterSpacing: '0.08em' }}>M — MORALES CONCIERGE</p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff' }}>What do you need, James?</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {options.map(opt => (
            <button
              key={opt.label}
              onClick={() => handleSelect(opt)}
              style={{
                width: '100%', padding: '16px 20px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                background: CARD, border: `1px solid ${BORDER}`,
                color: '#fff', fontSize: 15, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 14,
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = GOLD + '60'}
              onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}
            >
              <span style={{ fontSize: 22 }}>{opt.emoji}</span>
              {opt.label}
            </button>
          ))}
        </div>

        <button onClick={onClose} style={{ marginTop: 16, width: '100%', padding: '12px 0', borderRadius: 12, background: 'none', border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 13 }}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

function EmergencyModal({ onClose, muted }) {
  const [fired, setFired] = useState([]);

  // Fire each cascade item with a short stagger
  React.useEffect(() => {
    if (!muted) speak('Emergency mode activated. James — stay where you are. Help is coming. Security, your guardian, your doctor, and your hotel have all been notified. You are not alone.');
    CASCADE.forEach((_, i) => {
      setTimeout(() => setFired(f => [...f, i]), i * 350 + 200);
    });
  }, [muted]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,0,0,0.97)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(239,68,68,0.2)', border: `2px solid ${RED}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', animation: 'pulse 1s ease infinite' }}>
            <Shield style={{ width: 24, height: 24, color: RED }} />
          </div>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 800, color: RED, letterSpacing: '0.1em' }}>EMERGENCY — 3 TAPS DETECTED</p>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>Stay where you are, James.</p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Help is already on the way. M is handling everything.</p>
        </div>

        {/* Cascade */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {CASCADE.map((item, i) => {
            const active = fired.includes(i);
            return (
              <div key={i} style={{
                padding: '12px 16px', borderRadius: 12,
                background: active ? `${item.color}12` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? item.color + '40' : 'rgba(255,255,255,0.06)'}`,
                transition: 'all 0.35s ease',
                opacity: active ? 1 : 0.3,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <item.icon style={{ width: 16, height: 16, color: active ? item.color : 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: active ? '#fff' : 'rgba(255,255,255,0.3)' }}>{item.label}</p>
                    {active && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{item.detail}</p>}
                  </div>
                  {active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0, animation: 'pulse 1s ease infinite' }} />}
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={onClose} style={{ marginTop: 20, width: '100%', padding: '12px 0', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.1)`, color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <X style={{ width: 13, height: 13 }} /> Cancel emergency (owner only)
        </button>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

export default function TapProtocolDemo() {
  const [mode,  setMode]  = useState(null); // null | 'check' | 'emergency'
  const [muted, setMuted] = useState(false);
  const [flash, setFlash] = useState(0);

  const triggerFlash = () => setFlash(f => f + 1);

  const handleDouble = useCallback(() => { triggerFlash(); setMode('check'); },    []);
  const handleTriple = useCallback(() => { triggerFlash(); setMode('emergency'); }, []);

  const { tapCount, registerTap } = useTapProtocol({
    onDoubleTab: handleDouble,
    onTripleTap: handleTriple,
  });

  return (
    <div
      style={{ minHeight: '100vh', background: DARK, fontFamily: '"SF Pro Display", system-ui, sans-serif', userSelect: 'none' }}
      onTouchEnd={registerTap}
    >
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} } @keyframes tapFlash { 0%{background:rgba(212,175,55,0.15)} 100%{background:transparent} }`}</style>

      {/* Modals */}
      {mode === 'check'     && <CheckModal     onClose={() => setMode(null)} muted={muted} />}
      {mode === 'emergency' && <EmergencyModal onClose={() => setMode(null)} muted={muted} />}

      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/demo" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
          <ArrowLeft style={{ width: 16, height: 16 }} /> Back to demos
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/morales-m-mark.png" alt="M" style={{ width: 26, filter: `drop-shadow(0 0 6px ${GOLD})` }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Tap Protocol</span>
          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: `${GOLD}20`, color: GOLD, fontWeight: 800 }}>CR STANDARD</span>
        </div>
        <button
          onClick={() => { setMuted(m => !m); window.speechSynthesis?.cancel(); }}
          style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '6px 12px', color: muted ? 'rgba(255,255,255,0.3)' : GOLD, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
        >
          {muted ? <VolumeX style={{ width: 13, height: 13 }} /> : <Volume2 style={{ width: 13, height: 13 }} />}
          {muted ? 'Unmute' : 'Mute M'}
        </button>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 20px' }}>

        {/* The promise */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, color: GOLD, letterSpacing: '0.1em' }}>FOR JAMES. FOR EVERYONE.</p>
          <h1 style={{ margin: '0 0 12px', fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            No voice. No sight.<br />Just two taps or three.
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
            Works with eyes closed · Works with gloves · Works in darkness · Works in silence
          </p>
        </div>

        {/* Tap cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>

          {/* 2-tap */}
          <div style={{ padding: '22px 24px', borderRadius: 18, background: CARD, border: `1px solid ${GOLD}30` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1,2].map(n => <div key={n} style={{ width: 18, height: 18, borderRadius: '50%', background: GOLD, opacity: tapCount >= n ? 1 : 0.25, transition: 'opacity 0.15s' }} />)}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: GOLD }}>2 Taps</p>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>M checks in — "What do you need?"</p>
              </div>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.65 }}>
              James taps twice anywhere on the screen. M hears it. No alarm. No panic. Just M asking quietly what James needs — and acting on it instantly.
            </p>
            <button
              onClick={() => setMode('check')}
              style={{ padding: '11px 22px', borderRadius: 12, cursor: 'pointer', background: `${GOLD}15`, border: `1px solid ${GOLD}40`, color: GOLD, fontSize: 13, fontWeight: 700 }}
            >
              Simulate 2 taps
            </button>
          </div>

          {/* 3-tap */}
          <div style={{ padding: '22px 24px', borderRadius: 18, background: 'rgba(239,68,68,0.06)', border: `1px solid rgba(239,68,68,0.3)` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1,2,3].map(n => <div key={n} style={{ width: 18, height: 18, borderRadius: '50%', background: RED, opacity: tapCount >= n ? 1 : 0.25, transition: 'opacity 0.15s' }} />)}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: RED }}>3 Taps</p>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Emergency — no questions asked</p>
              </div>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.65 }}>
              James taps three times. M fires the full cascade instantly — security dispatched, guardian notified, doctor briefed, hotel alerted, GPS locked. All 6 systems in under 2 seconds.
            </p>
            <button
              onClick={() => setMode('emergency')}
              style={{ padding: '11px 22px', borderRadius: 12, cursor: 'pointer', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.5)', color: RED, fontSize: 13, fontWeight: 700 }}
            >
              Simulate 3 taps — full cascade
            </button>
          </div>
        </div>

        {/* Tap anywhere zone */}
        <div
          onClick={registerTap}
          style={{
            padding: '28px 24px', borderRadius: 18, border: `2px dashed ${BORDER}`,
            textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s',
            background: tapCount > 0 ? `${GOLD}05` : 'transparent',
            borderColor: tapCount > 0 ? GOLD + '60' : BORDER,
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = GOLD + '40'}
          onMouseLeave={e => e.currentTarget.style.borderColor = tapCount > 0 ? GOLD + '60' : BORDER}
        >
          <p style={{ margin: '0 0 8px', fontSize: 28 }}>👆</p>
          <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>Tap here 2× or 3×</p>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Works on mobile · Tap rapidly within 1 second</p>
          {tapCount > 0 && (
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 8 }}>
              {[1,2,3].map(n => (
                <div key={n} style={{ width: 14, height: 14, borderRadius: '50%', background: tapCount >= n ? (n === 3 ? RED : GOLD) : BORDER, transition: 'background 0.15s' }} />
              ))}
            </div>
          )}
        </div>

        {/* CR principle */}
        <div style={{ marginTop: 24, padding: '16px 20px', borderRadius: 14, background: CARD, border: `1px solid ${BORDER}`, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7 }}>
            Grandmother test ✅ · Child test ✅ · James test ✅<br />
            <strong style={{ color: GOLD }}>If it works for James — it works for everyone. That's the CR Standard.</strong>
          </p>
        </div>

      </div>
    </div>
  );
}
