import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Thermometer, Droplets, Wind, AlertTriangle } from 'lucide-react';

const GOLD  = '#D4AF37';
const DARK  = '#060B16';
const CARD  = '#0C1A1D';
const BORDER = '#2A3F4A';
const RED   = '#ef4444';
const BLUE  = '#60a5fa';
const GREEN = '#22c55e';
const PURPLE = '#a78bfa';

const SCENARIOS = [
  {
    city: 'Tijuana, Mexico',
    flag: '🇲🇽',
    emoji: '☀️',
    condition: 'Extreme Heat',
    temp: '38°C / 100°F',
    humidity: '72%',
    wind: '8 km/h',
    risk: 'High — Heat affects post-op healing and increases swelling',
    riskColor: RED,
    procedure: 'Dental Implants',
    actions: [
      {
        to: 'James (Patient)',
        icon: '🧑🏾',
        color: GOLD,
        message: 'Tijuana will be 38°C during your recovery. Heat increases swelling after dental implants. Wear loose, light clothing. Stay in air-conditioned spaces. I have updated your care plan.',
        mDid: 'Added 6 hydration reminders daily · Light clothing added to packing list · Outdoor activities postponed to morning hours only',
      },
      {
        to: 'Maria (Companion)',
        icon: '👩🏽‍⚕️',
        color: PURPLE,
        lang: '🇲🇽 Español',
        message: 'James llega durante calor extremo. Por favor traiga: paño frío, agua extra, sobres de electrolitos y un ventilador portátil. Mantenga la exposición al exterior a menos de 10 minutos.',
        mDid: 'M tradujo al español · Maria informada sobre protocolo de calor · Lista de suministros enviada · Ruta exterior minimizada',
      },
      {
        to: 'Dr. Martinez (Clinic)',
        icon: '👨🏽‍⚕️',
        color: GREEN,
        lang: '🇲🇽 Español',
        message: 'Paciente llega durante ola de calor de 38°C. Por favor asegure que la sala de recuperación esté climatizada a 22°C. Compresa fría disponible post-procedimiento. Se recomienda monitoreo extendido.',
        mDid: 'M tradujo al español · Solicitud de ambiente clínico enviada · Temperatura de sala registrada · Monitoreo extendido marcado en el caso',
      },
      {
        to: 'Mario (Driver)',
        icon: '🚗',
        color: BLUE,
        lang: '🇲🇽 Español',
        message: 'Alerta de calor extremo para el día de recogida. Por favor asegure que el AC esté encendido antes de que el paciente entre al vehículo. Use estacionamiento cubierto. Minimice el tiempo bajo el sol directo.',
        mDid: 'M tradujo al español · Protocolo de calor enviado al conductor · Ruta de estacionamiento cubierto pre-cargada · Exposición estimada: menos de 2 minutos',
      },
    ],
  },
  {
    city: 'Istanbul, Turkey',
    flag: '🇹🇷',
    emoji: '🌧️',
    condition: 'Heavy Rain Season',
    temp: '14°C / 57°F',
    humidity: '88%',
    wind: '22 km/h',
    risk: 'Medium — Wet surfaces, flooding risk in lower districts',
    riskColor: '#fb923c',
    procedure: 'Joint Replacement',
    actions: [
      {
        to: 'James (Patient)',
        icon: '🧑🏾',
        color: GOLD,
        message: 'Istanbul will have heavy rain during your stay. After joint replacement, wet surfaces are a fall risk. I have added waterproof footwear to your packing list and slip hazard warnings to your daily brief.',
        mDid: 'Waterproof footwear added to packing · Slip hazard alerts scheduled · Outdoor mobility restricted for Day 1-3',
      },
      {
        to: 'Maria (Companion)',
        icon: '👩🏽‍⚕️',
        color: PURPLE,
        message: 'Heavy rain forecast throughout the stay. James had joint replacement — wet surfaces are dangerous. Please use only covered entrances. Carry a non-slip mat for hotel bathroom.',
        mDid: 'Maria briefed on rain protocol · Covered routes mapped · Hotel non-slip request sent',
      },
      {
        to: 'Dr. Yilmaz (Clinic)',
        icon: '👨🏽‍⚕️',
        color: GREEN,
        message: 'Patient traveling during heavy rain season. Joint replacement patient — please ensure clinic entrance is dry and covered. Physiotherapy schedule adjusted for indoor sessions only.',
        mDid: 'Indoor physio sessions locked · Covered clinic entrance confirmed · Wet weather discharge protocol applied',
      },
      {
        to: 'Ahmet (Driver)',
        icon: '🚗',
        color: BLUE,
        message: 'Heavy rain alert. Please use covered drop-off points only. Avoid flooded lower districts — M has updated your suggested route. Allow 20 extra minutes for all journeys.',
        mDid: 'Flood-safe routes pre-loaded · Covered drop-off locations mapped · Extra journey time added to schedule',
      },
    ],
  },
  {
    city: 'Bogotá, Colombia',
    flag: '🇨🇴',
    emoji: '🌫️',
    condition: 'High Altitude + Cold',
    temp: '8°C / 46°F',
    humidity: '65%',
    wind: '15 km/h',
    risk: 'High — Altitude (2,600m) affects healing, breathing, and medication response',
    riskColor: RED,
    procedure: 'Rhinoplasty',
    actions: [
      {
        to: 'James (Patient)',
        icon: '🧑🏾',
        color: GOLD,
        message: 'Bogotá is at 2,600 metres altitude. This affects breathing and can extend recovery after rhinoplasty. I have added an altitude adaptation day before your procedure and alerted Dr. Ramírez.',
        mDid: 'Altitude adaptation day added to schedule · Breathing exercises added to daily check-in · Extra recovery day budgeted',
      },
      {
        to: 'Maria (Companion)',
        icon: '👩🏽‍⚕️',
        color: PURPLE,
        lang: '🇨🇴 Español',
        message: 'James puede experimentar mal de altura al llegar — dolor de cabeza, fatiga, dificultad para respirar. Manténgalo hidratado, en reposo y en interiores durante las primeras 24 horas. Evite las escaleras cuando sea posible.',
        mDid: 'M tradujo al español · Protocolo de mal de altura enviado · Descanso programado para el Día 1 · Hotel solo con ascensor confirmado',
      },
      {
        to: 'Dr. Ramírez (Clinic)',
        icon: '👨🏽‍⚕️',
        color: GREEN,
        lang: '🇨🇴 Español',
        message: 'Paciente llega desde Trinidad (nivel del mar) a Bogotá (2,600m). La altitud puede afectar la respuesta a la anestesia y la respiración post-operatoria tras rinoplastia. Se recomienda verificación pre-procedimiento y monitoreo extendido.',
        mDid: 'M tradujo al español · Verificación de altitud añadida al procedimiento · Monitoreo extendido marcado · Nota enviada al equipo quirúrgico',
      },
      {
        to: 'Carlos (Driver)',
        icon: '🚗',
        color: BLUE,
        lang: '🇨🇴 Español',
        message: 'El paciente puede estar ajustándose a la altitud. Por favor conduzca suavemente — evite frenadas bruscas. Mantenga el vehículo caliente. Si el paciente parece mal, contacte a M Concierge de inmediato.',
        mDid: 'M tradujo al español · Protocolo de altitud enviado al conductor · Contacto de emergencia pre-cargado · Preferencia de conducción suave registrada',
      },
    ],
  },
];

function speak(text, muted) {
  if (muted || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.88; u.pitch = 1.05;
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find(v => v.lang === 'en-GB') || voices.find(v => v.lang.startsWith('en')) || voices[0];
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

export default function WeatherHealthDemo() {
  const [selected,  setSelected]  = useState(0);
  const [fired,     setFired]     = useState([]);
  const [running,   setRunning]   = useState(false);
  const [muted,     setMuted]     = useState(false);
  const timers = useRef([]);
  const mutableRef = useRef(false);
  mutableRef.current = muted;

  const scenario = SCENARIOS[selected];

  const runCascade = () => {
    timers.current.forEach(clearTimeout);
    setFired([]);
    setRunning(true);
    const summary = `James is traveling to ${scenario.city} during ${scenario.condition}. M has briefed all 4 parties simultaneously.`;
    speak(summary, mutableRef.current);
    scenario.actions.forEach((_, i) => {
      const t = setTimeout(() => {
        setFired(f => [...f, i]);
        if (i === scenario.actions.length - 1) setRunning(false);
      }, 600 + i * 900);
      timers.current.push(t);
    });
  };

  const reset = () => {
    timers.current.forEach(clearTimeout);
    window.speechSynthesis?.cancel();
    setFired([]);
    setRunning(false);
  };

  const switchScenario = (i) => {
    reset();
    setSelected(i);
  };

  return (
    <div style={{ minHeight: '100vh', background: DARK, fontFamily: '"SF Pro Display", system-ui, sans-serif' }}>
      <style>{`@keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} } @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      {/* Header */}
      <div style={{ padding: '14px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/demo" style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none', color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
          <ArrowLeft style={{ width: 15, height: 15 }} /> All demos
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/morales-m-mark.png" alt="M" style={{ width: 24, filter: `drop-shadow(0 0 6px ${GOLD})` }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>Weather to Health</span>
          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: `${GOLD}20`, color: GOLD, fontWeight: 800 }}>CR 25</span>
        </div>
        <button onClick={() => { setMuted(m => !m); window.speechSynthesis?.cancel(); }}
          style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '5px 10px', color: muted ? 'rgba(255,255,255,0.3)' : GOLD, cursor: 'pointer', fontSize: 11 }}>
          {muted ? 'Unmute' : 'Mute M'}
        </button>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '28px 20px' }}>

        {/* Intro */}
        <div style={{ padding: '16px 20px', borderRadius: 14, background: `${GOLD}08`, border: `1px solid ${GOLD}25`, marginBottom: 20, textAlign: 'center' }}>
          <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 800, color: GOLD, letterSpacing: '0.1em' }}>WEATHER TO HEALTH INTELLIGENCE — CR 25</p>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
            One weather event. <strong style={{ color: '#fff' }}>Four parties prepared simultaneously.</strong><br />Patient, companion, doctor, driver — all adjusted. Zero friction.
          </p>
        </div>

        {/* Scenario selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {SCENARIOS.map((s, i) => (
            <button key={i} onClick={() => switchScenario(i)} style={{
              flex: 1, padding: '10px 8px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
              background: selected === i ? `${GOLD}15` : CARD,
              border: `1px solid ${selected === i ? GOLD + '60' : BORDER}`,
              color: selected === i ? GOLD : 'rgba(255,255,255,0.4)',
              fontSize: 10, fontWeight: 700, transition: 'all 0.2s',
            }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.emoji}</div>
              {s.city.split(',')[0]}
            </button>
          ))}
        </div>

        {/* Weather card */}
        <div style={{ padding: '20px 22px', borderRadius: 16, background: CARD, border: `1px solid ${BORDER}`, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 28 }}>{scenario.flag}</span>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#fff' }}>{scenario.city}</p>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Patient procedure: {scenario.procedure}</p>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 28 }}>{scenario.emoji}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            {[
              { icon: Thermometer, label: 'Temperature', value: scenario.temp, color: RED },
              { icon: Droplets,    label: 'Humidity',    value: scenario.humidity, color: BLUE },
              { icon: Wind,        label: 'Wind',        value: scenario.wind, color: GREEN },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} style={{ padding: '10px 12px', borderRadius: 10, background: `${color}10`, border: `1px solid ${color}25`, textAlign: 'center' }}>
                <Icon style={{ width: 14, height: 14, color, margin: '0 auto 4px' }} />
                <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 800, color: '#fff' }}>{value}</p>
                <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{label}</p>
              </div>
            ))}
          </div>

          <div style={{ padding: '10px 14px', borderRadius: 10, background: `${scenario.riskColor}10`, border: `1px solid ${scenario.riskColor}30`, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <AlertTriangle style={{ width: 14, height: 14, color: scenario.riskColor, flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{scenario.risk}</p>
          </div>
        </div>

        {/* Fire button */}
        {fired.length === 0 && (
          <button onClick={runCascade} disabled={running} style={{
            width: '100%', padding: '14px 0', borderRadius: 14, cursor: running ? 'not-allowed' : 'pointer', marginBottom: 20,
            background: `linear-gradient(135deg, ${GOLD}, #E8C85C)`,
            border: 'none', color: DARK, fontSize: 14, fontWeight: 800,
            boxShadow: `0 8px 24px rgba(212,175,55,0.35)`,
          }}>
            M adjusts care plan for {scenario.city} →
          </button>
        )}

        {/* Cascade notifications */}
        {fired.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 800, color: GOLD, letterSpacing: '0.08em' }}>M BRIEFED ALL PARTIES SIMULTANEOUSLY</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {scenario.actions.map((action, i) => (
                fired.includes(i) ? (
                  <div key={i} style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${action.color}30`, animation: 'fadeUp 0.35s ease' }}>
                    <div style={{ padding: '10px 14px', background: `${action.color}10`, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{action.icon}</span>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: action.color, letterSpacing: '0.06em' }}>{action.to.toUpperCase()}</p>
                      {action.lang && (
                        <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, color: GOLD, background: `${GOLD}15`, border: `1px solid ${GOLD}30`, borderRadius: 6, padding: '2px 7px', letterSpacing: '0.04em' }}>
                          {action.lang}
                        </span>
                      )}
                    </div>
                    <div style={{ padding: '12px 14px', background: CARD }}>
                      <p style={{ margin: '0 0 8px', fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.65 }}>
                        {action.message}
                      </p>
                      <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>
                        🤖 {action.mDid}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div key={i} style={{ height: 60, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[0,1,2].map(d => <div key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, opacity: 0.3, animation: `pulse 1s ease ${d * 0.2}s infinite` }} />)}
                    </div>
                  </div>
                )
              ))}
            </div>

            {fired.length === scenario.actions.length && (
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
                  One weather event. Four parties prepared.<br />
                  <strong style={{ color: GOLD }}>James didn't know any of this happened. M handled it.</strong>
                </p>
                <button onClick={reset} style={{ padding: '9px 20px', borderRadius: 10, cursor: 'pointer', background: CARD, border: `1px solid ${BORDER}`, color: '#fff', fontSize: 12, fontWeight: 600 }}>
                  Try another city
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
