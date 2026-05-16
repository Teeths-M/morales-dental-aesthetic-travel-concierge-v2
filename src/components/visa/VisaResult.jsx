import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Globe, FileText, Upload, RotateCcw, ArrowRight, Clock, Info, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const STATUS_CONFIG = {
  visa_free: {
    color: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
    icon: '✅',
    label: 'Visa Free',
    headline: 'Great news — you do not require a visa!',
    sub: 'Your passport has visa-free access to this destination.',
    statusColor: 'text-emerald-700',
  },
  evisa: {
    color: 'from-blue-500 to-indigo-500',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    icon: '💻',
    label: 'e-Visa Available',
    headline: 'You are eligible for an online e-Visa!',
    sub: 'Apply online before your trip — quick and convenient.',
    statusColor: 'text-blue-700',
  },
  arrival_card: {
    color: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    icon: '📄',
    label: 'Arrival Card Required',
    headline: 'You need a travel card upon arrival.',
    sub: 'A tourist card or arrival form is required at the border.',
    statusColor: 'text-amber-700',
  },
  visa_required: {
    color: 'from-red-500 to-rose-500',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700',
    icon: '🛂',
    label: 'Visa Required',
    headline: 'A visa application is required before travel.',
    sub: 'Please apply at your nearest embassy in advance.',
    statusColor: 'text-red-700',
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
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Main result card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-3xl border-2 ${cfg.border} ${cfg.bg} overflow-hidden`}
      >
        {/* Header gradient */}
        <div className={`bg-gradient-to-r ${cfg.color} p-6 text-white`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{cfg.icon}</span>
                <span className="text-sm font-bold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">{cfg.label}</span>
              </div>
              <h2 className="font-display text-2xl font-bold leading-tight">{cfg.headline}</h2>
              <p className="text-white/80 text-sm mt-1">{cfg.sub}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="bg-white/15 rounded-xl px-3 py-2 text-sm">
              <span className="opacity-70">From</span> <strong>{passport?.flag} {passport?.name}</strong>
            </div>
            <div className="bg-white/15 rounded-xl px-3 py-2 text-sm">
              <span className="opacity-70">To</span> <strong>{destination?.flag} {destination?.name}</strong>
            </div>
            {rule.days && (
              <div className="bg-white/15 rounded-xl px-3 py-2 text-sm">
                <Clock className="w-3 h-3 inline mr-1 opacity-70" />
                <strong>Up to {rule.days} days</strong>
              </div>
            )}
          </div>
        </div>

        {/* AI Summary */}
        <div className="p-5 border-b border-dashed border-slate-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">AI Visa Advisor</p>
              <p className="text-sm text-slate-700 leading-relaxed">{aiSummary}</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="p-5">
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <p>{rule.notes}</p>
          </div>
        </div>
      </motion.div>

      {/* Document Checklist */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Document Checklist</h3>
              <p className="text-xs text-slate-400">{checkedCount} of {allDocs.length} completed</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold ${readiness >= 80 ? 'text-emerald-600' : readiness >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{readiness}%</div>
            <div className="text-xs text-slate-400">Ready</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-slate-100 rounded-full mb-5 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${readiness >= 80 ? 'bg-emerald-500' : readiness >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
            animate={{ width: `${readiness}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <div className="space-y-2">
          {/* Standard visa docs */}
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Travel Documents</p>
          {rule.requirements.map((doc, i) => (
            <label key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={!!checkedDocs[`req_${i}`]}
                onChange={e => setCheckedDocs(prev => ({ ...prev, [`req_${i}`]: e.target.checked }))}
                className="w-4 h-4 rounded accent-emerald-600"
              />
              <span className={`text-sm ${checkedDocs[`req_${i}`] ? 'line-through text-slate-400' : 'text-slate-700'}`}>{doc}</span>
            </label>
          ))}

          {/* Medical docs */}
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-4 mb-2">Medical Travel Documents</p>
          {MEDICAL_DOCS.map((doc, i) => (
            <label key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 bg-blue-50/50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={!!checkedDocs[`med_${i}`]}
                onChange={e => setCheckedDocs(prev => ({ ...prev, [`med_${i}`]: e.target.checked }))}
                className="w-4 h-4 rounded accent-blue-600"
              />
              <span className={`text-sm ${checkedDocs[`med_${i}`] ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                {doc}
              </span>
              <span className="ml-auto text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">Clinic provides</span>
            </label>
          ))}

          {hasCompanion && (
            <>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-4 mb-2">Companion Documents</p>
              {['Companion passport copy', 'Companion return ticket'].map((doc, i) => (
                <label key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!checkedDocs[`comp_${i}`]}
                    onChange={e => setCheckedDocs(prev => ({ ...prev, [`comp_${i}`]: e.target.checked }))}
                    className="w-4 h-4 rounded accent-emerald-600"
                  />
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
          className="flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all"
        >
          <RotateCcw className="w-4 h-4" /> New Check
        </button>
        <Link to="/booking">
          <Button className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:opacity-90 text-white font-bold py-4 rounded-2xl text-sm shadow-md">
            Book Consultation <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
        <Shield className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-slate-400 leading-relaxed">
          This result is for guidance only. Visa rules change frequently. Always verify with the official embassy or consulate before travel.
        </p>
      </div>
    </div>
  );
}