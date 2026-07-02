/**
 * Situation Room — Global Intelligence Display
 *
 * Real-time tactical overview of every active patient journey worldwide.
 * EVN-iQ400 threat levels per destination, MedGuard scores, handshake
 * progress — rendered on a dark tactical world map.
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

// Simulated live feed (production: reads from AuditLog)
const FEED_ITEMS = [
  { icon: '✅', text: 'HS5 Clinic Arrival confirmed — patient at Morales partner clinic',   color: '#22c55e', time: '0:12' },
  { icon: '🛡️', text: 'MedGuard™ SAFE — score 14/100 — all 6 signals nominal',             color: '#22c55e', time: '1:47' },
  { icon: '🌍', text: 'EVN-iQ400 — No new advisories for active destinations',              color: GOLD,      time: '3:22' },
  { icon: '📡', text: 'Safe-T4life check-in received — 4h ahead of deadline',               color: '#22c55e', time: '5:10' },
  { icon: '⚠️', text: 'EVN-iQ400 WATCH — moderate advisory update for destination',         color: '#f59e0b', time: '8:44' },
  { icon: '✈️', text: 'HS2 Airport Drop-off confirmed — patient boarded',                   color: '#60a5fa', time: '12:01' },
  { icon: '💳', text: 'Escrow milestone released — payment to clinic after HS5',            color: GOLD,      time: '15:30' },
  { icon: '🚗', text: 'HS1 Driver Pickup confirmed — patient en route to airport',          color: '#22c55e', time: '22:15' },
  { icon: '🏨', text: 'HS4 Hotel Check-in confirmed — patient settled at partner hotel',    color: '#22c55e', time: '28:40' },
  { icon: '🛡️', text: 'MedGuard™ WATCH — score 38/100 — activity pattern shift detected', color: '#f59e0b', time: '34:50' },
  { icon: '📩', text: 'Pre-departure AI briefing sent — patient confirmed receipt',          color: '#a855f7', time: '41:20' },
  { icon: '🌍', text: 'EVN-iQ400 ALERT — advisory issued for transit route',                color: '#f97316', time: '48:00' },
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

  // Group patients by destination ISO
  const patientsByISO = {};
  activeCases.forEach(c => {
    const iso = COUNTRY_ISO[c.procedure_country];
    if (iso) {
      if (!patientsByISO[iso]) patientsByISO[iso] = [];
      patientsByISO[iso].push(c);
    }
  });

  const activeISOs  = new Set(Object.keys(patientsByISO));
  const totalActive = activeCases.length;
  const inTransit   = activeCases.filter(c => ACTIVE_TRAVEL_PHASES.has(c.trip_phase)).length;
  const countries   = activeISOs.size;

  // Fetch EVN-iQ400 risk data for active destinations
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
      } catch { /* silent — dots still render without EVN data */ }
    })();
  }, [activeCases.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const highRisk  = Object.values(evnData).filter(d => d.riskScore >= 72).length;
  const watchDest = Object.values(evnData).filter(d => d.riskScore >= 52 && d.riskScore < 72).length;

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

        {/* ── LEFT: Leaflet World Map ── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

          {/* EVN-iQ400 risk strip */}
          <div style={{ flexShrink: 0, padding: '8px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 12, overflowX: 'auto' }}>
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
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
                {activeCases.length === 0 ? 'Dot markers show once patients are booked' : 'Loading advisory data...'}
              </span>
            )}
          </div>

          {/* Map — fills remaining vertical space */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <MapContainer
              center={[20, 10]}
              zoom={2}
              style={{ width: '100%', height: '100%' }}
              zoomControl={false}
              attributionControl={true}
              minZoom={1}
              maxZoom={7}
            >
              {/* CartoDB Dark Matter — tactical dark look */}
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                subdomains="abcd"
                maxZoom={19}
              />

              {/* HQ marker — Miami */}
              <CircleMarker
                center={HQ}
                radius={10}
                pathOptions={{ fillColor: GOLD, color: '#fff', weight: 2.5, fillOpacity: 1 }}
              >
                <Popup>
                  <div style={{ fontSize: 12, minWidth: 140 }}>
                    <strong style={{ color: GOLD }}>Morales HQ</strong><br />
                    <span style={{ color: '#555' }}>Miami, Florida</span>
                  </div>
                </Popup>
              </CircleMarker>

              {/* Dashed lines: HQ → active destinations */}
              {DESTINATIONS.filter(d => activeISOs.has(d.iso)).map(dest => (
                <Polyline
                  key={`line-${dest.iso}`}
                  positions={[HQ, [dest.lat, dest.lng]]}
                  pathOptions={{ color: GOLD, weight: 1.2, opacity: 0.45, dashArray: '6 5' }}
                />
              ))}

              {/* Destination markers */}
              {DESTINATIONS.map(dest => {
                const count  = patientsByISO[dest.iso]?.length || 0;
                const evn    = evnData[dest.iso];
                const lvl    = evn ? getRiskLevel(evn.riskScore) : null;
                const color  = lvl?.color || (count > 0 ? GOLD : 'rgba(200,200,200,0.35)');
                const radius = count > 0 ? Math.min(10 + count * 2, 18) : 4;
                const opac   = count > 0 ? 0.85 : 0.4;
                // Show all known destinations — dim when inactive
                return (
                  <CircleMarker
                    key={dest.iso}
                    center={[dest.lat, dest.lng]}
                    radius={radius}
                    pathOptions={{ fillColor: color, color: '#04080F', weight: 1.5, fillOpacity: opac }}
                  >
                    <Popup>
                      <div style={{ fontSize: 12, minWidth: 160 }}>
                        <strong>{dest.name}</strong>
                        {count > 0 && (
                          <div style={{ color: '#1a8f3a', marginTop: 4 }}>
                            {count} active patient{count > 1 ? 's' : ''}
                          </div>
                        )}
                        {evn && (
                          <div style={{ marginTop: 4 }}>
                            {lvl.emoji} Risk score: <strong>{evn.riskScore}/100</strong>
                          </div>
                        )}
                        {!count && !evn && (
                          <div style={{ color: '#888', marginTop: 4 }}>No active journeys</div>
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
              ['#22c55e', 'Low Risk'],
              ['#f59e0b', 'Watch'],
              ['#ef4444', 'High Risk'],
              [GOLD,      'HQ / Active patient'],
              ['rgba(200,200,200,0.35)', 'No active journey'],
            ].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.15)' }} />
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Intelligence Panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Active journeys */}
          <div style={{ flexShrink: 0, padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto', maxHeight: '40%' }}>
            <p style={{ margin: '0 0 8px', fontSize: 9, fontWeight: 800, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)' }}>
              ACTIVE JOURNEYS · {totalActive}
            </p>
            {activeCases.length === 0 ? (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', margin: '8px 0', lineHeight: 1.6 }}>
                No active journeys yet.<br />
                <Link to="/booking" style={{ color: GOLD }}>Book a case</Link> to see patients appear on the map.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {activeCases.slice(0, 6).map(c => {
                  const iso = COUNTRY_ISO[c.procedure_country];
                  const evn = iso ? evnData[iso] : null;
                  const lvl = evn ? getRiskLevel(evn.riskScore) : null;
                  const hs  = c.current_step ?? 0;
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
                    <Link to="/demo/mission-control" style={{ color: GOLD }}>Mission Control</Link>
                  </p>
                )}
              </div>
            )}
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
                    transition={{ delay: i * 0.05 }}
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
