import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const RED   = '#ef4444';
const GOLD  = '#D4AF37';
const GREEN = '#22c55e';
const BG    = '#04080F';
const FONT  = '"SF Pro Display", system-ui, sans-serif';

function Scene({ layer, title, sub, children }) {
  return (
    <div
      style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 32px' }}
    >
      {layer && <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', margin: '0 0 10px' }}>{layer}</p>}
      {title && <h2 style={{ fontSize: 30, fontWeight: 900, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.02em' }}>{title}</h2>}
      {sub   && <p  style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 36px', lineHeight: 1.5 }}>{sub}</p>}
      {children}
    </div>
  );
}

// ── Scene 0: Intro ────────────────────────────────────────────────────────────
function IntroScene({ onNext }) {
  return (
    <Scene>
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [1, 0.65, 1] }}
        transition={{ duration: 2.5, repeat: Infinity }}
        style={{ fontSize: 72, marginBottom: 24 }}>📡</motion.div>
      <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.25em', color: GOLD, margin: '0 0 14px' }}>CR-55 · MORALES EMERGENCY SYSTEMS</p>
      <h1 style={{ fontSize: 40, fontWeight: 900, color: '#fff', margin: '0 0 16px', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
        Emergency<br /><span style={{ color: RED }}>Mesh Beacon</span>
      </h1>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 360, lineHeight: 1.65, margin: '0 0 44px' }}>
        When Elena is trapped in Caracas — her phone activates for her.
        No button press. No signal. Morales finds a way.
      </p>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onNext}
        style={{ padding: '15px 44px', borderRadius: 16, background: RED, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', border: 'none', boxShadow: `0 0 50px rgba(239,68,68,0.4)`, letterSpacing: '0.06em' }}
      >
        ACTIVATE DEMO →
      </motion.button>
    </Scene>
  );
}

// ── Scene 1: Earthquake auto-activation ──────────────────────────────────────
function TriggerScene({ onNext }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1000);
    const t2 = setTimeout(() => setPhase(2), 2400);
    const t3 = setTimeout(() => onNext(), 4200);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [onNext]);

  const STEPS = [
    { icon: '🌍', label: 'Magnitude 6.8 earthquake hits Caracas', done: phase >= 0 },
    { icon: '📳', label: 'Phone accelerometer detects the impact', done: phase >= 1 },
    { icon: '📡', label: 'Beacon auto-fired — Elena never pressed anything', done: phase >= 2, red: true },
  ];

  return (
    <Scene
      layer="LAYER 1 · AUTO-ACTIVATION"
      title={phase < 2 ? 'Earthquake Detected' : 'Beacon Auto-Fired'}
      sub={phase < 1 ? 'Magnitude 6.8 · Caracas, Venezuela · 14:32 local time'
         : phase < 2 ? 'Morales accelerometer reading seismic impact…'
         : 'She was unconscious. The phone activated for her.'}
    >
      <svg width="280" height="50" viewBox="0 0 280 50" style={{ margin: '0 0 28px', overflow: 'visible' }}>
        <motion.path
          d="M0,25 L30,25 L42,5 L54,45 L64,3 L76,47 L86,10 L98,42 L108,16 L118,38 L128,25 L280,25"
          fill="none" stroke={RED} strokeWidth={2.5} strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0.5 }}
          animate={{ pathLength: 1, opacity: phase === 0 ? 1 : 0.18 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        {phase >= 1 && (
          <motion.line x1="128" y1="0" x2="128" y2="50"
            stroke={GOLD} strokeWidth={1.5} strokeDasharray="3 3"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          />
        )}
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 380 }}>
        {STEPS.map(({ icon, label, done, red }) => (
          <motion.div key={label}
            animate={{ opacity: done ? 1 : 0.18 }}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderRadius: 14,
              background: done ? (red ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)') : 'transparent',
              border: `1px solid ${done ? (red ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)') : 'rgba(255,255,255,0.04)'}` }}>
            <span style={{ fontSize: 22 }}>{icon}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: done ? (red ? RED : '#fff') : 'rgba(255,255,255,0.25)', flex: 1, textAlign: 'left' }}>{label}</span>
            {done && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}
                style={{ fontSize: 14 }}>{red ? '🚨' : '✓'}</motion.span>
            )}
          </motion.div>
        ))}
      </div>

      <motion.p animate={{ opacity: phase >= 2 ? 1 : 0 }}
        style={{ marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.28)', fontStyle: 'italic' }}>
        "She never had to press a button."
      </motion.p>
    </Scene>
  );
}

// ── Scene 2: Beacon broadcasting ─────────────────────────────────────────────
function BroadcastScene({ onNext }) {
  useEffect(() => { const t = setTimeout(onNext, 5000); return () => clearTimeout(t); }, [onNext]);

  return (
    <Scene layer="LAYER 2 · BEACON BROADCAST" title="Signal Broadcasting" sub="Simultaneous Bluetooth · Wi-Fi Direct · Cellular — even offline">
      <div style={{ position: 'relative', width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {[0.7, 1.4, 2.1].map((delay, i) => (
          <motion.div key={i}
            animate={{ scale: [1, 4.5], opacity: [0.75, 0] }}
            transition={{ duration: 2.8, delay, repeat: Infinity, ease: 'easeOut' }}
            style={{ position: 'absolute', width: 50, height: 50, borderRadius: '50%', border: `2px solid ${RED}` }}
          />
        ))}
        <motion.div
          animate={{ boxShadow: [`0 0 30px ${RED}70`, `0 0 65px ${RED}95`, `0 0 30px ${RED}70`] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          style={{ width: 50, height: 50, borderRadius: '50%', background: RED, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, zIndex: 1 }}>
          📡
        </motion.div>
      </div>

      <div style={{ display: 'flex', gap: 14, marginTop: 36 }}>
        {[
          { icon: '🔵', label: 'Bluetooth', color: '#3b82f6', delay: 0.3 },
          { icon: '🟣', label: 'Wi-Fi Direct', color: '#8b5cf6', delay: 0.7 },
          { icon: '🟢', label: 'Cellular', color: GREEN, delay: 1.1 },
        ].map(({ icon, label, color, delay }) => (
          <motion.div key={label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
            style={{ padding: '12px 16px', borderRadius: 14, background: `${color}14`, border: `1px solid ${color}40`, textAlign: 'center', minWidth: 96 }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: '0.04em' }}>{label}</div>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}
        style={{ marginTop: 28, padding: '10px 22px', borderRadius: 24, background: 'rgba(239,68,68,0.08)', border: `1px solid ${RED}30` }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: RED }}>Signal transmitting every 3 seconds</span>
      </motion.div>
    </Scene>
  );
}

// ── Scene 3: Mesh relay ───────────────────────────────────────────────────────
const RELAY_NODES = [
  { icon: '🆘', label: 'Elena G.',  sub: 'Trapped · Caracas', color: RED       },
  { icon: '👤', label: 'Juan M.',   sub: 'Surface · Relay 1',  color: '#60a5fa' },
  { icon: '👤', label: 'Sofia V.',  sub: 'Street · Relay 2',   color: '#60a5fa' },
  { icon: '☁️', label: 'Cloud',    sub: 'Signal Reached',     color: GREEN      },
];

function MeshRelayScene({ onNext }) {
  const [lit, setLit] = useState(0);

  useEffect(() => {
    const timers = [600, 1500, 2400, 3300].map((d, i) => setTimeout(() => setLit(i + 1), d));
    const done   = setTimeout(onNext, 5600);
    return () => { timers.forEach(clearTimeout); clearTimeout(done); };
  }, [onNext]);

  return (
    <Scene layer="LAYER 3 · MESH RELAY NETWORK" title="Signal Propagating" sub="Nearby Morales users relay the beacon until it reaches the cloud">
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 8, width: '100%', maxWidth: 480, justifyContent: 'center' }}>
        {RELAY_NODES.map((node, i) => (
          <React.Fragment key={node.label}>
            <motion.div animate={{ opacity: lit > i ? 1 : 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 82 }}>
              <motion.div
                animate={lit > i ? { boxShadow: [`0 0 0px ${node.color}`, `0 0 28px ${node.color}55`, `0 0 0px ${node.color}`] } : {}}
                transition={{ duration: 1.6, repeat: Infinity }}
                style={{ width: 58, height: 58, borderRadius: '50%', background: lit > i ? `${node.color}18` : 'rgba(255,255,255,0.04)', border: `2px solid ${lit > i ? node.color : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 8 }}>
                {node.icon}
              </motion.div>
              <span style={{ fontSize: 10, fontWeight: 700, color: lit > i ? node.color : 'rgba(255,255,255,0.3)' }}>{node.label}</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', marginTop: 2 }}>{node.sub}</span>
            </motion.div>
            {i < RELAY_NODES.length - 1 && (
              <div style={{ flex: 1, height: 2, position: 'relative', overflow: 'hidden', margin: '0 4px', marginBottom: 28 }}>
                <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.07)', borderRadius: 1 }} />
                <AnimatePresence>
                  {lit > i && (
                    <motion.div key="fill"
                      initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 0.55 }}
                      style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: RELAY_NODES[i + 1].color, borderRadius: 1 }}
                    />
                  )}
                </AnimatePresence>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence>
        {lit >= 4 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: 30, padding: '10px 24px', borderRadius: 24, background: `${GREEN}12`, border: `1px solid ${GREEN}40` }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: GREEN }}>✅ Beacon reached the cloud via 2 relay nodes</span>
          </motion.div>
        )}
      </AnimatePresence>

      <p style={{ marginTop: 14, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
        No single point of failure · The network heals itself
      </p>
    </Scene>
  );
}

// ── Scene 4: Situation Room — Venezuela map ───────────────────────────────────
function SituationRoomScene({ onNext }) {
  useEffect(() => { const t = setTimeout(onNext, 6500); return () => clearTimeout(t); }, [onNext]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <motion.div animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 0.7, repeat: Infinity }}
          style={{ width: 8, height: 8, borderRadius: '50%', background: RED, boxShadow: `0 0 10px ${RED}` }} />
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', color: '#fff' }}>SITUATION ROOM</span>
        <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
          style={{ fontSize: 9, fontWeight: 700, color: RED, letterSpacing: '0.1em', marginLeft: 4 }}>
          ● EARTHQUAKE · BEACON ACTIVE · CARACAS
        </motion.span>
        <span style={{ marginLeft: 'auto', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em' }}>LAYER 4 · ADMIN SEES THIS</span>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#030a12' }}>
        {/* SVG map — northern South America */}
        <svg viewBox="0 0 300 200" width="100%" height="100%"
          style={{ position: 'absolute', inset: 0 }} preserveAspectRatio="xMidYMid meet">
          <rect width={300} height={200} fill="#030a12" />

          {/* Caribbean Sea */}
          <text x="105" y="20" textAnchor="middle" fill="rgba(96,165,250,0.18)"
            fontSize="6" letterSpacing="2" fontWeight="600">C A R I B B E A N   S E A</text>

          {/* Colombia */}
          <path d="M20,72 L22,54 L32,44 L46,40 L58,42 L65,52 L65,57 L75,65 L70,82 L58,95 L40,100 L24,92 L16,80 Z"
            fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.6" />
          <text x="40" y="74" textAnchor="middle" fill="rgba(255,255,255,0.22)" fontSize="5">COLOMBIA</text>

          {/* Brazil */}
          <path d="M58,95 L70,82 L75,65 L90,73 L108,75 L126,70 L138,62 L148,74 L160,92 L158,118 L142,148 L115,165 L82,162 L60,148 L45,125 L52,105 Z"
            fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.6" />
          <text x="105" y="128" textAnchor="middle" fill="rgba(255,255,255,0.22)" fontSize="5">BRAZIL</text>

          {/* Guyana */}
          <path d="M138,62 L142,50 L150,46 L158,52 L162,66 L157,80 L148,82 L138,72 Z"
            fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.6" />
          <text x="150" y="68" textAnchor="middle" fill="rgba(255,255,255,0.16)" fontSize="4">GUYANA</text>

          {/* Venezuela — highlighted red */}
          <path d="M65,57 L72,44 L82,36 L96,33 L110,35 L124,39 L135,42 L142,50 L138,62 L126,70 L108,75 L90,73 L75,65 Z"
            fill="rgba(239,68,68,0.13)" stroke="rgba(239,68,68,0.6)" strokeWidth="1" />
          <text x="104" y="59" textAnchor="middle" fill="rgba(255,255,255,0.6)"
            fontSize="6" fontWeight="bold" letterSpacing="0.5">VENEZUELA</text>

          {/* Trinidad */}
          <circle cx="162" cy="48" r="3" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />

          {/* Caracas label */}
          <text x="100" y="29" textAnchor="middle" fill="rgba(255,100,100,0.6)"
            fontSize="4.5" letterSpacing="0.5" fontWeight="600">CARACAS</text>

          {/* Beacon rings */}
          {[1, 2, 3].map(i => (
            <motion.circle key={i} cx={100} cy={35} r={5}
              fill="none" stroke={RED} strokeWidth={1}
              animate={{ r: [5, 20], opacity: [0.95, 0] }}
              transition={{ duration: 2.2, delay: i * 0.7, repeat: Infinity }}
            />
          ))}
          <circle cx={100} cy={35} r={4.5} fill={RED}
            style={{ filter: `drop-shadow(0 0 8px ${RED})` }} />

          {/* Miami HQ */}
          <circle cx={22} cy={14} r={3.5} fill={GOLD}
            style={{ filter: `drop-shadow(0 0 5px ${GOLD})` }} />
          <text x="30" y="16.5" fill={GOLD} fontSize="4.5" fontWeight="bold">HQ · Miami, FL</text>

          {/* Animated dash line: Miami → Caracas */}
          <motion.line x1={22} y1={14} x2={100} y2={35}
            stroke={RED} strokeWidth={1} strokeDasharray="4 4" opacity={0.4}
            animate={{ strokeDashoffset: [0, -8] }}
            transition={{ duration: 0.5, repeat: Infinity, ease: 'linear' }}
          />
        </svg>

        {/* Info card */}
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}
          style={{ position: 'absolute', right: 12, top: 10, background: 'rgba(3,10,18,0.97)', border: `1px solid ${RED}45`, borderRadius: 12, padding: '12px 14px', minWidth: 200 }}>
          <div style={{ fontSize: 8, fontWeight: 800, color: RED, letterSpacing: '0.15em', marginBottom: 7 }}>🚨 BEACON ACTIVE · EQ 6.8</div>
          <div style={{ fontSize: 11, color: '#fff', fontWeight: 700, marginBottom: 3 }}>Elena G. · Case #4821</div>
          <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace', marginBottom: 2 }}>10.4815° N, 66.9037° W</div>
          <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.35)', marginBottom: 9 }}>Caracas, Venezuela · Trapped · Auto-Activated</div>
          <div style={{ display: 'flex', gap: 5 }}>
            <div style={{ padding: '3px 7px', borderRadius: 5, background: `${RED}22`, fontSize: 7.5, fontWeight: 800, color: RED }}>BEACON</div>
            <div style={{ padding: '3px 7px', borderRadius: 5, background: 'rgba(249,115,22,0.12)', fontSize: 7.5, fontWeight: 800, color: '#f97316' }}>OFFLINE</div>
          </div>
        </motion.div>

        {/* Bottom banner */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6 }}
          style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', padding: '8px 20px', borderRadius: 24, background: 'rgba(239,68,68,0.1)', border: `1px solid ${RED}35`, whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: RED }}>Auto-Activated · Concierge Notified · Dispatch In Progress</span>
        </motion.div>
      </div>
    </div>
  );
}

// ── Scene 5: Automated dispatch ───────────────────────────────────────────────
const DISPATCH_SERVICES = [
  { icon: '🚒', label: 'Bomberos Venezuela', detail: 'GPS coordinates · Caracas rescue team en route', color: '#f97316' },
  { icon: '🚔', label: 'GNB Police',         detail: 'Last known location pinged · Patrol dispatched',  color: '#60a5fa' },
  { icon: '🏛️', label: 'US Embassy Caracas', detail: 'Citizen emergency protocol active',              color: GOLD      },
];

function DispatchScene() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 700);
    const t2 = setTimeout(() => setStep(2), 1500);
    const t3 = setTimeout(() => setStep(3), 2300);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  return (
    <Scene layer="LAYER 5 · AUTOMATED DISPATCH" title="Help Is On The Way" sub="No human intervention required — dispatched automatically">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 420 }}>
        {DISPATCH_SERVICES.map(({ icon, label, detail, color }, i) => (
          <motion.div key={label}
            initial={{ opacity: 0, x: -24 }}
            animate={step > i ? { opacity: 1, x: 0 } : { opacity: 0, x: -24 }}
            style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderRadius: 16, background: `${color}10`, border: `1px solid ${color}35` }}>
            <span style={{ fontSize: 34, flexShrink: 0 }}>{icon}</span>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{detail}</div>
            </div>
            <motion.div initial={{ scale: 0 }} animate={step > i ? { scale: 1 } : { scale: 0 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
              style={{ padding: '6px 12px', borderRadius: 20, background: `${GREEN}18`, border: `1px solid ${GREEN}45`, flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: GREEN }}>NOTIFIED</span>
            </motion.div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {step >= 3 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            style={{ marginTop: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>🛡️</div>
            <p style={{ fontSize: 20, fontWeight: 900, color: GOLD, margin: '0 0 8px', letterSpacing: '-0.01em' }}>Morales — The Lifeline</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', maxWidth: 320, margin: '0 auto 28px', lineHeight: 1.6 }}>
              "When the earth shakes and the signal dies, Morales becomes the lifeline."
            </p>
            <Link to="/demo" style={{ padding: '12px 32px', borderRadius: 12, background: `${GOLD}18`, border: `1px solid ${GOLD}45`, color: GOLD, fontSize: 12, fontWeight: 800, textDecoration: 'none', letterSpacing: '0.06em' }}>
              ← ALL DEMOS
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </Scene>
  );
}

// ── Judge Q&A overlay ─────────────────────────────────────────────────────────
const QA = [
  { q: 'How does it know an earthquake happened?', a: 'The phone\'s accelerometer detects violent shaking — same technology Google uses for Android Earthquake Alerts. No internet needed. Fires in milliseconds.' },
  { q: 'Does it pull live disaster data from the internet?', a: 'Yes — production integrates USGS Earthquake Feed (updates every 60s), GDACS (UN global disasters), and NOAA tsunami warnings. When a 6.0+ hits a client\'s country, the system cross-references who is there and alerts them.' },
  { q: 'What if the phone is destroyed or she\'s unconscious?', a: 'The beacon fires before destruction. If no beacon fires, the concierge layer sweeps all clients in the affected region proactively — they don\'t wait for a ping.' },
  { q: 'GPS doesn\'t work underground — how do you find her?', a: 'Last cached GPS coordinates transmit — typically accurate within 10–50 meters. Cell tower triangulation as fallback. Rescue teams use the last known point, same as real SAR operations.' },
  { q: 'How is this different from Life360 or Find My Friends?', a: 'Those tools show family where you are. Morales coordinates the rescue — dispatches local emergency services in their language, activates the US Embassy, contacts the concierge, logs an audit chain.' },
  { q: 'Has this worked in a real emergency?', a: 'This is a buildathon. Every component — accelerometer detection, BLE mesh relay, USGS feeds, Embassy protocols — is proven in production elsewhere. Morales integrates them for medical travelers specifically.' },
];

function JudgePanel({ onClose }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{ background: '#0a1520', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 20, padding: '28px 28px 24px', maxWidth: 620, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 800, color: GOLD, letterSpacing: '0.2em', margin: '0 0 4px' }}>JUDGE Q&A REFERENCE</p>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: '#fff', margin: 0 }}>Hard Questions — Real Answers</h2>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, padding: '6px 12px', cursor: 'pointer' }}>✕ CLOSE</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {QA.map(({ q, a }, i) => (
            <div key={i} style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: GOLD, margin: '0 0 6px' }}>Q: {q}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.6 }}>{a}</p>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 20, fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
          Tap outside or ✕ to return to demo
        </p>
      </motion.div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const SCENE_LABELS = ['INTRO', 'AUTO-DETECT', 'BROADCAST', 'MESH RELAY', 'SIT. ROOM', 'DISPATCH'];

export default function EmergencyMeshBeaconDemo() {
  const [scene, setScene] = useState(0);
  const [showQA, setShowQA] = useState(false);

  const next = useCallback(() => setScene(s => Math.min(s + 1, 5)), []);

  const SCENES = [
    <IntroScene onNext={next} />,
    <TriggerScene onNext={next} />,
    <BroadcastScene onNext={next} />,
    <MeshRelayScene onNext={next} />,
    <SituationRoomScene onNext={next} />,
    <DispatchScene />,
  ];

  return (
    <div style={{ height: '100vh', background: BG, color: '#fff', fontFamily: FONT, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AnimatePresence>{showQA && <JudgePanel onClose={() => setShowQA(false)} />}</AnimatePresence>

      {/* Nav */}
      <div style={{ flexShrink: 0, padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 14 }}>
        <Link to="/" style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontWeight: 600 }}>⌂ Home</Link>
        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)' }} />
        <Link to="/demo" style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontWeight: 600 }}>← Demos</Link>
        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)' }} />
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: RED }}>EMERGENCY MESH BEACON</span>
        <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>CR-55</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setShowQA(true)}
            style={{ padding: '5px 12px', borderRadius: 8, background: `${GOLD}15`, border: `1px solid ${GOLD}40`, color: GOLD, fontSize: 9, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.1em' }}>
            JUDGE Q&A
          </button>
          {SCENE_LABELS.map((label, i) => (
            <button key={i} onClick={() => setScene(i)} title={label}
              style={{ width: i === scene ? 22 : 7, height: 7, borderRadius: 4, background: i === scene ? RED : i < scene ? `${RED}45` : 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', transition: 'all 0.3s' }}
            />
          ))}
        </div>
      </div>

      {/* Scene */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={scene}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
            style={{ height: '100%' }}
          >
            {SCENES[scene]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
