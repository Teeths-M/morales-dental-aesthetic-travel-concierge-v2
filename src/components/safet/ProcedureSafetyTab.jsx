import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Stethoscope, CheckCircle2, AlertTriangle, Clock, FileText,
  ShieldCheck, AlertOctagon, BookOpen, Layers, MessageSquare
} from 'lucide-react';

const procedureInfo = {
  name: 'Porcelain Veneers',
  description: 'Ultra-thin porcelain shells bonded to the front surface of teeth to improve their color, shape, size, or length. A minimally invasive cosmetic dental procedure.',
  duration: '2–3 hours across 2–3 appointments',
  anesthesia: 'Local anesthesia only',
  recovery: '3–5 days (mild sensitivity)',
  downtime: 'Minimal — resume normal activities within 24–48hrs',
  sideEffects: ['Temporary tooth sensitivity', 'Mild gum irritation', 'Initial bite adjustment', 'Light post-procedure soreness'],
};

const safetyChecklist = [
  { label: 'Medical clearance form completed', done: true },
  { label: 'Recent bloodwork submitted', done: false },
  { label: 'Current medications reviewed', done: false },
  { label: 'Dental X-rays provided', done: true },
  { label: 'Smoking cessation plan acknowledged', done: false },
  { label: 'Fasting instructions reviewed', done: true },
  { label: 'Allergies confirmed with care team', done: false },
];

const compatibilityChecks = [
  { label: 'Veneer + Whitening Timing', status: 'ok', note: 'Whitening should be completed before veneer placement for optimal color matching.' },
  { label: 'Procedure Stacking Risk', status: 'ok', note: 'Single specialty procedure — no stacking concern.' },
  { label: 'Travel Timing Fit', status: 'ok', note: 'Local anesthesia only — safe to travel 24–48hrs post-procedure.' },
  { label: 'Recovery Overload Risk', status: 'ok', note: 'Low physical recovery demand — no overload risk identified.' },
];

const redFlags = [
  { text: 'Active gum disease must be treated before veneer placement.', severity: 'high' },
  { text: 'Severe tooth grinding (bruxism) may reduce veneer longevity — nightguard recommended.', severity: 'medium' },
];

const faqs = [
  { q: 'Will I feel pain during the procedure?', a: 'Local anesthesia ensures you feel no pain. Mild sensitivity is expected for 1–3 days after.' },
  { q: 'How long will my veneers last?', a: 'With proper care, porcelain veneers typically last 10–15 years.' },
  { q: 'Can I eat normally after placement?', a: 'Avoid very hard or crunchy foods for the first few days. Normal diet resumes quickly.' },
  { q: 'Is the process reversible?', a: 'Veneer preparation involves minimal enamel removal — it is generally considered irreversible. This is discussed during consultation.' },
];

export default function ProcedureSafetyTab() {
  const [expandedFaq, setExpandedFaq] = useState(null);

  return (
    <div className="space-y-6">
      {/* Procedure Overview */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Procedure Overview</h3>
            <p className="text-xs text-slate-400">{procedureInfo.name}</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed mb-5">{procedureInfo.description}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Clock, label: 'Duration', value: procedureInfo.duration },
            { icon: ShieldCheck, label: 'Anesthesia', value: procedureInfo.anesthesia },
            { icon: Clock, label: 'Recovery', value: procedureInfo.recovery },
            { icon: CheckCircle2, label: 'Downtime', value: procedureInfo.downtime },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-slate-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className="w-3.5 h-3.5 text-emerald-600" />
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
              </div>
              <p className="text-xs font-medium text-slate-700">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-500 mb-2">Common Side Effects</p>
          <div className="flex flex-wrap gap-2">
            {procedureInfo.sideEffects.map(s => (
              <span key={s} className="text-[11px] bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full">{s}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Safety Checklist */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Safety Checklist</h3>
              <p className="text-xs text-slate-400">Pre-procedure clearance items</p>
            </div>
          </div>
          <div className="space-y-2">
            {safetyChecklist.map((item) => (
              <div key={item.label} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border
                ${item.done ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${item.done ? 'text-emerald-600' : 'text-slate-200'}`} />
                <p className={`text-xs font-medium ${item.done ? 'text-emerald-800' : 'text-slate-500'}`}>{item.label}</p>
                {!item.done && (
                  <span className="ml-auto text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pending</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 bg-slate-50 rounded-xl px-3 py-2 flex items-center justify-between">
            <p className="text-xs text-slate-500">{safetyChecklist.filter(i => i.done).length} of {safetyChecklist.length} complete</p>
            <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-1.5 bg-emerald-500 rounded-full"
                style={{ width: `${(safetyChecklist.filter(i => i.done).length / safetyChecklist.length) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Compatibility Engine */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
              <Layers className="w-5 h-5 text-violet-700" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Procedure Compatibility</h3>
              <p className="text-xs text-slate-400">SAFE-T 4LIFE™ compatibility analysis</p>
            </div>
          </div>
          <div className="space-y-2">
            {compatibilityChecks.map((c) => (
              <div key={c.label} className="bg-slate-50 rounded-xl px-3 py-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-slate-700">{c.label}</p>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-[11px] text-slate-400">{c.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Red Flag Alerts */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <AlertOctagon className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Red Flag Alerts</h3>
            <p className="text-xs text-slate-400">Important safety considerations for your case</p>
          </div>
        </div>
        <div className="space-y-3">
          {redFlags.map((flag, i) => (
            <div key={i} className={`flex items-start gap-3 rounded-xl px-4 py-3 border
              ${flag.severity === 'high' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
              <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${flag.severity === 'high' ? 'text-red-500' : 'text-amber-500'}`} />
              <p className={`text-xs font-medium ${flag.severity === 'high' ? 'text-red-800' : 'text-amber-800'}`}>{flag.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ / Consent Education */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-sky-700" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Consent & Education Center</h3>
            <p className="text-xs text-slate-400">Frequently asked questions & informed consent</p>
          </div>
        </div>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-slate-100 rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left bg-slate-50 hover:bg-slate-100 transition-colors"
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
              >
                <p className="text-xs font-semibold text-slate-700">{faq.q}</p>
                <span className="text-slate-400 text-sm ml-3">{expandedFaq === i ? '−' : '+'}</span>
              </button>
              {expandedFaq === i && (
                <div className="px-4 py-3 bg-white">
                  <p className="text-xs text-slate-500 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Doctor Notes */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Doctor Notes</h3>
            <p className="text-xs text-slate-400">Messages from your assigned specialist</p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <p className="text-xs text-slate-400 italic">
            No notes from your doctor yet. Notes will appear here once your case has been reviewed and assigned.
          </p>
        </div>
      </div>
    </div>
  );
}