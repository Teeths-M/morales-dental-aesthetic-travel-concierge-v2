import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, Circle, AlertTriangle, Clock, Zap,
  Activity, Wind, Footprints, PersonStanding, Bike
} from 'lucide-react';

// Mobility milestone phases mapped to % of recovery completion
const MOBILITY_PHASES = [
  { pct: 0,   icon: Clock,          label: 'Post-Op Rest',       detail: 'Complete bed rest. Minimal movement.' },
  { pct: 20,  icon: Wind,           label: 'Resting Comfortably', detail: 'Pain managed. Gentle repositioning allowed.' },
  { pct: 40,  icon: Activity,       label: 'Sitting Up',          detail: 'Gradual sitting and light stretching.' },
  { pct: 60,  icon: Footprints,     label: 'Assisted Walking',    detail: 'Short supervised walks. Building strength.' },
  { pct: 80,  icon: PersonStanding, label: 'Independent Motion',  detail: 'Unassisted movement within safe range.' },
  { pct: 100, icon: Bike,           label: 'Full Mobility',       detail: 'Normal daily activities resumed. 🎉' },
];

function getMobilityPhase(progressPct) {
  let current = MOBILITY_PHASES[0];
  for (const phase of MOBILITY_PHASES) {
    if (progressPct >= phase.pct) current = phase;
    else break;
  }
  return current;
}

function CheckinDot({ checkin, index }) {
  const statusConfig = {
    completed:  { bg: 'bg-emerald-500', ring: 'ring-emerald-200', icon: CheckCircle2, iconColor: 'text-white' },
    missed:     { bg: 'bg-red-400',     ring: 'ring-red-200',     icon: AlertTriangle, iconColor: 'text-white' },
    escalated:  { bg: 'bg-orange-400',  ring: 'ring-orange-200',  icon: AlertTriangle, iconColor: 'text-white' },
    pending:    { bg: 'bg-slate-200',   ring: 'ring-slate-100',   icon: Circle,        iconColor: 'text-slate-400' },
  };
  const cfg = statusConfig[checkin.status] || statusConfig.pending;
  const Icon = cfg.icon;

  return (
    <motion.div
      className={`w-7 h-7 rounded-full flex items-center justify-center ring-4 ${cfg.bg} ${cfg.ring} flex-shrink-0`}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 300 }}
      title={checkin.status}
    >
      <Icon className={`w-3.5 h-3.5 ${cfg.iconColor}`} />
    </motion.div>
  );
}

export default function RecoveryMilestoneTimeline({ session }) {
  const checkins = session?.checkins || [];
  const total = session?.total_checkins_scheduled || checkins.length || 1;
  const completed = session?.total_checkins_completed || checkins.filter(c => c.status === 'completed').length;
  const escalated = checkins.filter(c => c.status === 'escalated' || c.escalated).length;
  const missed = checkins.filter(c => c.status === 'missed').length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const currentPhase = getMobilityPhase(progressPct);
  const nextPhase = MOBILITY_PHASES.find(p => p.pct > progressPct) || null;

  // Divide checkins into logical phase buckets for the visual timeline
  const phases = useMemo(() => {
    if (checkins.length === 0) return [];
    const bucketSize = Math.max(1, Math.ceil(checkins.length / MOBILITY_PHASES.length));
    return MOBILITY_PHASES.map((mp, i) => {
      const slice = checkins.slice(i * bucketSize, (i + 1) * bucketSize);
      const doneInSlice = slice.filter(c => c.status === 'completed').length;
      const phaseStatus =
        slice.length === 0 ? 'locked' :
        slice.every(c => c.status === 'completed') ? 'completed' :
        slice.some(c => c.status === 'completed' || c.status === 'pending') ? 'active' : 'upcoming';
      return { ...mp, checkins: slice, doneInSlice, phaseStatus };
    }).filter(p => p.checkins.length > 0);
  }, [checkins]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Recovery Milestone Timeline</h3>
          <p className="text-xs text-slate-400 mt-0.5">Your journey toward full mobility</p>
        </div>
        <div className="flex items-center gap-2">
          {escalated > 0 && (
            <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2.5 py-1 rounded-full">
              {escalated} escalated
            </span>
          )}
          {missed > 0 && (
            <span className="text-xs bg-red-100 text-red-700 font-semibold px-2.5 py-1 rounded-full">
              {missed} missed
            </span>
          )}
          <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2.5 py-1 rounded-full">
            {completed}/{total} check-ins
          </span>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span className="font-semibold text-slate-700">{currentPhase.label}</span>
          <span>{progressPct}% complete</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        {nextPhase && (
          <p className="text-[11px] text-slate-400 mt-1.5">
            Next milestone: <span className="font-semibold text-slate-600">{nextPhase.label}</span> at {nextPhase.pct}%
          </p>
        )}
        {progressPct === 100 && (
          <p className="text-xs text-emerald-700 font-semibold mt-1.5 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Recovery complete — full mobility achieved!
          </p>
        )}
      </div>

      {/* Vertical Timeline */}
      <div className="relative">
        {/* Spine line */}
        <div className="absolute left-[13px] top-4 bottom-4 w-0.5 bg-slate-100 rounded-full" />

        <div className="space-y-0">
          {phases.map((phase, i) => {
            const PhaseIcon = phase.icon;
            const isCompleted = phase.phaseStatus === 'completed';
            const isActive = phase.phaseStatus === 'active';

            return (
              <motion.div
                key={phase.pct}
                className="relative flex gap-4 pb-6 last:pb-0"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                {/* Phase node */}
                <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ring-4 transition-colors
                  ${isCompleted ? 'bg-emerald-500 ring-emerald-100' :
                    isActive    ? 'bg-violet-500 ring-violet-100 animate-pulse' :
                                  'bg-slate-200 ring-slate-50'}`}>
                  <PhaseIcon className={`w-3.5 h-3.5 ${isCompleted || isActive ? 'text-white' : 'text-slate-400'}`} />
                </div>

                {/* Phase content */}
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold ${isCompleted ? 'text-emerald-700' : isActive ? 'text-violet-700' : 'text-slate-400'}`}>
                      {phase.label}
                    </span>
                    {isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                    {isActive && (
                      <span className="text-[10px] bg-violet-100 text-violet-700 font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-2">{phase.detail}</p>

                  {/* Check-in dots for this phase */}
                  {phase.checkins.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {phase.checkins.map((ci, j) => (
                        <div key={j} className="relative group">
                          <CheckinDot checkin={ci} index={i * 10 + j} />
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 pointer-events-none">
                            <div className="bg-slate-800 text-white text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                              <div className="capitalize font-semibold">{ci.status}</div>
                              {ci.scheduled_at && (
                                <div className="text-slate-300">
                                  {new Date(ci.scheduled_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                              {ci.pain_level && <div>Pain: {ci.pain_level}/10</div>}
                            </div>
                          </div>
                        </div>
                      ))}
                      <span className="text-[10px] text-slate-400 ml-1">
                        {phase.doneInSlice}/{phase.checkins.length}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
        {[
          { color: 'bg-emerald-500', label: 'Completed' },
          { color: 'bg-violet-500',  label: 'Active' },
          { color: 'bg-orange-400',  label: 'Escalated' },
          { color: 'bg-red-400',     label: 'Missed' },
          { color: 'bg-slate-200',   label: 'Pending' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
            <span className="text-[10px] text-slate-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}