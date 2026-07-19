import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, CheckCircle2, Clock, Compass,
  Sun, CloudRain, AlertTriangle, Luggage, Moon, Radio
} from 'lucide-react';
import BaggageTracker from '@/components/baggage/BaggageTracker';
import RecoveryModePanel from '@/components/recovery/RecoveryModePanel';
import ActivitySafetyAdvisor from '@/components/activity/ActivitySafetyAdvisor';
import IQ200EnginePanel from '@/components/journey/IQ200EnginePanel';

const roadmap = [
  { phase: 'Pre-Travel', color: 'blue', steps: ['Documents ready', 'Medical clearance obtained', 'Packing guide reviewed', 'Medications prepared'] },
  { phase: 'Arrival', color: 'sky', steps: ['Airport transfer arranged', 'Hotel check-in confirmed', 'Coordinator welcome meeting', 'Pre-procedure consultation', 'Rest & hydration'] },
  { phase: 'Procedure', color: 'violet', steps: ['Pre-procedure fasting', 'Clinic arrival (8:30 AM)', 'Procedure with Dr. Ramirez', 'Recovery room (1–2 hours)', 'Hotel transfer & rest'] },
  { phase: 'Recovery', color: 'emerald', steps: ['Day 1–2: Rest & hydrate', 'Day 3: Follow-up check', 'Day 4–5: Light activity', 'Day 5: Discharge evaluation', 'Day 6: Pre-departure check'] },
  { phase: 'Post-Care', color: 'amber', steps: ['Return home', 'Virtual follow-up (Day 7)', 'Symptom monitoring', 'Final review (30-day)', '12-month check plan'] },
];

const colorMap = {
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    dot: 'bg-blue-600',    text: 'text-blue-700',    badge: 'bg-blue-100 text-blue-700' },
  sky:     { bg: 'bg-sky-50',     border: 'border-sky-200',     dot: 'bg-sky-600',     text: 'text-sky-700',     badge: 'bg-sky-100 text-sky-700' },
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-200',  dot: 'bg-violet-600',  text: 'text-violet-700',  badge: 'bg-violet-100 text-violet-700' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-600', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   dot: 'bg-amber-500',   text: 'text-amber-700',   badge: 'bg-amber-100 text-amber-700' },
};

const travelReadiness = [
  { label: 'Passport & Visa', status: 'ready' },
  { label: 'Flight Confirmed', status: 'ready' },
  { label: 'Hotel Confirmed', status: 'ready' },
  { label: 'Medical Clearance', status: 'pending' },
  { label: 'Medications Prepared', status: 'pending' },
  { label: 'Emergency Contacts Saved', status: 'missing' },
];

const destTips = [
  { icon: Sun, tip: 'Margarita Island averages 28°C in June — pack light, breathable clothing.' },
  { icon: CloudRain, tip: 'Brief afternoon showers are common. Pack a compact umbrella.' },
  { icon: MapPin, tip: 'The clinic is 12 minutes from your hotel by private car.' },
  { icon: Compass, tip: 'Local currency is Bolívar. USD and cards widely accepted in tourist areas.' },
];

// Demo case ID — in production this comes from the user's active case
const DEMO_CASE_ID = 'demo_case';

export default function JourneyModule({ _userRole = null }) {
  const [activePhase, setActivePhase] = useState('Pre-Travel');
  const [activeTab, setActiveTab] = useState('journey');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">My Journey</h2>
        <p className="text-xs text-slate-400 mt-0.5">Your complete healthcare travel experience roadmap</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        {[
          { id: 'journey', label: 'Roadmap', icon: MapPin },
          { id: 'iq200', label: 'Live Updates', icon: Radio },
          { id: 'baggage', label: 'Baggage', icon: Luggage },
          { id: 'recovery', label: 'Recovery', icon: Moon },
          { id: 'activities', label: 'Adventures', icon: MapPin },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              activeTab === tab.id
                ? 'bg-slate-800 text-white border-transparent'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}>
            <tab.icon className="w-3.5 h-3.5" />{tab.label}
          </button>
        ))}
      </div>

      {/* iQ200 Engine Tab */}
      {activeTab === 'iq200' && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
          <IQ200EnginePanel caseId={DEMO_CASE_ID} />
        </div>
      )}

      {/* Baggage Tab */}
      {activeTab === 'baggage' && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
          <BaggageTracker caseId={DEMO_CASE_ID} />
        </div>
      )}

      {/* Recovery Tab */}
      {activeTab === 'recovery' && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
          <RecoveryModePanel caseId={DEMO_CASE_ID} />
        </div>
      )}

      {/* Activities Tab */}
      {activeTab === 'activities' && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
          <ActivitySafetyAdvisor caseId={DEMO_CASE_ID} />
        </div>
      )}

      {/* Journey Roadmap Tab */}
      {activeTab === 'journey' && (
        <div className="space-y-6">
          {/* Interactive Roadmap */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-5">Journey Roadmap</h3>
            <div className="flex gap-2 flex-wrap mb-5">
              {roadmap.map(phase => {
                const c = colorMap[phase.color];
                const isActive = activePhase === phase.phase;
                return (
                  <button key={phase.phase} onClick={() => setActivePhase(phase.phase)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${isActive ? `${c.bg} ${c.border} ${c.text}` : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                    {phase.phase}
                  </button>
                );
              })}
            </div>
            {roadmap.filter(p => p.phase === activePhase).map(phase => {
              const c = colorMap[phase.color];
              return (
                <motion.div key={phase.phase} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="space-y-2">
                    {phase.steps.map((step, i) => (
                      <div key={step} className={`flex items-center gap-3 rounded-xl px-4 py-3 ${c.bg} border ${c.border}`}>
                        <div className={`w-6 h-6 rounded-full ${c.dot} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-white text-[10px] font-semibold">{i + 1}</span>
                        </div>
                        <p className={`text-xs font-medium ${c.text}`}>{step}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            {/* Travel Readiness */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">Travel Readiness</h3>
              </div>
              <div className="space-y-2">
                {travelReadiness.map(r => (
                  <div key={r.label} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border
                    ${r.status === 'ready' ? 'bg-emerald-50 border-emerald-100' :
                      r.status === 'pending' ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'}`}>
                    {r.status === 'ready'
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      : r.status === 'pending'
                      ? <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      : <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                    <p className={`text-xs font-medium ${r.status === 'ready' ? 'text-emerald-800' : r.status === 'pending' ? 'text-amber-800' : 'text-red-800'}`}>{r.label}</p>
                    <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      r.status === 'ready' ? 'bg-emerald-100 text-emerald-700' :
                      r.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>{r.status === 'ready' ? 'Ready' : r.status === 'pending' ? 'Pending' : 'Missing'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Destination Tips */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Compass className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">Destination Guide</h3>
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Margarita Island, Venezuela</p>
              <div className="space-y-3 mb-4">
                {destTips.map((t, i) => {
                  const Icon = t.icon;
                  return (
                    <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-xl px-3 py-2.5">
                      <Icon className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-600 leading-relaxed">{t.tip}</p>
                    </div>
                  );
                })}
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-blue-800 mb-1">Visa Information</p>
                <p className="text-[11px] text-blue-700">Most nationalities receive a tourist visa on arrival valid for 90 days. Your coordinator will confirm requirements for your passport.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}