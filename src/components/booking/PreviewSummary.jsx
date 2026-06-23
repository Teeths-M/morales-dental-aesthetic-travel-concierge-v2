import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Shield, User, Plane, Stethoscope, Pill, Activity, Heart, Baby, FileText, ClipboardCheck, Globe, HeartHandshake } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeTScan from './SafeTScan';

function SummarySection({ icon: Icon, title, color = 'text-slate-500', children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-sm font-semibold text-slate-700">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className="px-4 py-3 space-y-2 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  if (!value || value === '' || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-1 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-500 flex-shrink-0 w-40">{label}</span>
      <span className="text-xs font-semibold text-slate-800 text-right">
        {Array.isArray(value) ? value.join(', ') : String(value)}
      </span>
    </div>
  );
}

function bool(v) {
  if (v === true || v === 'yes') return 'Yes';
  if (v === false || v === 'no') return 'No';
  return v || '—';
}

export default function PreviewSummary({ isOpen, form, onEdit, onSubmit, isSubmitting }) {
  const { items } = useCart();
  const [scanDone, setScanDone] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const procedureNames = items.map(i => i.name).join(', ') || form.procedure_interest || '—';
  const bmi = form.height && form.weight
    ? (form.weight / ((form.height / 100) ** 2)).toFixed(1)
    : null;

  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-blue-900 px-6 py-5 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-base">Complete Consultation Summary</h2>
              <p className="text-white/60 text-xs">SAFE-T 4LIFE™ · Medical Review Preparation</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-3">

          {/* SAFE-T Scan */}
          <SafeTScan form={form} items={items} onScanComplete={(result) => { setScanDone(true); setScanResult(result); }} />

          {/* SECTION 1 — Personal */}
          <SummarySection icon={User} title="Personal Information" color="text-blue-600" defaultOpen={true}>
            <Row label="Full Name" value={form.patient_name} />
            <Row label="Age" value={form.age} />
            <Row label="Gender" value={form.gender} />
            <Row label="Nationality" value={form.nationality} />
            <Row label="Height" value={form.height ? `${form.height} cm` : null} />
            <Row label="Weight" value={form.weight ? `${form.weight} kg` : null} />
            {bmi && <Row label="BMI (calculated)" value={bmi} />}
            <Row label="Occupation" value={form.occupation} />
            <Row label="Emergency Contact" value={form.emergency_contact_name} />
            <Row label="Emergency Phone" value={form.emergency_contact_number} />
          </SummarySection>

          {/* SECTION 2 — Procedure */}
          <SummarySection icon={Stethoscope} title="Procedure & Travel" color="text-emerald-600" defaultOpen={true}>
            <Row label="Procedure(s) of Interest" value={procedureNames} />
            <Row label="Preferred Date" value={form.preferred_date ? new Date(form.preferred_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null} />
            <Row label="Notes / Goals" value={form.notes} />
          </SummarySection>

          {/* SECTION 3 — Medical History */}
          <SummarySection icon={Stethoscope} title="Medical History" color="text-red-500">
            <Row label="Medical Conditions" value={form.medical_conditions?.length ? form.medical_conditions : 'None reported'} />
            <Row label="Other Conditions" value={form.medical_conditions_other} />
            <Row label="Previous Surgery" value={bool(form.had_surgery)} />
            <Row label="Previous Procedures" value={form.previous_procedures} />
            <Row label="Last Surgery Date" value={form.last_surgery_date} />
            <Row label="Had Complications" value={bool(form.had_complications)} />
            <Row label="Complication Details" value={form.surgery_complications} />
          </SummarySection>

          {/* SECTION 4 — Anesthesia + Allergies + Medications */}
          <SummarySection icon={Pill} title="Anesthesia, Allergies & Medications" color="text-orange-500">
            <Row label="Anesthesia Complications" value={bool(form.anesthesia_complications)} />
            <Row label="Complication Types" value={form.anesthesia_complication_types} />
            <Row label="Allergies" value={form.allergies?.length ? form.allergies : 'None reported'} />
            <Row label="Allergy Details" value={form.allergy_details} />
            <Row label="Takes Medications" value={bool(form.takes_medications)} />
            <Row label="Medication Types" value={form.medication_types} />
            <Row label="Medication Notes" value={form.medication_notes} />
          </SummarySection>

          {/* SECTION 5 — Lifestyle */}
          <SummarySection icon={Activity} title="Lifestyle Assessment" color="text-violet-500">
            <Row label="Lifestyle Habits" value={form.lifestyle_habits?.length ? form.lifestyle_habits : 'None reported'} />
            <Row label="Exercises Regularly" value={bool(form.exercises_regularly)} />
            <Row label="Activity Level" value={form.activity_level} />
          </SummarySection>

          {/* SECTION 6 — Emotional */}
          <SummarySection icon={Heart} title="Mental & Emotional Wellness" color="text-pink-500">
            <Row label="Emotional Concerns" value={bool(form.emotional_concerns)} />
            <Row label="Concern Types" value={form.emotional_concern_types} />
            <Row label="Emotional Notes" value={form.emotional_notes} />
          </SummarySection>

          {/* SECTION 7 — Pregnancy */}
          <SummarySection icon={Baby} title="Women's Health" color="text-rose-400">
            <Row label="Pregnancy Status" value={form.pregnancy_status || 'Not provided'} />
          </SummarySection>

          {/* SECTION 8 — Travel & Support */}
          <SummarySection icon={HeartHandshake} title="Travel & Recovery Support" color="text-teal-500">
            <Row label="Has Companion" value={bool(form.has_companion)} />
            <Row label="Companion Relationship" value={form.companion_relationship} />
            <Row label="Travel Support Services" value={form.travel_buddy_services} />
          </SummarySection>

          {/* SECTION 9 — Cultural */}
          <SummarySection icon={Globe} title="Cultural & Religious Preferences" color="text-amber-500">
            <Row label="Has Cultural Preferences" value={bool(form.has_cultural_preferences)} />
            <Row label="Preferences" value={form.cultural_preferences} />
            <Row label="Cultural Notes" value={form.cultural_notes} />
          </SummarySection>

          {/* SECTION 10 — Documents */}
          <SummarySection icon={FileText} title="Documentation Status" color="text-slate-500">
            <Row label="Documents Provided" value={form.document_types?.length ? form.document_types : 'None uploaded'} />
            <Row label="Uploaded Files" value={form.uploaded_files?.length ? `${form.uploaded_files.length} file(s) attached` : 'No files uploaded'} />
            {(!form.document_types || form.document_types.length === 0) && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-700">No medical documents uploaded. Your coordinator may request lab work or imaging after review.</p>
              </div>
            )}
          </SummarySection>

          {/* SECTION 11 — Review Readiness */}
          <SummarySection icon={ClipboardCheck} title="Doctor Review Readiness" color="text-emerald-600" defaultOpen={true}>
            {(() => {
              const checks = [
                { label: 'Personal information complete', done: !!(form.patient_name && form.email && form.age && form.gender) },
                { label: 'Medical history provided', done: !!(form.medical_conditions !== undefined) },
                { label: 'Medications disclosed', done: form.takes_medications !== null },
                { label: 'Allergies disclosed', done: !!(form.allergies) },
                { label: 'Procedure(s) selected', done: items.length > 0 },
                { label: 'Emergency contact provided', done: !!(form.emergency_contact_name && form.emergency_contact_number) },
                { label: 'Preferred date selected', done: !!form.preferred_date },
                { label: 'Acknowledgement completed', done: true },
              ];
              const done = checks.filter(c => c.done).length;
              const pct = Math.round((done / checks.length) * 100);
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-600">Completion</span>
                    <span className={`text-xs font-semibold ${pct >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : 'bg-amber-400'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                  <div className="space-y-1 mt-2">
                    {checks.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 ${c.done ? 'text-emerald-500' : 'text-slate-300'}`} />
                        <span className={`text-xs ${c.done ? 'text-slate-600' : 'text-slate-400'}`}>{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </SummarySection>

          {/* Disclaimer */}
          <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
            <Shield className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-slate-500 leading-relaxed">
              <strong>SAFE-T 4LIFE™</strong> is an educational and coordination support system only and does not replace medical advice, diagnosis, or treatment from licensed healthcare professionals. All information is reviewed by our qualified medical team.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-3 px-5 py-4 border-t border-slate-100 bg-white sticky bottom-0">
          <Button variant="outline" onClick={onEdit} disabled={isSubmitting} className="text-sm">
            ← Edit
          </Button>
          <Button
            className="bg-gradient-to-r from-emerald-700 to-blue-800 hover:opacity-90 text-white font-semibold text-sm px-6"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />Submitting...</>
            ) : (
              '✓ Confirm & Submit to Doctor'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}