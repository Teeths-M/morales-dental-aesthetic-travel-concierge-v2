import React from 'react';
import { Pill, ClipboardList, CheckCircle2, AlertTriangle } from 'lucide-react';

/**
 * PostProcedureCarePanel — patient-facing, read-only. Renders the medication
 * schedule and outcome notes already written by schedulePostOpMedReminders /
 * sendPostOpInstructions onto the patient's own CaseRecord. Mirrors
 * RecoveryGuidancePanel's render-only-if-present pattern.
 *
 * Deliberately does NOT render anything memory-bank-derived (no aggregate
 * stats, no "similar patients" data) — that stays doctor-only, surfaced
 * through MemoryBankAdvisoryPanel in the doctor portal, never here.
 */
export default function PostProcedureCarePanel({ caseRecord }) {
  const schedule = caseRecord?.medication_schedule;
  if (!Array.isArray(schedule) || schedule.length === 0) return null;

  const doctorEntered = caseRecord.medication_source === 'doctor_entered';

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
          <Pill className="w-5 h-5 text-emerald-700" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Your Post-Procedure Medication Schedule</h3>
          <p className="text-xs text-slate-400">
            {doctorEntered ? 'Prescribed by your doctor' : 'Standard care protocol for your procedure'}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {schedule.map((med, i) => (
          <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">{med.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {[med.dose, med.frequency, med.duration].filter(Boolean).join(' · ')}
            </p>
            {med.notes && <p className="text-xs text-slate-400 mt-1">{med.notes}</p>}
          </div>
        ))}
      </div>

      {caseRecord.procedure_outcome_notes && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-1.5">
            <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-xs font-semibold text-slate-600">Notes from your doctor</p>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap">{caseRecord.procedure_outcome_notes}</p>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-start gap-2">
        {caseRecord.procedure_match_status === 'mismatch_flagged' ? (
          <>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-600 leading-relaxed">
              Your care team is reviewing a note on your procedure record — this doesn't change the care shown above.
            </p>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              This schedule is provided by your care team. Contact M immediately with any questions or new symptoms.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
