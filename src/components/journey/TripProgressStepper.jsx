import React from 'react';
import { CheckCircle2 } from 'lucide-react';

const GOLD = '#D4AF37';
const GREEN = '#22c55e';

const STEPS = [
  'Driver Pickup',
  'Airport Drop-off',
  'Destination Pickup',
  'Hotel Check-in',
  'Clinic',
  'Companion',
  'Return Transport',
  'Home Airport',
  'Home Drop-off',
];

/**
 * TripProgressStepper — 9-dot visual representation of the patient's physical journey.
 *
 * Props:
 *   currentStep  — integer 0–9 (0 = not started, 9 = complete)
 *   isComplete   — boolean; when true all dots and connectors turn gold
 */
export default function TripProgressStepper({ currentStep = 0, isComplete = false }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: GOLD }}>
          Journey Progress
        </span>
        <span className="text-xs font-medium" style={{ color: isComplete ? GOLD : '#94a3b8' }}>
          {isComplete ? '9/9 — Complete' : `${currentStep}/9`}
        </span>
      </div>

      <div className="flex items-center overflow-x-auto pb-1">
        {STEPS.map((label, i) => {
          const stepNum = i + 1;
          const isDone = isComplete || stepNum <= currentStep;
          const isCurrent = !isComplete && stepNum === currentStep + 1;

          const dotColor = isDone ? (isComplete ? GOLD : GREEN) : 'transparent';
          const borderColor = isDone
            ? (isComplete ? GOLD : GREEN)
            : isCurrent
            ? '#3b82f6'
            : '#2A3F4A';
          const textColor = isDone
            ? '#060B16'
            : isCurrent
            ? '#3b82f6'
            : '#475569';
          const connectorColor = isDone && !isComplete
            ? GREEN
            : isComplete
            ? GOLD
            : '#2A3F4A';

          return (
            <React.Fragment key={stepNum}>
              <div className="flex flex-col items-center" style={{ minWidth: 32 }}>
                <div
                  title={label}
                  className="flex items-center justify-center rounded-full transition-all duration-300"
                  style={{
                    width: 32,
                    height: 32,
                    background: dotColor,
                    border: `2px solid ${borderColor}`,
                    boxShadow: isCurrent ? '0 0 0 4px rgba(59,130,246,0.2)' : undefined,
                    animation: isCurrent ? 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' : undefined,
                  }}
                >
                  {isDone ? (
                    <CheckCircle2
                      style={{ width: 14, height: 14, color: '#060B16', strokeWidth: 2.5 }}
                    />
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 700, color: textColor }}>
                      {stepNum}
                    </span>
                  )}
                </div>
              </div>

              {i < STEPS.length - 1 && (
                <div
                  className="flex-1 rounded-full transition-all duration-500"
                  style={{ height: 2, minWidth: 6, background: connectorColor }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Labels row — hidden on very small screens, visible on sm+ */}
      <div className="hidden sm:flex mt-2 overflow-x-auto">
        {STEPS.map((label, i) => {
          const stepNum = i + 1;
          const isDone = isComplete || stepNum <= currentStep;
          const isCurrent = !isComplete && stepNum === currentStep + 1;
          return (
            <React.Fragment key={stepNum}>
              <div style={{ minWidth: 32, textAlign: 'center' }}>
                <span
                  className="text-[9px] leading-tight font-medium"
                  style={{
                    color: isDone
                      ? (isComplete ? GOLD : GREEN)
                      : isCurrent
                      ? '#3b82f6'
                      : '#475569',
                  }}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && <div style={{ flex: 1, minWidth: 6 }} />}
            </React.Fragment>
          );
        })}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
