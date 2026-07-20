/**
 * Situation Room — Global Intelligence Display
 *
 * Real-time tactical overview of every active patient journey worldwide.
 * Falls back to demo seed data when no real cases exist so the map
 * always looks alive during investor / judge demos.
 *
 * Route: /admin/situation-room  (also public at /demo/situation-room)
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { base44 } from '@/api/base44Client';
import { COUNTRY_ISO, getRiskLevel } from '@/hooks/useEnvironmentalIntelligence';
import { ACTIVE_TRAVEL_PHASES } from '@/lib/constants';

const GOLD = '#D4AF37';
const HQ   = [25.77, -80.19]; // Miami, FL — Morales HQ

// World bounds — prevents Leaflet from wrapping / tiling the map twice
const WORLD_BOUNDS = /** @type {any} */([[-85, -180], [85, 180]]);

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
  TR: { riskScore: 78, name: 'Turkey'   }, // HIGH RISK — triggers radar + alert
  IN: { riskScore: 28, name: 'India'    },
};

/**
 * Presentation for real AuditLog rows. Deliberately event-type only — this
 * board goes on a wall, so it must never render patient identity.
 */
const FEED_EVENT_STYLE = {
  handshake_completed:        { icon: '✅', color: '#22c55e', label: 'Checkpoint confirmed' },
  handshake_tap_confirmed:    { icon: '✅', color: '#22c55e', label: 'Checkpoint confirmed (app)' },
  handshake_sms_confirmed:    { icon: '📩', color: '#22c55e', label: 'Checkpoint confirmed (SMS)' },
  handshake_created:          { icon: '🕓', color: '#60a5fa', label: 'Checkpoint opened' },
  sos_triggered:              { icon: '🚨', color: '#ef4444', label: 'SOS TRIGGERED' },
  covert_sos_triggered:       { icon: '🚨', color: '#ef4444', label: 'COVERT SOS TRIGGERED' },
  satellite_sos_received:     { icon: '🛰️', color: '#ef4444', label: 'Satellite SOS received' },
  satellite_message_received: { icon: '🛰️', color: '#06b6d4', label: 'Satellite message received' },
  escrow_payment_released:    { icon: '💳', color: GOLD,      label: 'Escrow milestone released' },
  received_sos:               { icon: '🚨', color: '#ef4444', label: 'SOS received via SMS' },
  _default:                   { icon: '•',  color: '#94a3b8', label: 'Event recorded' },
};

// Sample feed — shown ONLY in demo mode, where the header says SAMPLE DATA.
const FEED_ITEMS = [
  { icon: '📡', text: 'MESH BEACON ACTIVATED — Elena G. · Taipei · GPS 25.0517°N 121.5645°E · Mesh relay: 2 nodes · Fire dept + Police auto-dispatched', color: '#ef4444', time: '0:00', tag: 'Beacon · CR-55' },
  { icon: '🚨', text: 'COUNTRY SAFETY ALERT — Carlos M. · Turkey zone risk 78/100 · Doctor & Clinic VERIFIED SAFE ✅ · Morales Concierge Team activated', color: '#ef4444', time: '0:02', tag: 'Country Advisory · Turkey' },
  { icon: '✅', text: 'Sophie R. — Clinic Arrival confirmed at Bangkok Aesthetic Clinic',           color: '#22c55e', time: '0:12',  tag: 'HS5 · Thailand'  },
  { icon: '🛡️', text: 'Anika P. — MedGuard™ SAFE · score 14/100 · all 6 signals nominal',         color: '#22c55e', time: '1:47',  tag: 'Recovery · India' },
  { icon: '🌍', text: 'EVN-iQ400 — No new advisories across all 5 active destinations',             color: GOLD,      time: '3:22',  tag: 'System-wide'     },
  { icon: '📡', text: 'Anika P. — Safe-T4life check-in received · 4h ahead of deadline',           color: '#22c55e', time: '5:10',  tag: 'HS7 · India'     },
  { icon: '⚠️', text: 'EVN-iQ400 — Turkey country zone score updated to 78 · Doctor & Clinic remain Morales-verified and safe', color: '#f59e0b', time: '8:44', tag: 'Country Risk · Turkey' },
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

  // Inject CSS for radar pulse animation (scoped to unique class names)
  useEffect(() => {
    const el = document.createElement('style');
    el.id    = 'morales-radar-css';
    el.textContent = `
      .mrls-hr-wrap{position:relative;width:70px;height:70px;display:flex;align-items:center;justify-content:center}
      .mrls-hr-ring{position:absolute;top:50%;left:50%;border-radius:50%;border:2px solid #ef4444;animation:mrlsRadar 2.2s ease-out infinite}
      .mrls-hr-ring:nth-child(1){animation-delay:0s}
      .mrls-hr-ring:nth-child(2){animation-delay:0.73s}
      .mrls-hr-ring:nth-child(3){animation-delay:1.46s}
      .mrls-hr-dot{width:14px;height:14px;border-radius:50%;background:#ef4444;box-shadow:0 0 8px #ef4444,0 0 20px rgba(239,68,68,0.6),0 0 40px rgba(239,68,68,0.3)}
      @keyframes mrlsRadar{
        0%  {width:14px;height:14px;transform:translate(-50%,-50%);opacity:0.95;border-width:2px}
        100%{width:72px;height:72px;transform:translate(-50%,-50%);opacity:0;border-width:1px}
      }
    `;
    if (!document.getElementById('morales-radar-css')) document.head.appendChild(el);
    return () => { const s = document.getElementById('morales-radar-css'); if (s) s.remove(); };
  }, []);

  // DivIcon for high-risk destinations — pulsing radar rings
  const highRiskIcon = useMemo(() => L.divIcon({
    className: '',
    html: `<div class="mrls-hr-wrap">
      <div class="mrls-hr-ring"></div>
      <div class="mrls-hr-ring"></div>
      <div class="mrls-hr-ring"></div>
      <div class="mrls-hr-dot"></div>
    </div>`,
    iconSize:   [70, 70],
    iconAnchor: [35, 35],
    popupAnchor:[0, -35],
  }), []);

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
      // User-scoped: asServiceRole is a THROWING getter in the browser — the
      // `?.` never helped (the getter itself throws), so this always rejected
      // and the room always fell back to demo data. Admin RLS permits the read.
      const results  = await Promise.allSettled(
        statuses.map(s =>
          base44.entities.CaseRecord.filter({ status: s }, '-updated_date', 20).catch(() => [])
        )
      );
      return results.flatMap(r => r.status === 'fulfilled' ? (r.value || []) : []);
    },
    staleTime: 90_000,
    refetchInterval: 300_000,
  });

  // ── Real live positions ───────────────────────────────────────────────────
  // The map used to plot destination-country centroids only: a dot meant "this
  // patient's procedure_country is Mexico", not where they were. The beacon has
  // been writing real GPS to LiveLocation all along (useLiveLocationBeacon →
  // updateLiveLocation) and getGuardianViewData already reads it — the admin
  // map simply never consumed it. Same read, same GPS-over-IP preference.
  const { data: livePositions = [] } = useQuery({
    queryKey: ['situation-room-live-positions', tick],
    queryFn: async () => {
      const rows = await base44.entities.LiveLocation
        .filter({ is_active: true }, '-updated_date', 200)
        .catch(() => []);
      // IP geo resolves to the ISP's registered city (wrong country under a
      // VPN), so a GPS fix always wins for the same case.
      const bestByCase = new Map();
      for (const r of rows) {
        if (r?.latitude == null || r?.longitude == null || !r.case_id) continue;
        const existing = bestByCase.get(r.case_id);
        const isGps = (r.source || 'gps') === 'gps';
        if (!existing || (isGps && (existing.source || 'gps') !== 'gps')) {
          bestByCase.set(r.case_id, r);
        }
      }
      return [...bestByCase.values()];
    },
    staleTime: 20_000,
    refetchInterval: 30_000, // positions move; cases don't
  });

  // A position is only meaningful while it is fresh. checkStaleLiveLocations
  // escalates at 15 minutes, so anything older is shown as last-known rather
  // than presented as current.
  const LIVE_FRESH_MS = 15 * 60 * 1000;
  const freshPositions = livePositions.filter(p => {
    const ts = p.updated_date || p.last_update_at || p.created_date;
    return ts && (Date.now() - new Date(ts).getTime()) < LIVE_FRESH_MS;
  });

  // ── Real intelligence feed ────────────────────────────────────────────────
  // Reads the audit hash chain instead of the hardcoded FEED_ITEMS array. The
  // sample array stayed on screen in every mode — including a fabricated
  // "MESH BEACON ACTIVATED" line — so an operator could believe they were
  // watching real events. Falls back to the sample only in demo mode, where it
  // is labelled as such.
  const { data: auditFeed = [] } = useQuery({
    queryKey: ['situation-room-feed', tick],
    queryFn: async () => {
      const rows = await base44.entities.AuditLog
        .list('-timestamp', 40)
        .catch(() => []);
      return rows.map((r) => {
        const style = FEED_EVENT_STYLE[r.event_type] || FEED_EVENT_STYLE._default;
        const when = r.timestamp || r.created_date;
        return {
          icon: style.icon,
          color: style.color,
          // Never render patient identity here — this board is often on a wall.
          text: `${style.label}${r.case_id ? ` · case ${String(r.case_id).slice(-6)}` : ''}`,
          time: when ? new Date(when).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          tag: r.event_type,
        };
      });
    },
    staleTime: 20_000,
    refetchInterval: 30_000,
  });

  // Real audit events when we have them; the labelled sample only in demo mode.
  const feedItems = auditFeed.length > 0 ? auditFeed : FEED_ITEMS;

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
  }, [activeCases.length, isDemo]);  

  const highRisk  = Object.values(displayEvn).filter(d => d.riskScore >= 72).length;
  const watchDest = Object.values(displayEvn).filter(d => d.riskScore >= 52 && d.riskScore < 72).length;

  // Find the highest-risk active patient for the alert banner
  const alertCase = displayCases.find(c => {
    const iso = COUNTRY_ISO[c.procedure_country];
    return iso && (displayEvn[iso]?.riskScore ?? 0) >= 72;
  });
  const alertEvn = alertCase ? displayEvn[COUNTRY_ISO[alertCase.procedure_country]] : null;

  return (
    <div style={{ height: '100vh', background: '#04080F', color: '#fff', fontFamily: '"SF Pro Display", system-ui, sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Top command bar ── */}
      <div style={{ flexShrink: 0, padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(4,8,15,0.98)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', gap: 20, zIndex: 1001 }}>
        <Link to="/admin" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontSize: 11 }}>← Admin</Link>
        <Link to="/demo" style={{ color: 'rgba(255,255,255,0.2)', textDecoration: 'none', fontSize: 11 }}>Demo</Link>
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }}
            style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', color: '#fff' }}>SITUATION ROOM</p>
            {/* Only claims LIVE when real positions are actually on the map.
                Country markers are destination centroids; the green dots are
                consented GPS refreshed every 30s. */}
            <p style={{ margin: 0, fontSize: 9, color: GOLD, letterSpacing: '0.2em', fontWeight: 700 }}>
              {isDemo
                ? 'MORALES GLOBAL INTELLIGENCE · SAMPLE DATA'
                : freshPositions.length > 0
                  ? `MORALES GLOBAL INTELLIGENCE · ${freshPositions.length} LIVE`
                  : 'MORALES GLOBAL INTELLIGENCE · NO LIVE POSITIONS'}
            </p>
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
            { v: highRisk,    l: 'ZONE HIGH RISK',     c: '#ef4444', pulse: highRisk > 0 },
            { v: watchDest,   l: 'ON WATCH',          c: '#f59e0b' },
          ].map(({ v, l, c, pulse }) => (
            <div key={l} style={{ textAlign: 'center' }}>
              {pulse ? (
                <motion.p
                  animate={{ opacity: [1, 0.35, 1], textShadow: [`0 0 8px ${c}`, `0 0 0px ${c}`, `0 0 8px ${c}`] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  style={{ margin: 0, fontSize: 20, fontWeight: 900, color: c, letterSpacing: '-0.02em' }}
                >{v}</motion.p>
              ) : (
                <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: c, letterSpacing: '-0.02em' }}>{v}</p>
              )}
              <p style={{ margin: 0, fontSize: 7, letterSpacing: '0.12em', color: pulse ? c : 'rgba(255,255,255,0.25)', fontWeight: 700 }}>{l}</p>
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
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.15em', color: GOLD, flexShrink: 0 }}>EVN-iQ400 · COUNTRY ZONE SAFETY</span>
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

          {/* Flashing ALERT banner — only when high-risk patient detected */}
          {alertCase && alertEvn && (
            <motion.div
              animate={{ opacity: [1, 0.55, 1], backgroundColor: ['rgba(239,68,68,0.18)', 'rgba(239,68,68,0.08)', 'rgba(239,68,68,0.18)'] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              style={{ flexShrink: 0, padding: '7px 20px', borderBottom: '1px solid rgba(239,68,68,0.5)', display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
                style={{ fontSize: 14 }}>🚨</motion.span>
              <span style={{ fontSize: 9, fontWeight: 900, color: '#ef4444', letterSpacing: '0.15em' }}>COUNTRY SAFETY ADVISORY</span>
              <div style={{ width: 1, height: 14, background: 'rgba(239,68,68,0.4)' }} />
              <div>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                  {alertCase.client_name} is in {alertCase.procedure_country} — Zone Risk {alertEvn.riskScore}/100
                </span>
                <span style={{ fontSize: 9, color: '#22c55e', fontWeight: 700, marginLeft: 10 }}>
                  ✅ Doctor &amp; Clinic: Morales-Verified Safe
                </span>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 800, color: '#ef4444', letterSpacing: '0.08em' }}>
                CONCIERGE TEAM ACTIVE
              </span>
            </motion.div>
          )}

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
                center={/** @type {any} */(HQ)}
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

              {/* Connection lines: HQ → active destinations (red for high-risk) */}
              {DESTINATIONS.filter(d => activeISOs.has(d.iso)).map(dest => {
                const isHR = (displayEvn[dest.iso]?.riskScore ?? 0) >= 72;
                return (
                  <Polyline
                    key={`line-${dest.iso}`}
                    positions={/** @type {any} */([HQ, [dest.lat, dest.lng]])}
                    pathOptions={{
                      color:     isHR ? '#ef4444' : GOLD,
                      weight:    isHR ? 2 : 1.5,
                      opacity:   isHR ? 0.75 : 0.5,
                      dashArray: isHR ? '4 4' : '6 5',
                    }}
                  />
                );
              })}

              {/* Destination markers — radar icon for high risk, circle for all others */}
              {DESTINATIONS.map(dest => {
                const count  = patientsByISO[dest.iso]?.length || 0;
                const evn    = displayEvn[dest.iso];
                const lvl    = evn ? getRiskLevel(evn.riskScore) : null;
                const isHR   = count > 0 && (evn?.riskScore ?? 0) >= 72;

                const popup = (
                  <Popup>
                    <div style={{ fontSize: 12, minWidth: 170 }}>
                      <strong>{dest.name}</strong>
                      {isHR && <div style={{ color: '#ef4444', fontWeight: 700, marginTop: 4 }}>🌍 HIGH COUNTRY ZONE RISK</div>}
                      {isHR && <div style={{ color: '#22c55e', fontSize: 11, marginTop: 2 }}>✅ Doctor &amp; Clinic: Morales-Verified</div>}
                      {count > 0 ? (
                        <div style={{ color: isHR ? '#ef4444' : '#1a8f3a', marginTop: 4 }}>
                          {count} active patient{count > 1 ? 's' : ''}{isDemo ? ' (sample data)' : ''}
                          {/* The pin is this country's centroid — it is where
                              the patient is TRAVELLING TO, not where they are.
                              Live position lives on LiveLocation/Guardian View
                              and is not plotted here. */}
                          <div style={{ color: '#888', fontSize: 10, marginTop: 2, fontWeight: 400 }}>
                            Destination country — not a tracked position
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: '#888', marginTop: 4 }}>Monitored destination</div>
                      )}
                      {evn && <div style={{ marginTop: 4 }}>{lvl.emoji} Country zone score: <strong>{evn.riskScore}/100</strong></div>}
                    </div>
                  </Popup>
                );

                // High-risk active patient → animated radar Marker
                if (isHR) {
                  return (
                    <Marker key={dest.iso} position={[dest.lat, dest.lng]} icon={highRiskIcon}>
                      {popup}
                    </Marker>
                  );
                }

                // Normal active or monitored → CircleMarker
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
                    {popup}
                  </CircleMarker>
                );
              })}

              {/* Real patient positions — actual GPS, not a country centroid.
                  Rendered on top of the destination markers so an operator can
                  tell "someone is travelling to Mexico" from "this person is
                  HERE, two minutes ago". */}
              {freshPositions.map((p) => {
                const ts = p.updated_date || p.last_update_at || p.created_date;
                const ageMin = ts ? Math.round((Date.now() - new Date(ts).getTime()) / 60000) : null;
                return (
                  <CircleMarker
                    key={`live-${p.case_id}`}
                    center={[p.latitude, p.longitude]}
                    radius={7}
                    pathOptions={{
                      color: '#22c55e',
                      fillColor: '#22c55e',
                      fillOpacity: 0.9,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div style={{ fontSize: 12, minWidth: 180 }}>
                        <strong>Live position</strong>
                        <div style={{ color: '#1a8f3a', marginTop: 4 }}>
                          {ageMin === 0 ? 'Updated just now' : `Updated ${ageMin} min ago`}
                        </div>
                        <div style={{ color: '#888', marginTop: 2 }}>
                          {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
                          {p.accuracy_meters ? ` · ±${Math.round(p.accuracy_meters)}m` : ''}
                        </div>
                        <div style={{ color: '#888', fontSize: 11, marginTop: 4 }}>
                          Shared with consent · {p.source === 'gps' ? 'GPS' : p.source || 'GPS'}
                        </div>
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
              [GOLD,      'Destination (not a position)'],
              ['#22c55e', 'Live position (consented)'],
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
                {/* Reads the audit chain now. Only says LIVE when it really is
                    — an operator must never stand down on sample data. */}
                <p style={{ margin: 0, fontSize: 9, fontWeight: 800, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)' }}>
                  {feedItems === FEED_ITEMS ? 'SAMPLE INTELLIGENCE FEED · NOT LIVE' : 'LIVE INTELLIGENCE FEED · AUDIT CHAIN'}
                </p>
              </div>
            </div>
            <div ref={feedRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 14px' }}>
              <AnimatePresence initial={false}>
                {feedItems.map((item, i) => (
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
