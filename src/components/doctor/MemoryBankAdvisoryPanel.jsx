import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, Loader2, ShieldAlert, Users, Pill } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { friendlyError, safeError } from '@/lib/friendlyError';

/**
 * MemoryBankAdvisoryPanel — DOCTOR-ONLY. Shows anonymized aggregate reference
 * data (recallSimilarOutcomes) from past, DIFFERENT patients with a similar
 * procedure + condition profile. Advisory context only — never a
 * recommendation for the doctor's current patient, and the caveat the backend
 * returns is always rendered with the same visual weight as the data itself.
 *
 * Must never be imported from src/components/patient/ or any patient-facing
 * page — this is the doctor-only half of the "AI informs, human decides"
 * pattern used elsewhere in this app (SAFE-T, Recovery Guidance).
 */
export default function MemoryBankAdvisoryPanel({ caseId = null, token }) {
  const [state, setState] = useState('idle'); // idle | loading | result | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleCheck = async () => {
    setState('loading');
    setError(null);
    try {
      const res = await base44.functions.invoke('recallSimilarOutcomes', {
        case_id: caseId,
        token: token || undefined,
      });
      if (!res.data?.success) throw safeError(res.data?.error || 'Could not check the memory bank.');
      setResult(res.data);
      setState('result');
    } catch (err) {
      setError(friendlyError(err, 'Could not check the memory bank right now.', 'MemoryBankAdvisoryPanel'));
      setState('error');
    }
  };

  return (
    <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <BrainCircuit className="w-5 h-5 text-indigo-700" />
        </div>
        <div>
          <p className="font-semibold text-indigo-900">Memory Bank — Similar Past Cases</p>
          <p className="text-sm text-indigo-800 mt-0.5">
            Anonymized reference data from past cases with a similar procedure and condition profile.
          </p>
        </div>
      </div>

      {state === 'idle' && (
        <Button onClick={handleCheck} className="w-full bg-indigo-700 hover:bg-indigo-800 text-white gap-2">
          <BrainCircuit className="w-4 h-4" /> Check Memory Bank for Similar Past Cases
        </Button>
      )}

      {state === 'loading' && (
        <Button disabled className="w-full bg-indigo-700 text-white gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Checking…
        </Button>
      )}

      {state === 'error' && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
      )}

      {state === 'result' && result && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {result.status === 'insufficient_data' ? (
            <div className="bg-white/70 rounded-lg border border-indigo-200 px-3 py-3 flex items-start gap-2">
              <Users className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-indigo-800">
                Not enough similar past cases yet ({result.similar_case_count} found) to show a reliable reference pattern.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/70 rounded-lg border border-indigo-200 px-3 py-2 text-center">
                  <p className="text-lg font-semibold text-indigo-900">{result.similar_case_count}</p>
                  <p className="text-[10px] text-indigo-600 uppercase tracking-wide">Similar cases</p>
                </div>
                <div className="bg-white/70 rounded-lg border border-indigo-200 px-3 py-2 text-center">
                  <p className="text-lg font-semibold text-indigo-900">{result.outcome_success_rate_percent}%</p>
                  <p className="text-[10px] text-indigo-600 uppercase tracking-wide">Success rate</p>
                </div>
                <div className="bg-white/70 rounded-lg border border-indigo-200 px-3 py-2 text-center">
                  <p className="text-lg font-semibold text-indigo-900">{result.avg_recovery_days ?? '—'}</p>
                  <p className="text-[10px] text-indigo-600 uppercase tracking-wide">Avg recovery days</p>
                </div>
              </div>

              {result.medication_category_frequency?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-indigo-800 mb-1.5 flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5" /> Medication categories used in similar cases
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.medication_category_frequency.map((m) => (
                      <span key={m.category} className="text-xs bg-white border border-indigo-200 text-indigo-700 rounded-full px-2.5 py-1">
                        {m.category.replace(/_/g, ' ')} · {m.percent}%
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.ai_summary && (
                <p className="text-sm text-indigo-900 bg-white/70 rounded-lg border border-indigo-200 px-3 py-2">
                  {result.ai_summary}
                </p>
              )}

              <p className="text-[11px] text-indigo-500">
                Matched on: {result.matched_on?.procedure_category} · {(result.matched_on?.condition_bucket_tags || []).join(', ')}
              </p>
            </>
          )}

          <div className="bg-amber-50 border border-amber-300 rounded-lg px-3 py-2.5 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-amber-800 leading-relaxed">{result.caveat}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
