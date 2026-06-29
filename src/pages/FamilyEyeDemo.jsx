import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, CheckCircle2, Heart } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const GOLD  = '#D4AF37';
const DARK  = '#060B16';
const CARD  = '#0C1A1D';
const BORDER = '#2A3F4A';
const GREEN = '#22c55e';

// Tom's real journey breadcrumbs through Tijuana
const TOM_TRAIL = [
  { lat: 32.5340, lng: -117.0360, label: 'Grand Hotel Tijuana',     time: '08:14', status: 'SAFE' },
  { lat: 32.5332, lng: -117.0340, label: 'Hotel exit — walking',    time: '09:22', status: 'SAFE' },
  { lat: 32.5320, lng: -117.0310, label: 'Avenida Revolución',      time: '09:31', status: 'SAFE' },
  { lat: 32.5310, lng: -117.0280, label: 'Calle 6a',                time: '09:38', status: 'SAFE' },
  { lat: 32.5298, lng: -117.0198, label: 'ISSSTECALI Dental Clinic', time: '09:47', status: 'SAFE' },
];

const CURRENT = TOM_TRAIL[TOM_TRAIL.length - 1];
const START   = TOM_TRAIL[0];

// Custom green patient marker
const TOM_ICON = L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;border-radius:50%;background:${GREEN};border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;box-shadow:0 2px 12px rgba(34,197,94,0.6);font-family:system-ui;">T</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const START_ICON = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#60a5fa;border:2px solid #fff;box-shadow:0 1px 6px rgba(96,165,250,0.5);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function MapCenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], 16, { animate: true, duration: 1.2 }); }, [lat, lng, map]);
  return null;
}

// Face ID scan animation
function FaceIDScan({ onComplete }) {
  const [step, setStep] = useState(0);
  const onCompleteRef = React.useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Empty deps — timers fire once on mount. Using ref to avoid stale closure.
  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 1800);
    const t2 = setTimeout(() => setStep(2), 2800);
    const t3 = setTimeout(() => onCompleteRef.current(), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div style={{ minHeight: 'calc(100vh - 57px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: '0 0 32px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>MORALES CONCIERGE — SANDRA WILLIAMS</p>

        {/* Face ID frame */}
        <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto 28px' }}>
          {/* Corner brackets */}
          {[['0','0','right','bottom'],['auto','0','left','bottom'],['0','auto','right','top'],['auto','auto','left','top']].map(([b,r,br,tr],i) => (
            <div key={i} style={{
              position: 'absolute', bottom: b, right: r, top: tr === 'top' ? 0 : 'auto', left: br === 'left' ? 0 : 'auto',
              width: 28, height: 28,
              borderTop: tr === 'top' ? `2px solid ${step >= 1 ? GREEN : GOLD}` : 'none',
              borderBottom: b === '0' ? `2px solid ${step >= 1 ? GREEN : GOLD}` : 'none',
              borderLeft: br === 'left' ? `2px solid ${step >= 1 ? GREEN : GOLD}` : 'none',
              borderRight: br === 'right' ? `2px solid ${step >= 1 ? GREEN : GOLD}` : 'none',
              transition: 'border-color 0.4s',
            }} />
          ))}

          {/* Face emoji */}
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>
            👩🏽
          </div>

          {/* Scan line */}
          {step === 0 && (
            <div style={{
              position: 'absolute', left: 10, right: 10, height: 2,
              background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
              animation: 'scanLine 1.5s ease infinite',
              top: '50%',
            }} />
          )}
        </div>

        <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: step >= 1 ? GREEN : '#fff' }}>
          {step === 0 ? 'Scanning...' : step === 1 ? 'Face recognised ✓' : 'Welcome, Sandra'}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
          {step === 0 ? 'Hold still' : step === 1 ? 'Unlocking Tom\'s location...' : 'Opening map...'}
        </p>
      </div>

      <style>{`
        @keyframes scanLine { 0%{top:10%} 50%{top:85%} 100%{top:10%} }
      `}</style>
    </div>
  );
}

export default function FamilyEyeDemo() {
  const [phase, setPhase] = useState('intro'); // intro | scanning | map
  const [liveTime, setLiveTime] = useState('');
  const [timeSince, setTimeSince] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
      setTimeSince(s => s + 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: DARK, fontFamily: '"SF Pro Display", system-ui, sans-serif' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      {/* Header */}
      <div style={{ padding: '14px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/demo" style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none', color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
          <ArrowLeft style={{ width: 15, height: 15 }} /> All demos
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/morales-m-mark.png" alt="M" style={{ width: 24, filter: `drop-shadow(0 0 6px ${GOLD})` }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>The Mother's Eye</span>
          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: `${GOLD}20`, color: GOLD, fontWeight: 800 }}>CR 18</span>
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>{liveTime}</div>
      </div>

      {/* Intro */}
      {phase === 'intro' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 28px', textAlign: 'center', minHeight: 'calc(100vh - 57px)' }}>
          <div style={{ fontSize: 52, marginBottom: 20 }}>👩🏽</div>
          <h1 style={{ margin: '0 0 12px', fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Sandra is worried</h1>
          <p style={{ margin: '0 0 8px', fontSize: 14, color: 'rgba(255,255,255,0.5)', maxWidth: 420, lineHeight: 1.7 }}>
            Her son Tom is in Tijuana, Mexico for dental surgery. It's 9:50 AM. She hasn't heard from him.
          </p>
          <p style={{ margin: '0 0 40px', fontSize: 14, color: '#fff', maxWidth: 420, lineHeight: 1.7 }}>
            She opens M. She doesn't need a link. She doesn't need to call. She just needs to <strong style={{ color: GOLD }}>see him.</strong>
          </p>
          <button onClick={() => setPhase('scanning')} style={{
            padding: '16px 44px', borderRadius: 16, cursor: 'pointer',
            background: `linear-gradient(135deg, ${GOLD}, #E8C85C)`,
            border: 'none', color: DARK, fontSize: 15, fontWeight: 800,
            boxShadow: `0 12px 36px rgba(212,175,55,0.4)`,
          }}>
            Sandra opens M — Face ID
          </button>
        </div>
      )}

      {/* Face scan */}
      {phase === 'scanning' && <FaceIDScan onComplete={() => setPhase('map')} />}

      {/* Map view */}
      {phase === 'map' && (
        <div style={{ animation: 'fadeUp 0.5s ease' }}>

          {/* SAFE status banner */}
          <div style={{ padding: '12px 24px', background: `${GREEN}15`, borderBottom: `1px solid ${GREEN}30`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 style={{ width: 18, height: 18, color: GREEN, flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: GREEN }}>Tom is SAFE — Tijuana, Mexico</p>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Last GPS update: {timeSince} seconds ago · Clinic area · No alerts</p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: GREEN, animation: 'pulse 1.5s ease infinite' }} />
              <span style={{ fontSize: 10, color: GREEN, fontWeight: 700 }}>LIVE</span>
            </div>
          </div>

          {/* Real satellite map */}
          <div style={{ position: 'relative' }}>
            <MapContainer
              center={[CURRENT.lat, CURRENT.lng]}
              zoom={15}
              style={{ height: '320px', width: '100%' }}
              zoomControl={true}
              attributionControl={false}
              scrollWheelZoom={true}
            >
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
                opacity={0.8}
              />
              <MapCenter lat={CURRENT.lat} lng={CURRENT.lng} />

              {/* Full breadcrumb trail */}
              <Polyline
                positions={TOM_TRAIL.map(p => [p.lat, p.lng])}
                pathOptions={{ color: '#60a5fa', weight: 3, opacity: 0.7 }}
              />

              {/* Start point */}
              <Marker position={[START.lat, START.lng]} icon={START_ICON} />

              {/* Past breadcrumb dots */}
              {TOM_TRAIL.slice(1, -1).map((p, i) => (
                <CircleMarker key={i} center={[p.lat, p.lng]} radius={4}
                  pathOptions={{ color: '#fff', fillColor: '#60a5fa', fillOpacity: 0.8, weight: 1 }}
                />
              ))}

              {/* Tom — current position */}
              <Marker position={[CURRENT.lat, CURRENT.lng]} icon={TOM_ICON} />
            </MapContainer>

            {/* Map label */}
            <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, pointerEvents: 'none' }}>
              <div style={{ background: 'rgba(6,11,22,0.88)', border: `1px solid ${GREEN}40`, borderRadius: 8, padding: '4px 12px', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Tom — {CURRENT.label}</span>
              </div>
            </div>
          </div>

          {/* Journey timeline */}
          <div style={{ padding: '16px 20px', maxWidth: 560, margin: '0 auto' }}>
            <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 800, color: GOLD, letterSpacing: '0.08em' }}>TOM'S JOURNEY TODAY</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TOM_TRAIL.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: i === TOM_TRAIL.length - 1 ? `${GREEN}10` : CARD, border: `1px solid ${i === TOM_TRAIL.length - 1 ? GREEN + '40' : BORDER}` }}>
                  <MapPin style={{ width: 13, height: 13, color: i === TOM_TRAIL.length - 1 ? GREEN : '#60a5fa', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: i === TOM_TRAIL.length - 1 ? '#fff' : 'rgba(255,255,255,0.6)' }}>{p.label}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock style={{ width: 11, height: 11, color: 'rgba(255,255,255,0.3)' }} />
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{p.time}</span>
                    {i === TOM_TRAIL.length - 1 && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: `${GREEN}20`, color: GREEN, fontWeight: 800 }}>NOW</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom message */}
            <div style={{ marginTop: 20, padding: '16px 20px', borderRadius: 14, background: `${GOLD}08`, border: `1px solid ${GOLD}25`, textAlign: 'center' }}>
              <Heart style={{ width: 16, height: 16, color: GOLD, margin: '0 auto 8px' }} />
              <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#fff' }}>Sandra didn't need to call. She didn't need a link.</p>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                Face ID → Tom's map. 3 seconds. That's The Mother's Eye.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
