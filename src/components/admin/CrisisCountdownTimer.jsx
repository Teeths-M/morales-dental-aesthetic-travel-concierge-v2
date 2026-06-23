import React, { useState, useEffect } from 'react';

export default function CrisisCountdownTimer({ deadline, onExpired }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!deadline) return;

    const compute = () => {
      const remaining = Math.max(0, new Date(deadline) - new Date());
      setTimeLeft(remaining);
      if (remaining === 0 && onExpired) onExpired();
    };

    compute();
    const interval = setInterval(compute, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (timeLeft === null) return null;

  if (timeLeft === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-red-700 bg-red-100 border border-red-300 px-3 py-1.5 rounded-lg animate-pulse">
          ⏰ WINDOW EXPIRED — ACTION REQUIRED NOW
        </span>
      </div>
    );
  }

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const WINDOW_MS = 15 * 60 * 1000;
  const pct = Math.min(100, (timeLeft / WINDOW_MS) * 100);

  const urgency = timeLeft < 5 * 60 * 1000 ? 'critical' : timeLeft < 10 * 60 * 1000 ? 'warning' : 'active';

  const styles = {
    critical: {
      text: 'text-red-600',
      bar: 'bg-red-500',
      bg: 'bg-red-50',
      border: 'border-red-200',
      label: 'text-red-500',
      pulse: true,
    },
    warning: {
      text: 'text-orange-600',
      bar: 'bg-orange-500',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      label: 'text-orange-500',
      pulse: false,
    },
    active: {
      text: 'text-amber-700',
      bar: 'bg-amber-400',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      label: 'text-amber-600',
      pulse: false,
    },
  };

  const s = styles[urgency];

  return (
    <div className={`${s.bg} ${s.border} border rounded-lg p-3`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-mono font-semibold tabular-nums ${s.text} ${s.pulse ? 'animate-pulse' : ''}`}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
          <span className={`text-xs font-medium ${s.label}`}>
            remaining for confirmation
          </span>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          urgency === 'critical' ? 'bg-red-100 text-red-700' :
          urgency === 'warning' ? 'bg-orange-100 text-orange-700' :
          'bg-amber-100 text-amber-700'
        }`}>
          {urgency === 'critical' ? '🔴 CRITICAL' : urgency === 'warning' ? '🟠 WARNING' : '🟡 MONITORING'}
        </span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${s.bar} rounded-full transition-all duration-1000`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}