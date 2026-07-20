import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { FileCheck, Globe2, Loader2, CheckCircle2, Circle, ChevronDown, ChevronUp, ExternalLink, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Spain',
  'Italy', 'Brazil', 'Mexico', 'Colombia', 'Argentina', 'Trinidad and Tobago', 'Jamaica',
  'India', 'China', 'Japan', 'South Korea', 'Nigeria', 'South Africa', 'UAE', 'Saudi Arabia',
  'Venezuela', 'Costa Rica', 'Panama', 'Thailand', 'Turkey', 'Israel', 'Netherlands', 'Sweden'
];

const DESTINATIONS = [
  'Venezuela', 'Mexico', 'Colombia', 'Costa Rica', 'Panama', 'Turkey', 'Thailand',
  'Spain', 'Germany', 'India', 'Brazil', 'Dominican Republic', 'Cuba', 'Argentina'
];

const CATEGORY_COLORS = {
  'Travel Documents': 'bg-blue-50 border-blue-200 text-blue-700',
  'Visa': 'bg-purple-50 border-purple-200 text-purple-700',
  'Health': 'bg-emerald-50 border-emerald-200 text-emerald-700',
  'Insurance': 'bg-amber-50 border-amber-200 text-amber-700',
  'Medical': 'bg-rose-50 border-rose-200 text-rose-700',
};

const VISA_STATUS_CONFIG = {
  visa_free: { label: 'Visa-Free Entry', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: '✅' },
  evisa: { label: 'eVisa Required', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '🌐' },
  embassy_required: { label: 'Embassy Visa Required', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: '🏛️' },
  unknown: { label: 'Verify with Embassy', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: '❓' },
};

export default function ComplianceChecklistPanel({ caseId }) {
  const [passport, setPassport] = useState('');
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('Medical procedure and recovery');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [expandedCats, setExpandedCats] = useState({});
  const [error, setError] = useState('');

  const generate = async () => {
    if (!passport || !destination) return;
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('generateComplianceChecklist', {
        passport_country: passport,
        destination_country: destination,
        medical_purpose: purpose,
        case_id: caseId || null
      });
      if (res.data?.checklist) {
        setChecklist(res.data.checklist);
        setResult(res.data.policy);
      } else {
        setError('Could not generate a checklist — please try again.');
      }
    } catch (_e) {
      setError('Could not generate a checklist — please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = (idx) => {
    const updated = [...(checklist.tasks || [])];
    updated[idx] = { ...updated[idx], completed: !updated[idx].completed };
    setChecklist({ ...checklist, tasks: updated });
  };

  const toggleCat = (cat) => setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));

  const grouped = (checklist?.tasks || []).reduce((acc, task, idx) => {
    const cat = task.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ ...task, _idx: idx });
    return acc;
  }, {});

  const completedCount = (checklist?.tasks || []).filter(t => t.completed).length;
  const totalCount = (checklist?.tasks || []).length;

  const visaConfig = VISA_STATUS_CONFIG[result?.visa_status || checklist?.visa_status] || VISA_STATUS_CONFIG.unknown;

  return (
    <div className="space-y-6">
      {/* Generator Form */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Globe2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">AI Border Policy Parser</h3>
            <p className="text-xs text-slate-500">Generate a custom compliance checklist for your passport + destination</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Your Passport Country</label>
            <select value={passport} onChange={e => setPassport(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
              <option value="">Select country...</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Destination Country</label>
            <select value={destination} onChange={e => setDestination(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
              <option value="">Select destination...</option>
              {DESTINATIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Medical Purpose</label>
          <input value={purpose} onChange={e => setPurpose(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="e.g. Rhinoplasty and recovery — 14 day stay" />
        </div>

        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
        <Button onClick={generate} disabled={!passport || !destination || loading}
          className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:opacity-90 text-white rounded-xl py-2.5 font-semibold disabled:opacity-50">
          {loading ? (
            <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Analyzing immigration policy...</span>
          ) : (
            <span className="flex items-center gap-2"><FileCheck className="w-4 h-4" /> Generate Compliance Checklist</span>
          )}
        </Button>
      </div>

      {/* Results */}
      <AnimatePresence>
        {checklist && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Visa status banner */}
            <div className={`flex items-center gap-4 rounded-2xl border px-5 py-4 ${visaConfig.color}`}>
              <span className="text-2xl">{visaConfig.icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-sm">{visaConfig.label}</p>
                <p className="text-xs mt-0.5 opacity-80">{result?.visa_summary || checklist?.policy_snapshot?.visa_summary}</p>
              </div>
              {result?.evisa_url && (
                <a href={result.evisa_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold underline">
                  Apply <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Progress bar */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Compliance Progress
                </span>
                <span className="text-xs font-semibold text-emerald-700">{completedCount}/{totalCount} complete</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-gradient-to-r from-emerald-500 to-blue-500 h-2 rounded-full transition-all"
                  style={{ width: totalCount ? `${(completedCount / totalCount) * 100}%` : '0%' }} />
              </div>
            </div>

            {/* Tasks by category */}
            {Object.entries(grouped).map(([cat, tasks]) => {
              const catDone = tasks.filter(t => t.completed).length;
              const isExpanded = expandedCats[cat] !== false; // default open
              const colorClass = CATEGORY_COLORS[cat] || 'bg-slate-50 border-slate-200 text-slate-700';
              return (
                <div key={cat} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <button onClick={() => toggleCat(cat)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${colorClass}`}>{cat}</span>
                      <span className="text-xs text-slate-500">{catDone}/{tasks.length} done</span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-4 space-y-2">
                      {tasks.map(task => (
                        <button key={task._idx} onClick={() => toggleTask(task._idx)}
                          className={`w-full flex items-start gap-3 rounded-xl px-4 py-3 border text-left transition-all ${task.completed ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                          {task.completed
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                            : <Circle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />}
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold ${task.completed ? 'text-emerald-800 line-through' : 'text-slate-800'}`}>{task.label}</p>
                            {task.description && <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{task.description}</p>}
                            {task.deadline_days_before && <p className="text-[10px] text-amber-600 mt-1 font-semibold">⏱ Required {task.deadline_days_before}+ days before travel</p>}
                          </div>
                          {task.link && (
                            <a href={task.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                              className="text-blue-500 hover:text-blue-700 flex-shrink-0">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {result?.medical_notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-800 mb-1">Medical Traveler Note</p>
                  <p className="text-xs text-amber-700 leading-relaxed">{result.medical_notes}</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}