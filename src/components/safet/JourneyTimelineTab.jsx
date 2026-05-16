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
  completed: { bg: 'bg-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', line: 'bg-emerald-400' },
  active: { bg: 'bg-blue-600', text: 'text-blue-700', badge: 'bg-blue-50 text-blue-700 border-blue-200', line: 'bg-slate-200' },
  upcoming: { bg: 'bg-slate-200', text: 'text-slate-400', badge: 'bg-slate-50 text-slate-500 border-slate-200', line: 'bg-slate-200' },
};

export default function JourneyTimelineTab() {
  const [expanded, setExpanded] = useState('planning');

  const completedCount = STAGES.filter(s => s.status === 'completed').length;
  const progress = Math.round((completedCount / STAGES.length) * 100);

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="bg-gradient-to-br from-emerald-800 to-blue-900 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Journey Progress</p>
            <h2 className="font-display text-2xl font-bold">Your Healthcare Journey</h2>
            <p className="text-white/70 text-sm mt-1">Stage 3 of 7 — Travel Planning</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{progress}%</div>
            <p className="text-white/60 text-xs">Complete</p>
          </div>
        </div>
        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-white/50 text-[10px]">Consultation</span>
          <span className="text-white/50 text-[10px]">Aftercare</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {STAGES.map((stage, idx) => {
          const s = STATUS_STYLES[stage.status];
          const isExpanded = expanded === stage.id;
          const doneCount = stage.tasks.filter(t => t.done).length;

          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                stage.status === 'active' ? 'border-blue-200 shadow-md shadow-blue-50' : 'border-slate-100 shadow-sm'
              }`}
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : stage.id)}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50/50 transition-colors"
              >
                {/* Timeline dot */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${
                    stage.status === 'completed' ? 'bg-emerald-50' : stage.status === 'active' ? 'bg-blue-50' : 'bg-slate-50'
                  }`}>
                    {stage.status === 'completed' ? '✅' : stage.icon}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-bold text-sm ${stage.status === 'upcoming' ? 'text-slate-400' : 'text-slate-800'}`}>
                      {stage.label}
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${s.badge}`}>
                      {stage.date}
                    </span>
                    {stage.status === 'active' && (
                      <span className="flex items-center gap-1 text-[10px] text-blue-600 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        Current Stage
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{stage.description}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-slate-400 font-medium">{doneCount}/{stage.tasks.length}</span>
                  <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {isExpanded && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 border-t border-slate-50 pt-3 space-y-2">
                    {stage.tasks.map((task, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        {task.done
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          : <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />
                        }
                        <span className={`text-sm ${task.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                          {task.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl p-4">
        <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-slate-500 leading-relaxed">
          <strong>SAFE-T 4LIFE™</strong> is an educational and coordination support system designed to assist clients throughout their healthcare journey and does not replace professional medical advice, diagnosis, or treatment from licensed healthcare providers.
        </p>
      </div>
    </div>
  );
}