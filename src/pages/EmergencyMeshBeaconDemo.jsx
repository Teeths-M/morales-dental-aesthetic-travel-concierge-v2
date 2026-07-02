import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
      <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.25em', color: GOLD, margin: '0 0 14px' }}>CR-55 · MORALES EMERGENCY SYSTEMS · VISION DEMO</p>
      <h1 style={{ fontSize: 40, fontWeight: 900, color: '#fff', margin: '0 0 16px', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
        Emergency<br /><span style={{ color: RED }}>Mesh Beacon</span>
      </h1>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 360, lineHeight: 1.65, margin: '0 0 12px' }}>
        When Elena is trapped in Caracas — her phone activates for her.
        No button press. No signal. Morales finds a way.
      </p>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', maxWidth: 320, lineHeight: 1.6, margin: '0 0 32px', fontStyle: 'italic' }}>
        This demo illustrates our future emergency detection vision. Device mesh networking requires our native app, currently on the roadmap.
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

// ── Scene 4: Situation Room — Leaflet world map ───────────────────────────────
const BEACON_ICON = L.divIcon({ className:'', iconSize:[44,44], iconAnchor:[22,22],
  html:'<div class="bc-wrap"><div class="bc-ring"></div><div class="bc-ring"></div><div class="bc-ring"></div><div class="bc-dot"></div></div>' });
const MESH_CLIENTS = [
  [21.2,-86.8,'safe','Cancún'], [51.5,-0.1,'safe','London'],
  [13.7,100.5,'safe','Bangkok'], [25.2,55.3,'safe','Dubai'],
  [41.0,28.9,'safe','Istanbul'], [-33.8,151.2,'safe','Sydney'],
  [6.5,3.4,'watch','Lagos'], [4.7,-74.1,'watch','Bogotá'],
];
function SituationRoomScene({ onNext }) {
  useEffect(() => { const t = setTimeout(onNext, 6500); return () => clearTimeout(t); }, [onNext]);
  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'bc-css';
    el.textContent = `.bc-wrap{position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center}.bc-ring{position:absolute;top:50%;left:50%;border-radius:50%;border:2px solid #ef4444;animation:bcP 2s ease-out infinite}.bc-ring:nth-child(2){animation-delay:.67s}.bc-ring:nth-child(3){animation-delay:1.33s}.bc-dot{width:10px;height:10px;border-radius:50%;background:#ef4444;box-shadow:0 0 6px #ef4444,0 0 18px rgba(239,68,68,.6)}@keyframes bcP{0%{width:10px;height:10px;transform:translate(-50%,-50%);opacity:.9}100%{width:44px;height:44px;transform:translate(-50%,-50%);opacity:0}}`;
    if (!document.getElementById('bc-css')) document.head.appendChild(el);
    return () => { const s = document.getElementById('bc-css'); if (s) s.remove(); };
  }, []);

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'8px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <motion.div animate={{ opacity:[1,0.25,1] }} transition={{ duration:0.7, repeat:Infinity }}
          style={{ width:7, height:7, borderRadius:'50%', background:RED, boxShadow:`0 0 8px ${RED}` }} />
        <span style={{ fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#fff' }}>SITUATION ROOM</span>
        <motion.span animate={{ opacity:[1,0.5,1] }} transition={{ duration:1.2, repeat:Infinity }}
          style={{ fontSize:9, fontWeight:700, color:RED, letterSpacing:'0.1em' }}>● EQ 6.8 · BEACON ACTIVE · CARACAS</motion.span>
        <span style={{ marginLeft:'auto', fontSize:9, color:'rgba(255,255,255,0.25)', letterSpacing:'0.08em' }}>LAYER 4 · GLOBAL MONITOR · 195 COUNTRIES</span>
      </div>

      <div style={{ flex:1, minHeight:0, display:'grid', gridTemplateColumns:'1fr 210px' }}>
        <div style={{ position:'relative', overflow:'hidden' }}>
          <MapContainer center={[20,10]} zoom={2} minZoom={1} maxZoom={5}
            maxBounds={[[-85,-180],[85,180]]} maxBoundsViscosity={1} worldCopyJump={false}
            zoomControl={false} attributionControl={false} zoomAnimation={false}
            style={{ width:'100%', height:'100%' }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png"
              subdomains="abcd" noWrap={true} maxZoom={19} bounds={[[-85,-180],[85,180]]} />
            <CircleMarker center={[25.77,-80.19]} radius={7}
              pathOptions={{ fillColor:GOLD, color:'#fff', weight:2, fillOpacity:1 }} />
            <Polyline positions={[[25.77,-80.19],[10.48,-66.9]]}
              pathOptions={{ color:RED, weight:1.5, opacity:0.55, dashArray:'5 5' }} />
            {MESH_CLIENTS.map(([lat,lng,s,city]) => (
              <CircleMarker key={city} center={[lat,lng]} radius={5}
                pathOptions={{ fillColor:s==='safe'?GREEN:GOLD, color:'#04080F', weight:1.5, fillOpacity:0.9 }} />
            ))}
            <Marker position={[10.48,-66.9]} icon={BEACON_ICON} />
          </MapContainer>

          <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.5}}
            style={{ position:'absolute', top:8, right:8, display:'flex', gap:6, zIndex:1000 }}>
            {[['247','CLIENTS'],['195','COUNTRIES'],['9','ALERTS']].map(([v,l]) => (
              <div key={l} style={{ padding:'6px 10px', borderRadius:8, background:'rgba(3,10,18,0.95)', border:'1px solid rgba(255,255,255,0.1)', textAlign:'center' }}>
                <div style={{ fontSize:13, fontWeight:900, color:GOLD, lineHeight:1 }}>{v}</div>
                <div style={{ fontSize:7, color:'rgba(255,255,255,0.35)', letterSpacing:'0.08em', marginTop:2 }}>{l}</div>
              </div>
            ))}
          </motion.div>

          <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.2}}
            style={{ position:'absolute', bottom:8, left:8, display:'flex', gap:12, alignItems:'center', zIndex:1000, background:'rgba(3,10,18,0.82)', padding:'5px 10px', borderRadius:8 }}>
            {[[GREEN,'SAFE'],[GOLD,'MONITORING'],[RED,'EMERGENCY']].map(([c,l]) => (
              <div key={l} style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:c, boxShadow:`0 0 6px ${c}` }} />
                <span style={{ fontSize:8, color:'rgba(255,255,255,0.35)', fontWeight:600 }}>{l}</span>
              </div>
            ))}
          </motion.div>
        </div>

        <div style={{ borderLeft:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', background:'rgba(2,8,16,0.98)', overflow:'hidden' }}>
          <motion.div initial={{opacity:0,x:14}} animate={{opacity:1,x:0}} transition={{delay:0.8}}
            style={{ padding:'12px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
            <div style={{ fontSize:8, fontWeight:800, color:RED, letterSpacing:'0.15em', marginBottom:6 }}>🚨 BEACON ACTIVE · EQ 6.8</div>
            <div style={{ fontSize:12, color:'#fff', fontWeight:700, marginBottom:2 }}>Elena G. · Case #4821</div>
            <div style={{ fontSize:9, color:'rgba(255,255,255,0.45)', fontFamily:'monospace', marginBottom:2 }}>10.4815° N, 66.9037° W</div>
            <div style={{ fontSize:9, color:'rgba(255,255,255,0.35)', marginBottom:8 }}>Caracas, Venezuela · Auto-Activated</div>
            <div style={{ display:'flex', gap:5 }}>
              <div style={{ padding:'3px 7px', borderRadius:5, background:`${RED}22`, fontSize:7.5, fontWeight:800, color:RED }}>BEACON</div>
              <div style={{ padding:'3px 7px', borderRadius:5, background:'rgba(249,115,22,0.12)', fontSize:7.5, fontWeight:800, color:'#f97316' }}>OFFLINE</div>
            </div>
          </motion.div>
          <div style={{ flex:1, overflowY:'auto', padding:'8px 10px' }}>
            <p style={{ fontSize:8, fontWeight:800, color:'rgba(255,255,255,0.25)', letterSpacing:'0.15em', margin:'0 0 8px' }}>LIVE FEED</p>
            {[
              {icon:'📡',text:'BLE Mesh relay: 2 nodes · Signal reached cloud',color:RED,t:'0:00'},
              {icon:'🚒',text:'Bomberos Venezuela dispatched — GPS locked',color:'#f97316',t:'0:12'},
              {icon:'🏛️',text:'US Embassy Caracas — protocol active',color:GOLD,t:'0:28'},
              {icon:'🛡️',text:'5-tier escalation initialized',color:'#60a5fa',t:'0:41'},
              {icon:'✅',text:'Concierge Team en route · ETA 12 min',color:GREEN,t:'1:02'},
            ].map(({icon,text,color,t}) => (
              <div key={t} style={{ padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.04)', display:'flex', gap:7, alignItems:'flex-start' }}>
                <span style={{ fontSize:11, flexShrink:0 }}>{icon}</span>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontSize:9, color:'rgba(255,255,255,0.65)', lineHeight:1.4 }}>{text}</p>
                  <span style={{ fontSize:7.5, color:'rgba(255,255,255,0.2)' }}>{t} ago</span>
                </div>
                <div style={{ width:4, height:4, borderRadius:'50%', background:color, flexShrink:0, marginTop:3 }} />
              </div>
            ))}
          </div>
        </div>
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
    <Scene layer="LAYER 5 · CONCIERGE COORDINATION" title="Morales Takes Over" sub="Your dedicated concierge team contacts each service — voice, digital, or direct. Whatever the country requires.">
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
  { q: 'What about a hiker who falls and breaks their leg?', a: 'The accelerometer detects the impact automatically — same fall-detection logic as Apple Watch. GPS coordinates are cached and transmitted. If other hikers are within 100m, the BLE mesh relays the signal out. Honest limit: true remote wilderness with zero nearby devices needs satellite (SPOT/inReach). Morales is the layer for 99% of real medical travel — cities, clinics, tourist areas.' },
  { q: 'Does it work in a snowstorm?', a: 'Yes. Snow does not block GPS — satellites are above the atmosphere. The accelerometer still fires. BLE range shrinks in dense snow but still works at shorter range. The real risk is cell signal loss in remote mountains. The system still fires the alert and logs last known GPS — which is exactly what rescue teams work from.' },
  { q: 'Child trapped — can the parent remotely activate the beacon?', a: 'No platform can remotely activate another person\'s phone without pre-installed remote control software (which creates serious privacy risks). What Morales does: (1) beacon fires automatically if the phone detects trauma — no child action needed; (2) the Secret Tap protocol means a conscious child can trigger SOS with two quick taps; (3) Family Eye gives parents real-time location tracking — they see the dot stop moving instantly and the concierge is auto-alerted.' },
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
