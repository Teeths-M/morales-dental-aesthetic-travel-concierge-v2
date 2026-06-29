import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, CheckCircle2, Heart, Navigation, Share2, ExternalLink } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
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

function openNav(url) { window.open(url, '_blank', 'noopener,noreferrer'); }

export default function FamilyEyeDemo() {
  const [phase,       setPhase]       = useState('intro');
  const [liveTime,    setLiveTime]    = useState('');
  const [tomStep,     setTomStep]     = useState(0);   // which waypoint Tom is at
  const [sinceUpdate, setSinceUpdate] = useState(0);   // seconds since last GPS ping
  const [copied,      setCopied]      = useState(false);
  const [arrived,     setArrived]     = useState(false);
  const stepRef = useRef(0);

  // Clock
  useEffect(() => {
    const t = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
      setSinceUpdate(s => s + 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Tom walks — advances one waypoint every 6 seconds
  useEffect(() => {
    if (phase !== 'map') return;
    stepRef.current = 0;
    setTomStep(0);
    setSinceUpdate(0);
    setArrived(false);

    const walk = setInterval(() => {
      stepRef.current += 1;
      if (stepRef.current >= TOM_TRAIL.length) {
        clearInterval(walk);
        setArrived(true);
        return;
      }
      setTomStep(stepRef.current);
      setSinceUpdate(0); // GPS ping resets
    }, 6000);

    return () => clearInterval(walk);
  }, [phase]);

  const tom = TOM_TRAIL[tomStep];

  // Dynamic nav URLs follow Tom's live position
  const liveGoogleUrl = `https://www.google.com/maps/search/?api=1&query=${tom.lat},${tom.lng}`;
  const liveDirUrl    = `https://www.google.com/maps/dir/?api=1&destination=${tom.lat},${tom.lng}&travelmode=driving`;
  const liveWazeUrl   = `https://waze.com/ul?ll=${tom.lat},${tom.lng}&navigate=yes`;
  const liveShareText = `Tom's live location — Tijuana, Mexico\nhttps://www.google.com/maps/search/?api=1&query=${tom.lat},${tom.lng}`;

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
          <div style={{ padding: '12px 24px', background: arrived ? `${GOLD}12` : `${GREEN}15`, borderBottom: `1px solid ${arrived ? GOLD + '40' : GREEN + '30'}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            {arrived
              ? <span style={{ fontSize: 18 }}>🏥</span>
              : <CheckCircle2 style={{ width: 18, height: 18, color: GREEN, flexShrink: 0 }} />}
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: arrived ? GOLD : GREEN }}>
                {arrived ? 'Tom has arrived at the clinic ✓' : `Tom is SAFE — ${tom.label}`}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                {arrived ? 'Dental procedure beginning — M monitoring recovery room' : `Last GPS ping: ${sinceUpdate}s ago · Moving toward clinic · No alerts`}
              </p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: arrived ? GOLD : GREEN, animation: 'pulse 1.5s ease infinite' }} />
              <span style={{ fontSize: 10, color: arrived ? GOLD : GREEN, fontWeight: 700 }}>LIVE</span>
            </div>
          </div>

          {/* Real satellite map — Tom moves live */}
          <div style={{ position: 'relative' }}>
            <MapContainer
              center={[TOM_TRAIL[0].lat, TOM_TRAIL[0].lng]}
              zoom={15}
              style={{ height: '340px', width: '100%' }}
              zoomControl={true}
              attributionControl={false}
              scrollWheelZoom={true}
            >
              <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
              <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" maxZoom={19} opacity={0.8} />

              {/* Map follows Tom */}
              <MapCenter lat={tom.lat} lng={tom.lng} />

              {/* Trail only up to Tom's current position */}
              {tomStep > 0 && (
                <Polyline
                  positions={TOM_TRAIL.slice(0, tomStep + 1).map(p => [p.lat, p.lng])}
                  pathOptions={{ color: '#60a5fa', weight: 3, opacity: 0.8 }}
                />
              )}

              {/* Waypoints Tom has passed */}
              {TOM_TRAIL.slice(0, tomStep).map((p, i) => (
                <CircleMarker key={i} center={[p.lat, p.lng]} radius={4}
                  pathOptions={{ color: '#fff', fillColor: '#60a5fa', fillOpacity: 0.9, weight: 1 }} />
              ))}

              {/* Destination clinic — always visible */}
              <CircleMarker center={[CURRENT.lat, CURRENT.lng]} radius={8}
                pathOptions={{ color: GOLD, fillColor: GOLD, fillOpacity: arrived ? 1 : 0.25, weight: 2 }} />

              {/* Tom — live position with popup */}
              <Marker position={[tom.lat, tom.lng]} icon={TOM_ICON}>
                <Popup closeButton={false}>
                  <div style={{ background: '#0C1A1D', border: '1px solid rgba(34,197,94,0.4)', borderRadius: 10, padding: '10px 12px', minWidth: 165 }}>
                    <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 800, color: GREEN }}>📍 Tom is here</p>
                    <p style={{ margin: '0 0 10px', fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{tom.label}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <button onClick={() => openNav(liveDirUrl)} style={{ width: '100%', padding: '7px 10px', borderRadius: 7, background: '#4285F4', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>🗺 Directions — Google</button>
                      <button onClick={() => openNav(liveWazeUrl)} style={{ width: '100%', padding: '7px 10px', borderRadius: 7, background: '#33CCFF', border: 'none', color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>📡 Navigate — Waze</button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>

            {/* Live pulse label */}
            <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, pointerEvents: 'none' }}>
              <div style={{ background: 'rgba(6,11,22,0.92)', border: `1px solid ${arrived ? GOLD + '60' : GREEN + '40'}`, borderRadius: 8, padding: '4px 12px', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: arrived ? GOLD : GREEN, animation: 'pulse 1.2s ease infinite' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>
                  {arrived ? '🏥 Arrived at clinic' : `Tom · ${tom.label} · tap marker for nav`}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation action buttons — always track Tom's live position */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '12px 16px', background: '#0C1A1D', borderBottom: `1px solid ${BORDER}` }}>
            <button onClick={() => openNav(liveGoogleUrl)}
              style={{ padding: '10px 6px', borderRadius: 10, background: 'rgba(66,133,244,0.12)', border: '1px solid rgba(66,133,244,0.35)', color: '#4285F4', fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <ExternalLink style={{ width: 14, height: 14 }} />
              Google Maps
            </button>
            <button onClick={() => openNav(liveWazeUrl)}
              style={{ padding: '10px 6px', borderRadius: 10, background: 'rgba(51,204,255,0.10)', border: '1px solid rgba(51,204,255,0.3)', color: '#33CCFF', fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <Navigation style={{ width: 14, height: 14 }} />
              Waze
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: "Tom's Location", text: liveShareText }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(liveShareText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
                }
              }}
              style={{ padding: '10px 6px', borderRadius: 10, background: copied ? 'rgba(34,197,94,0.12)' : `rgba(212,175,55,0.10)`, border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : 'rgba(212,175,55,0.3)'}`, color: copied ? GREEN : GOLD, fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <Share2 style={{ width: 14, height: 14 }} />
              {copied ? 'Copied!' : 'Share'}
            </button>
          </div>

          {/* Journey timeline — lights up as Tom moves */}
          <div style={{ padding: '16px 20px', maxWidth: 560, margin: '0 auto' }}>
            <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 800, color: GOLD, letterSpacing: '0.08em' }}>TOM'S JOURNEY TODAY</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TOM_TRAIL.map((p, i) => {
                const isNow    = i === tomStep && !arrived;
                const isPast   = i < tomStep || arrived;
                const isFuture = i > tomStep && !arrived;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12,
                    background: isNow ? `${GREEN}12` : isPast ? `rgba(96,165,250,0.06)` : CARD,
                    border: `1px solid ${isNow ? GREEN + '50' : isPast ? 'rgba(96,165,250,0.25)' : BORDER}`,
                    opacity: isFuture ? 0.4 : 1,
                    transition: 'all 0.5s ease',
                  }}>
                    <MapPin style={{ width: 13, height: 13, color: isNow ? GREEN : isPast ? '#60a5fa' : 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: isNow ? '#fff' : isPast ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)' }}>{p.label}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock style={{ width: 11, height: 11, color: 'rgba(255,255,255,0.3)' }} />
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{p.time}</span>
                      {isNow && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: `${GREEN}20`, color: GREEN, fontWeight: 800, animation: 'pulse 1.2s ease infinite' }}>LIVE</span>}
                      {isPast && !isNow && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: 'rgba(96,165,250,0.15)', color: '#60a5fa', fontWeight: 700 }}>✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom message — changes when Tom arrives */}
            <div style={{ marginTop: 20, padding: '16px 20px', borderRadius: 14, background: arrived ? `${GOLD}12` : `${GOLD}08`, border: `1px solid ${GOLD}25`, textAlign: 'center', transition: 'all 0.5s' }}>
              <Heart style={{ width: 16, height: 16, color: GOLD, margin: '0 auto 8px' }} />
              {arrived ? (
                <>
                  <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: GOLD }}>Tom is at the clinic. Sandra saw every step.</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>Face ID → live satellite → arrived safe. The Mother's Eye never blinks.</p>
                </>
              ) : (
                <>
                  <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#fff' }}>Sandra didn't need to call. She didn't need a link.</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>She's watching Tom walk to the clinic — live — from 4,000 km away.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
