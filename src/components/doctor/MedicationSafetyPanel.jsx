import React, { useEffect, useState, useCallback } from 'react';
import { Pill, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Doctor-facing medication review — mounted in DoctorDashboard.jsx alongside
// the 3-Way Care Gate, same doctor_confirmation_status === 'CONFIRMED' gate.
// Every action (Confirm/Reject/Discontinue/Request Info) is doctor-only,
// enforced server-side by confirmMedication itself — this panel is just the
// UI, it never writes the entity directly.

function ActionButton({ label, onClick, disabled, tone = 'default' }) {
  const tones = {
    default: 'bg-slate-800 text-white hover:bg-slate-700',
    danger: 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 ${tones[tone]}`}
    >
      {label}
    </button>
  );
}

export default function MedicationSafetyPanel({ caseRecord }) {
  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [noteFor, setNoteFor] = useState(null);
  const [noteText, setNoteText] = useState('');

  const fetchMeds = useCallback(async () => {
    if (!caseRecord?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const rows = await base44.entities.Medication.filter({ case_id: caseRecord.id }, '-created_date', 100);
      setMeds(rows || []);
    } catch (_) {
      setMeds([]);
    } finally {
      setLoading(false);
    }
  }, [caseRecord?.id]);

  useEffect(() => { fetchMeds(); }, [fetchMeds]);

  const runAction = async (medicationId, action, note) => {
    setBusy(medicationId + action);
    try {
      await base44.functions.invoke('confirmMedication', { medication_id: medicationId, action, note });
      await fetchMeds();
      setNoteFor(null);
      setNoteText('');
    } catch (_) {
      // silent — row stays as-is, doctor can retry
    } finally {
      setBusy(null);
    }
  };

  if (loading || meds.length === 0) return null; // nothing to show until a real medication exists

  return (
    <div className="mt-3 bg-slate-50 border border-slate-100 rounded-2xl p-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <Pill className="w-3.5 h-3.5" /> Medication Safety
      </p>
      <div className="space-y-3">
        {meds.map((m) => (
          <div key={m.id} className="bg-white border border-slate-100 rounded-xl p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{m.normalized_name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {[m.strength, m.dosage, m.frequency].filter(Boolean).join(' · ') || 'Details pending'}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-400">Source: {m.source_type}</span>
                  {m.status === 'requires_review' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-amber-50 border-amber-200 text-amber-700">
                      <ShieldAlert className="w-3 h-3" /> {(m.flags || []).join(', ') || 'Flagged'}
                    </span>
                  )}
                  {m.doctor_confirmed && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-700">
                      <CheckCircle2 className="w-3 h-3" /> Confirmed
                    </span>
                  )}
                  {!m.patient_confirmed && (
                    <span className="text-[11px] text-slate-400">Patient hasn't confirmed yet</span>
                  )}
                </div>
              </div>
            </div>

            {m.status !== 'discontinued' && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {!m.doctor_confirmed && (
                  <ActionButton
                    label={busy === m.id + 'doctor_confirm' ? '...' : 'Confirm'}
                    disabled={!!busy}
                    onClick={() => runAction(m.id, 'doctor_confirm')}
                  />
                )}
                <ActionButton
                  label="Request info"
                  disabled={!!busy}
                  onClick={() => setNoteFor(noteFor === m.id ? null : m.id)}
                />
                <ActionButton
                  label="Discontinue"
                  tone="danger"
                  disabled={!!busy}
                  onClick={() => setNoteFor(noteFor === `${m.id}-discontinue` ? null : `${m.id}-discontinue`)}
                />
              </div>
            )}

            {noteFor === m.id && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="What do you need to know?"
                  className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5"
                />
                <ActionButton
                  label="Send"
                  disabled={!noteText.trim() || !!busy}
                  onClick={() => runAction(m.id, 'request_info', noteText.trim())}
                />
              </div>
            )}

            {noteFor === `${m.id}-discontinue` && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Why is this being discontinued?"
                  className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5"
                />
                <ActionButton
                  label="Confirm"
                  tone="danger"
                  disabled={!noteText.trim() || !!busy}
                  onClick={() => runAction(m.id, 'discontinue', noteText.trim())}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
