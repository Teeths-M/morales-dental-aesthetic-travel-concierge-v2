import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Brain,
  Plane,
  Info,
  Heart,
  Wind,
  Pill,
  Cigarette,
  Wine,
  Shield,
  HelpCircle,
  FileText,
  ClipboardCheck,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';

const riskLevels = [
  { label: 'Overall Safety', level: 'Low', tone: 'emerald', score: 20, note: 'Clear to continue planning' },
  { label: 'Lifestyle Review', level: 'Moderate', tone: 'amber', score: 50, note: 'One habit needs attention' },
  { label: 'Travel Readiness', level: 'Low', tone: 'emerald', score: 15, note: 'No major travel barriers' },
  { label: 'Recovery Load', level: 'Low', tone: 'emerald', score: 25, note: 'Standard support expected' },
];

const medicalHistory = [
  { label: 'Diabetes', icon: Activity, status: 'clear', note: 'Not reported' },
  { label: 'Hypertension', icon: Heart, status: 'clear', note: 'Not reported' },
  { label: 'Asthma / Respiratory', icon: Wind, status: 'review', note: 'Mild asthma noted — clearance recommended' },
  { label: 'Autoimmune Disorders', icon: Shield, status: 'clear', note: 'Not reported' },
  { label: 'Previous Surgeries', icon: FileText, status: 'review', note: 'Rhinoplasty in 2018 — noted for planning' },
  { label: 'Anesthesia Complications', icon: AlertTriangle, status: 'clear', note: 'None reported' },
  { label: 'Known Allergies', icon: AlertTriangle, status: 'review', note: 'Penicillin allergy recorded' },
  { label: 'Current Medications', icon: Pill, status: 'review', note: 'Medication list needs clinician review' },
  { label: 'Smoking', icon: Cigarette, status: 'review', note: 'Active smoker — pause plan advised' },
  { label: 'Alcohol Use', icon: Wine, status: 'clear', note: 'Social use — no current concern' },
];

const readinessChecks = [
  { label: 'Anxiety level', value: 'Moderate', detail: 'Offer reassurance call before travel', tone: 'amber' },
  { label: 'Emotional readiness', value: 'Good', detail: 'Expectations are mostly aligned', tone: 'emerald' },
  { label: 'Expectation fit', value: 'Discuss', detail: 'Review outcome timeline with provider', tone: 'amber' },
  { label: 'Stress indicators', value: 'Low', detail: 'No high-stress concerns detected', tone: 'emerald' },
];

const travelRisks = [
  { label: 'Long-flight recovery', risk: 'Low', note: '4–5 hour flight is manageable with hydration and compression garments.' },
  { label: 'Mobility limitations', risk: 'None', note: 'No mobility restrictions have been reported.' },
  { label: 'Companion support', risk: 'Recommended', note: 'A companion is advised for comfort and post-care support.' },
  { label: 'Emergency planning', risk: 'Pending', note: 'Emergency contacts and local hospital info still need to be added.' },
];

const educationCards = [
  {
    icon: Cigarette,
    tone: 'amber',
    title: 'Healing quality',
    body: 'Stopping smoking before care improves oxygen flow and can meaningfully support wound healing.',
  },
  {
    icon: Pill,
    tone: 'red',
    title: 'Medication safety',
    body: 'Blood thinners, aspirin, NSAIDs, and supplements should be reviewed before treatment planning.',
  },
  {
    icon: Activity,
    tone: 'violet',
    title: 'Procedure stacking',
    body: 'Combining treatments may increase recovery load, so your plan is reviewed as a whole.',
  },
  {
    icon: Brain,
    tone: 'blue',
    title: 'Calm preparation',
    body: 'Emotional readiness matters. Your team can schedule extra guidance before the procedure.',
  },
];

const toneStyles = {
  emerald: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    bar: 'bg-emerald-500',
    soft: 'bg-emerald-50 border-emerald-100',
  },
  amber: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: 'bg-amber-50 text-amber-700 border-amber-100',
    bar: 'bg-amber-400',
    soft: 'bg-amber-50 border-amber-100',
  },
  red: {
    badge: 'bg-red-50 text-red-700 border-red-200',
    icon: 'bg-red-50 text-red-700 border-red-100',
    bar: 'bg-red-500',
    soft: 'bg-red-50 border-red-100',
  },
  blue: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: 'bg-blue-50 text-blue-700 border-blue-100',
    bar: 'bg-blue-500',
    soft: 'bg-blue-50 border-blue-100',
  },
  violet: {
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    icon: 'bg-violet-50 text-violet-700 border-violet-100',
    bar: 'bg-violet-500',
    soft: 'bg-violet-50 border-violet-100',
  },
};

export default function RiskAssessmentTab() {
  const reviewItems = medicalHistory.filter((item) => item.status === 'review').length;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
        <div className="grid gap-0 xl:grid-cols-[1.65fr_0.75fr]">
          <div className="p-6 sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">
                  <ShieldCheck className="h-3.5 w-3.5" /> Safety Review
                </div>
                <h2 className="font-display text-3xl text-slate-950">Clinical risk snapshot</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                  A plain-language view of what is clear, what needs review, and what your care team should confirm before travel.
                </p>
              </div>
              <div className="hidden rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-center sm:block">
                <div className="text-3xl font-bold text-slate-950">{reviewItems}</div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Review items</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
              {riskLevels.map((risk, index) => {
                const tone = toneStyles[risk.tone];
                return (
                  <motion.div
                    key={risk.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-4 flex flex-col items-start gap-2 2xl:flex-row 2xl:items-center 2xl:justify-between">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] leading-snug text-slate-500">{risk.label}</p>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${tone.badge}`}>
                        {risk.level}
                      </span>
                    </div>
                    <div className="mb-3 h-2 rounded-full bg-slate-100">
                      <div className={`h-2 rounded-full ${tone.bar}`} style={{ width: `${risk.score}%` }} />
                    </div>
                    <p className="text-xs leading-relaxed text-slate-600">{risk.note}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-950 p-6 text-white xl:border-l xl:border-t-0 sm:p-8">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <Sparkles className="h-6 w-6 text-emerald-300" />
            </div>
            <h3 className="font-display text-2xl">Care team focus</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Your profile is generally low-risk, with a few practical details to review before final clearance.
            </p>
            <div className="mt-6 space-y-3">
              {['Confirm respiratory clearance', 'Review medication list', 'Prepare smoking pause guidance'].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  <span className="text-sm font-medium text-slate-100">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/8 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-950">Health profile review</h3>
              <p className="text-sm text-slate-500">Clear items stay quiet. Items needing attention are highlighted.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {medicalHistory.map((item) => {
              const Icon = item.icon;
              const isReview = item.status === 'review';
              return (
                <div
                  key={item.label}
                  className={`rounded-2xl border p-4 ${isReview ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${isReview ? 'border-amber-200 bg-white text-amber-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-900">{item.label}</p>
                        {isReview ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-700">Review</span>
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.note}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/8 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50 text-violet-700">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-950">Readiness notes</h3>
                <p className="text-sm text-slate-500">Emotional and expectation-based planning signals.</p>
              </div>
            </div>
            <div className="space-y-3">
              {readinessChecks.map((item) => {
                const tone = toneStyles[item.tone];
                return (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-slate-900">{item.label}</p>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${tone.badge}`}>{item.value}</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.detail}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/8 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 text-sky-700">
                <Plane className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-950">Travel safeguards</h3>
                <p className="text-sm text-slate-500">Flight, mobility, companion, and emergency planning.</p>
              </div>
            </div>
            <div className="space-y-3">
              {travelRisks.map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-slate-900">{item.label}</p>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                      item.risk === 'Low' || item.risk === 'None' ? 'bg-emerald-100 text-emerald-700' :
                      item.risk === 'Recommended' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                    }`}>{item.risk}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/8 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-950">Personal risk guidance</h3>
            <p className="mt-1 text-sm text-slate-500">Short, practical education based on the signals in your profile.</p>
          </div>
          <Info className="h-5 w-5 text-slate-400" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {educationCards.map((card) => {
            const Icon = card.icon;
            const tone = toneStyles[card.tone];
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border p-5 ${tone.soft}`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${tone.icon}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-400" />
                </div>
                <h4 className="text-sm font-bold text-slate-950">{card.title}</h4>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{card.body}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <HelpCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
        <p className="text-xs leading-relaxed text-slate-500">
          <strong className="text-slate-700">SAFE-T 4LIFE™ Disclaimer:</strong> This platform provides educational and coordination support only and does not replace medical advice from licensed healthcare professionals.
        </p>
      </div>
    </div>
  );
}