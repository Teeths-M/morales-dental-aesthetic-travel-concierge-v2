import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Thermometer, Activity, Smile, Droplets, Wind, AlertCircle, CheckCircle2, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const METRICS = [
  { id: 'pain', label: 'Pain Level', icon: Activity, color: 'red', desc: '0 = No pain, 10 = Severe', unit: '/10' },
  { id: 'swelling', label: 'Swelling', icon: Wind, color: 'orange', desc: '0 = None, 10 = Significant', unit: '/10' },
  { id: 'temperature', label: 'Feeling', icon: Thermometer, color: 'amber', desc: 'Normal / Warm / Feverish', isSelect: true, options: ['Normal', 'Slightly warm', 'Feverish', 'Chills'] },
  { id: 'mobility', label: 'Mobility', icon: Activity, color: 'blue', desc: '0 = Bed rest, 10 = Full mobility', unit: '/10' },
  { id: 'mood', label: 'Emotional Wellbeing', icon: Smile, color: 'purple', desc: '0 = Very low, 10 = Excellent', unit: '/10' },
  { id: 'hydration', label: 'Hydration', icon: Droplets, color: 'cyan', desc: 'How much water today?', isSelect: true, options: ['< 1 litre', '1–2 litres', '2–3 litres', '3+ litres'] },
];

const CHECKINS = [
  { day: 'Day 1 Check-in', date: '3 days ago', pain: 5, swelling: 6, mood: 6, summary: 'Some discomfort reported — normal post-procedure. Advised rest and ice pack application.' },
  { day: 'Day 3 Check-in', date: '1 day ago', pain: 3, swelling: 4, mood: 7, summary: 'Improving well. Swelling reducing. Mood improving. Continue following care instructions.' },
];

export default function WellnessMonitorTab() {
  const [values, setValues] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const summary = Object.entries(values).map(([k, v]) => `${k}: ${v}`).join(', ');
      const resp = await base44.integrations.Core.InvokeLLM({
        prompt: `You are SAFE-T 4LIFE™, a premium healthcare travel companion. A patient just submitted their daily wellness check-in with these readings: ${summary}. 
        Write a warm, reassuring 2-3 sentence response that:
        1. Acknowledges their check-in
        2. Provides appropriate guidance based on the readings (if pain/swelling is high, recommend rest and contacting provider; if good, encourage them)
        3. Ends with emotional support
        NEVER diagnose or prescribe. Be calm, warm, and supportive.`
      });
      setAiResponse(resp);
      setSubmitted(true);
    } catch {
      setAiResponse("Thank you for checking in. Your data has been recorded. Please continue following your care instructions and reach out to your coordinator if you have any concerns. 💚");
      setSubmitted(true);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Daily Wellness Check-In</h2>
            <p className="text-white/60 text-sm">Recovery monitoring · SAFE-T 4LIFE™</p>
          </div>
        </div>
        <p className="text-white/70 text-sm leading-relaxed">
          Your daily check-in helps us monitor your recovery progress and ensure you're receiving the right support. Your responses are private and reviewed by your care coordinator.
        </p>
      </div>

      {!submitted ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Today's Check-In</h3>
            <p className="text-xs text-slate-500 mt-0.5">How are you feeling today? Be honest — we're here to help.</p>
          </div>
          <div className="p-5 space-y-5">
            {METRICS.map(metric => {
              const Icon = metric.icon;
              return (
                <div key={metric.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <label className="text-sm font-semibold text-slate-700">{metric.label}</label>
                    <span className="text-xs text-slate-400">— {metric.desc}</span>
                  </div>
                  {metric.isSelect ? (
                    <div className="flex flex-wrap gap-2">
                      {metric.options.map(opt => (
                        <button
                          key={opt}
                          onClick={() => setValues(v => ({ ...v, [metric.id]: opt }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            values[metric.id] === opt
                              ? 'bg-slate-800 text-white border-slate-800'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <input
                        type="range" min="0" max="10"
                        value={values[metric.id] || 0}
                        onChange={e => setValues(v => ({ ...v, [metric.id]: e.target.value }))}
                        className="flex-1 accent-emerald-600"
                      />
                      <span className="w-8 text-center font-bold text-slate-700 text-sm">
                        {values[metric.id] || 0}{metric.unit}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">Additional Notes (optional)</label>
              <textarea
                placeholder="Anything specific you'd like your care team to know?"
                rows={3}
                onChange={e => setValues(v => ({ ...v, notes: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-200 resize-none text-slate-700 placeholder:text-slate-400"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-700 to-blue-800 hover:opacity-90 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-md"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analyzing...</>
              ) : (
                <><Send className="w-4 h-4" /> Submit Check-In</>
              )}
            </button>
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-emerald-100 bg-emerald-50 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="font-bold text-emerald-800 text-sm">Check-In Received</p>
              <p className="text-xs text-emerald-600">SAFE-T 4LIFE™ AI Response</p>
            </div>
          </div>
          <div className="p-5">
            <p className="text-slate-700 text-sm leading-relaxed">{aiResponse}</p>
            <button
              onClick={() => { setSubmitted(false); setValues({}); setAiResponse(''); }}
              className="mt-4 text-xs text-slate-400 hover:text-slate-600 underline transition-colors"
            >
              Submit another check-in
            </button>
          </div>
        </motion.div>
      )}

      {/* Previous Check-ins */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm">Previous Check-Ins</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {CHECKINS.map((c, i) => (
            <div key={i} className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-800 text-sm">{c.day}</span>
                <span className="text-xs text-slate-400">{c.date}</span>
              </div>
              <div className="flex gap-4 mb-2">
                <span className="text-xs text-slate-500">Pain: <strong className="text-slate-700">{c.pain}/10</strong></span>
                <span className="text-xs text-slate-500">Swelling: <strong className="text-slate-700">{c.swelling}/10</strong></span>
                <span className="text-xs text-slate-500">Mood: <strong className="text-slate-700">{c.mood}/10</strong></span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed italic">"{c.summary}"</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl p-4">
        <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-slate-500 leading-relaxed">
          Wellness monitoring is for coordination and support only. If you experience severe symptoms, contact your healthcare provider immediately or call emergency services.
        </p>
      </div>
    </div>
  );
}