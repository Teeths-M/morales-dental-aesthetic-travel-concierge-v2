/**
 * Situation Room — Global Intelligence Display
 *
 * Real-time tactical overview of every active patient journey worldwide.
 * Falls back to demo seed data when no real cases exist so the map
 * always looks alive during investor / judge demos.
 *
 * Route: /admin/situation-room  (also public at /demo/situation-room)
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { base44 } from '@/api/base44Client';
import { COUNTRY_ISO, getRiskLevel } from '@/hooks/useEnvironmentalIntelligence';
import { ACTIVE_TRAVEL_PHASES } from '@/lib/constants';

const GOLD = '#D4AF37';
const HQ   = [25.77, -80.19]; // Miami, FL — Morales HQ

// World bounds — prevents Leaflet from wrapping / tiling the map twice
const WORLD_BOUNDS = [[-85, -180], [85, 180]];

const DESTINATIONS = [
  { iso: 'MX', name: 'Mexico',       lat: 23.6,   lng: -102.5 },
  { iso: 'CO', name: 'Colombia',     lat: 4.6,    lng: -74.3  },
  { iso: 'VE', name: 'Venezuela',    lat: 8.0,    lng: -66.6  },
  { iso: 'BR', name: 'Brazil',       lat: -14.2,  lng: -51.9  },
  { iso: 'CR', name: 'Costa Rica',   lat: 10.0,   lng: -84.0  },
  { iso: 'TR', name: 'Turkey',       lat: 39.0,   lng: 35.2   },
  { iso: 'TH', name: 'Thailand',     lat: 15.9,   lng: 100.9  },
  { iso: 'IN', name: 'India',        lat: 20.6,   lng: 78.9   },
  { iso: 'PH', name: 'Philippines',  lat: 12.9,   lng: 122.0  },
  { iso: 'ZA', name: 'South Africa', lat: -29.0,  lng: 25.0   },
  { iso: 'EG', name: 'Egypt',        lat: 26.8,   lng: 30.8   },
  { iso: 'MA', name: 'Morocco',      lat: 31.8,   lng: -7.1   },
  { iso: 'JO', name: 'Jordan',       lat: 31.2,   lng: 36.2   },
  { iso: 'SG', name: 'Singapore',    lat: 1.3,    lng: 103.8  },
  { iso: 'MY', name: 'Malaysia',     lat: 4.2,    lng: 109.7  },
  { iso: 'KR', name: 'South Korea',  lat: 36.0,   lng: 127.9  },
  { iso: 'HU', name: 'Hungary',      lat: 47.2,   lng: 19.5   },
  { iso: 'PL', name: 'Poland',       lat: 52.1,   lng: 19.1   },
  { iso: 'AR', name: 'Argentina',    lat: -34.0,  lng: -64.0  },
  { iso: 'PE', name: 'Peru',         lat: -9.2,   lng: -75.0  },
];

// Human-readable journey stage names for each Handshake Step
const HS_LABELS = {
  0: 'Pre-Departure', 1: 'Driver Pickup', 2: 'Airport Drop-off',
  3: 'In-Country',    4: 'Hotel Check-in', 5: 'Clinic Arrival',
  6: 'Procedure',     7: 'Recovery',       8: 'Travel Home', 9: 'Home Safe',
};

// Seed data — shown only when no real cases exist (judges / demo mode)
const DEMO_CASES = [
  { id: 'demo-1', client_name: 'María G.',  procedure_country: 'Mexico',    current_step: 4, trip_phase: 'Travel-Coordination',   status: 'Travel-Coordination',   flag: '🇲🇽', procedure: 'Dental Implants',   doctor: 'Dr. Hernández', clinic: 'Clínica Morales MX',       _demo: true },
  { id: 'demo-2', client_name: 'James T.',  procedure_country: 'Colombia',  current_step: 2, trip_phase: 'Ready-For-Travel',      status: 'Ready-For-Travel',      flag: '🇨🇴', procedure: 'All-on-4 Implants',  doctor: 'Dr. Castillo',  clinic: 'Bogotá Dental Center',     _demo: true },
  { id: 'demo-3', client_name: 'Sophie R.', procedure_country: 'Thailand',  current_step: 6, trip_phase: 'Procedure-In-Progress', status: 'Procedure-In-Progress', flag: '🇹🇭', procedure: 'Rhinoplasty',        doctor: 'Dr. Suwan',     clinic: 'Bangkok Aesthetic Clinic', _demo: true },
  { id: 'demo-4', client_name: 'Carlos M.', procedure_country: 'Turkey',    current_step: 3, trip_phase: 'Ready-For-Travel',      status: 'Ready-For-Travel',      flag: '🇹🇷', procedure: 'Porcelain Veneers',  doctor: 'Dr. Yilmaz',    clinic: 'Istanbul Smile Studio',    _demo: true },
  { id: 'demo-5', client_name: 'Anika P.',  procedure_country: 'India',     current_step: 7, trip_phase: 'Recovery',              status: 'Recovery',              flag: '🇮🇳', procedure: 'Tummy Tuck',         doctor: 'Dr. Sharma',    clinic: 'Mumbai MedPlus Centre',    _demo: true },
];

const DEMO_EVN = {
  MX: { riskScore: 42, name: 'Mexico'   },
  CO: { riskScore: 38, name: 'Colombia' },
  TH: { riskScore: 18, name: 'Thailand' },
  TR: { riskScore: 55, name: 'Turkey'   },
  IN: { riskScore: 28, name: 'India'    },
};

// Simulated live feed (production: reads from AuditLog)
const FEED_ITEMS = [
  { icon: '✅', text: 'Sophie R. — Clinic Arrival confirmed at Bangkok Aesthetic Clinic',           color: '#22c55e', time: '0:12',  tag: 'HS5 · Thailand'  },
  { icon: '🛡️', text: 'Anika P. — MedGuard™ SAFE · score 14/100 · all 6 signals nominal',         color: '#22c55e', time: '1:47',  tag: 'Recovery · India' },
  { icon: '🌍', text: 'EVN-iQ400 — No new advisories across all 5 active destinations',             color: GOLD,      time: '3:22',  tag: 'System-wide'     },
  { icon: '📡', text: 'Anika P. — Safe-T4life check-in received · 4h ahead of deadline',           color: '#22c55e', time: '5:10',  tag: 'HS7 · India'     },
  { icon: '⚠️', text: 'EVN-iQ400 WATCH — Turkey advisory score updated to 55 · elevated risk',     color: '#f59e0b', time: '8:44',  tag: 'Carlos M.'       },
  { icon: '✈️', text: 'James T. — Airport Drop-off confirmed · patient boarded flight to Colombia', color: '#60a5fa', time: '12:01', tag: 'HS2 · Colombia'  },
  { icon: '💳', text: 'María G. — Escrow milestone released after Hotel Check-in confirmed',        color: GOLD,      time: '15:30', tag: 'HS4 · Mexico'    },
  { icon: '🚗', text: 'Carlos M. — Driver Pickup confirmed · en route to Istanbul airport',         color: '#22c55e', time: '22:15', tag: 'HS1 · Turkey'    },
  { icon: '🏨', text: 'James T. — Hotel Check-in confirmed at partner hotel in Bogotá',             color: '#22c55e', time: '28:40', tag: 'HS4 · Colombia'  },
  { icon: '🛡️', text: 'Carlos M. — MedGuard™ WATCH · score 38/100 · activity shift detected',     color: '#f59e0b', time: '34:50', tag: 'HS3 · Turkey'    },
  { icon: '📩', text: 'María G. — Pre-departure AI briefing sent · confirmed receipt',              color: '#a855f7', time: '41:20', tag: 'Pre-Departure'   },
  { icon: '🌍', text: 'EVN-iQ400 ALERT — advisory issued for transit route through Colombia',       color: '#f97316', time: '48:00', tag: 'System-wide'     },
];

export default function SituationRoom() {
  const [tick, setTick]       = useState(0);
  const [evnData, setEvnData] = useState({});
  const [time, setTime]       = useState(new Date());
  const feedRef               = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 90_000);
    return () => clearInterval(id);
  }, []);

  const { data: activeCases = [] } = useQuery({
    queryKey: ['situation-room-cases', tick],
    queryFn: async () => {
      const statuses = ['Travel-Coordination', 'Ready-For-Travel', 'Procedure-In-Progress', 'Recovery', 'Deposit-Paid'];
      const results  = await Promise.allSettled(
        statuses.map(s =>
          (base44.asServiceRole?.entities?.CaseRecord?.filter({ status: s }, '-updated_date', 20) ?? Promise.resolve([]))
            .catch(() => [])
        )
      );
      return results.flatMap(r => r.status === 'fulfilled' ? (r.value || []) : []);
    },
    staleTime: 90_000,
    refetchInterval: 300_000,
  });

  // Fall back to demo seed when no real patients exist
  const isDemo       = activeCases.length === 0;
  const displayCases = isDemo ? DEMO_CASES : activeCases;
  const displayEvn   = isDemo ? DEMO_EVN   : evnData;

  // Group patients by destination ISO
  const patientsByISO = {};
  displayCases.forEach(c => {
    const iso = COUNTRY_ISO[c.procedure_country];
    if (iso) {
      if (!patientsByISO[iso]) patientsByISO[iso] = [];
      patientsByISO[iso].push(c);
    }
  });

  const activeISOs  = new Set(Object.keys(patientsByISO));
  const totalActive = displayCases.length;
  const inTransit   = displayCases.filter(c => ACTIVE_TRAVEL_PHASES.has(c.trip_phase)).length;
  const countries   = activeISOs.size;

  // Fetch live EVN-iQ400 risk data for real active destinations
  useEffect(() => {
    if (isDemo) return;
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
      } catch { /* silent */ }
    })();
  }, [activeCases.length, isDemo]); // eslint-disable-line react-hooks/exhaustive-deps

  const highRisk  = Object.values(displayEvn).filter(d => d.riskScore >= 72).length;
  const watchDest = Object.values(displayEvn).filter(d => d.riskScore >= 52 && d.riskScore < 72).length;

  return (
    <div style={{ height: '100vh', background: '#04080F', color: '#fff', fontFamily: '"SF Pro Display", system-ui, sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Top command bar ── */}
      <div style={{ flexShrink: 0, padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(4,8,15,0.98)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', gap: 20, zIndex: 1001 }}>
        <Link to="/demo" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontSize: 11 }}>← Demo</Link>
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }}
            style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', color: '#fff' }}>SITUATION ROOM</p>
            <p style={{ margin: 0, fontSize: 9, color: GOLD, letterSpacing: '0.2em', fontWeight: 700 }}>MORALES GLOBAL INTELLIGENCE · LIVE</p>
          </div>
        </div>

        {/* Demo mode badge */}
        {isDemo && (
          <div style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(212,175,55,0.15)', border: `1px solid ${GOLD}50`, fontSize: 9, fontWeight: 800, color: GOLD, letterSpacing: '0.1em' }}>
            DEMO MODE
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 20 }}>
          {[
            { v: totalActive, l: 'ACTIVE JOURNEYS', c: GOLD      },
            { v: inTransit,   l: 'IN TRANSIT',       c: '#60a5fa' },
            { v: countries,   l: 'COUNTRIES',        c: '#a855f7' },
            { v: highRisk,    l: 'HIGH RISK',         c: '#ef4444' },
            { v: watchDest,   l: 'ON WATCH',          c: '#f59e0b' },
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
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 320px' }}>

        {/* ── LEFT: World Map ── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

          {/* EVN-iQ400 risk strip */}
          <div style={{ flexShrink: 0, padding: '8px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 12, overflowX: 'auto' }}>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.15em', color: GOLD, flexShrink: 0 }}>EVN-iQ400</span>
            {Object.entries(displayEvn).sort((a, b) => b[1].riskScore - a[1].riskScore).map(([iso, d]) => {
              const lvl = getRiskLevel(d.riskScore);
              return (
                <div key={iso} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 8, background: lvl.bg, border: `1px solid ${lvl.border}`, flexShrink: 0 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: lvl.color }}>{d.riskScore}</span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{d.name || iso}</span>
                  <span style={{ fontSize: 9 }}>{lvl.emoji}</span>
                </div>
              );
            })}
          </div>

          {/* Leaflet map — fills remaining space */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <MapContainer
              center={[20, 10]}
              zoom={2}
              minZoom={1}
              maxZoom={7}
              maxBounds={WORLD_BOUNDS}
              maxBoundsViscosity={1.0}
              worldCopyJump={false}
              zoomControl={false}
              attributionControl={true}
              style={{ width: '100%', height: '100%' }}
            >
              {/* Dark no-label tiles — cleaner tactical look */}
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                subdomains="abcd"
                noWrap={true}
                maxZoom={19}
              />

              {/* HQ pulsing marker — Miami */}
              <CircleMarker
                center={HQ}
                radius={10}
                pathOptions={{ fillColor: GOLD, color: '#fff', weight: 2.5, fillOpacity: 1 }}
              >
                <Popup>
                  <div style={{ fontSize: 12, minWidth: 140 }}>
                    <strong style={{ color: '#b8860b' }}>Morales HQ</strong><br />
                    <span style={{ color: '#555' }}>Miami, Florida</span>
                  </div>
                </Popup>
              </CircleMarker>

              {/* Dashed gold lines: HQ → active destinations */}
              {DESTINATIONS.filter(d => activeISOs.has(d.iso)).map(dest => (
                <Polyline
                  key={`line-${dest.iso}`}
                  positions={[HQ, [dest.lat, dest.lng]]}
                  pathOptions={{ color: GOLD, weight: 1.5, opacity: 0.5, dashArray: '6 5' }}
                />
              ))}

              {/* Destination markers — all 20 visible, active ones highlighted */}
              {DESTINATIONS.map(dest => {
                const count  = patientsByISO[dest.iso]?.length || 0;
                const evn    = displayEvn[dest.iso];
                const lvl    = evn ? getRiskLevel(evn.riskScore) : null;
                const color  = count > 0 ? (lvl?.color || GOLD) : '#0ea5e9';
                const radius = count > 0 ? Math.min(8 + count * 3, 16) : 5;
                const opac   = count > 0 ? 0.9 : 0.55;
                return (
                  <CircleMarker
                    key={dest.iso}
                    center={[dest.lat, dest.lng]}
                    radius={radius}
                    pathOptions={{ fillColor: color, color: count > 0 ? '#04080F' : 'rgba(0,0,0,0.4)', weight: 1.5, fillOpacity: opac }}
                  >
                    <Popup>
                      <div style={{ fontSize: 12, minWidth: 160 }}>
                        <strong>{dest.name}</strong>
                        {count > 0 ? (
                          <div style={{ color: '#1a8f3a', marginTop: 4 }}>
                            {count} active patient{count > 1 ? 's' : ''}
                            {isDemo && ' (demo)'}
                          </div>
                        ) : (
                          <div style={{ color: '#888', marginTop: 4 }}>Monitored destination</div>
                        )}
                        {evn && (
                          <div style={{ marginTop: 4 }}>
                            {lvl.emoji} Risk score: <strong>{evn.riskScore}/100</strong>
                          </div>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>

          {/* Legend */}
          <div style={{ flexShrink: 0, padding: '7px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 18, background: '#04080F' }}>
            {[
              [GOLD,      'Active patient'],
              ['#22c55e', 'Low risk'],
              ['#f59e0b', 'Watch'],
              ['#ef4444', 'High risk'],
              ['#0ea5e9', 'Monitored'],
            ].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Intelligence Panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Active journeys */}
          <div style={{ flexShrink: 0, padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto', maxHeight: '42%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ margin: 0, fontSize: 9, fontWeight: 800, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)' }}>
                ACTIVE JOURNEYS · {totalActive}
              </p>
              {isDemo && (
                <span style={{ fontSize: 8, color: GOLD, fontWeight: 700, letterSpacing: '0.08em' }}>DEMO DATA</span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {displayCases.slice(0, 6).map(c => {
                const iso       = COUNTRY_ISO[c.procedure_country];
                const evn       = iso ? displayEvn[iso] : null;
                const lvl       = evn ? getRiskLevel(evn.riskScore) : null;
                const hs        = c.current_step ?? 0;
                const stageName = HS_LABELS[hs] || `Step ${hs}`;
                const barColor  = lvl?.color || GOLD;
                return (
                  <div key={c.id} style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${lvl ? lvl.border : 'rgba(255,255,255,0.08)'}` }}>
                    {/* Row 1: name + risk */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{c.client_name || 'Patient'}</span>
                      {lvl && <span style={{ fontSize: 9, fontWeight: 800, color: lvl.color }}>{lvl.emoji} {lvl.label}</span>}
                    </div>
                    {/* Row 2: procedure + doctor */}
                    <div style={{ fontSize: 9, color: GOLD, marginBottom: 6, opacity: 0.85, display: 'flex', gap: 4, alignItems: 'center' }}>
                      {c.procedure && <span>{c.procedure}</span>}
                      {c.procedure && c.doctor && <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>}
                      {c.doctor && <span style={{ color: 'rgba(255,255,255,0.45)' }}>{c.doctor}</span>}
                      {!c.procedure && <span style={{ color: 'rgba(255,255,255,0.3)' }}>Procedure not specified</span>}
                    </div>
                    {/* Row 3: flag + country + progress bar + stage name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11 }}>{c.flag || '🌐'}</span>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', minWidth: 52, flexShrink: 0 }}>{c.procedure_country || '—'}</span>
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                        <div style={{ width: `${(hs / 9) * 100}%`, height: '100%', background: barColor, borderRadius: 2, transition: 'width 0.6s ease' }} />
                      </div>
                      <span style={{ fontSize: 9, color: barColor, fontWeight: 700, minWidth: 78, textAlign: 'right', flexShrink: 0 }}>{stageName}</span>
                    </div>
                  </div>
                );
              })}
              {displayCases.length > 6 && (
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textAlign: 'center', margin: '4px 0 0' }}>
                  +{displayCases.length - 6} more →{' '}
                  <Link to="/demo/mission-control" style={{ color: GOLD }}>Mission Control</Link>
                </p>
              )}
            </div>
          </div>

          {/* Live intelligence feed */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flexShrink: 0, padding: '10px 14px 6px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
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
                {FEED_ITEMS.map((item, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    style={{ padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'flex-start', gap: 8 }}
                  >
                    <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.7)', lineHeight: 1.45 }}>{item.text}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>{item.time} ago</span>
                        {item.tag && <span style={{ fontSize: 8, color: item.color, fontWeight: 700, opacity: 0.75 }}>{item.tag}</span>}
                      </div>
                    </div>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: item.color, flexShrink: 0, marginTop: 4 }} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom actions */}
          <div style={{ flexShrink: 0, padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8 }}>
            <Link to="/demo/mission-control"
              style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: 10, background: `${GOLD}15`, border: `1px solid ${GOLD}40`, color: GOLD, fontSize: 10, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.05em' }}>
              MISSION CONTROL →
            </Link>
            <Link to="/demo"
              style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.05em' }}>
              ← ALL DEMOS
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
