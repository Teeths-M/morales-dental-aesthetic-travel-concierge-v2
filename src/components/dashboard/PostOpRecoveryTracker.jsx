/**
 * PostOpRecoveryTracker
 * Shows the patient's 4 post-op check-in milestones (Day 3, 7, 14, 30)
 * on the Dashboard once their case is in 'completed' phase.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, AlertTriangle, Heart } from 'lucide-react';

const GOLD = '#D4AF37';

const DAY_CONFIG = {
  3:  { emoji: '🌿', label: 'Day 3',  desc: 'First recovery check' },
  7:  { emoji: '💛', label: 'Week 1', desc: 'One week post-procedure' },
  14: { emoji: '✨', label: 'Week 2', desc: 'Two-week milestone' },
  30: { emoji: '🏆', label: 'Month 1',desc: 'One month — full recovery' },
};

export default function PostOpRecoveryTracker({ checkIns = [] }) {
  if (!checkIns.length) return null;

  const all4 = [3, 7, 14, 30].map(day => {
    const rec = checkIns.find(c => c.day === day);
    return { day, ...DAY_CONFIG[day], rec };
  });

  const submitted = all4.filter(c => c.rec?.status === 'submitted').length;
  const allDone   = submitted === 4;

  return (
    <div className="rounded-2xl" style={{ background: '#0C1A1D', border: `1px solid ${allDone ? GOLD + '40' : '#2A3F4A'}`, padding: '20px 20px 16px' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4" style={{ color: GOLD }} />
          <span className="text-sm font-semibold text-white">Post-Op Recovery Care</span>
        </div>
        <span className="text-xs font-medium" style={{ color: submitted === 4 ? '#22c55e' : GOLD }}>
          {submitted}/4 check-ins complete
        </span>
      </div>

      {/* Timeline */}
      <div className="flex items-center gap-1">
        {all4.map(({ day, emoji, label, rec }, i) => {
          const done    = rec?.status === 'submitted';
          const overdue = rec?.status === 'overdue';
          const flagged = done && rec?.needs_doctor_followup;

          return (
            <React.Fragment key={day}>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex flex-col items-center"
                style={{ flex: 1 }}
              >
                {/* Dot */}
                <div
                  className="flex items-center justify-center rounded-full mb-2 text-base"
                  style={{
                    width: 44, height: 44,
                    background: done ? (flagged ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.12)') : overdue ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
                    border: `2px solid ${done ? (flagged ? '#ef4444' : '#22c55e') : overdue ? '#ef4444' : '#2A3F4A'}`,
                  }}
                >
                  {done ? (
                    flagged
                      ? <AlertTriangle className="w-4 h-4 text-red-400" />
                      : <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : overdue ? (
                    <Clock className="w-4 h-4 text-red-400" />
                  ) : (
                    <span>{emoji}</span>
                  )}
                </div>

                {/* Label */}
                <span className="text-[11px] font-semibold" style={{ color: done ? (flagged ? '#fca5a5' : '#22c55e') : '#64748b' }}>
                  {label}
                </span>

                {/* Rating if submitted */}
                {done && rec?.rating && (
                  <span className="text-[10px] mt-0.5" style={{ color: GOLD }}>
                    {'⭐'.repeat(rec.rating)}
                  </span>
                )}
              </motion.div>

              {/* Connector */}
              {i < 3 && (
                <div style={{ flex: 0, width: 4, height: 2, background: done ? '#22c55e' : '#1e2d35', margin: '0 2px', marginBottom: 18 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Upcoming check-in hint */}
      {!allDone && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid #1e2d35' }}>
          {(() => {
            const next = all4.find(c => c.rec?.status === 'pending');
            if (!next) return null;
            const scheduledAt = next.rec?.scheduled_at;
            const daysLeft = scheduledAt ? Math.max(0, Math.ceil((new Date(scheduledAt) - Date.now()) / 86_400_000)) : null;
            return (
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Next: <span style={{ color: GOLD, fontWeight: 600 }}>{next.label}</span>
                {daysLeft !== null && ` — check-in link arrives in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
              </p>
            );
          })()}
        </div>
      )}

      {/* All done banner */}
      {allDone && (
        <div className="mt-3 pt-3 text-center" style={{ borderTop: `1px solid ${GOLD}25` }}>
          <p className="text-xs font-semibold" style={{ color: GOLD }}>
            🏆 All 4 recovery milestones complete — the Morales journey continues.
          </p>
        </div>
      )}
    </div>
  );
}
