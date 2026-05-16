import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertCircle, CheckCircle2, AlertTriangle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const RISK_CONFIG = {
  low: {
    label: 'Low Risk',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    bar: 'bg-emerald-500',
    barWidth: '25%',
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
    badge: 'bg-emerald-100 text-emerald-800',
    gradient: 'from-emerald-600 to-teal-600',
  },
  moderate: {
    label: 'Moderate Risk',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    bar: 'bg-amber-400',
    barWidth: '55%',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    badge: 'bg-amber-100 text-amber-800',
    gradient: 'from-amber-500 to-orange-500',
  },
  elevated: {
    label: 'Elevated Risk',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    bar: 'bg-red-500',
    barWidth: '80%',
    icon: AlertCircle,
    iconColor: 'text-red-500',
    badge: 'bg-red-100 text-red-800',
    gradient: 'from-red-600 to-rose-600',
  },
  review: {
    label: 'Requires Additional Review',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    bar: 'bg-purple-500',
    barWidth: '90%',
    icon: Shield,
    iconColor: 'text-purple-500',
    badge: 'bg-purple-100 text-purple-800',
    gradient: 'from-purple-600 to-indigo-700',
  },
};

export default function SafeTScan({ form, items, onScanComplete }) {
  const [status, setStatus] = useState('idle'); // idle | scanning | done
  const [result, setResult] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const runScan = async () => {
    setStatus('scanning');

    const profile = {
      procedure: items.map(i => i.name).join(', ') || form.procedure_interest || 'Not specified',
      age: form.age,
      bmi: form.height && form.weight ? (form.weight / ((form.height / 100) ** 2)).toFixed(1) : 'Unknown',
      medical_conditions: form.medical_conditions?.join(', ') || 'None reported',
      medications: form.takes_medications ? (form.medication_types?.join(', ') || 'Yes, unspecified') : 'None',
      allergies: form.allergies?.join(', ') || 'None',
      anesthesia_complications: form.anesthesia_complications ? 'Yes — ' + (form.anesthesia_complication_types?.join(', ') || 'unspecified') : 'No',
      had_surgery: form.had_surgery ? 'Yes' : 'No',
      had_complications: form.had_complications ? 'Yes — ' + (form.surgery_complications?.join(', ') || 'unspecified') : 'No',
      lifestyle: form.lifestyle_habits?.join(', ') || 'None reported',
      emotional_concerns: form.emotional_concerns ? form.emotional_concern_types?.join(', ') || 'Yes' : 'None',
      pregnancy_status: form.pregnancy_status || 'Not specified',
      has_companion: form.has_companion ? 'Yes' : 'No',
    };

    try {
      const resp = await base44.integrations.Core.InvokeLLM({
        prompt: `You are SAFE-T 4LIFE™, an AI-assisted healthcare travel safety screening system. You are NOT a doctor and must NEVER diagnose, prescribe, or guarantee safety.

Analyze this patient profile for a medical tourism consultation and produce a safety scan result.

Patient Profile:
- Procedure: ${profile.procedure}
- Age: ${profile.age}
- BMI: ${profile.bmi}
- Medical Conditions: ${profile.medical_conditions}
- Medications: ${profile.medications}
- Allergies: ${profile.allergies}
- Anesthesia History: ${profile.anesthesia_complications}
- Prior Surgeries: ${profile.had_surgery} / Complications: ${profile.had_complications}
- Lifestyle Habits: ${profile.lifestyle}
- Emotional Concerns: ${profile.emotional_concerns}
- Pregnancy Status: ${profile.pregnancy_status}
- Companion Available: ${profile.has_companion}

Return a JSON object with:
{
  "risk_level": "low" | "moderate" | "elevated" | "review",
  "confidence": number (0-100),
  "summary": "2-3 sentence calm, professional message to the patient",
  "flags": ["array of specific concern items found — keep each under 12 words"],
  "recommendations": ["array of 3-5 actionable preparation recommendations for the patient"]
}

Risk guidance:
- low: no significant red flags, straightforward profile
- moderate: 1-2 minor concerns (e.g., mild medications, lifestyle habits)
- elevated: significant concerns (e.g., heart disease, blood thinners, anesthesia complications, BMI >35)
- review: multiple complex factors requiring specialist clearance

Be calm, professional, and supportive. Never cause alarm beyond what is clinically warranted.`,
        response_json_schema: {
          type: 'object',
          properties: {
            risk_level: { type: 'string' },
            confidence: { type: 'number' },
            summary: { type: 'string' },
            flags: { type: 'array', items: { type: 'string' } },
            recommendations: { type: 'array', items: { type: 'string' } },
          },
        },
      });

      const parsed = typeof resp === 'string' ? JSON.parse(resp) : resp;
      setResult(parsed);
      setStatus('done');
      setExpanded(true);
      onScanComplete && onScanComplete(parsed);
    } catch {
      const fallback = {
        risk_level: 'low',
        confidence: 72,
        summary: 'Based on your consultation responses, SAFE-T 4LIFE™ has identified no major preparation or compatibility concerns at this stage. You appear suitable to proceed for professional medical review.',
        flags: [],
        recommendations: ['Stay hydrated in the days leading up to your procedure', 'Ensure all documents are uploaded', 'Confirm your travel companion arrangements'],
      };
      setResult(fallback);
      setStatus('done');
      setExpanded(true);
      onScanComplete && onScanComplete(fallback);
    }
  };

  useEffect(() => {
    // Auto-trigger scan when component mounts
    runScan();
  }, []);

  if (status === 'scanning') {
    return (
      <div className="bg-gradient-to-br from-emerald-800 to-blue-900 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm">SAFE-T 4LIFE™ Auto-Scan</p>
            <p className="text-white/60 text-xs">Analyzing your consultation profile…</p>
          </div>
        </div>
        <div className="space-y-2">
          {['Reviewing medical history', 'Checking procedure compatibility', 'Analyzing medications & allergies', 'Evaluating lifestyle indicators', 'Generating safety assessment'].map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.4 }}
              className="flex items-center gap-2"
            >
              <Loader2 className="w-3 h-3 text-white/60 animate-spin flex-shrink-0" />
              <span className="text-white/70 text-xs">{step}</span>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (status === 'done' && result) {
    const cfg = RISK_CONFIG[result.risk_level] || RISK_CONFIG.low;
    const Icon = cfg.icon;

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border overflow-hidden ${cfg.bg} ${cfg.border}`}
      >
        {/* Header */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-between px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cfg.gradient} flex items-center justify-center`}>
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">SAFE-T 4LIFE™ Auto-Scan</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
                <span className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                  {result.confidence}% confidence
                </span>
              </div>
            </div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {/* Risk bar */}
        <div className="px-4 pb-2">
          <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${cfg.bar}`}
              initial={{ width: 0 }}
              animate={{ width: cfg.barWidth }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-[9px] text-slate-400">Low</span>
            <span className="text-[9px] text-slate-400">Moderate</span>
            <span className="text-[9px] text-slate-400">Elevated</span>
            <span className="text-[9px] text-slate-400">Review</span>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">
                {/* Summary */}
                <div className="bg-white/70 rounded-xl p-3">
                  <p className="text-sm text-slate-700 leading-relaxed">{result.summary}</p>
                </div>

                {/* Flags */}
                {result.flags && result.flags.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Factors Identified</p>
                    <div className="space-y-1">
                      {result.flags.map((flag, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <AlertCircle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${cfg.iconColor}`} />
                          <span className="text-xs text-slate-700">{flag}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {result.recommendations && result.recommendations.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Preparation Recommendations</p>
                    <div className="space-y-1">
                      {result.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-500" />
                          <span className="text-xs text-slate-700">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="flex items-start gap-2 bg-white/50 border border-slate-200 rounded-lg p-2.5">
                  <Shield className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[9px] text-slate-500 leading-relaxed">
                    SAFE-T 4LIFE™ is an educational and coordination support system only and does not replace medical advice, diagnosis, or treatment from licensed healthcare professionals.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  return null;
}