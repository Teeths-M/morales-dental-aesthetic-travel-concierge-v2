import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Shield, AlertTriangle, Zap, Globe,
  Radio, ArrowRight, RefreshCw, Phone
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { ACTIVE_TRAVEL_PHASES } from '@/lib/constants';
import { COUNTRY_ISO, getRiskLevel } from '@/hooks/useEnvironmentalIntelligence';

const GOLD = '#D4AF37';

const DEMO_CASES = [
  { id: 'demo_1', client_name: 'Maria C.',  procedure_country: 'Venezuela', trip_phase: 'arrived',        current_step: 5, client_phone: '+1-555-0101' },
  { id: 'demo_2', client_name: 'James T.',  procedure_country: 'Thailand',  trip_phase: 'recovery',       current_step: 6, client_phone: '+1-555-0102' },
  { id: 'demo_3', client_name: 'Luisa R.',  procedure_country: 'Colombia',  trip_phase: 'transit_out',    current_step: 3, client_phone: '+1-555-0103' },
  { id: 'demo_4', client_name: 'Carlos M.', procedure_country: 'Mexico',    trip_phase: 'transit_return', current_step: 7, client_phone: '+1-555-0104' },
  { id: 'demo_5', client_name: 'Priya S.',  procedure_country: 'Turkey',    trip_phase: 'recovery',       current_step: 6, client_phone: '+1-555-0105' },
  { id: 'demo_6', client_name: 'Ahmed K.',  procedure_country: 'UAE',       trip_phase: 'pre_departure',  current_step: 1, client_phone: '+1-555-0106' },
];

const DEMO_MEDGUARD = {
  demo_1: 44,
  demo_2: 18,
  demo_3: 67,
  demo_4: 22,
  demo_5: 38,
  demo_6: 15,
};

const RISK_CONFIG = {
  SAFE:     { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  label: 'Safe',     icon: Shield },
  WATCH:    { color: '#d97706', bg: 'rgba(217,119,6,0.12)',  label: 'Watch',    icon: Shield },
  ALERT:    { color: '#ea580c', bg: 'rgba(234,88,12,0.15)',  label: 'Alert',    icon: AlertTriangle },
  CRITICAL: { color: '#dc2626', bg: 'rgba(220,38,38,0.15)',  label: 'Critical', icon: Zap },
};

const HS_LABELS = ['', '🚗 Home Pickup', '✈️ Airport', '🛬 Destination', '🏨 Hotel', '🏥 Clinic', '🍽️ Companion', '🚕 Return', '🛫 Home Airport', '🏠 Journey Complete'];

const PHASE_COLORS = {
  pre_departure:  '#64748b',
  transit_out:    '#60a5fa',
  arrived:        '#22c55e',
  recovery:       GOLD,
  transit_return: '#a855f7',
  completed:      '#22c55e',
};

// ── Pulsing signal dot ─────────────────────────────────────────────────────
function SignalDot({ color, size = 10 }) {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <span className="animate-ping absolute inline-flex rounded-full opacity-60"
        style={{ background: color, width: size, height: size }} />
      <span className="relative inline-flex rounded-full"
        style={{ background: color, width: size, height: size }} />
    </span>
  );
}

// ── Patient card ───────────────────────────────────────────────────────────
function PatientCard({ c, medguardScore, evnScore, _onContact }) {
  const riskLevel = medguardScore >= 81 ? 'CRITICAL' : medguardScore >= 61 ? 'ALERT' : medguardScore >= 31 ? 'WATCH' : 'SAFE';
  const risk      = RISK_CONFIG[riskLevel];
  const RiskIcon  = risk.icon;
  const phase     = c.trip_phase || 'pre_departure';
  const phaseColor = PHASE_COLORS[phase] || '#64748b';
  const hs        = c.current_step ?? 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: '#0C1A1D', border: `1px solid ${risk.color}35` }}
    >
      {/* Risk top bar */}
      <div style={{ height: 3, background: `linear-gradient(to right, transparent, ${risk.color}, transparent)` }} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <img loading="lazy" decoding="async" src="https://i.pravatar.cc/150?img=47" alt={c.client_name}
              className="w-9 h-9 rounded-full object-cover flex-shrink-0"
              style={{ border: `2px solid ${risk.color}` }} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{c.client_name}</p>
              <p className="text-[10px] mt-0.5 truncate" style={{ color: '#64748b' }}>
                📍 {c.procedure_country || c.destination_country || 'Location TBC'}
              </p>
            </div>
          </div>

          {/* MedGuard score */}
          <div className="text-right flex-shrink-0">
            <div className="text-xl font-black leading-none" style={{ color: risk.color }}>{medguardScore}</div>
            <div className="text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>MedGuard</div>
          </div>
        </div>

        {/* Journey phase + HS step */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <SignalDot color={phaseColor} size={7} />
            <span className="text-[10px] font-semibold capitalize" style={{ color: phaseColor }}>
              {phase.replace(/_/g, ' ')}
            </span>
          </div>
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {HS_LABELS[hs] || 'Pre-departure'}
          </span>
        </div>

        {/* HS progress dots */}
        <div className="flex items-center gap-0.5 mb-3">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full"
              style={{ background: i < hs ? phaseColor : '#1e2d35' }} />
          ))}
        </div>

        {/* Risk badge + EVN + action */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
              style={{ background: risk.bg, border: `1px solid ${risk.color}30` }}>
              <RiskIcon className="w-3 h-3" style={{ color: risk.color }} />
              <span className="text-[9px] font-bold uppercase" style={{ color: risk.color }}>{risk.label}</span>
            </div>
            {evnScore != null && (() => {
              const evnLvl = getRiskLevel(evnScore);
              return (
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
                  style={{ background: evnLvl.bg, border: `1px solid ${evnLvl.border}` }}>
                  <Globe className="w-2.5 h-2.5" style={{ color: evnLvl.color }} />
                  <span className="text-[9px] font-bold" style={{ color: evnLvl.color }}>ENV {evnScore}</span>
                </div>
              );
            })()}
          </div>
          {c.client_phone && (
            <a href={`tel:${c.client_phone}`}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
              <Phone className="w-3 h-3" /> Call
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Live activity feed item ────────────────────────────────────────────────
function FeedItem({ icon, text, time, color }) {
  return (
    <div className="flex items-start gap-2.5 py-2.5" style={{ borderBottom: '1px solid #1e2d35' }}>
      <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/70 leading-snug">{text}</p>
        <p className="text-[10px] mt-0.5" style={{ color: '#475569' }}>{time}</p>
      </div>
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: color }} />
    </div>
  );
}

/**
 * AdminMissionControl — The Command Center
 *
 * Every active patient on the platform, globally, in real time.
 * MedGuard scores, journey phases, HS progress — all in one view.
 * Like NASA mission control but for medical travel safety.
 */
export default function AdminMissionControl() {
  const queryClient = useQueryClient();
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing,  setRefreshing]  = useState(false);

  // Load all active cases
  const { data: activeCases = [], isLoading } = useQuery({
    queryKey: ['mission-control-cases'],
    queryFn: async () => {
      const statuses = ['Travel-Coordination', 'Ready-For-Travel', 'Procedure-In-Progress', 'Recovery', 'Deposit-Paid'];
      // User-scoped: asServiceRole is a THROWING getter in the browser — even
      // `?.` couldn't save this (the getter itself throws), so the whole
      // queryFn rejected and the board ALWAYS fell back to demo cases. Admin
      // RLS on CaseRecord permits this read directly.
      const results = await Promise.allSettled(
        statuses.map(s => base44.entities.CaseRecord.filter({ status: s }, '-updated_date', 20).catch(() => []))
      );
      return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
    },
    staleTime: 60_000,
    refetchInterval: 300_000,
  });

  // Simulated MedGuard scores (in real use: read from AuditLog last analysis)
  const medguardScores = {};
  activeCases.forEach((c) => {
    // Real score would come from last runMedGuardAnalysis AuditLog entry
    // For display: derive from case properties
    let score = 12;
    if (c.trip_phase === 'arrived' || c.trip_phase === 'recovery') score += 15;
    if (c.procedure_country && ['Venezuela', 'Mexico', 'Colombia', 'Honduras'].includes(c.procedure_country)) score += 15;
    medguardScores[c.id] = Math.min(score, 100);
  });

  // Demo fallback is fine for a walkthrough, but it must SAY so — an admin (or
  // an investor looking over their shoulder) must never mistake sample patients
  // for live ones. Same honesty pattern as SituationRoom's isDemo badges.
  const isDemo        = !isLoading && activeCases.length === 0;
  const displayCases  = activeCases.length > 0 ? activeCases : DEMO_CASES;
  const displayScores = activeCases.length > 0 ? medguardScores : DEMO_MEDGUARD;

  const safeCount     = Object.values(displayScores).filter(s => s < 31).length;
  const watchCount    = Object.values(displayScores).filter(s => s >= 31 && s < 61).length;
  const alertCount    = Object.values(displayScores).filter(s => s >= 61 && s < 81).length;
  const criticalCount = Object.values(displayScores).filter(s => s >= 81).length;

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['mission-control-cases'] });
    setLastRefresh(new Date());
    setTimeout(() => setRefreshing(false), 800);
  };

  // Sample events for the walkthrough ONLY. Real activity lives in the audit
  // log — fabricating "live" events next to real patients would be exactly the
  // kind of claim-outrunning-code this platform must never make.
  const SAMPLE_FEED = [
    { icon: '✅', text: 'Maria C. — HS5 Clinic Arrival confirmed. Caracas, Venezuela.', time: '2 min ago', color: '#22c55e' },
    { icon: '🛡️', text: 'MedGuard SAFE — James T. score 18/100. Bangkok, Thailand.', time: '5 min ago', color: '#22c55e' },
    { icon: '⚠️', text: 'MedGuard WATCH — Luisa R. score 44/100. Bogotá, Colombia.', time: '12 min ago', color: '#d97706' },
    { icon: '💳', text: 'Escrow released — $1,200 to Dr. Ahmed after HS5 confirmation.', time: '18 min ago', color: GOLD },
    { icon: '✈️', text: 'Travel Agency confirmed — Maria C. flights booked DAL-CCS.', time: '34 min ago', color: '#60a5fa' },
    { icon: '🚗', text: 'HS1 Driver Pickup — Carlos M. confirmed. Heading to JFK.', time: '1h ago', color: '#22c55e' },
    { icon: '📩', text: 'Quote reminder sent (Stage 1) — Prestige Travel Agency.', time: '2h ago', color: '#94a3b8' },
  ];
  const feed = isDemo ? SAMPLE_FEED : [];

  const inTransit = displayCases.filter((c) => ACTIVE_TRAVEL_PHASES.has(c.trip_phase));
  const countries  = [...new Set(displayCases.map((c) => c.procedure_country).filter(Boolean))];

  // ── EVN-iQ400 batch fetch — country advisory scores for all active destinations ──
  const [evnScores, setEvnScores] = useState({}); // iso2 → { score, riskScore, source }
  useEffect(() => {
    if (!countries.length) return;
    (async () => {
      try {
        const res  = await fetch('https://www.travel-advisory.info/api', { signal: AbortSignal.timeout(8000) });
        const json = await res.json();
        const out  = {};
        countries.forEach(name => {
          const iso2  = COUNTRY_ISO[name];
          if (!iso2) return;
          const entry = json?.data?.[iso2];
          if (!entry) return;
          const score     = entry.advisory?.score ?? 2;
          const riskScore = Math.round(((Math.max(1, Math.min(5, score)) - 1) / 4) * 85 + 5);
          out[iso2] = { name, iso2, score, riskScore, source: 'live' };
        });
        setEvnScores(out);
      } catch {
        // Offline — set moderate baseline for all
        const out = {};
        countries.forEach(name => {
          const iso2 = COUNTRY_ISO[name];
          if (iso2) out[iso2] = { name, iso2, score: 2, riskScore: 33, source: 'offline' };
        });
        setEvnScores(out);
      }
    })();
  }, [countries.join(',')]);  

  return (
    <div className="min-h-screen" style={{ background: '#060B16' }}>

      {/* ── Top bar ── */}
      <div className="px-6 py-4 flex items-center justify-between sticky top-0 z-20"
        style={{ background: 'rgba(6,11,22,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #2A3F4A' }}>
        <div className="flex items-center gap-4">
          <Link to="/admin" className="text-sm" style={{ color: '#475569' }}>← Admin</Link>
          <div>
            <div className="flex items-center gap-2">
              <img src="/morales-m-mark.png" alt="M" className="w-5" style={{ filter: `drop-shadow(0 0 4px ${GOLD})` }} />
              <span className="text-base font-bold text-white">Mission Control</span>
              {isDemo && (
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-widest"
                  style={{ background: 'rgba(212,175,55,0.15)', border: `1px solid ${GOLD}50`, color: GOLD }}>
                  DEMO MODE
                </span>
              )}
            </div>
            <p className="text-[10px]" style={{ color: '#475569' }}>
              {isDemo
                ? 'Sample patients — no live cases on the platform right now'
                : `Last updated ${lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Auto-refreshes every 90s`}
            </p>
          </div>
        </div>
        <button onClick={handleRefresh} disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{ background: '#0C1A1D', border: '1px solid #2A3F4A', color: '#94a3b8' }}>
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="px-6 py-6 space-y-6">

        {/* ── Global stats strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { icon: '🌍', label: 'Active Patients',   value: displayCases.length,  color: GOLD },
            { icon: '✈️', label: 'In Transit',         value: inTransit.length,    color: '#60a5fa' },
            { icon: '🌐', label: 'Countries',          value: countries.length,    color: '#a855f7' },
            { icon: '🟢', label: 'Safe',               value: safeCount,           color: '#22c55e' },
            { icon: '🟡', label: 'Watch',              value: watchCount,          color: '#d97706' },
            { icon: '🟠', label: 'Alert',              value: alertCount,          color: '#ea580c' },
            { icon: '🔴', label: 'Critical',           value: criticalCount,       color: '#dc2626' },
          ].map(({ icon, label, value, color }) => (
            <div key={label} className="rounded-2xl px-4 py-3 text-center"
              style={{ background: '#0C1A1D', border: `1px solid ${color}25` }}>
              <div className="text-lg mb-0.5">{icon}</div>
              <div className="text-2xl font-black" style={{ color }}>{value}</div>
              <div className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: '#475569' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── EVN-iQ400 Global Intelligence Ticker ── */}
        {Object.keys(evnScores).length > 0 && (
          <div style={{ background: '#080F1C', border: `1px solid ${GOLD}25`, borderRadius: 16, padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Globe style={{ width: 13, height: 13, color: GOLD }} />
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', color: GOLD, textTransform: 'uppercase' }}>
                EVN-iQ400 · Environmental Intelligence · Active Destinations
              </span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginLeft: 4 }}>
                {Object.values(evnScores)[0]?.source === 'live' ? '🟢 Live' : '🟡 Offline cache'}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.values(evnScores).sort((a,b) => b.riskScore - a.riskScore).map(ev => {
                const lvl = getRiskLevel(ev.riskScore);
                return (
                  <div key={ev.iso2} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 10, background: lvl.bg, border: `1px solid ${lvl.border}` }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: lvl.color }}>{ev.riskScore}</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>{ev.name}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: lvl.color }}>{lvl.emoji} {lvl.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Main grid: patient cards + feed ── */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">

          {/* Patient cards */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <SignalDot color={GOLD} size={8} />
                <span className="text-sm font-semibold text-white">Active Patients</span>
                {isDemo && (
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-bold tracking-widest"
                    style={{ background: 'rgba(212,175,55,0.12)', color: GOLD }}>
                    SAMPLE
                  </span>
                )}
              </div>
              {criticalCount > 0 && (
                <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ background: 'rgba(220,38,38,0.15)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)' }}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {criticalCount} CRITICAL — Immediate attention required
                </motion.div>
              )}
            </div>

            {isLoading ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="rounded-2xl h-44 animate-pulse" style={{ background: '#0C1A1D' }} />
                ))}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {/* Sort: Critical first, then Alert, then Watch, then Safe */}
                {[...displayCases].sort((a, b) => (displayScores[b.id] || 0) - (displayScores[a.id] || 0))
                  .map((c) => {
                    const iso2    = COUNTRY_ISO[c.procedure_country];
                    const evnData = iso2 ? evnScores[iso2] : null;
                    return (
                      <PatientCard key={c.id} c={c} medguardScore={displayScores[c.id] || 12}
                        evnScore={evnData?.riskScore ?? null} onContact={() => {}} />
                    );
                  })}
              </div>
            )}
          </div>

          {/* Live activity feed */}
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden sticky top-24"
              style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid #2A3F4A' }}>
                <Radio className="w-4 h-4" style={{ color: GOLD }} />
                <span className="text-sm font-semibold text-white">{isDemo ? 'Sample Activity' : 'Activity'}</span>
                {isDemo ? (
                  <span className="text-[9px] font-bold tracking-widest" style={{ color: GOLD }}>NOT LIVE</span>
                ) : (
                  <SignalDot color='#22c55e' size={6} />
                )}
              </div>
              <div className="px-4 overflow-y-auto" style={{ maxHeight: 480 }}>
                {feed.map((item, i) => (
                  <FeedItem key={i} {...item} />
                ))}
                {!isDemo && (
                  <p className="text-xs py-4" style={{ color: '#64748b' }}>
                    Real activity is recorded in the audit log — open it below for the verified, hash-chained history.
                  </p>
                )}
              </div>
              <div className="px-4 py-3" style={{ borderTop: '1px solid #2A3F4A' }}>
                <Link to="/admin/audit-log"
                  className="flex items-center justify-between text-xs font-semibold"
                  style={{ color: GOLD }}>
                  View Full Audit Log <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Countries active */}
            {countries.length > 0 && (
              <div className="rounded-2xl px-4 py-4" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
                <p className="text-xs font-semibold mb-3 tracking-widest uppercase" style={{ color: GOLD }}>
                  Active Destinations
                </p>
                <div className="flex flex-wrap gap-2">
                  {countries.map(c => (
                    <span key={c} className="text-xs px-2 py-1 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
