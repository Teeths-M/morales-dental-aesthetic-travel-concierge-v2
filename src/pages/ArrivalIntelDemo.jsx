import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Volume2, VolumeX, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const GOLD   = '#D4AF37';
const DARK   = '#060B16';
const CARD   = '#0C1A1D';
const BORDER = '#2A3F4A';
const GREEN  = '#22c55e';
const BLUE   = '#60a5fa';
const PINK   = '#f472b6';

// Real Tijuana GPS — James moving toward the clinic
const CLINIC  = { lat: 32.5298, lng: -117.0198, name: 'ISSSTECALI Dental Clinic', address: 'Calle 6a & Constitución' };
const _DOCTOR_POS = { lat: 32.5298, lng: -117.0198 }; // doctor is at clinic
const MARIA_POS  = { lat: 32.5310, lng: -117.0240 }; // companion nearby

// James's approach path — 5 GPS positions moving toward clinic
const JAMES_PATH = [
  { lat: 32.5340, lng: -117.0360, eta: '12 min', dist: '1.4 km' },
  { lat: 32.5330, lng: -117.0330, eta: '9 min',  dist: '1.1 km' },
  { lat: 32.5320, lng: -117.0290, eta: '6 min',  dist: '0.7 km' },
  { lat: 32.5310, lng: -117.0250, eta: '3 min',  dist: '0.4 km' },
  { lat: 32.5298, lng: -117.0198, eta: 'ARRIVED', dist: '0 m'   },
];

const JAMES_ICON = (color) => L.divIcon({
  className: '',
  html: `<div style="width:26px;height:26px;border-radius:50%;background:${color};border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;box-shadow:0 2px 10px ${color}80;font-family:system-ui;">J</div>`,
  iconSize: [26, 26], iconAnchor: [13, 13],
});

const CLINIC_ICON = L.divIcon({
  className: '',
  html: `<div style="width:30px;height:30px;border-radius:8px;background:#0C1A1D;border:2px solid ${GOLD};display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 12px rgba(212,175,55,0.4);">🏥</div>`,
  iconSize: [30, 30], iconAnchor: [15, 15],
});

const MARIA_ICON = L.divIcon({
  className: '',
  html: `<div style="width:22px;height:22px;border-radius:50%;background:${PINK};border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#fff;font-family:system-ui;">M</div>`,
  iconSize: [22, 22], iconAnchor: [11, 11],
});

function MapFollow({ lat, lng }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], 15, { animate: true, duration: 1.0 }); }, [lat, lng, map]);
  return null;
}

function speak(text, muted, onEnd) {
  if (muted || !window.speechSynthesis) { setTimeout(onEnd || (() => {}), 300); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.85; u.pitch = 1.05; u.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find(v => v.lang === 'en-GB') || voices.find(v => v.lang.startsWith('en')) || voices[0];
  if (v) u.voice = v;
  if (onEnd) { u.onend = onEnd; u.onerror = onEnd; }
  window.speechSynthesis.speak(u);
}

export default function ArrivalIntelDemo() {
  const [step,     setStep]     = useState(0);   // 0 = James's position index
  const [running,  setRunning]  = useState(false);
  const [arrived,  setArrived]  = useState(false);
  const [muted,    setMuted]    = useState(false);
  const [_view,     _setView]     = useState('map'); // map | doctor | james | all
  const [notifications, setNotes] = useState([]);
  const timerRef = useRef(null);
  const mutableRef = useRef(false);
  mutableRef.current = muted;

  const addNote = (msg, color) => setNotes(n => [...n, { msg, color, id: Date.now() }]);

  const runApproach = useCallback(() => {
    setRunning(true);
    setArrived(false);
    setStep(0);
    setNotes([]);

    // Step through James's approach path
    const steps = [0, 1, 2, 3, 4];
    steps.forEach((s, i) => {
      const t = setTimeout(() => {
        setStep(s);
        if (s === 2) addNote('Dr. Martinez: "Patient James is 6 minutes away. Clinic — prepare." 🏥', GREEN);
        if (s === 3) addNote('Maria: "James is 3 minutes away — I see him on my map." 👩🏽‍⚕️', PINK);
        if (s === 4) {
          setArrived(true);
          setRunning(false);
          addNote('Handshake 5 confirmed ✅ — All parties notified', GOLD);
          addNote('Sandra: "James has arrived safely at the clinic." 💚', GREEN);
          // Voice handshake for James
          setTimeout(() => {
            speak(
              "James. You are here. Dr. Martinez knows you have arrived. She is ready for you. Take a slow breath. You made it. I am right here.",
              mutableRef.current
            );
          }, 800);
        }
      }, i * 2200);
      timerRef.current = t;
    });
  }, []);

  useEffect(() => () => { clearTimeout(timerRef.current); window.speechSynthesis?.cancel(); }, []);

  const james = JAMES_PATH[step];
  const isArrived = step === JAMES_PATH.length - 1 && arrived;

  return (
    <div style={{ minHeight: '100vh', background: DARK, fontFamily: '"SF Pro Display", system-ui, sans-serif' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      {/* Header */}
      <div style={{ padding: '14px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/demo" style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none', color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
          <ArrowLeft style={{ width: 15, height: 15 }} /> All demos
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/morales-m-mark.png" alt="M" style={{ width: 24, filter: `drop-shadow(0 0 6px ${GOLD})` }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>Arrival Intelligence</span>
          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: `${GOLD}20`, color: GOLD, fontWeight: 800 }}>HS-5</span>
        </div>
        <button onClick={() => { setMuted(m => !m); window.speechSynthesis?.cancel(); }}
          style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '5px 10px', color: muted ? 'rgba(255,255,255,0.3)' : GOLD, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
          {muted ? <VolumeX style={{ width: 12, height: 12 }} /> : <Volume2 style={{ width: 12, height: 12 }} />}
          {muted ? 'Unmute' : 'Mute M'}
        </button>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px' }}>

        {/* Scenario */}
        <div style={{ padding: '14px 18px', borderRadius: 14, background: `${GOLD}08`, border: `1px solid ${GOLD}25`, marginBottom: 16, textAlign: 'center' }}>
          <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 800, color: GOLD, letterSpacing: '0.1em' }}>MUTUAL ARRIVAL INTELLIGENCE</p>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
            James is approaching the clinic. <strong style={{ color: '#fff' }}>Dr. Martinez sees him moving.</strong><br />
            When he arrives — M speaks to James by voice. All parties confirm simultaneously.
          </p>
        </div>

        {/* Who sees what */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { icon: '🧑🏾', name: 'James', role: 'Patient', color: BLUE, note: 'Sees clinic on map · Hears M voice on arrival' },
            { icon: '👨🏽‍⚕️', name: 'Dr. Martinez', role: 'Doctor', color: GREEN, note: 'Sees James approaching · Prepares clinic' },
            { icon: '👩🏽‍⚕️', name: 'Maria', role: 'Companion', color: PINK, note: 'Sees both James + clinic · Coordinates' },
          ].map(p => (
            <div key={p.name} style={{ padding: '10px 12px', borderRadius: 12, background: CARD, border: `1px solid ${p.color}30`, textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{p.icon}</div>
              <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 800, color: p.color }}>{p.name}</p>
              <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>{p.note}</p>
            </div>
          ))}
        </div>

        {/* Live Map */}
        <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${isArrived ? GREEN + '60' : BORDER}`, marginBottom: 16, transition: 'border-color 0.5s' }}>
          {/* Map header */}
          <div style={{ padding: '10px 16px', background: '#080F1C', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin style={{ width: 13, height: 13, color: GOLD }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>ISSSTECALI Dental Clinic — Tijuana</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {running && <span style={{ fontSize: 9, color: BLUE, fontWeight: 800, animation: 'pulse 1s ease infinite' }}>TRACKING LIVE</span>}
              {isArrived && <span style={{ fontSize: 9, color: GREEN, fontWeight: 800 }}>✓ ARRIVED</span>}
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: running ? BLUE : isArrived ? GREEN : '#64748b', animation: running || isArrived ? 'pulse 1.5s ease infinite' : 'none' }} />
            </div>
          </div>

          {/* ETA bar */}
          {(running || isArrived) && (
            <div style={{ padding: '8px 16px', background: isArrived ? `${GREEN}15` : `${BLUE}10`, display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${isArrived ? GREEN + '30' : BORDER}` }}>
              <Navigation style={{ width: 13, height: 13, color: isArrived ? GREEN : BLUE, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: isArrived ? GREEN : '#fff' }}>
                  {isArrived ? 'James has arrived at the clinic' : `James — ETA ${james.eta} · ${james.dist} remaining`}
                </p>
              </div>
              {!isArrived && (
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
                  Step {step + 1}/{JAMES_PATH.length}
                </div>
              )}
            </div>
          )}

          {/* Real satellite map */}
          <MapContainer center={[CLINIC.lat, CLINIC.lng]} zoom={15} style={{ height: '260px' }} zoomControl={false} attributionControl={false} scrollWheelZoom={false}>
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" maxZoom={19} opacity={0.8} />
            <MapFollow lat={james.lat} lng={james.lng} />

            {/* James's path trail */}
            {step > 0 && (
              <Polyline
                positions={JAMES_PATH.slice(0, step + 1).map(p => [p.lat, p.lng])}
                pathOptions={{ color: BLUE, weight: 3, opacity: 0.7 }}
              />
            )}

            {/* James marker */}
            <Marker position={[james.lat, james.lng]} icon={JAMES_ICON(isArrived ? GREEN : BLUE)} />

            {/* Clinic */}
            <Marker position={[CLINIC.lat, CLINIC.lng]} icon={CLINIC_ICON} />

            {/* Maria */}
            {running && <Marker position={[MARIA_POS.lat, MARIA_POS.lng]} icon={MARIA_ICON} />}

            {/* EVN scan ring on clinic when James arrives */}
            {isArrived && (
              <>
                <Circle center={[CLINIC.lat, CLINIC.lng]} radius={60} pathOptions={{ color: GREEN, fillColor: GREEN, fillOpacity: 0.08, weight: 1.5 }} />
                <Circle center={[CLINIC.lat, CLINIC.lng]} radius={120} pathOptions={{ color: GREEN, fillColor: 'transparent', fillOpacity: 0, weight: 1, opacity: 0.3, dashArray: '4 3' }} />
              </>
            )}
          </MapContainer>

          {/* Map legend */}
          <div style={{ padding: '8px 16px', background: '#080F1C', display: 'flex', gap: 16, justifyContent: 'center' }}>
            {[['🧑🏾', BLUE, 'James'], ['🏥', GOLD, 'Clinic'], ['👩🏽‍⚕️', PINK, 'Maria']].map(([e, _c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 11 }}>{e}</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* START button */}
        {!running && !arrived && (
          <button onClick={runApproach} style={{
            width: '100%', padding: '14px 0', borderRadius: 14, cursor: 'pointer',
            background: `linear-gradient(135deg, ${GOLD}, #E8C85C)`,
            border: 'none', color: DARK, fontSize: 14, fontWeight: 800,
            boxShadow: `0 8px 28px rgba(212,175,55,0.4)`,
            marginBottom: 16,
          }}>
            James begins approach — Start tracking
          </button>
        )}

        {/* Live notifications */}
        {notifications.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifications.map((n, _i) => (
              <div key={n.id} style={{ padding: '10px 14px', borderRadius: 12, background: CARD, border: `1px solid ${n.color}30`, animation: 'fadeUp 0.35s ease', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: n.color, flexShrink: 0, animation: 'pulse 1.5s ease infinite' }} />
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{n.msg}</p>
              </div>
            ))}
          </div>
        )}

        {/* Voice handshake confirmation */}
        {isArrived && (
          <div style={{ marginTop: 16, padding: '18px 20px', borderRadius: 16, background: `${GOLD}10`, border: `1px solid ${GOLD}40`, textAlign: 'center', animation: 'fadeUp 0.5s ease' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${GOLD}20`, border: `2px solid ${GOLD}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 16, fontWeight: 800, color: GOLD }}>M</div>
            <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 800, color: '#fff', fontStyle: 'italic' }}>
              "James. You are here. Dr. Martinez knows you have arrived.<br />She is ready for you. Take a slow breath. You made it."
            </p>
            <p style={{ margin: '10px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
              M spoke to James by voice — Handshake 5 complete ✓
            </p>
            <button onClick={() => { setArrived(false); setStep(0); setNotes([]); window.speechSynthesis?.cancel(); }}
              style={{ marginTop: 14, padding: '9px 22px', borderRadius: 12, cursor: 'pointer', background: CARD, border: `1px solid ${BORDER}`, color: '#fff', fontSize: 12, fontWeight: 600 }}>
              Replay
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
