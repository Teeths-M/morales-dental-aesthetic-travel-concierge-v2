import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, RotateCcw, ArrowRight, Clock, Info, Shield, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const STATUS_CONFIG = {
  visa_free: {
    gradient: 'from-[#064e3b] to-[#065f46]',
    accent: 'bg-emerald-500',
    accentText: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    label: 'Visa Free',
    headline: 'Great news — no visa required.',
    sub: 'Your passport grants visa-free access to this destination.',
    dot: 'bg-emerald-400',
  },
  evisa: {
    gradient: 'from-[#1e3a5f] to-[#1e40af]',
    accent: 'bg-blue-500',
    accentText: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    label: 'e-Visa Available',
    headline: 'You can apply online for an e-Visa.',
    sub: 'Apply from home before your trip — fast and convenient.',
    dot: 'bg-blue-400',
  },
  arrival_card: {
    gradient: 'from-[#78350f] to-[#92400e]',
    accent: 'bg-amber-500',
    accentText: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    label: 'Arrival Card Required',
    headline: 'A tourist card is required on arrival.',
    sub: 'Typically available at the border — small fee may apply.',
    dot: 'bg-amber-400',
  },
  visa_required: {
    gradient: 'from-[#7f1d1d] to-[#991b1b]',
    accent: 'bg-red-500',
    accentText: 'text-red-400',
    badge: 'bg-red-500/20 text-red-300 border-red-500/30',
    label: 'Visa Required',
    headline: 'A visa must be obtained before travel.',
    sub: 'Apply through your nearest embassy in advance.',
    dot: 'bg-red-400',
  },
};

const MEDICAL_DOCS = [
  'Medical invitation letter from clinic',
  'Appointment confirmation from Morales Dental',
  'Treatment itinerary summary',
  'Travel support letter from coordinator',
];

export default function VisaResult({ result, onReset }) {
  const { passport, destination, purpose, travelDate, stayDuration, hasCompanion, rule, aiSummary } = result;
  const cfg = STATUS_CONFIG[rule.status] || STATUS_CONFIG.visa_required;
  const [checkedDocs, setCheckedDocs] = useState({});

  const allDocs = [
    ...rule.requirements,
    ...MEDICAL_DOCS,
    ...(hasCompanion ? ['Companion passport copy', 'Companion return ticket'] : []),
  ];
  const checkedCount = Object.values(checkedDocs).filter(Boolean).length;
  const readiness = Math.round((checkedCount / allDocs.length) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* Status card — dark premium */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`rounded-2xl bg-gradient-to-br ${cfg.gradient} text-white overflow-hidden shadow-xl`}
      >
        <div className="p-6 lg:p-7">
          {/* Status badge */}
          <div className="flex items-center gap-3 mb-5">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold tracking-widest uppercase ${cfg.badge}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </div>
          </div>

          <h2 className="font-display text-2xl lg:text-3xl font-bold leading-tight mb-2">{cfg.headline}</h2>
          <p className="text-white/60 text-sm mb-6">{cfg.sub}</p>

          {/* Journey pills */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2 text-sm">
              <span>{passport?.flag}</span>
              <span className="text-white/60 text-xs">From</span>
              <span className="font-semibold">{passport?.name}</span>
            </div>
            <div className="flex items-center justify-center w-7 h-7 self-center">
              <ArrowRight className="w-4 h-4 text-white/30" />
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2 text-sm">
              <span>{destination?.flag}</span>
              <span className="text-white/60 text-xs">To</span>
              <span className="font-semibold">{destination?.name}</span>
            </div>
            {rule.days && (
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2 text-sm">
                <Clock className="w-3 h-3 text-white/50" />
                <span className="font-semibold">Up to {rule.days} days</span>
              </div>
            )}
          </div>
        </div>

        {/* Apply link */}
        {rule.applyUrl && (
          <div className="px-6 pb-4">
            <a
              href={rule.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl text-sm font-bold text-white transition-all"
            >
              <span>🔗</span> Apply / Start Application Online →
            </a>
          </div>
        )}

        {/* AI advisor strip */}
        <div className="bg-black/20 border-t border-white/10 p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[10px] font-bold tracking-wide">AI</span>
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-widest uppercase text-white/40 mb-1.5">AI Visa Advisor</p>
              <p className="text-sm text-white/80 leading-relaxed">{aiSummary}</p>
            </div>
          </div>
        </div>

        {/* Entry notes */}
        <div className="bg-black/10 px-5 py-3 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-white/40 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-white/50 leading-relaxed">{rule.notes}</p>
        </div>
      </motion.div>

      {/* Document Checklist */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4 text-slate-500" />
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Document Checklist</h3>
              <p className="text-xs text-slate-400">{checkedCount} of {allDocs.length} completed</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className={`text-lg font-bold ${readiness >= 80 ? 'text-emerald-600' : readiness >= 50 ? 'text-amber-600' : 'text-slate-500'}`}>{readiness}%</div>
            </div>
            {/* Mini arc */}
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="#f1f5f9" strokeWidth="3" />
              <circle cx="18" cy="18" r="14" fill="none"
                stroke={readiness >= 80 ? '#10b981' : readiness >= 50 ? '#f59e0b' : '#94a3b8'}
                strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 14}`}
                strokeDashoffset={2 * Math.PI * 14 * (1 - readiness / 100)}
              />
            </svg>
          </div>
        </div>

        {/* Thin progress */}
        <div className="h-1 bg-slate-100">
          <motion.div
            className={`h-full ${readiness >= 80 ? 'bg-emerald-500' : readiness >= 50 ? 'bg-amber-500' : 'bg-slate-400'}`}
            animate={{ width: `${readiness}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>

        <div className="p-5 space-y-1">
          {/* Travel docs */}
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Travel Documents</p>
          {rule.requirements.map((doc, i) => (
            <label key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                checkedDocs[`req_${i}`] ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 group-hover:border-slate-400'
              }`}>
                {checkedDocs[`req_${i}`] && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <input type="checkbox" className="sr-only" checked={!!checkedDocs[`req_${i}`]}
                onChange={e => setCheckedDocs(prev => ({ ...prev, [`req_${i}`]: e.target.checked }))} />
              <span className={`text-sm ${checkedDocs[`req_${i}`] ? 'line-through text-slate-400' : 'text-slate-700'}`}>{doc}</span>
            </label>
          ))}

          {/* Medical docs */}
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 mb-2 px-1">Medical Travel Documents</p>
          {MEDICAL_DOCS.map((doc, i) => (
            <label key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                checkedDocs[`med_${i}`] ? 'bg-blue-500 border-blue-500' : 'border-slate-300 group-hover:border-slate-400'
              }`}>
                {checkedDocs[`med_${i}`] && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <input type="checkbox" className="sr-only" checked={!!checkedDocs[`med_${i}`]}
                onChange={e => setCheckedDocs(prev => ({ ...prev, [`med_${i}`]: e.target.checked }))} />
              <span className={`flex-1 text-sm ${checkedDocs[`med_${i}`] ? 'line-through text-slate-400' : 'text-slate-700'}`}>{doc}</span>
              <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">Clinic provides</span>
            </label>
          ))}

          {hasCompanion && (
            <>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 mb-2 px-1">Companion Documents</p>
              {['Companion passport copy', 'Companion return ticket'].map((doc, i) => (
                <label key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    checkedDocs[`comp_${i}`] ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 group-hover:border-slate-400'
                  }`}>
                    {checkedDocs[`comp_${i}`] && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <input type="checkbox" className="sr-only" checked={!!checkedDocs[`comp_${i}`]}
                    onChange={e => setCheckedDocs(prev => ({ ...prev, [`comp_${i}`]: e.target.checked }))} />
                  <span className={`text-sm ${checkedDocs[`comp_${i}`] ? 'line-through text-slate-400' : 'text-slate-700'}`}>{doc}</span>
                </label>
              ))}
            </>
          )}
        </div>
      </motion.div>

      {/* CTAs */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 py-3.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" /> New Check
        </button>
        <Link to="/booking">
          <button className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-900 hover:bg-slate-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all">
            Book Consultation <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </Link>
      </div>

      {/* Disclaimer */}
      <div className="flex items-center gap-2 text-center justify-center">
        <Shield className="w-3 h-3 text-slate-300 flex-shrink-0" />
        <p className="text-xs text-slate-400 leading-relaxed">
          Guidance only — always verify with the official embassy before travel.
        </p>
      </div>
    </div>
  );
}