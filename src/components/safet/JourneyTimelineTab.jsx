import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Circle, ChevronRight, MapPin, Calendar, Plane, Stethoscope, HeartPulse, Star, AlertCircle } from 'lucide-react';

const STAGES = [
  {
    id: 'consultation',
    label: 'Initial Consultation',
    icon: '💬',
    status: 'completed',
    date: 'Completed',
    description: 'Medical history review, procedure selection, and risk assessment completed.',
    tasks: [
      { label: 'Medical intake form submitted', done: true },
      { label: 'Procedure interests confirmed', done: true },
      { label: 'Risk assessment completed', done: true },
      { label: 'Initial consultation call', done: true },
    ],
  },
  {
    id: 'doctor_review',
    label: 'Doctor Review',
    icon: '🩺',
    status: 'completed',
    date: 'Completed',
    description: 'Your assigned healthcare provider has reviewed your medical profile.',
    tasks: [
      { label: 'Medical profile reviewed by doctor', done: true },
      { label: 'Treatment plan created', done: true },
      { label: 'Pre-procedure instructions issued', done: true },
    ],
  },
  {
    id: 'planning',
    label: 'Travel Planning',
    icon: '✈️',
    status: 'active',
    date: 'In Progress',
    description: 'Coordinating your travel, accommodation, and logistics for a seamless arrival.',
    tasks: [
      { label: 'Visa requirements checked', done: true },
      { label: 'Flight booking confirmed', done: false },
      { label: 'Hotel/accommodation arranged', done: false },
      { label: 'Airport transfer scheduled', done: false },
      { label: 'Travel insurance secured', done: false },
    ],
  },
  {
    id: 'preparation',
    label: 'Pre-Procedure Prep',
    icon: '📋',
    status: 'upcoming',
    date: 'Upcoming',
    description: 'Final preparations including fasting, medications, and document readiness.',
    tasks: [
      { label: 'Pre-procedure blood work', done: false },
      { label: 'Fasting instructions followed', done: false },
      { label: 'Medications reviewed with doctor', done: false },
      { label: 'Recovery supplies packed', done: false },
    ],
  },
  {
    id: 'procedure',
    label: 'Procedure Day',
    icon: '🏥',
    status: 'upcoming',
    date: 'Upcoming',
    description: 'Your care team will be fully prepared to guide you through your procedure safely.',
    tasks: [
      { label: 'Arrival at clinic', done: false },
      { label: 'Pre-procedure check with doctor', done: false },
      { label: 'Procedure completed', done: false },
      { label: 'Post-procedure monitoring', done: false },
    ],
  },
  {
    id: 'recovery',
    label: 'Recovery',
    icon: '🌿',
    status: 'upcoming',
    date: 'Upcoming',
    description: 'SAFE-T 4LIFE™ will check in daily to monitor your recovery and wellbeing.',
    tasks: [
      { label: '24-hour post-procedure check-in', done: false },
      { label: 'Day 3 wellness check', done: false },
      { label: 'Day 7 follow-up review', done: false },
      { label: 'Return travel cleared by doctor', done: false },
    ],
  },
  {
    id: 'aftercare',
    label: 'Aftercare & Follow-Up',
    icon: '⭐',
    status: 'upcoming',
    date: 'Upcoming',
    description: 'Ongoing support, follow-up consultations, and long-term wellness guidance.',
    tasks: [
      { label: '30-day remote follow-up', done: false },
      { label: 'Final results review', done: false },
      { label: 'Long-term care instructions', done: false },
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
      <div className="relative overflow-hidden rounded-[2rem] border border-white/40 bg-white/80 p-6 shadow-xl shadow-slate-900/10 backdrop-blur-xl">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-800/70">Journey Progress</p>
            <h2 className="mt-2 font-display text-3xl text-slate-950">Your Healthcare Journey</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">Stage 3 of 7 — travel, lodging, and arrival support are being coordinated by your care team.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/75 px-5 py-4 text-right shadow-sm">
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
        <div className="absolute left-[1.55rem] top-4 hidden h-[calc(100%-2rem)] w-px bg-white/70 sm:block" />
        <div className="space-y-4">
          {STAGES.map((stage, idx) => {
            const s = STATUS_STYLES[stage.status];
            const isExpanded = expanded === stage.id;
            const doneCount = stage.tasks.filter(t => t.done).length;

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="relative sm:pl-12"
              >
                <div className={`absolute left-0 top-5 z-10 hidden h-4 w-4 rounded-full border-4 border-white ${s.rail} shadow-md sm:block`} />
                <div className={`overflow-hidden rounded-[1.6rem] border border-white/55 bg-white/88 shadow-lg backdrop-blur-xl transition-all ${s.glow}`}>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : stage.id)}
                    className="w-full p-5 text-left transition-colors hover:bg-white/55"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border text-xl shadow-sm ${s.icon}`}>
                        {stage.status === 'completed' ? <CheckCircle2 className="h-6 w-6" /> : <span>{stage.icon}</span>}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className={`font-display text-xl ${stage.status === 'upcoming' ? 'text-slate-500' : 'text-slate-950'}`}>
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
                      <div className="mx-5 mb-5 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                        <div className="grid gap-2 sm:grid-cols-2">
                          {stage.tasks.map((task, i) => (
                            <div key={i} className="flex items-center gap-3 rounded-xl bg-white/80 px-3 py-2.5">
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
      <div className="flex items-start gap-3 rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur-xl">
        <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-slate-500 leading-relaxed">
          <strong>SAFE-T 4LIFE™</strong> is an educational and coordination support system designed to assist clients throughout their healthcare journey and does not replace professional medical advice, diagnosis, or treatment from licensed healthcare providers.
        </p>
      </div>
    </div>
  );
}