import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const RED   = '#ef4444';
const GOLD  = '#D4AF37';
const GREEN = '#22c55e';
const BG    = '#04080F';
const FONT  = '"SF Pro Display", system-ui, sans-serif';

function Scene({ layer, title, sub, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 32px' }}
    >
      {layer && <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', margin: '0 0 10px' }}>{layer}</p>}
      {title && <h2 style={{ fontSize: 30, fontWeight: 900, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.02em' }}>{title}</h2>}
      {sub   && <p  style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 36px', lineHeight: 1.5 }}>{sub}</p>}
      {children}
    </motion.div>
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
        A distributed rescue network. Works offline. Relays through nearby users.
        Dispatches help automatically — no human intervention required.
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

// ── Scene 1: Long-press SOS trigger ──────────────────────────────────────────
function TriggerScene({ onNext }) {
  const [holding,   setHolding]   = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [activated, setActivated] = useState(false);
  const timerRef = useRef(null);
  const startRef = useRef(null);

  function startHold(e) {
    e.preventDefault();
    if (activated) return;
    startRef.current = Date.now();
    setHolding(true);
    timerRef.current = setInterval(() => {
      const pct = Math.min(((Date.now() - startRef.current) / 3000) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(timerRef.current);
        setActivated(true);
        setHolding(false);
        setTimeout(onNext, 1400);
      }
    }, 30);
  }

  function endHold() {
    if (activated) return;
    clearInterval(timerRef.current);
    setHolding(false);
    setProgress(0);
  }

  const C = 2 * Math.PI * 66;

  return (
    <Scene
      layer="LAYER 1 · USER TRIGGER"
      title="Long-press SOS"
      sub="Works in airplane mode · No internet required · 3-second hold"
    >
      <div style={{ position: 'relative', width: 156, height: 156, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }} width={156} height={156}>
          <circle cx={78} cy={78} r={66} fill="none" stroke="rgba(239,68,68,0.1)" strokeWidth={6} />
          <circle cx={78} cy={78} r={66} fill="none" stroke={RED} strokeWidth={6} strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - progress / 100)}
            style={{ transition: 'stroke-dashoffset 0.03s linear' }} />
        </svg>
        <motion.button
          onMouseDown={startHold} onMouseUp={endHold} onMouseLeave={endHold}
          onTouchStart={startHold} onTouchEnd={endHold}
          animate={activated ? { scale: [1, 1.12, 1] } : {}}
          style={{
            width: 108, height: 108, borderRadius: '50%', cursor: 'pointer',
            border: `3px solid ${activated ? RED : 'rgba(239,68,68,0.55)'}`,
            background: activated ? RED : `rgba(239,68,68,${holding ? '0.28' : '0.1'})`,
            color: '#fff', fontSize: 22, fontWeight: 900, letterSpacing: '0.04em',
            boxShadow: (holding || activated) ? `0 0 60px rgba(239,68,68,0.55), 0 0 120px rgba(239,68,68,0.2)` : 'none',
            transition: 'all 0.15s', userSelect: 'none',
          }}
        >
          {activated ? '✓' : 'SOS'}
        </motion.button>
      </div>

      <motion.p
        animate={{ color: activated ? GREEN : holding ? RED : 'rgba(255,255,255,0.3)' }}
        style={{ marginTop: 18, fontSize: 13, fontWeight: 800, letterSpacing: '0.06em' }}
      >
        {activated ? '✅ BEACON ACTIVATED' : holding ? 'HOLD…' : 'Hold for 3 seconds'}
      </motion.p>

      <div style={{ marginTop: 28, display: 'flex', gap: 10 }}>
        {[['✈️', 'Airplane Mode'], ['📶', 'No Signal'], ['📡', 'Beacon Active']].map(([icon, label], i) => (
          <motion.div key={label}
            animate={{
              borderColor: activated && i === 2 ? `${GREEN}60` : 'rgba(255,255,255,0.08)',
              color:       activated && i === 2 ? GREEN : 'rgba(255,255,255,0.25)',
            }}
            style={{ padding: '6px 12px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', fontSize: 10, fontWeight: 700 }}>
            {icon} {label}
          </motion.div>
        ))}
      </div>

      <button onClick={onNext} style={{ marginTop: 30, fontSize: 11, color: 'rgba(255,255,255,0.2)', background: 'none', border: 'none', cursor: 'pointer' }}>
        Skip →
      </button>
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
  { icon: '🚨', label: 'Elena G.', sub: 'Trapped', color: RED      },
  { icon: '👤', label: 'Marco T.', sub: 'Relay 1', color: '#60a5fa' },
  { icon: '👤', label: 'Sofia R.', sub: 'Relay 2', color: '#60a5fa' },
  { icon: '☁️', label: 'Cloud',   sub: 'Reached', color: GREEN     },
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

// ── Scene 4: Situation Room sees it ──────────────────────────────────────────
function SituationRoomScene({ onNext }) {
  useEffect(() => { const t = setTimeout(onNext, 5500); return () => clearTimeout(t); }, [onNext]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <motion.div animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 0.7, repeat: Infinity }}
          style={{ width: 8, height: 8, borderRadius: '50%', background: RED, boxShadow: `0 0 10px ${RED}` }} />
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', color: '#fff' }}>SITUATION ROOM</span>
        <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
          style={{ fontSize: 9, fontWeight: 700, color: RED, letterSpacing: '0.1em', marginLeft: 4 }}>
          ● 1 BEACON ACTIVE
        </motion.span>
        <span style={{ marginLeft: 'auto', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em' }}>LAYER 4 · ADMIN SEES THIS</span>
      </div>

      <div style={{ flex: 1, position: 'relative', background: '#060e1a', overflow: 'hidden' }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.05 }}>
          {[...Array(10)].map((_, i) => (
            <React.Fragment key={i}>
              <line x1={`${i * 11.1}%`} y1="0" x2={`${i * 11.1}%`} y2="100%" stroke="#fff" strokeWidth={0.5} />
              <line x1="0" y1={`${i * 11.1}%`} x2="100%" y2={`${i * 11.1}%`} stroke="#fff" strokeWidth={0.5} />
            </React.Fragment>
          ))}
        </svg>

        {/* HQ */}
        <div style={{ position: 'absolute', left: '20%', top: '52%' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: GOLD, boxShadow: `0 0 14px ${GOLD}` }} />
          <div style={{ fontSize: 9, color: GOLD, fontWeight: 700, marginTop: 4, whiteSpace: 'nowrap' }}>HQ · Miami</div>
        </div>

        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} preserveAspectRatio="none">
          <line x1="20%" y1="52%" x2="68%" y2="33%" stroke={RED} strokeWidth={1.5} strokeDasharray="5 5" opacity={0.5} />
        </svg>

        {/* Beacon marker */}
        <div style={{ position: 'absolute', left: '68%', top: '33%', transform: 'translate(-50%, -50%)' }}>
          {[1, 2, 3].map(i => (
            <motion.div key={i}
              animate={{ scale: [1, 4.2], opacity: [0.8, 0] }}
              transition={{ duration: 2.1, delay: i * 0.65, repeat: Infinity }}
              style={{ position: 'absolute', width: 18, height: 18, borderRadius: '50%', border: `2px solid ${RED}`, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
            />
          ))}
          <div style={{ position: 'relative', width: 18, height: 18, borderRadius: '50%', background: RED, boxShadow: `0 0 22px ${RED}` }} />
        </div>

        {/* Info card */}
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }}
          style={{ position: 'absolute', right: 16, top: 14, background: 'rgba(4,8,15,0.95)', border: `1px solid ${RED}40`, borderRadius: 12, padding: '14px 16px', minWidth: 210 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: RED, letterSpacing: '0.15em', marginBottom: 8 }}>🚨 BEACON ACTIVE</div>
          <div style={{ fontSize: 11, color: '#fff', fontWeight: 700, marginBottom: 3 }}>Elena G. · Case #4821</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', marginBottom: 3 }}>25.0517° N, 121.5645° E</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Taipei · HS5 · Clinic Arrival</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ padding: '4px 8px', borderRadius: 6, background: `${RED}20`, fontSize: 8, fontWeight: 700, color: RED }}>BEACON</div>
            <div style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>OFFLINE</div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6 }}
          style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', padding: '9px 22px', borderRadius: 24, background: `rgba(239,68,68,0.12)`, border: `1px solid ${RED}40`, whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: RED }}>Concierge Notified · Dispatch Initiated</span>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ── Scene 5: Automated dispatch ───────────────────────────────────────────────
const DISPATCH_SERVICES = [
  { icon: '🚒', label: 'Fire Department', detail: 'GPS coordinates transmitted', color: '#f97316' },
  { icon: '🚔', label: 'Police',          detail: 'Last known location pinged',  color: '#60a5fa' },
  { icon: '🏛️', label: 'US Embassy',     detail: 'Emergency protocol active',   color: GOLD     },
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

// ── Main page ─────────────────────────────────────────────────────────────────
const SCENE_LABELS = ['INTRO', 'TRIGGER', 'BROADCAST', 'MESH RELAY', 'SIT. ROOM', 'DISPATCH'];

export default function EmergencyMeshBeaconDemo() {
  const [scene, setScene] = useState(0);

  const next = () => setScene(s => Math.min(s + 1, 5));

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
      {/* Nav */}
      <div style={{ flexShrink: 0, padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 14 }}>
        <Link to="/demo" style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontWeight: 600 }}>← Demo</Link>
        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)' }} />
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: RED }}>EMERGENCY MESH BEACON</span>
        <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>CR-55</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
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
          <motion.div key={scene} style={{ height: '100%' }}>
            {SCENES[scene]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
