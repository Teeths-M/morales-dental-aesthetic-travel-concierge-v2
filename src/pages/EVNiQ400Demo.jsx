/**
 * EVN-iQ400 Cinematic Demo
 * 100% offline/airplane-mode capable — all data is hardcoded.
 * Shows a patient walking through Tijuana, Mexico entering a danger zone
 * and the full EVN-iQ400 threat detection + alert cascade.
 */
import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Shield, Wifi, WifiOff, Plane, Globe, ArrowLeft, RotateCcw, MapPin, Phone } from 'lucide-react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Circle } from 'react-leaflet';

const GOLD = '#D4AF37';
const DARK = '#060B16';

// ── Scenario: Patient walking through Tijuana, MX ──────────────────────────
const WAYPOINTS = [
  {
    id: 1,
    label: 'Grand Hotel Tijuana',
    sublabel: 'Blvd. Agua Caliente 4500',
    risk: 'SAFE',
    lat: 32.5340, lng: -117.0360,
    svg: { x: 62, y: 76 },
    scanMsg: 'International hotel zone — well-lit, security on-site.',
    scanDuration: 1800,
  },
  {
    id: 2,
    label: 'Avenida Revolución',
    sublabel: 'Tourist & Shopping District',
    risk: 'SAFE',
    lat: 32.5322, lng: -117.0295,
    svg: { x: 142, y: 118 },
    scanMsg: 'Tourist corridor — high foot traffic, police presence.',
    scanDuration: 2000,
  },
  {
    id: 3,
    label: 'ISSSTECALI Dental Clinic',
    sublabel: 'Calle 6a & Constitución',
    risk: 'SAFE',
    lat: 32.5298, lng: -117.0198,
    svg: { x: 242, y: 168 },
    scanMsg: 'Medical tourism zone — vetted by Morales. Safe corridor.',
    scanDuration: 2200,
  },
  {
    id: 4,
    label: 'Calle Coahuila',
    sublabel: 'Commercial Street',
    risk: 'MODERATE',
    lat: 32.5276, lng: -117.0148,
    svg: { x: 302, y: 210 },
    scanMsg: 'Elevated nighttime activity. Petty theft reported in last 30 days.',
    scanDuration: 2500,
  },
  {
    id: 5,
    label: 'Zona Norte',
    sublabel: 'Calle 1ra, Tijuana',
    risk: 'HIGH',
    lat: 32.5262, lng: -117.0098,
    svg: { x: 362, y: 238 },
    scanMsg: 'KNOWN HIGH-RISK ZONE · Gang activity · Avoid after dark.',
    scanDuration: 0,
  },
];

// Timeline (ms from demo start):
// t=0      → start at waypoint 1
// t=2000   → scan 1 complete
// t=3200   → move to WP2
// t=5500   → scan 2 complete
// t=6800   → move to WP3
// t=9500   → scan 3 complete
// t=11000  → move to WP4
// t=14000  → scan 4 (MODERATE alert fires)
// t=15500  → move to WP5
// t=18500  → HIGH RISK DETECTED — dramatic sequence
const TIMELINE = [
  { t: 0,     action: 'arrive',  wp: 0 },
  { t: 2000,  action: 'scan',    wp: 0 },
  { t: 3500,  action: 'move',    wp: 1 },
  { t: 5800,  action: 'scan',    wp: 1 },
  { t: 7200,  action: 'move',    wp: 2 },
  { t: 9700,  action: 'scan',    wp: 2 },
  { t: 11200, action: 'move',    wp: 3 },
  { t: 13900, action: 'scan',    wp: 3 },  // MODERATE alert
  { t: 15600, action: 'move',    wp: 4 },
  { t: 18800, action: 'scan',    wp: 4 },  // HIGH alert
];

// Risk config
const RISK = {
  SAFE:     { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.4)',  emoji: '✅', label: 'SAFE' },
  MODERATE: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.4)', emoji: '⚠️', label: 'MODERATE RISK' },
  HIGH:     { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.5)',  emoji: '🔴', label: 'HIGH RISK' },
};

// SVG path string from waypoints
const svgPath = WAYPOINTS.map((w, i) => `${i === 0 ? 'M' : 'L'} ${w.svg.x} ${w.svg.y}`).join(' ');

// ── Sub-components ──────────────────────────────────────────────────────────

function OfflineBadge({ mode }) {
  const configs = {
    online:   { icon: Wifi,    color: '#22c55e', label: 'ONLINE' },
    offline:  { icon: WifiOff, color: '#f59e0b', label: 'OFFLINE' },
    airplane: { icon: Plane,   color: '#60a5fa', label: 'AIRPLANE' },
  };
  const cfg = configs[mode];
  const Icon = cfg.icon;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: `${cfg.color}15`, border: `1px solid ${cfg.color}40` }}>
      <Icon style={{ width: 11, height: 11, color: cfg.color }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, letterSpacing: '0.1em' }}>{cfg.label}</span>
    </div>
  );
}

function ScanLine({ text, risk, isScanning }) {
  const cfg = risk ? RISK[risk] : null;
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
        background: cfg ? `${cfg.color}20` : 'rgba(255,255,255,0.06)',
        border: `1.5px solid ${cfg ? cfg.color : 'rgba(255,255,255,0.15)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9,
      }}>
        {isScanning ? '◌' : cfg ? cfg.emoji : '·'}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 11, color: cfg ? cfg.color : 'rgba(255,255,255,0.6)', fontWeight: cfg ? 700 : 400, lineHeight: 1.5 }}>
          {text}
        </p>
      </div>
    </motion.div>
  );
}

// ── Main Demo Component ─────────────────────────────────────────────────────
export default function EVNiQ400Demo() {
  const [mode, setMode]           = useState('online');
  const [running, setRunning]     = useState(false);
  const [done, setDone]           = useState(false);
  const [currentWP, setCurrentWP] = useState(0);
  const [moving, setMoving]       = useState(false);
  const [scanLogs, setScanLogs]   = useState([]);
  const [alert, setAlert]         = useState(null);   // { risk, wp }
  const [showDanger, setShowDanger] = useState(false);
  const [highRiskSeq, setHighRiskSeq] = useState(0); // 0=none,1=detecting,2=analyzing,3=confirmed
  const timersRef = useRef([]);

  const addLog = useCallback((text, risk = null, isScanning = false) => {
    setScanLogs(prev => [...prev.slice(-30), { text, risk, isScanning, id: Date.now() + Math.random() }]);
  }, []);

  const schedule = useCallback((fn, delay) => {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
    return id;
  }, []);

  const reset = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setRunning(false); setDone(false); setCurrentWP(0); setMoving(false);
    setScanLogs([]); setAlert(null); setShowDanger(false); setHighRiskSeq(0);
  }, []);

  // Mode-specific messaging — what makes each mode LOOK different
  const MSG = {
    online: {
      boot:    ['📡 Connecting to live advisory network...', '✅ Connected · 14 government advisory sources active · AI layer ready'],
      scan:    '⏳ Querying live AI intelligence...',
      cross:   '⚡ Cross-referencing LLM threat model · 14 live data sources...',
      confirm: '🔴 HIGH RISK CONFIRMED via LLM · 14 live sources · AI confidence: 98%',
    },
    offline: {
      boot:    ['📱 Network unavailable · Loading 24h intelligence cache...', '✅ Cache loaded · Last sync 6h ago · 200+ risk zones active'],
      scan:    '⏳ Checking local intelligence cache...',
      cross:   '⚡ Cache hit: Zona Norte flagged in last 24h · verifying...',
      confirm: '🔴 HIGH RISK CONFIRMED via cache · Zona Norte in 24h local database · No network needed',
    },
    airplane: {
      boot:    ['✈️ Airplane mode · Zero network dependency activated', '✅ Morales Offline KB v4.0 loaded · 200+ pre-loaded risk zones · 30+ countries'],
      scan:    '⏳ Scanning offline knowledge base...',
      cross:   '⚡ Offline KB match: Zona Norte — pre-loaded gang zone data...',
      confirm: '🔴 HIGH RISK CONFIRMED via Offline KB · No internet · No API · Pre-loaded Morales Intelligence',
    },
  };

  const runDemo = useCallback(() => {
    if (running) return;
    reset();
    setRunning(true);
    const m = MSG[mode] || MSG.online;

    // t=0 — boot sequence (mode-specific)
    addLog('📡 GPS signal acquired · 32.5340°N, 117.0360°W');
    addLog(m.boot[0], null, true);
    schedule(() => addLog(m.boot[1]), 800);
    schedule(() => addLog(`🛡️ Patient: Sofia M. · EVN-iQ400 ACTIVE`), 1200);

    // t=1600 — WP0
    schedule(() => { setCurrentWP(0); addLog(`📍 Location: ${WAYPOINTS[0].label}`); }, 1600);
    schedule(() => addLog(m.scan, null, true), 2000);
    schedule(() => addLog(`${RISK.SAFE.emoji} ${WAYPOINTS[0].label} — ${WAYPOINTS[0].scanMsg}`, 'SAFE'), 3000);

    // t=3500 — move to WP1
    schedule(() => { setMoving(true); addLog('🔄 Patient in motion...'); }, 3500);
    schedule(() => { setCurrentWP(1); setMoving(false); addLog(`📍 Location: ${WAYPOINTS[1].label}`); }, 4500);
    schedule(() => addLog(m.scan, null, true), 4800);
    schedule(() => addLog(`${RISK.SAFE.emoji} ${WAYPOINTS[1].label} — ${WAYPOINTS[1].scanMsg}`, 'SAFE'), 5700);

    // t=6200 — move to WP2
    schedule(() => { setMoving(true); addLog('🔄 Patient in motion...'); }, 6200);
    schedule(() => { setCurrentWP(2); setMoving(false); addLog(`📍 Location: ${WAYPOINTS[2].label}`); }, 7200);
    schedule(() => addLog(m.scan, null, true), 7500);
    schedule(() => addLog(`${RISK.SAFE.emoji} ${WAYPOINTS[2].label} — ${WAYPOINTS[2].scanMsg}`, 'SAFE'), 8400);

    // t=9000 — move to WP3 MODERATE
    schedule(() => { setMoving(true); addLog('🔄 Patient heading toward commercial district...'); }, 9000);
    schedule(() => { setCurrentWP(3); setMoving(false); addLog(`📍 Location: ${WAYPOINTS[3].label}`); }, 10000);
    schedule(() => addLog(m.scan, null, true), 10300);
    schedule(() => addLog('⚡ Elevated activity signal detected...', null, true), 11000);
    schedule(() => {
      addLog(`${RISK.MODERATE.emoji} ${WAYPOINTS[3].label} — ${WAYPOINTS[3].scanMsg}`, 'MODERATE');
      setAlert({ risk: 'MODERATE', wp: WAYPOINTS[3] });
    }, 12000);

    // t=14000 — move to WP4 HIGH
    schedule(() => { setAlert(null); setMoving(true); addLog('🔄 PATIENT CONTINUES MOVING — entering restricted zone...'); }, 14000);
    schedule(() => { setCurrentWP(4); setMoving(false); addLog(`📍 Location: ${WAYPOINTS[4].label}`); }, 15000);
    schedule(() => addLog(m.scan, null, true), 15300);
    schedule(() => { setHighRiskSeq(1); addLog(m.cross, null, true); }, 16000);
    schedule(() => { setHighRiskSeq(2); addLog('🔴 GANG ACTIVITY ZONE · 3 incidents in 30 days · THREAT CONFIRMED', null, true); }, 16800);
    schedule(() => setShowDanger(true), 17200);
    schedule(() => {
      setHighRiskSeq(3);
      addLog(m.confirm, 'HIGH');
      setAlert({ risk: 'HIGH', wp: WAYPOINTS[4] });
    }, 17800);
    schedule(() => setDone(true), 21000);

  }, [running, mode, addLog, schedule, reset]); // eslint-disable-line react-hooks/exhaustive-deps

  const curWPData = WAYPOINTS[currentWP];

  return (
    <div style={{ minHeight: '100vh', background: DARK, color: '#fff', fontFamily: '"SF Pro Display", system-ui, sans-serif' }}>

      {/* ── Header ── */}
      <div style={{ background: 'rgba(6,11,22,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <Link to="/demo" style={{ color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontSize: 12 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Demo Hub
        </Link>
        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${GOLD}18`, border: `1px solid ${GOLD}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Globe style={{ width: 14, height: 14, color: GOLD }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>EVN-iQ400</p>
            <p style={{ margin: 0, fontSize: 9, color: GOLD, letterSpacing: '0.1em', fontWeight: 700 }}>ENVIRONMENTAL INTELLIGENCE · LIVE DEMO</p>
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Mode selector */}
          {['online', 'offline', 'airplane'].map(m => (
            <button key={m} onClick={() => { if (!running || done) { reset(); setMode(m); } }}
              style={{ padding: '5px 12px', borderRadius: 99, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer', transition: 'all 0.2s',
                background: mode === m ? `${m === 'online' ? '#22c55e' : m === 'offline' ? '#f59e0b' : '#60a5fa'}20` : 'transparent',
                border: `1px solid ${mode === m ? (m === 'online' ? '#22c55e' : m === 'offline' ? '#f59e0b' : '#60a5fa') : 'rgba(255,255,255,0.15)'}`,
                color: mode === m ? (m === 'online' ? '#22c55e' : m === 'offline' ? '#f59e0b' : '#60a5fa') : 'rgba(255,255,255,0.4)',
              }}>
              {m === 'airplane' ? '✈ AIRPLANE' : m.toUpperCase()}
            </button>
          ))}

          {done ? (
            <button onClick={() => { reset(); setTimeout(runDemo, 400); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 99, background: `${GOLD}20`, border: `1px solid ${GOLD}60`, color: GOLD, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              <RotateCcw style={{ width: 12, height: 12 }} /> Replay
            </button>
          ) : (
            <OfflineBadge mode={mode} />
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* ── LEFT: City Map ── */}
        <div style={{ background: '#080F1C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, overflow: 'hidden' }}>
          {/* Map header */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin style={{ width: 14, height: 14, color: GOLD }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Tijuana, Baja California, México</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {moving && (
                <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }}
                  style={{ fontSize: 10, color: '#60a5fa', fontWeight: 700 }}>TRACKING</motion.div>
              )}
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: moving ? '#60a5fa' : '#22c55e', boxShadow: `0 0 8px ${moving ? '#60a5fa' : '#22c55e'}` }} />
            </div>
          </div>

          {/* Real Satellite Map — Esri World Imagery */}
          <div style={{ position: 'relative' }}>
            <style>{`
              .evn-patient { width:26px;height:26px;border-radius:50%;background:var(--pc);border:2.5px solid #060B16;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;box-shadow:0 0 12px var(--pc); }
              .evn-scan-ring { width:80px;height:80px;border-radius:50%;border:1.5px solid rgba(212,175,55,0.35);animation:evnPulse 2.5s ease-out infinite;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%); }
              @keyframes evnPulse { 0%{transform:translate(-50%,-50%) scale(0.4);opacity:0.8} 100%{transform:translate(-50%,-50%) scale(1.8);opacity:0} }
              .leaflet-container { background: #1a2035 !important; }
            `}</style>
            <MapContainer
              key={`evn-map-${currentWP}`}
              center={[curWPData.lat, curWPData.lng]}
              zoom={15}
              style={{ height: 280, width: '100%' }}
              zoomControl={false}
              attributionControl={false}
              scrollWheelZoom={false}
              dragging={false}
            >
              {/* Esri satellite imagery */}
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
              {/* Street labels over satellite */}
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
                opacity={0.8}
              />

              {/* Full ghost route */}
              <Polyline
                positions={WAYPOINTS.map(w => [w.lat, w.lng])}
                pathOptions={{ color: 'rgba(255,255,255,0.2)', weight: 2, dashArray: '5 4' }}
              />

              {/* Travelled route */}
              <Polyline
                positions={WAYPOINTS.slice(0, currentWP + 1).map(w => [w.lat, w.lng])}
                pathOptions={{ color: GOLD, weight: 3, opacity: 0.85 }}
              />

              {/* Moderate risk zone */}
              {currentWP >= 3 && (
                <Circle
                  center={[WAYPOINTS[3].lat, WAYPOINTS[3].lng]}
                  radius={120}
                  pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.08, weight: 1.5, dashArray: '4 3' }}
                />
              )}

              {/* High risk danger zone */}
              {(showDanger || currentWP >= 4) && (
                <Circle
                  center={[WAYPOINTS[4].lat, WAYPOINTS[4].lng]}
                  radius={200}
                  pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.1, weight: 2 }}
                />
              )}

              {/* Past waypoint dots */}
              {WAYPOINTS.slice(0, currentWP).map((w, i) => (
                <CircleMarker key={i} center={[w.lat, w.lng]} radius={6}
                  pathOptions={{ color: '#060B16', fillColor: RISK[w.risk].color, fillOpacity: 0.9, weight: 2 }}
                />
              ))}

              {/* Current patient position */}
              <CircleMarker
                center={[curWPData.lat, curWPData.lng]}
                radius={10}
                pathOptions={{ color: '#060B16', fillColor: RISK[curWPData.risk].color, fillOpacity: 1, weight: 2.5 }}
              />
              {/* EVN scan ring */}
              {running && (
                <Circle
                  center={[curWPData.lat, curWPData.lng]}
                  radius={180}
                  pathOptions={{ color: GOLD, fillColor: 'transparent', fillOpacity: 0, weight: 1, opacity: 0.4 }}
                />
              )}
            </MapContainer>

            {/* Current location label overlay */}
            <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, pointerEvents: 'none' }}>
              <div style={{ background: 'rgba(6,11,22,0.88)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '4px 12px', backdropFilter: 'blur(8px)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{curWPData.label}</span>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, padding: '8px 16px', justifyContent: 'center', background: 'rgba(6,11,22,0.6)' }}>
              {[['#22c55e', 'Safe'], ['#f59e0b', 'Moderate'], ['#ef4444', 'High Risk'], [GOLD, 'Route']].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Patient status bar */}
          <div style={{ margin: '0 16px 16px', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${RISK[curWPData.risk].color}20`, border: `2px solid ${RISK[curWPData.risk].color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: RISK[curWPData.risk].color, flexShrink: 0 }}>S</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#fff' }}>Sofia M. · Active Journey · Tijuana, MX</p>
              <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{curWPData.label} · {curWPData.sublabel}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 99, background: `${RISK[curWPData.risk].color}15`, border: `1px solid ${RISK[curWPData.risk].color}40` }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: RISK[curWPData.risk].color }}>{RISK[curWPData.risk].label}</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Live Feed ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* EVN-iQ400 status */}
          <div style={{ background: '#080F1C', border: `1px solid ${GOLD}30`, borderRadius: 20, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <motion.div
                animate={{ boxShadow: running ? [`0 0 0 0 ${GOLD}40`, `0 0 0 8px ${GOLD}00`, `0 0 0 0 ${GOLD}40`] : 'none' }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ width: 32, height: 32, borderRadius: 10, background: `${GOLD}15`, border: `1px solid ${GOLD}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Globe style={{ width: 15, height: 15, color: GOLD }} />
              </motion.div>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#fff' }}>EVN-iQ400 Live Feed</p>
                <p style={{ margin: 0, fontSize: 9, color: GOLD, letterSpacing: '0.1em' }}>
                  {highRiskSeq >= 3 ? 'THREAT CONFIRMED' : highRiskSeq >= 1 ? 'ANALYZING THREAT' : running ? 'SCANNING ACTIVE' : 'STANDBY'}
                </p>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <OfflineBadge mode={mode} />
              </div>
            </div>

            {/* High-risk dramatic indicator */}
            <AnimatePresence>
              {highRiskSeq >= 1 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ padding: '10px 14px', borderRadius: 12, marginBottom: 12,
                    background: highRiskSeq >= 3 ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${highRiskSeq >= 3 ? 'rgba(239,68,68,0.6)' : 'rgba(239,68,68,0.3)'}`,
                  }}
                >
                  <motion.p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#ef4444', letterSpacing: '0.02em' }}
                    animate={highRiskSeq < 3 ? { opacity: [1, 0.4, 1] } : {}}
                    transition={{ duration: 0.6, repeat: highRiskSeq < 3 ? Infinity : 0 }}
                  >
                    {highRiskSeq === 1 && '⚡ THREAT SIGNATURE DETECTED · ANALYZING...'}
                    {highRiskSeq === 2 && '🔴 PATTERN MATCH CONFIRMED · PROCESSING...'}
                    {highRiskSeq >= 3 && '🔴 HIGH RISK CONFIRMED · ALERT DISPATCHED'}
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Play button — shown before demo starts */}
            {!running && !done && scanLogs.length === 0 && (
              <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
                  Select a mode above, then press Play
                </p>
                <motion.button
                  onClick={runDemo}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '14px 32px', borderRadius: 50,
                    background: `linear-gradient(135deg, ${GOLD} 0%, #E8C85C 100%)`,
                    border: 'none', cursor: 'pointer', color: '#060B16',
                    fontSize: 14, fontWeight: 800, letterSpacing: '0.02em',
                    boxShadow: `0 8px 32px ${GOLD}50`,
                  }}
                >
                  ▶ Run Demo
                </motion.button>
                <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>~18 seconds · works offline</p>
              </div>
            )}

            {/* Scan log */}
            <div style={{ maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
              <AnimatePresence initial={false}>
                {scanLogs.map(log => (
                  <ScanLine key={log.id} text={log.text} risk={log.risk} isScanning={log.isScanning} />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Mode info */}
          <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14 }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', marginBottom: 6 }}>CURRENT MODE</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <OfflineBadge mode={mode} />
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                {mode === 'online' && 'Live government advisories + AI area assessment via LLM. Full intelligence layer active.'}
                {mode === 'offline' && 'No internet — EVN-iQ400 uses 24h localStorage cache + offline keyword database. Zero-dependency operation.'}
                {mode === 'airplane' && 'Airplane mode — EVN-iQ400 offline knowledge base active. 50+ hardcoded high-risk zones across 6 countries. Alerts fire without any network.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── DRAMATIC ALERT OVERLAY ── */}
      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            style={{
              position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              width: 'min(500px, calc(100vw - 32px))', zIndex: 9999,
              borderRadius: 20, overflow: 'hidden',
              background: alert.risk === 'HIGH' ? '#100404' : '#0d0c00',
              border: `2px solid ${alert.risk === 'HIGH' ? 'rgba(239,68,68,0.7)' : 'rgba(245,158,11,0.6)'}`,
              boxShadow: `0 24px 80px ${alert.risk === 'HIGH' ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.3)'}`,
            }}
          >
            {/* Alert top bar */}
            <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${alert.risk === 'HIGH' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                  background: alert.risk === 'HIGH' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                }}
              >
                {alert.risk === 'HIGH' ? '🔴' : '⚠️'}
              </motion.div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Globe style={{ width: 11, height: 11, color: GOLD }} />
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: GOLD }}>EVN-iQ400 ALERT</span>
                </div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: alert.risk === 'HIGH' ? '#ef4444' : '#f59e0b', letterSpacing: '-0.01em' }}>
                  {alert.risk === 'HIGH' ? '🔴 High-Risk Area Detected' : '⚠️ Area Advisory — Moderate Risk'}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                  {alert.wp.label} · {alert.wp.sublabel}
                </p>
              </div>
              <button onClick={() => setAlert(null)}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ×
              </button>
            </div>

            {/* Alert body */}
            <div style={{ padding: '14px 18px' }}>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.65 }}>
                {alert.wp.scanMsg}
              </p>

              {alert.risk === 'HIGH' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <a href="/emergency"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 12, background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: '#fff', fontSize: 12, fontWeight: 800, textDecoration: 'none', boxShadow: '0 4px 20px rgba(239,68,68,0.4)' }}
                  >
                    <Phone style={{ width: 13, height: 13 }} /> SOS — Contact Concierge
                  </a>
                  <button onClick={() => setAlert(null)}
                    style={{ padding: '10px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Dismiss
                  </button>
                </div>
              )}
              {alert.risk === 'MODERATE' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setAlert(null)}
                    style={{ flex: 1, padding: '10px 0', borderRadius: 12, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', color: '#f59e0b', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Understood — Stay Alert
                  </button>
                </div>
              )}
            </div>

            {/* Mode indicator */}
            <div style={{ padding: '8px 18px 10px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <OfflineBadge mode={mode} />
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>
                {mode === 'online' ? 'AI-assessed · live data' : mode === 'offline' ? 'Local cache · 24h TTL' : 'Offline KB · zero network'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HIGH RISK FLASH ── */}
      <AnimatePresence>
        {highRiskSeq >= 3 && showDanger && !done && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.15, 0] }}
            transition={{ duration: 0.5, times: [0, 0.3, 1] }}
            style={{ position: 'fixed', inset: 0, background: '#ef4444', pointerEvents: 'none', zIndex: 9998 }}
          />
        )}
      </AnimatePresence>

      {/* Done state */}
      {done && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ maxWidth: 1200, margin: '0 auto 24px', padding: '0 20px' }}>
          <div style={{ padding: '14px 20px', background: `${GOLD}10`, border: `1px solid ${GOLD}30`, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Shield style={{ width: 18, height: 18, color: GOLD, flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
              <strong style={{ color: GOLD }}>Demo complete.</strong> In production: alerts fire in the patient's native notification center (push + SMS fallback). Works in all three modes — online, offline, and airplane. Try switching modes above and replaying.
            </p>
            <button onClick={() => { reset(); setTimeout(runDemo, 400); }}
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 99, background: `${GOLD}20`, border: `1px solid ${GOLD}60`, color: GOLD, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              <RotateCcw style={{ width: 12, height: 12 }} /> Replay
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
