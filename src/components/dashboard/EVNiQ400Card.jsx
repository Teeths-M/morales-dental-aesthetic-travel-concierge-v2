/**
 * EVN-iQ400 — Environmental Intelligence Layer
 *
 * Displays a 0–100 environmental risk score for the patient's destination
 * with plain-language explanations sourced from live government travel
 * advisories, aggregated via travel-advisory.info (free, no API key).
 *
 * Integrates with MedGuard: the environmental risk score is shown alongside
 * the behavioural safety score so the concierge sees both at a glance.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Globe, ChevronDown, ChevronUp, Clock, AlertTriangle, CheckCircle2, Wifi, WifiOff } from 'lucide-react';
import { useEnvironmentalIntelligence, getRiskLevel } from '@/hooks/useEnvironmentalIntelligence';

const GOLD = '#D4AF37';

// Circular arc score ring
function ScoreRing({ score, color, size = 88 }) {
  const r       = (size - 12) / 2;
  const circ    = 2 * Math.PI * r;
  const filled  = circ * (score / 100);
  const cx      = size / 2;
  const cy      = size / 2;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      {/* track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={8} />
      {/* arc */}
      <motion.circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - filled }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
      />
    </svg>
  );
}

// Compact advisory level pill
function AdvisoryPill({ score }) {
  const levels = [
    { max: 1.4, label: 'Normal Precautions',    color: '#22c55e' },
    { max: 2.4, label: 'Exercise Caution',       color: '#eab308' },
    { max: 3.4, label: 'Avoid Non-Essential',    color: '#f97316' },
    { max: 4.4, label: 'Avoid All Travel',       color: '#ef4444' },
    { max: 5.0, label: 'Advisory Unavailable',   color: '#94a3b8' },
  ];
  const lvl = levels.find(l => score <= l.max) || levels[levels.length - 1];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
      padding: '3px 8px', borderRadius: 99,
      background: `${lvl.color}18`, border: `1px solid ${lvl.color}50`,
      color: lvl.color, whiteSpace: 'nowrap',
    }}>
      {lvl.label}
    </span>
  );
}

// Single signal row
function Signal({ icon: Icon, label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}15`, border: `1px solid ${color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon style={{ width: 13, height: 13, color }} />
      </div>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', flex: 1 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', textAlign: 'right', maxWidth: 180 }}>{value}</span>
    </div>
  );
}

export default function EVNiQ400Card({ country, countryCode }) {
  const [expanded, setExpanded] = useState(false);
  const { data, loading, riskLevel } = useEnvironmentalIntelligence({ country, countryCode });

  if (!country && !countryCode) return null;

  const score     = data?.riskScore ?? 35;
  const level     = riskLevel ?? getRiskLevel(score);
  const isLoading = loading && !data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: 'linear-gradient(135deg, #0A1520 0%, #0C1A2A 100%)',
        border: `1px solid ${level.border}`,
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: `0 4px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03) inset`,
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: `${GOLD}20`, border: `1px solid ${GOLD}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Globe style={{ width: 11, height: 11, color: GOLD }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', color: GOLD, textTransform: 'uppercase' }}>
            EVN-iQ400
          </span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginLeft: 2 }}>
            Environmental Intelligence
          </span>
          {data?.source === 'live' && (
            <Wifi style={{ width: 10, height: 10, color: '#22c55e', marginLeft: 'auto' }} />
          )}
          {data?.source === 'offline' && (
            <WifiOff style={{ width: 10, height: 10, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }} />
          )}
        </div>

        {/* Score block */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
          {/* Ring */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <ScoreRing score={isLoading ? 0 : score} color={level.color} size={88} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              {isLoading ? (
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${GOLD}60`, borderTopColor: GOLD, animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <>
                  <span style={{ fontSize: 22, fontWeight: 800, color: level.color, lineHeight: 1 }}>{score}</span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>/ 100</span>
                </>
              )}
            </div>
          </div>

          {/* Right side */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                {level.emoji} {level.label} Risk
              </span>
            </div>
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>
                {data?.countryName || country}
              </span>
            </div>
            {data && <AdvisoryPill score={data.advisoryScore} />}
          </div>
        </div>
      </div>

      {/* Primary insight */}
      {data?.note && (
        <div style={{ margin: '0 20px 14px', padding: '10px 12px', background: `${level.bg}`, border: `1px solid ${level.border}`, borderRadius: 12 }}>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
            {data.note}
          </p>
        </div>
      )}

      {/* Expand/collapse toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 20px', background: 'rgba(255,255,255,0.03)', border: 'none',
          borderTop: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer',
          color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600,
        }}
      >
        <span>{expanded ? 'Hide details' : 'See all signals'}</span>
        {expanded ? <ChevronUp style={{ width: 13, height: 13 }} /> : <ChevronDown style={{ width: 13, height: 13 }} />}
      </button>

      {/* Expanded signals */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="signals"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 20px 16px' }}>
              {data && (
                <>
                  <Signal
                    icon={Globe}
                    label="Government advisories"
                    value={data.sourcesActive > 0
                      ? `${data.sourcesActive} source${data.sourcesActive !== 1 ? 's' : ''} active`
                      : 'Morales curated profile'}
                    color={level.color}
                  />
                  <Signal
                    icon={Shield}
                    label="Advisory level"
                    value={`${data.advisoryScore.toFixed(1)} / 5.0`}
                    color={level.color}
                  />
                  {data.timeNote && (
                    <Signal
                      icon={Clock}
                      label="Time-of-day risk"
                      value={data.timeNote}
                      color='#60a5fa'
                    />
                  )}
                  <Signal
                    icon={data.riskScore < 55 ? CheckCircle2 : AlertTriangle}
                    label="Morales safety escorts"
                    value={data.riskScore >= 55
                      ? 'Available — ask your concierge'
                      : 'Not required for this destination'}
                    color={data.riskScore >= 55 ? '#f97316' : '#22c55e'}
                  />
                  {data.updated && (
                    <div style={{ marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'right' }}>
                      Advisory data updated {data.updated}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
}
