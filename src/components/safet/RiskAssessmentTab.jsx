import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, AlertTriangle, CheckCircle2, Brain, Plane, Info,
  Heart, Wind, Pill, Cigarette, Wine, Shield, HelpCircle
} from 'lucide-react';

const riskLevels = [
  { label: 'Overall Risk', level: 'Low', color: 'emerald', score: 20 },
  { label: 'Lifestyle Factors', level: 'Moderate', color: 'amber', score: 50 },
  { label: 'Travel Readiness', level: 'Low', color: 'emerald', score: 15 },
  { label: 'Recovery Complexity', level: 'Low', color: 'emerald', score: 25 },
];

const medicalHistory = [
  { label: 'Diabetes', icon: Activity, status: 'none', note: 'Not reported' },
  { label: 'Hypertension', icon: Heart, status: 'none', note: 'Not reported' },
  { label: 'Asthma / Respiratory', icon: Wind, status: 'flag', note: 'Mild asthma noted — clearance recommended' },
  { label: 'Autoimmune Disorders', icon: Shield, status: 'none', note: 'Not reported' },
  { label: 'Previous Surgeries', icon: Activity, status: 'flag', note: 'Rhinoplasty (2018) — noted' },
  { label: 'Anesthesia Complications', icon: AlertTriangle, status: 'none', note: 'None reported' },
  { label: 'Known Allergies', icon: AlertTriangle, status: 'flag', note: 'Penicillin allergy recorded' },
  { label: 'Current Medications', icon: Pill, status: 'flag', note: 'Review required' },
  { label: 'Smoking', icon: Cigarette, status: 'flag', note: 'Active smoker — cessation advised' },
  { label: 'Alcohol Use', icon: Wine, status: 'none', note: 'Social/moderate — no concern' },
];

const educationCards = [
  {
    icon: Cigarette,
    color: 'amber',
    title: 'Smoking & Healing',
    body: 'Smoking significantly reduces blood oxygen levels and can delay wound healing by up to 40%. Cessation 4+ weeks before your procedure is strongly recommended.',
  },
  {
    icon: Pill,
    color: 'red',
    title: 'Blood Thinners & Bleeding Risk',
    body: 'Medications like aspirin, warfarin, or NSAIDs increase intraoperative and post-operative bleeding risk. Always disclose all medications to your care team.',
  },
  {
    icon: Activity,
    color: 'violet',
    title: 'Procedure Combinations',
    body: 'Combining multiple procedures in a single session can increase physical stress on the body. SAFE-T 4LIFE™ evaluates your specific combination for safety.',
  },
  {
    icon: Brain,
    color: 'blue',
    title: 'Emotional Readiness',
    body: 'Stress and anxiety can affect recovery. Our care team offers emotional support resources and pre-procedure consultations to help you feel confident.',
  },
];

const mentalChecks = [
  { label: 'Anxiety Level', value: 'Moderate', color: 'amber' },
  { label: 'Emotional Readiness', value: 'Good', color: 'emerald' },
  { label: 'Expectation Management', value: 'Needs Discussion', color: 'amber' },
  { label: 'Stress Indicators', value: 'Low', color: 'emerald' },
];

const travelRisks = [
  { label: 'Long-Flight Recovery Concern', risk: 'Low', note: '4–5hr flight is manageable with proper compression garments and hydration.' },
  { label: 'Mobility Limitations', risk: 'None', note: 'No reported mobility restrictions.' },
  { label: 'Companion Support', risk: 'Recommended', note: 'Companion travel is advised for your procedure type.' },
  { label: 'Emergency Planning', risk: 'Pending', note: 'Emergency contacts and local hospital info needed.' },
];

const colorMap = {
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  red: { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-100', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700' },
};

export default function RiskAssessmentTab() {
  return (
    <div className="space-y-6">
      {/* Risk Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {riskLevels.map((r) => {
          const c = colorMap[r.color];
          return (
            <motion.div
              key={r.label}
              className={`bg-white rounded-2xl border ${c.border} shadow-sm p-5 text-center`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold mb-3 ${c.badge}`}>{r.level}</div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full mb-3">
                <div className={`h-1.5 rounded-full ${r.color === 'emerald' ? 'bg-emerald-500' : r.color === 'amber' ? 'bg-amber-400' : 'bg-red-500'}`}
                  style={{ width: `${r.score}%` }} />
              </div>
              <p className="text-xs font-semibold text-slate-600">{r.label}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Medical History Review */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Medical History Review</h3>
              <p className="text-xs text-slate-400">SAFE-T 4LIFE™ assessment of your profile</p>
            </div>
          </div>
          <div className="space-y-2">
            {medicalHistory.map((item) => {
              const Icon = item.icon;
              const isFlag = item.status === 'flag';
              return (
                <div key={item.label} className={`flex items-start gap-3 rounded-xl px-3 py-2.5 border
                  ${isFlag ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                  <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isFlag ? 'text-amber-600' : 'text-slate-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                      {isFlag ? (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Review</span>
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.note}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-5">
          {/* Mental Wellness Check */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                <Brain className="w-5 h-5 text-violet-700" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">Mental Wellness Check</h3>
                <p className="text-xs text-slate-400">Emotional & psychological readiness</p>
              </div>
            </div>
            <div className="space-y-2">
              {mentalChecks.map((m) => {
                const c = colorMap[m.color];
                return (
                  <div key={m.label} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
                    <p className="text-xs font-medium text-slate-700">{m.label}</p>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${c.badge}`}>{m.value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Travel Risk */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                <Plane className="w-5 h-5 text-sky-700" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">Travel Risk Assessment</h3>
                <p className="text-xs text-slate-400">Flight, mobility & planning evaluation</p>
              </div>
            </div>
            <div className="space-y-2">
              {travelRisks.map((t) => (
                <div key={t.label} className="bg-slate-50 rounded-xl px-3 py-2.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs font-semibold text-slate-700">{t.label}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      t.risk === 'Low' || t.risk === 'None' ? 'bg-emerald-100 text-emerald-700' :
                      t.risk === 'Recommended' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                    }`}>{t.risk}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{t.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Education Cards */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-500" /> Risk Education Center
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {educationCards.map((card) => {
            const Icon = card.icon;
            const c = colorMap[card.color];
            return (
              <motion.div
                key={card.title}
                className={`bg-white rounded-2xl border ${c.border} shadow-sm p-5`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-4 h-4 ${c.text}`} />
                </div>
                <h4 className="text-xs font-bold text-slate-800 mb-1.5">{card.title}</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">{card.body}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 flex items-start gap-3">
        <HelpCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-500 leading-relaxed">
          <strong className="text-slate-600">SAFE-T 4LIFE™ Disclaimer:</strong> This platform provides educational and coordination support only and does not replace medical advice from licensed healthcare professionals. Always consult your assigned physician before making any health decisions.
        </p>
      </div>
    </div>
  );
}