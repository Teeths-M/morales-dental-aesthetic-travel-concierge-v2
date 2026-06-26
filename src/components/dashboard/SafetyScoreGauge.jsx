import React from 'react';

const GOLD = '#D4AF37';

// 0–30 Green, 31–60 Yellow, 61–80 Orange, 81–100 Red (per board spec)
const BANDS = [
  { max: 30,  color: '#22c55e', label: 'All Clear',  sub: 'Low behavioral risk — journey looks healthy' },
  { max: 60,  color: '#eab308', label: 'Monitoring', sub: 'Some signals elevated — staying close' },
  { max: 80,  color: '#f97316', label: 'Elevated',   sub: 'Multiple risk signals active — concierge alerted' },
  { max: 100, color: '#ef4444', label: 'Critical',   sub: 'Security response has been initiated' },
];

const LEGEND = [
  { range: '0–30',   color: '#22c55e', lbl: 'Safe'     },
  { range: '31–60',  color: '#eab308', lbl: 'Watch'    },
  { range: '61–80',  color: '#f97316', lbl: 'Alert'    },
  { range: '81–100', color: '#ef4444', lbl: 'Critical' },
];

function getBand(score) {
  return BANDS.find(b => score <= b.max) ?? BANDS[BANDS.length - 1];
}

// SVG gauge constants
const R    = 50;
const CX   = 62;
const CY   = 62;
const CIRC = 2 * Math.PI * R; // 314.2

/**
 * SafetyScoreGauge — Morales Safety Score circular gauge
 *
 * Props:
 *   score        — 0-100 risk score (null = loading)
 *   breakdown    — { signal_name: points } object from MedGuard
 *   analyzedAt   — ISO timestamp of last analysis
 *   isLoading    — boolean
 *   isActiveTravel — boolean (false shows pre-travel dormant state)
 *   phase        — trip_phase string
 */
export default function SafetyScoreGauge({ score, breakdown, analyzedAt, isLoading, isActiveTravel, phase }) {
  const safeScore = score ?? 0;
  const band      = getBand(safeScore);
  const arc       = (safeScore / 100) * CIRC;
  const gap       = CIRC - arc;

  const breakdownEntries = breakdown ? Object.entries(breakdown) : [];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background:   'rgba(255,255,255,0.025)',
        border:       `1px solid rgba(212,175,55,0.18)`,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div className="px-5 pt-5 pb-4">
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] font-extrabold tracking-[0.2em] uppercase" style={{ color: GOLD }}>
              Your Morales Safety Score
            </p>
            <p className="text-[9px] tracking-widest uppercase mt-0.5" style={{ color: 'rgba(255,255,255,0.28)' }}>
              Powered by MedGuard™
            </p>
          </div>
          {analyzedAt && (
            <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.22)' }}>
              {new Date(analyzedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        <div className="flex items-center gap-5">
          {/* ── Circular SVG gauge ── */}
          <div className="relative flex-shrink-0" style={{ width: 124, height: 124 }}>
            <svg viewBox="0 0 124 124" width={124} height={124}>
              {/* Shadow glow behind arc */}
              {!isLoading && safeScore > 0 && (
                <circle
                  cx={CX} cy={CY} r={R}
                  fill="none"
                  stroke={band.color}
                  strokeWidth={14}
                  strokeDasharray={`${arc} ${gap}`}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${CX} ${CY})`}
                  style={{ opacity: 0.18, filter: 'blur(4px)' }}
                />
              )}
              {/* Track (background ring) */}
              <circle
                cx={CX} cy={CY} r={R}
                fill="none"
                stroke="rgba(255,255,255,0.07)"
                strokeWidth={8}
              />
              {/* Score arc */}
              {!isLoading && (
                <circle
                  cx={CX} cy={CY} r={R}
                  fill="none"
                  stroke={isActiveTravel ? band.color : 'rgba(255,255,255,0.15)'}
                  strokeWidth={8}
                  strokeDasharray={`${arc} ${gap}`}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${CX} ${CY})`}
                  style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1), stroke 0.4s ease' }}
                />
              )}
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              ) : (
                <>
                  <span
                    className="font-black leading-none"
                    style={{
                      fontSize: 36,
                      color: isActiveTravel ? band.color : 'rgba(255,255,255,0.3)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {safeScore}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    /100
                  </span>
                </>
              )}
            </div>
          </div>

          {/* ── Right panel: status + signal bars ── */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Status */}
            {isActiveTravel ? (
              <div>
                <p className="font-semibold text-sm leading-tight" style={{ color: band.color }}>
                  {isLoading ? 'Analyzing…' : band.label}
                </p>
                <p className="text-xs leading-snug mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {isLoading ? 'Running 6-signal behavioral analysis' : band.sub}
                </p>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Dormant</p>
                <p className="text-xs leading-snug mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Active monitoring begins when your journey starts
                </p>
              </div>
            )}

            {/* Signal breakdown bars */}
            {breakdownEntries.length > 0 && (
              <div className="space-y-1.5">
                {breakdownEntries.slice(0, 4).map(([key, val]) => {
                  const pts       = Number(val);
                  const label     = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                  const barColor  = pts === 0 ? '#22c55e' : pts <= 10 ? '#eab308' : '#ef4444';
                  const barWidth  = Math.min(pts * 3, 100);
                  return (
                    <div key={key}>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
                        <span className="text-[10px] font-bold" style={{ color: barColor }}>
                          {pts > 0 ? `+${pts}` : '✓'}
                        </span>
                      </div>
                      <div className="h-[3px] rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                        <div
                          className="h-[3px] rounded-full"
                          style={{ width: `${barWidth}%`, background: barColor, transition: 'width 0.7s ease' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Color band legend */}
            <div className="flex flex-wrap gap-1">
              {LEGEND.map(({ range, color, lbl }) => (
                <span
                  key={range}
                  className="flex items-center gap-1 text-[8px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: `${color}12`, color, border: `1px solid ${color}25` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                  {lbl}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer bar */}
      <div
        className="px-5 py-2 flex items-center justify-between"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.12)' }}
      >
        <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
          6 behavioral signals · Refreshes every 5 min
        </p>
        <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
          {phase ? phase.replace(/_/g, ' ') : 'pre-travel'}
        </p>
      </div>
    </div>
  );
}
