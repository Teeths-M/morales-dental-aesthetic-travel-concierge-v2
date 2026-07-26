/**
 * Stage 10 & 11: Doctor Portal — Surgical Execution Controls
 * Shown only when a case is in a surgical stage.
 * - Stage 10: "Log Physical Intake Handshake" button
 * - Stage 11: "Procedure Complete / Move to 7-Day Recovery" button
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, AlertTriangle, CheckCircle2, Loader2,
  BellOff, Activity, ClipboardCheck, Plus, X, Pill
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { friendlyError, safeError } from '@/lib/friendlyError';
import MemoryBankAdvisoryPanel from '@/components/doctor/MemoryBankAdvisoryPanel';

const SURGICAL_STAGES = ['Procedure-In-Progress', 'SURGICAL_EXECUTION_WINDOW', 'Ready-For-Travel'];
const EMPTY_MED = { name: '', dose: '', frequency: '', duration: '', notes: '' };

export default function SurgicalExecutionControls({ caseData, token, onStatusChange }) {
  const [loadingHandshake, setLoadingHandshake] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const bookedProcedures = caseData?.procedures || [];
  const [confirmedSet, setConfirmedSet] = useState(() => new Set(bookedProcedures));
  const [extraProcedures, setExtraProcedures] = useState([]);
  const [extraProcedureInput, setExtraProcedureInput] = useState('');
  const [medications, setMedications] = useState([{ ...EMPTY_MED }]);

  const toggleBookedProcedure = (name) => {
    setConfirmedSet(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const addExtraProcedure = () => {
    const val = extraProcedureInput.trim();
    if (!val || extraProcedures.includes(val)) return;
    setExtraProcedures(prev => [...prev, val]);
    setExtraProcedureInput('');
  };

  const removeExtraProcedure = (val) => {
    setExtraProcedures(prev => prev.filter(p => p !== val));
  };

  const updateMedication = (idx, field, value) => {
    setMedications(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const addMedicationRow = () => setMedications(prev => [...prev, { ...EMPTY_MED }]);
  const removeMedicationRow = (idx) => setMedications(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

  const status = caseData?.status;
  const isBlackoutActive = caseData?.notification_blackout_active;
  const isInWindow = status === 'SURGICAL_EXECUTION_WINDOW';
  const canLogHandshake = SURGICAL_STAGES.includes(status) && !isInWindow;
  const canLogComplete = isInWindow;

  if (!canLogHandshake && !canLogComplete) return null;

  const handleIntakeHandshake = async () => {
    setLoadingHandshake(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('logPhysicalIntakeHandshake', {
        case_id: caseData.id,
        token: token || undefined
      });
      if (!res.data?.success) throw safeError(res.data?.error || 'Could not record that handshake.');
      setResult({ type: 'handshake', data: res.data });
      onStatusChange?.('SURGICAL_EXECUTION_WINDOW');
    } catch (err) {
      setError(friendlyError(err, 'That handshake was not recorded. Nothing changed — please try again.', 'SurgicalExecutionControls'));
    } finally {
      setLoadingHandshake(false);
    }
  };

  const handleProcedureComplete = async () => {
    setLoadingComplete(true);
    setError(null);
    try {
      const confirmedProcedures = [
        ...bookedProcedures.filter(p => confirmedSet.has(p)),
        ...extraProcedures,
      ];
      const cleanMedications = medications.filter(m => m.name.trim());

      const res = await base44.functions.invoke('logProcedureComplete', {
        case_id: caseData.id,
        token: token || undefined,
        outcome_notes: outcomeNotes,
        procedures_confirmed_by_doctor: confirmedProcedures,
        doctor_recommended_medications: cleanMedications,
      });
      if (!res.data?.success) throw safeError(res.data?.error || 'Could not record the procedure as complete.');
      setResult({ type: 'complete', data: res.data });
      onStatusChange?.('RECOVERY_PHASE_7_DAY');
    } catch (err) {
      setError(friendlyError(err, 'That was not recorded. Nothing changed — please try again.', 'SurgicalExecutionControls'));
    } finally {
      setLoadingComplete(false);
      setShowCompleteForm(false);
    }
  };

  if (result) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl border p-5 ${result.type === 'handshake' ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className={`w-6 h-6 mt-0.5 ${result.type === 'handshake' ? 'text-red-600' : 'text-emerald-600'}`} />
          <div>
            <p className={`font-semibold text-base ${result.type === 'handshake' ? 'text-red-800' : 'text-emerald-800'}`}>
              {result.type === 'handshake' ? 'Intake Handshake Logged — Blackout ACTIVE' : 'Procedure Complete — Blackout LIFTED'}
            </p>
            <p className="text-sm mt-1 text-slate-600">{result.data.message}</p>
            {result.data.suppressed_notifications_pending > 0 && (
              <p className="text-xs mt-2 text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                {result.data.suppressed_notifications_pending} suppressed notifications are pending in the audit log.
              </p>
            )}
            {result.type === 'complete' && result.data.procedure_match_status === 'mismatch_flagged' && (
              <div className="text-xs mt-2 text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{result.data.procedure_match_explanation || 'What was confirmed differs from what was booked — this has been flagged for review.'}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Blackout Status Banner */}
      <AnimatePresence>
        {isBlackoutActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 bg-red-50 border border-red-300 rounded-xl px-4 py-3"
          >
            <BellOff className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Notification Blackout ACTIVE</p>
              <p className="text-xs text-red-700 mt-0.5">
                All automated SMS, email, and platform alerts to Patient, Admin, and Doctor are suspended. Suppressed notifications are logged to the immutable audit trail.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stage 10: Intake Handshake */}
      {canLogHandshake && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <ClipboardCheck className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="font-semibold text-amber-900">Stage 10 — Clinical Intake Handshake</p>
              <p className="text-sm text-amber-800 mt-0.5">
                Log that the patient has been physically received at the clinic. This is a <strong>non-repudiable</strong> transaction that will transition the case into the Surgical Execution Window and activate the notification blackout protocol.
              </p>
            </div>
          </div>
          <div className="bg-white/70 rounded-lg border border-amber-200 px-3 py-2 mb-4 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              By clicking below you confirm the patient is physically present and consents to proceed. This action is logged with your credentials and cannot be undone.
            </p>
          </div>
          <Button
            onClick={handleIntakeHandshake}
            disabled={loadingHandshake}
            className="w-full bg-amber-700 hover:bg-amber-800 text-white gap-2 py-5 h-auto text-base font-semibold"
          >
            {loadingHandshake ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Logging…</>
            ) : (
              <><ShieldCheck className="w-5 h-5" /> Log Physical Intake Handshake</>
            )}
          </Button>
        </div>
      )}

      {/* Stage 11: Procedure Complete */}
      {canLogComplete && (
        <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50 p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Activity className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <p className="font-semibold text-emerald-900">Stage 11 — Log Procedure Complete</p>
              <p className="text-sm text-emerald-800 mt-0.5">
                When the procedure is finished, log completion here to move the patient to the 7-Day Recovery window and lift the notification blackout.
              </p>
            </div>
          </div>

          {!showCompleteForm ? (
            <Button
              onClick={() => setShowCompleteForm(true)}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white gap-2 py-5 h-auto text-base font-semibold"
            >
              <CheckCircle2 className="w-5 h-5" />
              Procedure Complete / Move to 7-Day Recovery
            </Button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* AI procedure-match verification: doctor confirms what was actually done */}
              {bookedProcedures.length > 0 && (
                <div>
                  <Label className="text-emerald-800 font-medium">Confirm Procedures Performed</Label>
                  <p className="text-xs text-emerald-700 mt-0.5 mb-2">
                    Uncheck anything not done, or add a procedure that isn't on the original booking. This is checked automatically against the booking — a difference is flagged for review, it never blocks recovery.
                  </p>
                  <div className="space-y-1.5">
                    {bookedProcedures.map(p => (
                      <label key={p} className="flex items-center gap-2 bg-white rounded-lg border border-emerald-200 px-3 py-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={confirmedSet.has(p)}
                          onChange={() => toggleBookedProcedure(p)}
                          className="rounded"
                        />
                        <span className="text-sm text-slate-700">{p}</span>
                      </label>
                    ))}
                  </div>
                  {extraProcedures.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {extraProcedures.map(p => (
                        <span key={p} className="text-xs bg-amber-100 border border-amber-300 text-amber-800 rounded-full pl-2.5 pr-1.5 py-1 flex items-center gap-1">
                          {p}
                          <button type="button" onClick={() => removeExtraProcedure(p)} className="hover:text-amber-900">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={extraProcedureInput}
                      onChange={(e) => setExtraProcedureInput(e.target.value)}
                      placeholder="Add a procedure performed that isn't listed above"
                      className="bg-white"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExtraProcedure(); } }}
                    />
                    <Button type="button" variant="outline" onClick={addExtraProcedure} className="gap-1 flex-shrink-0">
                      <Plus className="w-4 h-4" /> Add
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-emerald-800 font-medium">Outcome Notes (optional)</Label>
                <Textarea
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  placeholder="Brief clinical outcome notes, any complications, next steps for recovery team…"
                  className="mt-1.5 h-24 bg-white"
                />
              </div>

              {/* Doctor-entered recommended medications — replaces the standard default schedule when filled in */}
              <div>
                <Label className="text-emerald-800 font-medium flex items-center gap-1.5">
                  <Pill className="w-4 h-4" /> Recommended Medications (optional)
                </Label>
                <p className="text-xs text-emerald-700 mt-0.5 mb-2">
                  Leave blank to use the standard care protocol for this procedure type instead.
                </p>
                <div className="space-y-2">
                  {medications.map((med, idx) => (
                    <div key={idx} className="bg-white rounded-lg border border-emerald-200 p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={med.name} onChange={(e) => updateMedication(idx, 'name', e.target.value)} placeholder="Medication name" />
                        <Input value={med.dose} onChange={(e) => updateMedication(idx, 'dose', e.target.value)} placeholder="Dose (e.g. 500mg)" />
                        <Input value={med.frequency} onChange={(e) => updateMedication(idx, 'frequency', e.target.value)} placeholder="Frequency (e.g. 3x/day)" />
                        <Input value={med.duration} onChange={(e) => updateMedication(idx, 'duration', e.target.value)} placeholder="Duration (e.g. 7 days)" />
                      </div>
                      <div className="flex gap-2">
                        <Input value={med.notes} onChange={(e) => updateMedication(idx, 'notes', e.target.value)} placeholder="Notes for the patient (optional)" className="flex-1" />
                        {medications.length > 1 && (
                          <Button type="button" variant="outline" size="icon" onClick={() => removeMedicationRow(idx)} className="flex-shrink-0">
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" onClick={addMedicationRow} className="gap-1 mt-2">
                  <Plus className="w-4 h-4" /> Add another medication
                </Button>
              </div>

              <MemoryBankAdvisoryPanel caseId={caseData?.id} token={token} />

              <div className="flex gap-3">
                <Button
                  onClick={handleProcedureComplete}
                  disabled={loadingComplete}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white gap-2"
                >
                  {loadingComplete ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Logging…</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> Confirm & Submit</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCompleteForm(false)}
                  disabled={loadingComplete}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}