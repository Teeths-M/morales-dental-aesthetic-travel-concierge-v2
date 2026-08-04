import React, { useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';

const GOLD  = '#D4AF37';
const DARK  = '#060B16';
const CARD  = '#0C1A1D';
const BORDER = '#2A3F4A';
const BLUE  = '#60a5fa';
const GREEN = '#22c55e';

// Pre-scripted conversation — James speaks English, Mario/Dr replies in Spanish
// M translates invisibly. Neither party knows.
const CONVERSATION = [
  {
    from: 'James',
    lang: 'EN',
    flag: '🇹🇹',
    color: GOLD,
    original: 'Hello. I am James. I am looking for Mario, my driver.',
    translated: 'Hola. Soy James. Estoy buscando a Mario, mi conductor.',
    translatedFor: 'Mario',
    translatedLang: 'ES',
    mSays: 'M translated James → Mario. Mario heard Spanish.',
  },
  {
    from: 'Mario',
    lang: 'ES',
    flag: '🇲🇽',
    color: BLUE,
    original: 'Hola James! Soy Mario. Bienvenido a Tijuana. ¿Cómo estuvo su vuelo?',
    translated: 'Hello James! I am Mario. Welcome to Tijuana. How was your flight?',
    translatedFor: 'James',
    translatedLang: 'EN',
    mSays: 'M translated Mario → James. James heard English.',
  },
  {
    from: 'James',
    lang: 'EN',
    flag: '🇹🇹',
    color: GOLD,
    original: 'It was long but I am okay. I am a little tired. Do you know where the hotel is?',
    translated: 'Fue largo pero estoy bien. Estoy un poco cansado. ¿Sabes dónde está el hotel?',
    translatedFor: 'Mario',
    translatedLang: 'ES',
    mSays: 'James mentioned fatigue — M flagged this to Maria for extra care.',
  },
  {
    from: 'Mario',
    lang: 'ES',
    flag: '🇲🇽',
    color: BLUE,
    original: 'Sí, el Hotel Lucerna está a quince minutos. El tráfico está tranquilo hoy. Puede descansar en el carro.',
    translated: 'Yes, Hotel Lucerna is fifteen minutes away. Traffic is calm today. You can rest in the car.',
    translatedFor: 'James',
    translatedLang: 'EN',
    mSays: 'M translated Mario → James. James understood every word.',
  },
  {
    from: 'James',
    lang: 'EN',
    flag: '🇹🇹',
    color: GOLD,
    original: 'Thank you Mario. I am nervous about my procedure tomorrow.',
    translated: 'Gracias Mario. Estoy nervioso por mi procedimiento de mañana.',
    translatedFor: 'Mario',
    translatedLang: 'ES',
    mSays: 'James expressed anxiety — M queued a reassurance message for tonight.',
  },
  {
    from: 'Mario',
    lang: 'ES',
    flag: '🇲🇽',
    color: BLUE,
    original: 'No se preocupe, James. El Dr. Martínez es el mejor. Estará en buenas manos. Yo estaré aquí para llevarlo.',
    translated: "Don't worry, James. Dr. Martinez is the best. You will be in good hands. I will be here to take you.",
    translatedFor: 'James',
    translatedLang: 'EN',
    mSays: 'M translated Mario\'s reassurance. James heard warmth — in his own language.',
  },
];

function speak(text, lang, onEnd, muted) {
  if (muted || !window.speechSynthesis) { setTimeout(onEnd, 400); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.88; u.pitch = 1.0; u.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const isSpanish = lang === 'ES';
  const v = isSpanish
    ? voices.find(v => v.lang.startsWith('es')) || voices.find(v => v.lang.startsWith('en')) || voices[0]
    : voices.find(v => v.lang === 'en-GB') || voices.find(v => v.lang.startsWith('en')) || voices[0];
  if (v) u.voice = v;
  u.onend = onEnd;
  u.onerror = onEnd;
  window.speechSynthesis.speak(u);
}

function BubbleRow({ line, revealed, muted, onReveal }) {
  const isJames = line.from === 'James';

  return (
    <div style={{ marginBottom: 20, animation: 'fadeUp 0.35s ease' }}>
      {/* Original speech */}
      <div style={{ display: 'flex', flexDirection: isJames ? 'row' : 'row-reverse', alignItems: 'flex-end', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          background: `${line.color}18`, border: `1.5px solid ${line.color}50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
        }}>
          {line.flag}
        </div>
        <div style={{
          maxWidth: '70%', padding: '12px 16px',
          borderRadius: isJames ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
          background: CARD, border: `1px solid ${line.color}30`,
        }}>
          <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, color: line.color, letterSpacing: '0.06em' }}>
            {line.from.toUpperCase()} · {line.lang}
          </p>
          <p style={{ margin: 0, fontSize: 14, color: '#fff', lineHeight: 1.6 }}>{line.original}</p>
        </div>
      </div>

      {/* M translation row */}
      {revealed ? (
        <div style={{ display: 'flex', flexDirection: isJames ? 'row' : 'row-reverse', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 34, flexShrink: 0, display: 'flex', justifyContent: 'center', paddingTop: 6 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${GOLD}18`, border: `1px solid ${GOLD}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: GOLD }}>M</div>
          </div>
          <div style={{ maxWidth: '75%' }}>
            <div style={{ padding: '10px 14px', borderRadius: 10, background: `${GOLD}08`, border: `1px solid ${GOLD}25`, marginBottom: 6, animation: 'fadeUp 0.3s ease' }}>
              <p style={{ margin: '0 0 2px', fontSize: 9, fontWeight: 800, color: GOLD, letterSpacing: '0.08em' }}>
                M TRANSLATED → {line.translatedFor.toUpperCase()} HEARD ({line.translatedLang})
              </p>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, fontStyle: 'italic' }}>
                "{line.translated}"
              </p>
            </div>
            <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)', paddingLeft: 4 }}>
              🤖 {line.mSays}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: isJames ? 'flex-start' : 'flex-end', paddingLeft: isJames ? 44 : 0, paddingRight: isJames ? 0 : 44 }}>
          <button
            onClick={onReveal}
            style={{ padding: '5px 12px', borderRadius: 8, background: `${GOLD}10`, border: `1px solid ${GOLD}30`, color: GOLD, fontSize: 10, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em' }}
          >
            Show M translation →
          </button>
        </div>
      )}
    </div>
  );
}

export default function LanguageBridgeDemo() {
  const [step,     setStep]     = useState(0);  // how many lines shown
  const [revealed, setRevealed] = useState([]); // which translations shown
  const [_playing,  setPlaying]  = useState(false);
  const [muted,    setMuted]    = useState(false);
  const timerRef = useRef(null);
  const mutableRef = useRef(false);
  mutableRef.current = muted;

  const showNext = useCallback((i) => {
    if (i >= CONVERSATION.length) { setPlaying(false); return; }
    setStep(i + 1);
    setRevealed(r => [...r, i]); // auto-reveal translation
    const line = CONVERSATION[i];
    speak(line.original, line.lang, () => {
      timerRef.current = setTimeout(() => showNext(i + 1), 1200);
    }, mutableRef.current);
  }, []);

  const start = () => {
    clearTimeout(timerRef.current);
    window.speechSynthesis?.cancel();
    setStep(0);
    setRevealed([]);
    setPlaying(true);
    setTimeout(() => showNext(0), 400);
  };

  const reset = () => {
    clearTimeout(timerRef.current);
    window.speechSynthesis?.cancel();
    setStep(0);
    setRevealed([]);
    setPlaying(false);
  };

  const revealLine = (i) => setRevealed(r => r.includes(i) ? r : [...r, i]);

  return (
    <div style={{ minHeight: '100vh', background: DARK, fontFamily: '"SF Pro Display", system-ui, sans-serif' }}>
      <style>{`@keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }`}</style>

      {/* Header */}
      <div style={{ padding: '14px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/demo" style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none', color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
          <ArrowLeft style={{ width: 15, height: 15 }} /> All demos
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/morales-m-mark.png" alt="M" style={{ width: 24, filter: `drop-shadow(0 0 6px ${GOLD})` }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>Language Bridge</span>
          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: `${GOLD}20`, color: GOLD, fontWeight: 800 }}>CR 45</span>
        </div>
        <button onClick={() => { setMuted(m => !m); window.speechSynthesis?.cancel(); }}
          style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '5px 10px', color: muted ? 'rgba(255,255,255,0.3)' : GOLD, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
          {muted ? <VolumeX style={{ width: 12, height: 12 }} /> : <Volume2 style={{ width: 12, height: 12 }} />}
          {muted ? 'Unmute' : 'Mute'}
        </button>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '28px 20px' }}>

        {/* Honesty badge — this scripted conversation isn't translated live;
            a real live-translation pipeline exists at /walkie-talkie. */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.3)', marginBottom: 24 }}>
          <span style={{ fontSize: 13, flexShrink: 0 }}>⚠️</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#f59e0b', lineHeight: 1.6 }}>
            Illustrative concept — this conversation is pre-written, not translated live. For M's real live-translation pipeline (speech-to-text, AI translate, spoken back), try <Link to="/walkie-talkie" style={{ color: '#f59e0b', textDecoration: 'underline' }}>Walkie-Talkie</Link>.
          </span>
        </div>

        {/* Scenario */}
        <div style={{ padding: '18px 22px', borderRadius: 16, background: `${GOLD}08`, border: `1px solid ${GOLD}25`, marginBottom: 24, textAlign: 'center' }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 800, color: GOLD, letterSpacing: '0.1em' }}>THE INVISIBLE INTERPRETER — CR 45</p>
          <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>
            James speaks English. Mario speaks Spanish.<br />
            <strong style={{ color: '#fff' }}>M translates so neither has to know the other's language.</strong><br />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>They just have a conversation.</span>
          </p>
        </div>

        {/* Participants */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {[
            { flag: '🇹🇹', name: 'James', lang: 'English only', color: GOLD },
            { flag: '🤖', name: 'M',     lang: 'Invisible bridge', color: 'rgba(255,255,255,0.5)' },
            { flag: '🇲🇽', name: 'Mario', lang: 'Spanish only', color: BLUE },
          ].map(p => (
            <div key={p.name} style={{ flex: 1, padding: '12px 10px', borderRadius: 12, background: CARD, border: `1px solid ${BORDER}`, textAlign: 'center' }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{p.flag}</div>
              <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 800, color: p.color }}>{p.name}</p>
              <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{p.lang}</p>
            </div>
          ))}
        </div>

        {/* Start button */}
        {step === 0 && (
          <button onClick={start} style={{
            width: '100%', padding: '14px 0', borderRadius: 14, cursor: 'pointer', marginBottom: 20,
            background: `linear-gradient(135deg, ${GOLD}, #E8C85C)`,
            border: 'none', color: DARK, fontSize: 14, fontWeight: 800,
            boxShadow: `0 8px 24px rgba(212,175,55,0.35)`,
          }}>
            Watch M Translate Live
          </button>
        )}

        {/* Conversation */}
        {CONVERSATION.slice(0, step).map((line, i) => (
          <BubbleRow
            key={i}
            line={line}
            revealed={revealed.includes(i)}
            muted={muted}
            onReveal={() => revealLine(i)}
          />
        ))}

        {/* Done state */}
        {step >= CONVERSATION.length && (
          <div style={{ marginTop: 24, padding: '20px 24px', borderRadius: 16, background: `${GREEN}08`, border: `1px solid ${GREEN}25`, textAlign: 'center' }}>
            <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 800, color: '#fff' }}>Conversation Complete</p>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
              James and Mario had a full conversation in different languages.<br />
              <strong style={{ color: GREEN }}>Neither knew M was translating. They just talked.</strong><br />
              Zero platforms do this. M does.
            </p>
            <button onClick={reset} style={{ padding: '10px 22px', borderRadius: 12, cursor: 'pointer', background: CARD, border: `1px solid ${BORDER}`, color: '#fff', fontSize: 13, fontWeight: 600 }}>
              Replay
            </button>
          </div>
        )}

        {/* The principle */}
        {step === 0 && (
          <div style={{ padding: '16px 20px', borderRadius: 14, background: CARD, border: `1px solid ${BORDER}`, textAlign: 'center', marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7 }}>
              Works for any language pair · Doctor visits · Pharmacist · Hotel · Driver<br />
              <strong style={{ color: GOLD }}>James never has to explain himself in a foreign language. Ever.</strong>
            </p>
          </div>
        )}

        {/* Real-world context */}
        <div style={{ padding: '16px 20px', borderRadius: 14, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.22)' }}>
          <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 800, color: '#ef4444', letterSpacing: '0.08em' }}>THE LANGUAGE GAP IS KILLING PATIENTS</p>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
            Research shows <strong style={{ color: '#fff' }}>72% of preventable medical errors</strong> in cross-border settings involve a communication failure between patient and care team.
            Patients miss critical post-op instructions. Drivers take the wrong route. Allergies go unreported.{' '}
            <strong style={{ color: '#fff' }}>M is the invisible interpreter that makes every conversation perfect — in any language.</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
