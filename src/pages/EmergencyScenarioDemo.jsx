import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio, ArrowLeft, Play, RotateCcw,
  MessageSquare, Navigation, Siren, ExternalLink, MessageCircle
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Maria's real Caracas GPS coordinates
const MARIA_LAT = 10.4815;
const MARIA_LNG = -66.9037;

const MARIA_GOOGLE_URL = `https://www.google.com/maps/search/?api=1&query=${MARIA_LAT},${MARIA_LNG}`;
const MARIA_DIR_URL    = `https://www.google.com/maps/dir/?api=1&destination=${MARIA_LAT},${MARIA_LNG}&travelmode=driving`;
const MARIA_WAZE_URL   = `https://waze.com/ul?ll=${MARIA_LAT},${MARIA_LNG}&navigate=yes`;
const MARIA_SHARE_MSG  = encodeURIComponent(`Maria's last known location — Av. Libertador, Caracas, Venezuela\nhttps://www.google.com/maps/search/?api=1&query=${MARIA_LAT},${MARIA_LNG}`);

function openNav(url) { window.open(url, '_blank', 'noopener,noreferrer'); }

const MARIA_ICON_SAFE = L.divIcon({
  className: '',
  html: `<div style="display:flex;flex-direction:column;align-items:center;"><div style="width:40px;height:40px;border-radius:50%;border:3px solid #22c55e;overflow:hidden;box-shadow:0 0 16px rgba(34,197,94,0.7);"><img src='https://i.pravatar.cc/80?img=47' style='width:100%;height:100%;object-fit:cover;'/></div><div style='width:2px;height:12px;background:#22c55e;'></div><div style='width:6px;height:6px;border-radius:50%;background:#22c55e;margin-top:-1px;'></div></div>`,
  iconSize: [40, 60], iconAnchor: [20, 58],
});
const MARIA_ICON_LOST = L.divIcon({
  className: '',
  html: `<div style="display:flex;flex-direction:column;align-items:center;opacity:0.6;"><div style="width:40px;height:40px;border-radius:50%;border:3px solid #ef4444;overflow:hidden;box-shadow:0 0 16px rgba(239,68,68,0.7);filter:grayscale(0.5);"><img src='https://i.pravatar.cc/80?img=47' style='width:100%;height:100%;object-fit:cover;'/></div><div style='width:2px;height:12px;background:#ef4444;'></div><div style='width:6px;height:6px;border-radius:50%;background:#ef4444;margin-top:-1px;'></div></div>`,
  iconSize: [40, 60], iconAnchor: [20, 58],
});

const GOLD = '#D4AF37';
const DARK = '#060B16';

/* ── Scenario timeline ───────────────────────────────────────────────────────
   Each step has a delay (ms) from when Play is pressed, a type that drives
   the visual style, and a message that appears in the incident log.
*/
const TIMELINE = [
  {
    id: 'checkin_ok',
    delay: 0,
    type: 'safe',
    time: '09:00 AM',
    title: 'Check-In Confirmed',
    detail: 'Maria checked in from Hotel Tamanaco, Caracas. GPS: 10.4815°N 66.9037°W',
    sms: null,
  },
  {
    id: 'missed',
    delay: 2500,
    type: 'warning',
    time: '09:00 PM',
    title: 'CHECK-IN MISSED',
    detail: 'Maria did not respond to the 9:00 PM check-in. 2-hour response window opened.',
    sms: null,
  },
  {
    id: 'gps_lost',
    delay: 4500,
    type: 'warning',
    time: '09:47 PM',
    title: 'GPS Signal Lost',
    detail: 'Live beacon stopped transmitting. Last known location cached: Av. Libertador, Caracas.',
    sms: null,
  },
  {
    id: 'sms_2h',
    delay: 6500,
    type: 'escalate',
    time: '11:00 PM',
    title: '+2h — SMS Reminder Sent',
    detail: 'Automated SMS to Maria: "Your safety check-in is overdue. Reply SAFE to confirm."',
    sms: {
      to: 'Maria (+1-305-XXX-XXXX)',
      body: 'MORALES SAFETY: Your 9:00 PM check-in is overdue. Reply SAFE immediately or emergency contacts will be notified.',
    },
  },
  {
    id: 'contact_2h',
    delay: 8500,
    type: 'escalate',
    time: '11:00 PM',
    title: '+2h — Emergency Contact Alerted',
    detail: 'SMS sent to Rosa Delgado (sister): "Maria missed her safety check-in. Last location attached."',
    sms: {
      to: 'Rosa Delgado — Emergency Contact',
      body: 'MORALES ALERT: Maria has missed her safety check-in. Last known location: https://morales.app/track/live?token=a8f3k2 — Please call her immediately.',
    },
  },
  {
    id: 'voice_3h',
    delay: 10500,
    type: 'critical',
    time: '12:00 AM',
    title: '+3h — Automated Voice Call',
    detail: 'Outbound call to Maria\'s registered number. No answer. Voice call to Rosa Delgado initiated.',
    sms: null,
  },
  {
    id: 'security_5h',
    delay: 12800,
    type: 'critical',
    time: '02:00 AM',
    title: '+5h — SECURITY DISPATCHED',
    detail: 'Private security team deployed to last known GPS coordinates. Hotel confirmed Maria did not return.',
    sms: {
      to: 'Security Team — Caracas Unit',
      body: 'URGENT DISPATCH: Solo patient unaccounted for 5h. Last GPS: 10.4815°N, 66.9037°W — Av. Libertador, Caracas. Patient: Maria C., Room 412.',
    },
  },
  {
    id: 'police_9h',
    delay: 15500,
    type: 'emergency',
    time: '06:00 AM',
    title: '+9h — POLICE + EMBASSY NOTIFIED',
    detail: 'Venezuelan National Police Case #2024-CV-8821 opened. US Embassy Caracas duty officer contacted. GPS coordinates transmitted.',
    sms: {
      to: 'All Contacts + Authorities',
      body: 'MORALES EMERGENCY: Maria C. has been unreachable for 9 hours. Case filed with Venezuelan National Police. Coordinates: 10.4815°N, 66.9037°W. Embassy ref: EMB-2024-1103.',
    },
  },
  {
    id: 'found',
    delay: 18500,
    type: 'rescue',
    time: '07:23 AM',
    title: '✅ PATIENT LOCATED — SAFE',
    detail: 'Security team located Maria using last cached GPS coordinates. Police escort secured. Medical check completed.',
    sms: {
      to: 'All Contacts',
      body: 'MORALES UPDATE: Maria has been located and is safe. Security escort arranged. Thank you for your patience. — Morales Concierge',
    },
  },
];

const TYPE_STYLES = {
  safe:      { dot: '#22c55e', border: 'rgba(34,197,94,0.3)',  bg: 'rgba(34,197,94,0.06)',  label: '#22c55e' },
  warning:   { dot: '#f59e0b', border: 'rgba(245,158,11,0.3)', bg: 'rgba(245,158,11,0.06)', label: '#f59e0b' },
  escalate:  { dot: '#f97316', border: 'rgba(249,115,22,0.3)', bg: 'rgba(249,115,22,0.06)', label: '#f97316' },
  critical:  { dot: '#ef4444', border: 'rgba(239,68,68,0.3)',  bg: 'rgba(239,68,68,0.08)',  label: '#ef4444' },
  emergency: { dot: '#dc2626', border: 'rgba(220,38,38,0.5)',  bg: 'rgba(220,38,38,0.12)',  label: '#fca5a5' },
  rescue:    { dot: GOLD,      border: `rgba(212,175,55,0.4)`, bg: `rgba(212,175,55,0.08)`, label: GOLD },
};

/* ── SMS Popup ───────────────────────────────────────────────────────────── */
function SmsPopup({ sms, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ x: 340, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 340, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl overflow-hidden shadow-2xl"
      style={{ background: '#0C1A1D', border: '1px solid rgba(239,68,68,0.4)' }}
    >
      <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.12)', borderBottom: '1px solid rgba(239,68,68,0.2)' }}>
        <MessageSquare className="w-4 h-4 text-red-400 flex-shrink-0" />
        <p className="text-xs font-semibold text-red-300">Morales Safety SMS</p>
        <p className="text-xs ml-auto" style={{ color: '#475569' }}>to: {sms.to}</p>
      </div>
      <div className="px-4 py-3">
        <p className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>{sms.body}</p>
      </div>
    </motion.div>
  );
}

/* ── GPS Map Pin — Real Esri Satellite ───────────────────────────────────── */
function GpsMapPin({ active, lost }) {
  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ height: 180, border: `1px solid ${lost ? 'rgba(239,68,68,0.4)' : active ? 'rgba(34,197,94,0.3)' : '#1e3040'}` }}>
      {/* Real satellite map */}
      <MapContainer center={[MARIA_LAT, MARIA_LNG]} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false} scrollWheelZoom={false} dragging={false}>
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" maxZoom={19} opacity={0.75} />
        {active && (
          <Marker position={[MARIA_LAT, MARIA_LNG]} icon={lost ? MARIA_ICON_LOST : MARIA_ICON_SAFE}>
            <Popup closeButton={false} className="morales-popup">
              <div style={{ background: '#0C1A1D', border: '1px solid rgba(212,175,55,0.4)', borderRadius: 10, padding: '10px 12px', minWidth: 165 }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 800, color: '#D4AF37' }}>📍 Maria — last known</p>
                <p style={{ margin: '0 0 10px', fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Av. Libertador, Caracas, Venezuela</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button onClick={() => openNav(MARIA_DIR_URL)} style={{ width: '100%', padding: '7px 10px', borderRadius: 7, background: '#4285F4', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>🗺 Directions — Google</button>
                  <button onClick={() => openNav(MARIA_WAZE_URL)} style={{ width: '100%', padding: '7px 10px', borderRadius: 7, background: '#33CCFF', border: 'none', color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>📡 Navigate — Waze</button>
                </div>
              </div>
            </Popup>
          </Marker>
        )}
        {active && !lost && <Circle center={[MARIA_LAT, MARIA_LNG]} radius={80} pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.06, weight: 1.5 }} />}
        {lost && <Circle center={[MARIA_LAT, MARIA_LNG]} radius={120} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.06, weight: 1.5, dashArray: '5 4' }} />}
      </MapContainer>

      {/* Overlay — location label */}
      <div className="absolute top-2 left-3 flex items-center gap-1.5 z-[1000]" style={{ pointerEvents: 'none' }}>
        <div style={{ background: 'rgba(6,11,22,0.85)', backdropFilter: 'blur(4px)', borderRadius: 6, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Navigation className="w-3 h-3" style={{ color: GOLD }} />
          <span className="text-[10px] font-semibold" style={{ color: GOLD }}>Caracas, Venezuela</span>
        </div>
      </div>

      {/* Overlay — GPS status */}
      <div className="absolute top-2 right-3 flex items-center gap-1.5 z-[1000]" style={{ pointerEvents: 'none' }}>
        <div style={{ background: 'rgba(6,11,22,0.85)', backdropFilter: 'blur(4px)', borderRadius: 6, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: lost ? '#ef4444' : active ? '#22c55e' : '#475569', boxShadow: !lost && active ? '0 0 6px rgba(34,197,94,0.7)' : 'none', display: 'inline-block', width: 7, height: 7, borderRadius: '50%' }} />
          <span className="text-[10px] font-semibold" style={{ color: lost ? '#ef4444' : active ? '#22c55e' : '#475569' }}>
            {lost ? 'SIGNAL LOST' : active ? 'LIVE' : 'IDLE'}
          </span>
        </div>
      </div>

      {/* Overlay — coordinates */}
      <div className="absolute bottom-2 left-3 z-[1000]" style={{ pointerEvents: 'none' }}>
        <div style={{ background: 'rgba(6,11,22,0.8)', backdropFilter: 'blur(4px)', borderRadius: 6, padding: '3px 8px' }}>
          <p className="text-[9px] font-mono" style={{ color: '#94a3b8', margin: 0 }}>10.4815°N  66.9037°W</p>
          <p className="text-[9px]" style={{ color: '#64748b', margin: 0 }}>Av. Libertador · Last cached {lost ? '09:47 PM' : 'live'}</p>
        </div>
      </div>

      {lost && active && (
        <div className="absolute inset-0 flex items-end justify-center pb-10">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs font-semibold text-red-400"
          >
            Last known position
          </motion.p>
        </div>
      )}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function EmergencyScenarioDemo({ minimal = false }) {
  const [playing, setPlaying]     = useState(false);
  const [visibleIds, setVisible]  = useState(new Set(['checkin_ok']));
  const [activeSms, setActiveSms] = useState(null);
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsLost, setGpsLost]     = useState(false);
  const [done, setDone]           = useState(false);
  const timers = useRef([]);

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  function reset() {
    clearTimers();
    setPlaying(false);
    setVisible(new Set(['checkin_ok']));
    setActiveSms(null);
    setGpsActive(false);
    setGpsLost(false);
    setDone(false);
  }

  function play() {
    reset();
    setPlaying(true);
    setGpsActive(true);

    TIMELINE.forEach((evt, i) => {
      const t1 = setTimeout(() => {
        setVisible(prev => new Set([...prev, evt.id]));
        if (evt.sms) setActiveSms(evt.sms);
        if (evt.id === 'gps_lost') setGpsLost(true);
        if (evt.id === 'found') { setGpsLost(false); setDone(true); }
      }, evt.delay);
      timers.current.push(t1);
    });

    // Stop playing indicator after last event
    const tEnd = setTimeout(() => setPlaying(false), TIMELINE[TIMELINE.length - 1].delay + 1000);
    timers.current.push(tEnd);
  }

  useEffect(() => () => clearTimers(), []);

  const isFound = visibleIds.has('found');

  return (
    <div style={{ background: DARK, minHeight: minimal ? undefined : '100vh' }}>

      {/* NAV — hidden when embedded as a tab */}
      {!minimal && (
        <nav className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
          style={{ background: 'rgba(6,11,22,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Link to="/demo" className="flex items-center gap-2 text-xs font-medium" style={{ color: '#64748b' }}>
            <ArrowLeft className="w-4 h-4" /> Back to Demo
          </Link>
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#ef4444' }}>
            ⚠ Live Incident Simulator
          </span>
          <div className="w-24" />
        </nav>
      )}

      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* HEADER */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5 text-xs font-semibold"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5' }}
          >
            <Radio className="w-3 h-3" /> Simulated Incident — Real System Response
          </motion.div>
          <h1 className="text-4xl font-bold mb-3 leading-tight" style={{ color: '#f8fafc', letterSpacing: '-0.03em', fontFamily: 'Georgia, serif' }}>
            Solo Traveler.<br />
            <span style={{ color: '#ef4444' }}>Missing. 9 Hours.</span>
          </h1>
          <p className="text-base max-w-xl mx-auto" style={{ color: '#64748b' }}>
            Watch the Morales Safe-T4life™ system respond to a kidnapping scenario — automatically, in the correct sequence, with no human intervention needed.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-6">

          {/* LEFT — Patient + Map */}
          <div className="md:col-span-2 space-y-4">

            {/* Patient card */}
            <div className="rounded-2xl p-4" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
              <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: GOLD }}>Patient Profile</p>
              <div className="flex items-center gap-3 mb-4">
                <img src="https://i.pravatar.cc/150?img=47" alt="Maria Castellanos"
                  className="w-14 h-14 rounded-full flex-shrink-0"
                  style={{ border: '3px solid #22c55e', boxShadow: '0 0 14px rgba(34,197,94,0.35)', objectFit: 'cover' }}
                />
                <div>
                  <p className="font-semibold text-white text-sm">Maria Castellanos</p>
                  <p className="text-xs" style={{ color: '#64748b' }}>34 · Solo Traveler · USA</p>
                  <p className="text-xs" style={{ color: '#64748b' }}>Rhinoplasty — Hotel Tamanaco, CCS</p>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  { label: 'Emergency Contact', val: 'Rosa Delgado (sister)' },
                  { label: 'Guardian Link', val: 'Active — 1 guardian' },
                  { label: 'Check-in Interval', val: 'Every 12 hours' },
                  { label: 'Solo Protocol', val: '5-tier escalation' },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between">
                    <span style={{ color: '#475569' }}>{label}</span>
                    <span className="font-medium text-white">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* GPS map */}
            <div className="rounded-2xl p-4" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
              <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: GOLD }}>Live GPS Beacon</p>
              <GpsMapPin active={gpsActive} lost={gpsLost} />
              {/* Navigation & share action bar */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                <button onClick={() => openNav(MARIA_GOOGLE_URL)} style={{ padding: '8px 6px', borderRadius: 8, background: '#4285F4', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <ExternalLink size={12} />Google Maps
                </button>
                <button onClick={() => openNav(MARIA_WAZE_URL)} style={{ padding: '8px 6px', borderRadius: 8, background: '#33CCFF', border: 'none', color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <Navigation size={12} />Waze
                </button>
                <button onClick={() => openNav(`https://wa.me/?text=${MARIA_SHARE_MSG}`)} style={{ padding: '8px 6px', borderRadius: 8, background: '#25D366', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <MessageCircle size={12} />WhatsApp
                </button>
                <button onClick={() => openNav(`sms:?body=${MARIA_SHARE_MSG}`)} style={{ padding: '8px 6px', borderRadius: 8, background: '#1e3040', border: '1px solid #2A3F4A', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <MessageSquare size={12} />SMS
                </button>
              </div>
            </div>

            {/* Status badge */}
            <AnimatePresence>
              {isFound && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl p-4 text-center"
                  style={{ background: 'rgba(212,175,55,0.1)', border: `1px solid ${GOLD}50` }}
                >
                  <p className="text-2xl mb-1">🛡️</p>
                  <p className="font-bold text-sm" style={{ color: GOLD }}>Maria is Safe</p>
                  <p className="text-xs mt-1" style={{ color: '#64748b' }}>Located via last GPS cache. Security escort active.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT — Incident log */}
          <div className="md:col-span-3">
            <div className="rounded-2xl overflow-hidden" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>

              {/* Header */}
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #1e2d35' }}>
                <div>
                  <p className="text-xs font-bold tracking-widest uppercase" style={{ color: '#ef4444' }}>Incident Log</p>
                  <p className="text-xs mt-0.5" style={{ color: '#475569' }}>Auto-generated · Case #INC-2024-0847</p>
                </div>
                <div className="flex gap-2">
                  {!playing && !done && (
                    <button
                      onClick={play}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: '#ef4444', color: '#fff' }}
                    >
                      <Play className="w-3 h-3" /> Run Scenario
                    </button>
                  )}
                  {playing && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
                      <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                      Live
                    </div>
                  )}
                  {done && (
                    <button
                      onClick={reset}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: '#1e2d35', color: '#94a3b8', border: '1px solid #2A3F4A' }}
                    >
                      <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div className="p-4 space-y-3 max-h-[480px] overflow-y-auto">
                {!playing && !done && visibleIds.size === 1 && (
                  <div className="text-center py-8">
                    <Siren className="w-8 h-8 mx-auto mb-3" style={{ color: '#475569' }} />
                    <p className="text-sm font-semibold text-white mb-1">Emergency Scenario Simulator</p>
                    <p className="text-xs" style={{ color: '#475569' }}>Press Run Scenario to watch the system respond in real-time</p>
                  </div>
                )}

                <AnimatePresence>
                  {TIMELINE.filter(e => visibleIds.has(e.id)).map((evt) => {
                    const s = TYPE_STYLES[evt.type];
                    return (
                      <motion.div
                        key={evt.id}
                        initial={{ opacity: 0, x: -16, height: 0 }}
                        animate={{ opacity: 1, x: 0, height: 'auto' }}
                        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                        className="rounded-xl overflow-hidden"
                        style={{ border: `1px solid ${s.border}`, background: s.bg }}
                      >
                        <div className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
                              style={{ background: s.dot, boxShadow: `0 0 6px ${s.dot}80` }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <p className="text-sm font-semibold text-white leading-tight">{evt.title}</p>
                                <span className="text-[10px] font-mono flex-shrink-0" style={{ color: s.label }}>{evt.time}</span>
                              </div>
                              <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>{evt.detail}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Typing indicator while playing */}
                {playing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1e2d35' }}
                  >
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: '#ef4444' }}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
                      />
                    ))}
                    <span className="text-xs" style={{ color: '#475569' }}>System processing next action…</span>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Escalation chain reference */}
            <div className="mt-4 rounded-2xl p-4" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
              <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: '#64748b' }}>Automatic Response Chain</p>
              <div className="flex items-center gap-0 overflow-x-auto pb-1">
                {[
                  { t: '0h', label: 'Missed', c: '#f59e0b' },
                  { t: '+2h', label: 'SMS', c: '#f97316' },
                  { t: '+3h', label: 'Call', c: '#ef4444' },
                  { t: '+5h', label: 'Security', c: '#dc2626' },
                  { t: '+9h', label: 'Police', c: '#991b1b' },
                ].map(({ t, label, c }, i) => (
                  <React.Fragment key={t}>
                    <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: 52 }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold mb-1"
                        style={{ background: `${c}20`, border: `1px solid ${c}60`, color: c }}>
                        {t}
                      </div>
                      <span className="text-[9px] font-medium text-center" style={{ color: '#475569' }}>{label}</span>
                    </div>
                    {i < 4 && <div className="flex-1 h-px mx-1" style={{ background: '#1e2d35', minWidth: 8 }} />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-10 text-center space-y-4">
          <p className="text-sm" style={{ color: '#475569' }}>
            Every step above runs <span className="text-white font-semibold">automatically</span> — no human needed to initiate any escalation.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Link to="/demo" className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold"
              style={{ background: '#0C1A1D', color: '#94a3b8', border: '1px solid #2A3F4A' }}>
              <ArrowLeft className="w-4 h-4" /> Back to Platform Demo
            </Link>
            <Link to="/consultation" className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold"
              style={{ background: GOLD, color: DARK }}>
              Start a Safe Journey
            </Link>
          </div>
        </div>
      </div>

      {/* SMS popup */}
      <AnimatePresence>
        {activeSms && (
          <SmsPopup key={activeSms.body} sms={activeSms} onDismiss={() => setActiveSms(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
