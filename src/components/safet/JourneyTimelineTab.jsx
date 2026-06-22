import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, ChevronRight, Plane, ClipboardCheck, Stethoscope, HeartPulse, Star, AlertCircle, MessageCircle, ShieldCheck, Hospital, Leaf } from 'lucide-react';

const STAGES = [
  {
    id: 'consultation',
    label: 'Care Intake',
    icon: MessageCircle,
    status: 'completed',
    date: 'Completed',
    description: 'Your goals, health background, and travel preferences are now organized into one care profile.',
    tasks: [
      { label: 'Health intake received', done: true },
      { label: 'Treatment goals clarified', done: true },
      { label: 'Safety scan completed', done: true },
      { label: 'First care conversation logged', done: true },
    ],
  },
  {
    id: 'doctor_review',
    label: 'Clinical Review',
    icon: Stethoscope,
    status: 'completed',
    date: 'Completed',
    description: 'A licensed provider has reviewed your profile and shaped the next steps around your needs.',
    tasks: [
      { label: 'Profile reviewed by clinician', done: true },
      { label: 'Care direction outlined', done: true },
      { label: 'Preparation notes added', done: true },
    ],
  },
  {
    id: 'planning',
    label: 'Arrival Plan',
    icon: Plane,
    status: 'active',
    date: 'In Progress',
    description: 'Your route, stay, pickup, and arrival details are being coordinated into a smooth landing plan.',
    tasks: [
      { label: 'Entry requirements confirmed', done: true },
      { label: 'Flight details pending', done: false },
      { label: 'Recovery-friendly stay to be selected', done: false },
      { label: 'Clinic transfer to be scheduled', done: false },
      { label: 'Travel coverage to be verified', done: false },
    ],
  },
  {
    id: 'preparation',
    label: 'Readiness Check',
    icon: ClipboardCheck,
    status: 'upcoming',
    date: 'Upcoming',
    description: 'A final checklist will help you arrive prepared, calm, and medically ready for care.',
    tasks: [
      { label: 'Required lab work completed', done: false },
      { label: 'Fasting window confirmed', done: false },
      { label: 'Medication guidance reviewed', done: false },
      { label: 'Recovery essentials packed', done: false },
    ],
  },
  {
    id: 'procedure',
    label: 'Care Day',
    icon: Hospital,
    status: 'upcoming',
    date: 'Upcoming',
    description: 'Your local team will guide arrivals, checks, treatment, and early monitoring step by step.',
    tasks: [
      { label: 'Clinic arrival confirmed', done: false },
      { label: 'Provider check-in completed', done: false },
      { label: 'Treatment completed', done: false },
      { label: 'Early recovery monitored', done: false },
    ],
  },
  {
    id: 'recovery',
    label: 'Recovery Watch',
    icon: Leaf,
    status: 'upcoming',
    date: 'Upcoming',
    description: 'Daily check-ins will track comfort, mobility, and concerns while you recover away from home.',
    tasks: [
      { label: '24-hour comfort check', done: false },
      { label: 'Day 3 progress review', done: false },
      { label: 'Day 7 follow-up review', done: false },
      { label: 'Return travel clearance requested', done: false },
    ],
  },
  {
    id: 'aftercare',
    label: 'Long-Term Follow-Up',
    icon: Star,
    status: 'upcoming',
    date: 'Upcoming',
    description: 'After you return home, follow-ups and care notes keep your results and wellbeing on track.',
    tasks: [
      { label: '30-day remote review', done: false },
      { label: 'Results discussion scheduled', done: false },
      { label: 'Long-term care notes delivered', done: false },
    ],
  },
];

const STATUS_STYLES = {
  completed: {
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
    rail: 'bg-emerald-400',
    glow: 'shadow-emerald-100/80',
  },
  active: {
    chip: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: 'bg-blue-600 text-white border-blue-500',
    rail: 'bg-blue-500',
    glow: 'shadow-blue-200/80 ring-1 ring-blue-200/80',
  },
  upcoming: {
    chip: 'bg-slate-50 text-slate-500 border-slate-200',
    icon: 'bg-white text-slate-400 border-slate-200',
    rail: 'bg-slate-200',
    glow: 'shadow-slate-200/70',
  },
};

export default function JourneyTimelineTab() {
  const [expanded, setExpanded] = useState('planning');

  const completedCount = STAGES.filter(s => s.status === 'completed').length;
  const progress = Math.round((completedCount / STAGES.length) * 100);

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white p-6 shadow-xl shadow-slate-900/12">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-800/70">Journey Progress</p>
            <h2 className="mt-2 font-display text-3xl text-slate-950">Your Healthcare Journey</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">Stage 3 of 7 — travel, lodging, and arrival support are being coordinated by your care team.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-right shadow-sm">
            <div className="text-4xl font-bold text-slate-950">{progress}%</div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Complete</p>
          </div>
        </div>
        <div className="relative mt-6 h-3 overflow-hidden rounded-full bg-slate-200/80">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </div>
        <div className="relative mt-3 flex justify-between text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          <span>Consultation</span>
          <span>Aftercare</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative pl-3 sm:pl-6">
        <div className="absolute left-8 top-8 hidden h-[calc(100%-4rem)] w-px bg-white/80 sm:block" />
        <div className="space-y-4">
          {STAGES.map((stage, idx) => {
            const s = STATUS_STYLES[stage.status];
            const isExpanded = expanded === stage.id;
            const doneCount = stage.tasks.filter(t => t.done).length;
            const StageIcon = stage.icon;

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="relative sm:pl-12"
              >
                <div className={`absolute left-0 top-6 z-10 hidden h-4 w-4 rounded-full border-4 border-white ${s.rail} shadow-md sm:block`} />
                <div className={`overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-xl transition-all ${s.glow}`}>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : stage.id)}
                    className="w-full p-5 text-left transition-colors hover:bg-slate-50"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border shadow-sm ${s.icon}`}>
                        {stage.status === 'completed' ? <ShieldCheck className="h-6 w-6" /> : <StageIcon className="h-6 w-6" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className={`text-base font-bold tracking-tight ${stage.status === 'upcoming' ? 'text-slate-600' : 'text-slate-950'}`}>
                            {stage.label}
                          </h3>
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${s.chip}`}>
                            {stage.date}
                          </span>
                          {stage.status === 'active' && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm">
                              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                              Current
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{stage.description}</p>
                      </div>

                      <div className="flex flex-shrink-0 items-center gap-3 pt-1">
                        <div className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 sm:block">
                          {doneCount}/{stage.tasks.length}
                        </div>
                        <ChevronRight className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mx-5 mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="grid gap-2 sm:grid-cols-2">
                          {stage.tasks.map((task, i) => (
                            <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-sm">
                              {task.done
                                ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                                : <Circle className="h-4 w-4 flex-shrink-0 text-slate-300" />
                              }
                              <span className={`text-sm ${task.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                {task.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-slate-500 leading-relaxed">
          <strong>SAFE-T 4LIFE™</strong> is an educational and coordination support system designed to assist clients throughout their healthcare journey and does not replace professional medical advice, diagnosis, or treatment from licensed healthcare providers.
        </p>
      </div>
    </div>
  );
}