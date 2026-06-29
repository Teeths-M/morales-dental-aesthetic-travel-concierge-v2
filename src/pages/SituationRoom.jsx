/**
 * Situation Room — Global Intelligence Display
 *
 * Real-time tactical overview of every active patient journey worldwide.
 * EVN-iQ400 threat levels per destination, MedGuard scores, handshake
 * progress — rendered on a dark tactical world map. Like NASA mission
 * control, but for medical travel safety.
 *
 * Route: /admin/situation-room
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { COUNTRY_ISO, getRiskLevel } from '@/hooks/useEnvironmentalIntelligence';
import { ACTIVE_TRAVEL_PHASES } from '@/lib/constants';

const GOLD = '#D4AF37';

// ── Geographic coordinate → SVG pixel (Mercator-like, 800×440 canvas) ───────
const W = 800, H = 440;
function geoToXY(lng, lat) {
  const x = ((lng + 180) / 360) * W;
  const y = ((85 - lat) / 170) * H;
  return { x: Math.round(x), y: Math.round(y) };
}

// ── Known destination reference points ──────────────────────────────────────
const DESTINATIONS = [
  { iso: 'MX', name: 'Mexico',       lng: -102.5,  lat: 23.6,   flag: '🇲🇽' },
  { iso: 'CO', name: 'Colombia',     lng: -74.3,   lat: 4.6,    flag: '🇨🇴' },
  { iso: 'VE', name: 'Venezuela',    lng: -66.6,   lat: 8.0,    flag: '🇻🇪' },
  { iso: 'BR', name: 'Brazil',       lng: -51.9,   lat: -14.2,  flag: '🇧🇷' },
  { iso: 'CR', name: 'Costa Rica',   lng: -84.0,   lat: 10.0,   flag: '🇨🇷' },
  { iso: 'TR', name: 'Turkey',       lng: 35.2,    lat: 39.0,   flag: '🇹🇷' },
  { iso: 'TH', name: 'Thailand',     lng: 100.9,   lat: 15.9,   flag: '🇹🇭' },
  { iso: 'IN', name: 'India',        lng: 78.9,    lat: 20.6,   flag: '🇮🇳' },
  { iso: 'PH', name: 'Philippines',  lng: 122.0,   lat: 12.9,   flag: '🇵🇭' },
  { iso: 'ZA', name: 'South Africa', lng: 25.0,    lat: -29.0,  flag: '🇿🇦' },
  { iso: 'EG', name: 'Egypt',        lng: 30.8,    lat: 26.8,   flag: '🇪🇬' },
  { iso: 'MA', name: 'Morocco',      lng: -7.1,    lat: 31.8,   flag: '🇲🇦' },
  { iso: 'JO', name: 'Jordan',       lng: 36.2,    lat: 31.2,   flag: '🇯🇴' },
  { iso: 'SG', name: 'Singapore',    lng: 103.8,   lat: 1.3,    flag: '🇸🇬' },
  { iso: 'MY', name: 'Malaysia',     lng: 109.7,   lat: 4.2,    flag: '🇲🇾' },
  { iso: 'KR', name: 'South Korea',  lng: 127.9,   lat: 36.0,   flag: '🇰🇷' },
  { iso: 'HU', name: 'Hungary',      lng: 19.5,    lat: 47.2,   flag: '🇭🇺' },
  { iso: 'PL', name: 'Poland',       lng: 19.1,    lat: 52.1,   flag: '🇵🇱' },
  { iso: 'AR', name: 'Argentina',    lng: -64.0,   lat: -34.0,  flag: '🇦🇷' },
  { iso: 'PE', name: 'Peru',         lng: -75.0,   lat: -9.2,   flag: '🇵🇪' },
].map(d => ({ ...d, ...geoToXY(d.lng, d.lat) }));

// Very simplified continent outlines as SVG polylines (tactical feel, not accurate)
const CONTINENT_PATHS = [
  // North America (rough outline)
  'M165,55 L185,50 L215,55 L230,75 L220,110 L205,130 L190,140 L175,150 L160,165 L155,145 L145,120 L140,95 L150,70 Z',
  // South America
  'M195,165 L210,160 L225,175 L230,200 L225,230 L215,255 L200,270 L185,260 L178,235 L180,205 L185,180 Z',
  // Europe
  'M325,55 L360,50 L375,60 L370,80 L355,90 L340,85 L325,75 Z',
  // Africa
  'M330,95 L365,90 L380,110 L385,145 L375,185 L355,215 L335,220 L315,205 L308,175 L310,140 L318,110 Z',
  // Asia (simplified)
  'M370,45 L450,40 L510,50 L545,65 L550,95 L530,115 L490,125 L450,115 L420,100 L385,90 L370,70 Z',
  // Southeast Asia
  'M460,130 L490,125 L510,140 L505,160 L485,165 L460,155 Z',
  // Australia
  'M480,230 L530,225 L550,245 L545,275 L520,285 L490,275 L470,255 Z',
];

// Radar sweep animation
function RadarSweep() {
  return (
    <motion.line
      x1={W / 2} y1={H / 2}
      x2={W} y2={H / 2}
      stroke={`${GOLD}25`}
      strokeWidth="1"
      style={{ transformOrigin: `${W / 2}px ${H / 2}px` }}
      animate={{ rotate: 360 }}
      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
    />
  );
}

// Destination marker with pulse
function DestMarker({ dest, evnData, patients, isActive }) {
  const risk = evnData ? getRiskLevel(evnData.riskScore) : null;
  const color = risk?.color || (isActive ? GOLD : 'rgba(255,255,255,0.2)');
  const count = patients?.length || 0;
  if (!isActive && count === 0) return null;

  return (
    <g>
      {/* Pulse rings */}
      {count > 0 && (
        <>
          <motion.circle cx={dest.x} cy={dest.y} r="18"
            fill="transparent" stroke={color} strokeWidth="1" opacity="0.3"
            animate={{ r: [12, 24, 12], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: dest.x * 0.003 }}
          />
          <motion.circle cx={dest.x} cy={dest.y} r="10"
            fill="transparent" stroke={color} strokeWidth="1.5"
            animate={{ opacity: [0.8, 0.3, 0.8] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: dest.x * 0.003 }}
          />
        </>
      )}
      {/* Core dot */}
      <circle cx={dest.x} cy={dest.y} r={count > 0 ? 5 : 3}
        fill={count > 0 ? color : 'rgba(255,255,255,0.15)'}
        stroke="#04080F" strokeWidth="1.5"
      />
      {/* Patient count badge */}
      {count > 0 && (
        <>
          <circle cx={dest.x + 9} cy={dest.y - 9} r="7"
            fill="#04080F" stroke={color} strokeWidth="1" />
          <text x={dest.x + 9} y={dest.y - 5.5}
            textAnchor="middle" fontSize="8" fill={color} fontWeight="bold">
            {count}
          </text>
        </>
      )}
      {/* Country label */}
      {(count > 0 || isActive) && (
        <text x={dest.x} y={dest.y + 18}
          textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.5)" fontWeight="500">
          {dest.name}
        </text>
      )}
    </g>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function SituationRoom() {
  const [tick, setTick]       = useState(0);
  const [evnData, setEvnData] = useState({});
  const [feed, setFeed]       = useState([]);
  const feedRef               = useRef(null);
  const [time, setTime]       = useState(new Date());

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-tick for animations
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 90_000);
    return () => clearInterval(id);
  }, []);

  // Fetch active patient cases
  const { data: activeCases = [] } = useQuery({
    queryKey: ['situation-room-cases', tick],
    queryFn: async () => {
      const statuses = ['Travel-Coordination', 'Ready-For-Travel', 'Procedure-In-Progress', 'Recovery', 'Deposit-Paid'];
      const results = await Promise.allSettled(
        statuses.map(s => (base44.asServiceRole?.entities?.CaseRecord?.filter({ status: s }, '-updated_date', 20) ?? Promise.resolve([])).catch(() => []))
      );
      return results.flatMap(r => r.status === 'fulfilled' ? (r.value || []) : []);
    },
    staleTime: 90_000,
    refetchInterval: 300_000,
  });

  // Group patients by destination country ISO
  const patientsByISO = {};
  activeCases.forEach(c => {
    const iso = COUNTRY_ISO[c.procedure_country];
    if (iso) {
      if (!patientsByISO[iso]) patientsByISO[iso] = [];
      patientsByISO[iso].push(c);
    }
  });

  const activeISOs   = new Set(Object.keys(patientsByISO));
  const totalActive  = activeCases.length;
  const inTransit    = activeCases.filter(c => ACTIVE_TRAVEL_PHASES.has(c.trip_phase)).length;
  const countries    = activeISOs.size;

  // Fetch EVN-iQ400 advisory data for active destinations
  useEffect(() => {
    const isos = [...activeISOs];
    if (!isos.length) return;
    (async () => {
      try {
        const res  = await fetch('https://www.travel-advisory.info/api', { signal: AbortSignal.timeout(8000) });
        const json = await res.json();
        const out  = {};
        isos.forEach(iso2 => {
          const entry = json?.data?.[iso2];
          if (!entry) return;
          const score     = entry.advisory?.score ?? 2;
          const riskScore = Math.round(((Math.max(1, Math.min(5, score)) - 1) / 4) * 85 + 5);
          out[iso2] = { riskScore, score, name: entry.name };
        });
        setEvnData(out);
      } catch { /* silent — dots still show without EVN data */ }
    })();
  }, [activeCases.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Simulated live intelligence feed (in production: reads from AuditLog)
  useEffect(() => {
    const BASE = [
      { icon: '✅', text: 'HS5 Clinic Arrival confirmed — patient at Morales partner clinic',        color: '#22c55e', time: '0:12' },
      { icon: '🛡️', text: 'MedGuard™ SAFE — score 14/100 — all 6 signals nominal',                  color: '#22c55e', time: '1:47' },
      { icon: '🌍', text: 'EVN-iQ400 — No new advisories for active destinations',                   color: GOLD,      time: '3:22' },
      { icon: '📡', text: 'Safe-T4life check-in received — 4h ahead of deadline',                    color: '#22c55e', time: '5:10' },
      { icon: '⚠️', text: 'EVN-iQ400 WATCH — moderate advisory update for destination',              color: '#f59e0b', time: '8:44' },
      { icon: '✈️', text: 'HS2 Airport Drop-off confirmed — patient boarded',                       color: '#60a5fa', time: '12:01' },
      { icon: '💳', text: 'Escrow milestone released — payment to clinic after HS5 confirmed',       color: GOLD,      time: '15:30' },
      { icon: '🚗', text: 'HS1 Driver Pickup confirmed — patient en route to airport',               color: '#22c55e', time: '22:15' },
      { icon: '🏨', text: 'HS4 Hotel Check-in confirmed — patient settled at partner hotel',         color: '#22c55e', time: '28:40' },
      { icon: '🛡️', text: 'MedGuard™ WATCH — score 38/100 — activity pattern shift detected',      color: '#f59e0b', time: '34:50' },
      { icon: '📩', text: 'Pre-departure AI briefing sent — patient confirmed receipt',               color: '#a855f7', time: '41:20' },
      { icon: '🌍', text: 'EVN-iQ400 ALERT — moderate advisory issued for transit route',            color: '#f97316', time: '48:00' },
    ];
    setFeed(BASE);
  }, []);

  // Scroll feed to top on new entries
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = 0;
  }, [feed.length]);

  const highRisk  = Object.values(evnData).filter(d => d.riskScore >= 72).length;
  const watchDest = Object.values(evnData).filter(d => d.riskScore >= 52 && d.riskScore < 72).length;

  return (
    <div style={{ minHeight: '100vh', background: '#04080F', color: '#fff', fontFamily: '"SF Pro Display", system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top command bar ── */}
      <div style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(4,8,15,0.98)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', gap: 20, position: 'sticky', top: 0, zIndex: 50 }}>
        <Link to="/admin" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontSize: 11 }}>← Admin</Link>
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }}
            style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', color: '#fff' }}>SITUATION ROOM</p>
            <p style={{ margin: 0, fontSize: 9, color: GOLD, letterSpacing: '0.2em', fontWeight: 700 }}>MORALES GLOBAL INTELLIGENCE · LIVE</p>
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Global stats */}
          {[
            { v: totalActive,  l: 'ACTIVE JOURNEYS', c: GOLD },
            { v: inTransit,    l: 'IN TRANSIT',       c: '#60a5fa' },
            { v: countries,    l: 'COUNTRIES',        c: '#a855f7' },
            { v: highRisk,     l: 'HIGH RISK DEST',   c: '#ef4444' },
            { v: watchDest,    l: 'WATCH DEST',       c: '#f59e0b' },
          ].map(({ v, l, c }) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: c, letterSpacing: '-0.02em' }}>{v}</p>
              <p style={{ margin: 0, fontSize: 7, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.25)', fontWeight: 700 }}>{l}</p>
            </div>
          ))}
          <div style={{ textAlign: 'right', borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: 20 }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '0.05em', fontVariantNumeric: 'tabular-nums' }}>
              {time.toLocaleTimeString('en-US', { hour12: false })}
            </p>
            <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>
              {time.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()} UTC
            </p>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 0 }}>

        {/* ── LEFT: Tactical World Map ── */}
        <div style={{ position: 'relative', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

          {/* EVN-iQ400 strip */}
          <div style={{ padding: '8px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 12, overflowX: 'auto' }}>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.15em', color: GOLD, flexShrink: 0 }}>EVN-iQ400</span>
            {Object.entries(evnData).sort((a, b) => b[1].riskScore - a[1].riskScore).map(([iso, d]) => {
              const lvl = getRiskLevel(d.riskScore);
              return (
                <div key={iso} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 8, background: lvl.bg, border: `1px solid ${lvl.border}`, flexShrink: 0 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: lvl.color }}>{d.riskScore}</span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{d.name || iso}</span>
                  <span style={{ fontSize: 9 }}>{lvl.emoji}</span>
                </div>
              );
            })}
            {Object.keys(evnData).length === 0 && (
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>Loading advisory data...</span>
            )}
          </div>

          {/* SVG World */}
          <div style={{ padding: '12px 16px', flex: 1 }}>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
              {/* Background grid */}
              {Array.from({ length: 17 }, (_, i) => (
                <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2={H}
                  stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
              ))}
              {Array.from({ length: 9 }, (_, i) => (
                <line key={`h${i}`} x1="0" y1={i * 55} x2={W} y2={i * 55}
                  stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
              ))}

              {/* Equator + Prime Meridian */}
              <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke={`${GOLD}15`} strokeWidth="1" strokeDasharray="4 6" />
              <line x1={W / 2} y1="0" x2={W / 2} y2={H} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 6" />

              {/* Continent outlines (tactical) */}
              {CONTINENT_PATHS.map((d, i) => (
                <path key={i} d={d} fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
              ))}

              {/* Radar sweep */}
              <RadarSweep />

              {/* Destination markers */}
              {DESTINATIONS.map(dest => (
                <DestMarker
                  key={dest.iso}
                  dest={dest}
                  evnData={evnData[dest.iso] || null}
                  patients={patientsByISO[dest.iso] || []}
                  isActive={activeISOs.has(dest.iso)}
                />
              ))}

              {/* Morales HQ marker */}
              <g>
                <motion.circle cx={188} cy={155} r="12"
                  fill="transparent" stroke={GOLD} strokeWidth="1.5"
                  animate={{ r: [8, 18, 8], opacity: [0.8, 0, 0.8] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                <circle cx={188} cy={155} r="5" fill={GOLD} stroke="#04080F" strokeWidth="2" />
                <text x={188} y={172} textAnchor="middle" fontSize="7.5" fill={GOLD} fontWeight="800">HQ</text>
              </g>

              {/* Connection lines from HQ to active destinations */}
              {DESTINATIONS.filter(d => activeISOs.has(d.iso)).map(dest => (
                <motion.line
                  key={`line-${dest.iso}`}
                  x1={188} y1={155} x2={dest.x} y2={dest.y}
                  stroke={`${GOLD}20`} strokeWidth="1" strokeDasharray="4 4"
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, delay: dest.x * 0.002 }}
                />
              ))}
            </svg>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 8, paddingLeft: 4 }}>
              {[['#22c55e', 'Safe'], ['#f59e0b', 'Watch'], ['#ef4444', 'High Risk'], [GOLD, 'Morales HQ']].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{l}</span>
                </div>
              ))}
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>Radar sweep: 90s cycle</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Intelligence Feed ── */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

          {/* Active journeys list */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ margin: '0 0 8px', fontSize: 9, fontWeight: 800, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)' }}>
              ACTIVE JOURNEYS · {totalActive}
            </p>
            {activeCases.length === 0 ? (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', margin: '8px 0' }}>No active journeys</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {activeCases.slice(0, 6).map(c => {
                  const iso  = COUNTRY_ISO[c.procedure_country];
                  const evn  = iso ? evnData[iso] : null;
                  const lvl  = evn ? getRiskLevel(evn.riskScore) : null;
                  const hs   = c.current_step ?? 0;
                  return (
                    <div key={c.id} style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: `1px solid ${lvl ? lvl.border : 'rgba(255,255,255,0.06)'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{c.client_name || 'Patient'}</span>
                        {lvl && <span style={{ fontSize: 9, fontWeight: 800, color: lvl.color }}>{lvl.emoji} {lvl.label}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{c.procedure_country || '—'}</span>
                        <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                          <div style={{ width: `${(hs / 9) * 100}%`, height: '100%', background: GOLD, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>HS{hs}/9</span>
                      </div>
                    </div>
                  );
                })}
                {activeCases.length > 6 && (
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textAlign: 'center', margin: '4px 0 0' }}>
                    +{activeCases.length - 6} more →{' '}
                    <Link to="/admin/mission-control" style={{ color: GOLD }}>Mission Control</Link>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Live intelligence feed */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: '10px 14px 6px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }}
                  style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                <p style={{ margin: 0, fontSize: 9, fontWeight: 800, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)' }}>
                  LIVE INTELLIGENCE FEED
                </p>
              </div>
            </div>
            <div ref={feedRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 14px' }}>
              <AnimatePresence initial={false}>
                {feed.map((item, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{ padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'flex-start', gap: 8 }}
                  >
                    <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>{item.text}</p>
                      <p style={{ margin: 0, fontSize: 8, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>{item.time} ago</p>
                    </div>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: item.color, flexShrink: 0, marginTop: 4 }} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom actions */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8 }}>
            <Link to="/admin/mission-control"
              style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: 10, background: `${GOLD}15`, border: `1px solid ${GOLD}40`, color: GOLD, fontSize: 10, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.05em' }}>
              MISSION CONTROL →
            </Link>
            <Link to="/admin/dispatch-monitor"
              style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.05em' }}>
              DISPATCH →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
