import React from 'react';

const GOLD = '#D4AF37';

/* ── Per-step role definition ────────────────────────────────────────────────
   Each handshake belongs to a role. The dot uses that role's color when
   active/done, and the heart icon is always shown inside.
*/
const STEPS = [
  { label: 'Driver\nPickup',       role: 'driver',    color: '#22c55e', emoji: '🚗' }, // HS1
  { label: 'Airport\nDrop-off',    role: 'airport',   color: '#a855f7', emoji: '✈️' }, // HS2
  { label: 'Destination\nPickup',  role: 'airport',   color: '#a855f7', emoji: '🛬' }, // HS3
  { label: 'Hotel\nCheck-in',      role: 'patient',   color: '#ef4444', emoji: '🏨' }, // HS4
  { label: 'Clinic\nArrival',      role: 'doctor',    color: '#D4AF37', emoji: '🏥' }, // HS5
  { label: 'Companion\nDelivery',  role: 'companion', color: '#ec4899', emoji: '🍽️' }, // HS6
  { label: 'Return\nTransport',    role: 'driver',    color: '#22c55e', emoji: '🚕' }, // HS7
  { label: 'Home\nAirport',        role: 'airport',   color: '#a855f7', emoji: '🛫' }, // HS8
  { label: 'Home\nDrop-off',       role: 'patient',   color: '#ef4444', emoji: '🏠' }, // HS9
];

const ROLE_LABELS = {
  driver:    { name: 'Driver',    color: '#22c55e' },
  airport:   { name: 'Airport',   color: '#a855f7' },
  patient:   { name: 'Patient',   color: '#ef4444' },
  doctor:    { name: 'Doctor',    color: '#D4AF37' },
  companion: { name: 'Companion', color: '#ec4899' },
};

/* ── Heart SVG — inline so no extra import ───────────────────────────────── */
function Heart({ size = 14, color = '#fff', filled = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'}
      stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

/**
 * TripProgressStepper — 9-heart visual spine of the patient journey.
 * Each heart is colored by role: green=driver, purple=airport,
 * red=patient, gold=doctor, pink=companion.
 *
 * Props:
 *   currentStep  — 0–9 (0 = not started, 9 = complete)
 *   isComplete   — boolean; all hearts turn gold on completion
 */
export default function TripProgressStepper({ currentStep = 0, isComplete = false }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: GOLD }}>
          Journey Progress
        </span>
        <span className="text-xs font-medium" style={{ color: isComplete ? GOLD : '#94a3b8' }}>
          {isComplete ? '9/9 — Complete ✨' : `${currentStep}/9`}
        </span>
      </div>

      {/* Heart dots + connectors */}
      <div className="flex items-center overflow-x-auto pb-1">
        {STEPS.map((step, i) => {
          const stepNum  = i + 1;
          const isDone   = isComplete || stepNum <= currentStep;
          const isCurrent = !isComplete && stepNum === currentStep + 1;

          const roleColor   = isComplete ? GOLD : step.color;
          const dotBg       = isDone ? roleColor : 'transparent';
          const borderColor = isDone ? roleColor : isCurrent ? roleColor : '#2A3F4A';
          const connColor   = isDone && !isComplete ? step.color : isComplete ? GOLD : '#2A3F4A';

          return (
            <React.Fragment key={stepNum}>
              <div className="flex flex-col items-center" style={{ minWidth: 34 }}>
                <div
                  title={`HS${stepNum} — ${step.label.replace('\n', ' ')} (${ROLE_LABELS[step.role].name})`}
                  className="flex items-center justify-center rounded-full transition-all duration-300 relative"
                  style={{
                    width: 34,
                    height: 34,
                    background: isDone ? `${roleColor}20` : 'transparent',
                    border: `2px solid ${borderColor}`,
                    boxShadow: isDone
                      ? `0 0 10px ${roleColor}55`
                      : isCurrent
                      ? `0 0 0 4px ${roleColor}30`
                      : undefined,
                    animation: isCurrent ? 'heartbeat 1.4s ease-in-out infinite' : undefined,
                  }}
                >
                  {isDone ? (
                    <Heart size={14} color={roleColor} filled />
                  ) : isCurrent ? (
                    <Heart size={12} color={roleColor} filled={false} />
                  ) : (
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#2A3F4A' }}>{stepNum}</span>
                  )}
                </div>
              </div>

              {i < STEPS.length - 1 && (
                <div
                  className="flex-1 rounded-full transition-all duration-500"
                  style={{
                    height: 2,
                    minWidth: 4,
                    background: isDone && !isComplete
                      ? `linear-gradient(to right, ${step.color}, ${STEPS[i + 1].color})`
                      : isComplete
                      ? GOLD
                      : '#2A3F4A',
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Role color legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {Object.entries(ROLE_LABELS).map(([key, { name, color }]) => (
          <div key={key} className="flex items-center gap-1">
            <Heart size={9} color={color} filled />
            <span className="text-[9px] font-medium" style={{ color }}>{name}</span>
          </div>
        ))}
      </div>

      {/* Step labels */}
      <div className="hidden sm:flex mt-2 overflow-x-auto">
        {STEPS.map((step, i) => {
          const stepNum = i + 1;
          const isDone  = isComplete || stepNum <= currentStep;
          const isCurrent = !isComplete && stepNum === currentStep + 1;
          const labelColor = isComplete ? GOLD : isDone ? step.color : isCurrent ? step.color : '#475569';
          return (
            <React.Fragment key={stepNum}>
              <div style={{ minWidth: 34, textAlign: 'center' }}>
                <div className="text-[8px] leading-tight font-medium whitespace-pre-line" style={{ color: labelColor }}>
                  {step.emoji}
                </div>
              </div>
              {i < STEPS.length - 1 && <div style={{ flex: 1, minWidth: 4 }} />}
            </React.Fragment>
          );
        })}
      </div>

      <style>{`
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          14%       { transform: scale(1.15); }
          28%       { transform: scale(1); }
          42%       { transform: scale(1.1); }
          70%       { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
