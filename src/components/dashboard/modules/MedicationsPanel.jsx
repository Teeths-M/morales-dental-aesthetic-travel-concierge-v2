import React, { useEffect, useState, useCallback } from 'react';
import { Pill, ShieldAlert, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

// Reads live Medication rows created by reportMedication / the Care Room's
// doctor-instruction linking / intake seeding — RLS already scopes read to
// patient-or-doctor-or-admin, matching VaultDocumentsPanel.jsx's own
// established direct-filter pattern. Tap-to-confirm calls confirmMedication
// directly (same pattern DocumentScannerCard.jsx uses for scanVaultDocument).

const SOURCE_LABELS = {
  patient: 'You reported this',
  doctor: 'From your doctor',
  document: 'From a scanned document',
  prescription: 'From a scanned prescription',
  hospital: 'From a hospital record',
  system_observation: 'System-detected',
};

const CURRENT_STATUSES = new Set(['active', 'planned']);
const PAST_STATUSES = new Set(['completed', 'discontinued', 'stopped']);

function MedicationRow({ med, onConfirm, confirming }) {
  const needsPatientConfirm = !med.patient_confirmed && med.status !== 'discontinued';
  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
          <Pill className="w-5 h-5 text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">{med.normalized_name}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {[med.strength, med.dosage, med.frequency].filter(Boolean).join(' · ') || 'Details pending'}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[11px] text-slate-400">{SOURCE_LABELS[med.source_type] || med.source_type}</span>
            {med.status === 'requires_review' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-amber-50 border-amber-200 text-amber-700">
                <ShieldAlert className="w-3 h-3" /> Doctor review needed
              </span>
            )}
            {med.doctor_confirmed && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-700">
                <CheckCircle2 className="w-3 h-3" /> Doctor confirmed
              </span>
            )}
          </div>
        </div>
        {needsPatientConfirm && (
          <button
            onClick={() => onConfirm(med.id)}
            disabled={confirming === med.id}
            className="flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {confirming === med.id ? '...' : 'Confirm'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function MedicationsPanel() {
  const { user } = useAuth();
  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(null);

  const fetchMeds = useCallback(async () => {
    if (!user?.email) { setLoading(false); return; }
    setLoading(true);
    try {
      const rows = await base44.entities.Medication.filter({ patient_email: user.email }, '-created_date', 100);
      setMeds(rows || []);
    } catch (_) {
      setMeds([]);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => { fetchMeds(); }, [fetchMeds]);

  const handleConfirm = async (medicationId) => {
    setConfirming(medicationId);
    try {
      await base44.functions.invoke('confirmMedication', { medication_id: medicationId, action: 'patient_confirm' });
      await fetchMeds();
    } catch (_) {
      // silent — the row's confirm button simply stays available to retry
    } finally {
      setConfirming(null);
    }
  };

  const current = meds.filter((m) => CURRENT_STATUSES.has(m.status));
  const flagged = meds.filter((m) => m.status === 'requires_review');
  const past = meds.filter((m) => PAST_STATUSES.has(m.status));
  const other = meds.filter((m) => !CURRENT_STATUSES.has(m.status) && m.status !== 'requires_review' && !PAST_STATUSES.has(m.status));

  if (loading) {
    return <div className="text-center py-6 text-slate-400 text-sm">Loading your medications...</div>;
  }

  if (meds.length === 0) {
    return null; // nothing to show until a real medication exists — no placeholder rows
  }

  return (
    <div className="space-y-6 mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Medications</h2>
          <p className="text-xs text-slate-400 mt-0.5">Tell M-Care about anything you're taking — it'll ask you to confirm before it's added here.</p>
        </div>
        <button
          onClick={fetchMeds}
          className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {flagged.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Needs doctor review</p>
          {flagged.map((m) => <MedicationRow key={m.id} med={m} onConfirm={handleConfirm} confirming={confirming} />)}
        </div>
      )}

      {(current.length > 0 || other.length > 0) && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Current</p>
          {[...current, ...other].map((m) => <MedicationRow key={m.id} med={m} onConfirm={handleConfirm} confirming={confirming} />)}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Past
          </p>
          {past.map((m) => <MedicationRow key={m.id} med={m} onConfirm={handleConfirm} confirming={confirming} />)}
        </div>
      )}
    </div>
  );
}
