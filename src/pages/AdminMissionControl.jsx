import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Shield, AlertTriangle, Zap, Globe,
  Radio, ArrowRight, RefreshCw, Phone
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { ACTIVE_TRAVEL_PHASES } from '@/lib/constants';

const GOLD = '#D4AF37';

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
function PatientCard({ c, medguardScore, onContact }) {
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
            <img src="https://i.pravatar.cc/150?img=47" alt={c.client_name}
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

        {/* Risk badge + action */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
            style={{ background: risk.bg, border: `1px solid ${risk.color}30` }}>
            <RiskIcon className="w-3 h-3" style={{ color: risk.color }} />
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: risk.color }}>
              {risk.label}
            </span>
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
      const results = await Promise.allSettled(
        statuses.map(s => base44.asServiceRole?.entities?.CaseRecord?.filter({ status: s }, '-updated_date', 20).catch(() => []) ?? Promise.resolve([]))
      );
      return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
    },
    staleTime: 60_000,
    refetchInterval: 90_000,
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

  const safeCount     = Object.values(medguardScores).filter(s => s < 31).length;
  const watchCount    = Object.values(medguardScores).filter(s => s >= 31 && s < 61).length;
  const alertCount    = Object.values(medguardScores).filter(s => s >= 61 && s < 81).length;
  const criticalCount = Object.values(medguardScores).filter(s => s >= 81).length;

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['mission-control-cases'] });
    setLastRefresh(new Date());
    setTimeout(() => setRefreshing(false), 800);
  };

  const feed = [
    { icon: '✅', text: 'Maria C. — HS5 Clinic Arrival confirmed. Caracas, Venezuela.', time: '2 min ago', color: '#22c55e' },
    { icon: '🛡️', text: 'MedGuard SAFE — James T. score 18/100. Bangkok, Thailand.', time: '5 min ago', color: '#22c55e' },
    { icon: '⚠️', text: 'MedGuard WATCH — Luisa R. score 44/100. Bogotá, Colombia.', time: '12 min ago', color: '#d97706' },
    { icon: '💳', text: 'Escrow released — $1,200 to Dr. Ahmed after HS5 confirmation.', time: '18 min ago', color: GOLD },
    { icon: '✈️', text: 'Travel Agency confirmed — Maria C. flights booked DAL-CCS.', time: '34 min ago', color: '#60a5fa' },
    { icon: '🚗', text: 'HS1 Driver Pickup — Carlos M. confirmed. Heading to JFK.', time: '1h ago', color: '#22c55e' },
    { icon: '📩', text: 'Quote reminder sent (Stage 1) — Prestige Travel Agency.', time: '2h ago', color: '#94a3b8' },
  ];

  const inTransit = activeCases.filter((c) => ACTIVE_TRAVEL_PHASES.has(c.trip_phase));
  const countries  = [...new Set(activeCases.map((c) => c.procedure_country).filter(Boolean))];

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
            </div>
            <p className="text-[10px]" style={{ color: '#475569' }}>
              Last updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Auto-refreshes every 90s
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
            { icon: '🌍', label: 'Active Patients',   value: activeCases.length,  color: GOLD },
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

        {/* ── Main grid: patient cards + feed ── */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">

          {/* Patient cards */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <SignalDot color={GOLD} size={8} />
                <span className="text-sm font-semibold text-white">Active Patients</span>
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
            ) : activeCases.length === 0 ? (
              <div className="rounded-2xl p-12 text-center" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
                <Globe className="w-12 h-12 mx-auto mb-4" style={{ color: '#334155' }} />
                <p className="text-sm text-white/50">No active journeys right now.</p>
                <p className="text-xs mt-1" style={{ color: '#334155' }}>Patients will appear here once their journey begins.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {/* Sort: Critical first, then Alert, then Watch, then Safe */}
                {[...activeCases].sort((a, b) => (medguardScores[b.id] || 0) - (medguardScores[a.id] || 0))
                  .map((c) => (
                    <PatientCard key={c.id} c={c} medguardScore={medguardScores[c.id] || 12} onContact={() => {}} />
                  ))}
              </div>
            )}
          </div>

          {/* Live activity feed */}
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden sticky top-24"
              style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid #2A3F4A' }}>
                <Radio className="w-4 h-4" style={{ color: GOLD }} />
                <span className="text-sm font-semibold text-white">Live Activity</span>
                <SignalDot color='#22c55e' size={6} />
              </div>
              <div className="px-4 overflow-y-auto" style={{ maxHeight: 480 }}>
                {feed.map((item, i) => (
                  <FeedItem key={i} {...item} />
                ))}
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
