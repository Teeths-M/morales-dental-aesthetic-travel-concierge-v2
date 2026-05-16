import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Shield, CheckCircle2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import PreviewSummary from '@/components/booking/PreviewSummary';
import ConsultationMedicalCart from '@/components/cart/ConsultationMedicalCart';
import SubmissionSuccess from '@/components/booking/SubmissionSuccess';

import Section1PersonalInfo from '../components/booking/Section1PersonalInfo';
import Section2Travel from '../components/booking/Section2Travel';
import Section3Cultural from '../components/booking/Section3Cultural';
import Section4MedicalHistory from '../components/booking/Section4MedicalHistory';
import Section5Anesthesia from '../components/booking/Section5Anesthesia';
import Section6Medications from '../components/booking/Section6Medications';
import Section7Lifestyle from '../components/booking/Section7Lifestyle';
import Section8Emotional from '../components/booking/Section8Emotional';
import Section9Pregnancy from '../components/booking/Section9Pregnancy';
import Section10Documents from '../components/booking/Section10Documents';
import SectionProcedure from '../components/booking/SectionProcedure';
import ClientAcknowledgement from '../components/booking/ClientAcknowledgement';

const steps = [
  { label: 'Personal', emoji: '👤', desc: 'Your identity & emergency contact' },
  { label: 'Travel', emoji: '✈️', desc: 'Journey & companion details' },
  { label: 'Cultural', emoji: '🕌', desc: 'Preferences & accommodations' },
  { label: 'Medical', emoji: '🩺', desc: 'History & previous procedures' },
  { label: 'Anesthesia', emoji: '💉', desc: 'Reactions & tolerance' },
  { label: 'Medications', emoji: '💊', desc: 'Current drugs & allergies' },
  { label: 'Lifestyle', emoji: '🏃', desc: 'Habits & activity level' },
  { label: 'Emotional', emoji: '🧠', desc: 'Mental wellness & readiness' },
  { label: 'Women\'s Health', emoji: '🌸', desc: 'Reproductive health status' },
  { label: 'Documents', emoji: '📎', desc: 'Upload & attach files' },
  { label: 'Procedure', emoji: '🏥', desc: 'Select date & treatments' },
  { label: 'Confirm', emoji: '📋', desc: 'Review & acknowledge' },
];

export default function Booking() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [acknowledged, setAcknowledged] = useState(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const { items, clearCart } = useCart();

  const [form, setForm] = useState({
    patient_name: '', email: '', phone: '', age: '', gender: '',
    height: '', weight: '', nationality: '', occupation: '',
    emergency_contact_name: '', emergency_contact_number: '',
    has_companion: null, companion_relationship: '', travel_buddy_services: [],
    has_cultural_preferences: null, cultural_preferences: [], cultural_notes: '',
    medical_conditions: [], medical_conditions_other: '',
    had_surgery: null, previous_procedures: '', last_surgery_date: '',
    had_complications: null, surgery_complications: [],
    anesthesia_complications: null, anesthesia_complication_types: [],
    allergies: [], allergy_details: '',
    takes_medications: null, medication_types: [], medication_notes: '',
    lifestyle_habits: [], exercises_regularly: null, activity_level: '',
    emotional_concerns: null, emotional_concern_types: [], emotional_notes: '',
    pregnancy_status: '', document_types: [], uploaded_files: [],
    procedure_interest: '', preferred_date: '', notes: '',
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const createMutation = useMutation({
    mutationFn: (data) => {
      const procedureNames = items.map(item => item.name).join(', ') || 'other';
      return base44.entities.Consultation.create({ ...data, procedure_interest: procedureNames });
    },
    onSuccess: () => { clearCart(); setSubmitted(true); },
  });

  const canNext = () => {
    if (step === 0) return form.patient_name && form.email;
    if (step === 10) return form.preferred_date && items.length > 0;
    if (step === 11) return acknowledged.size === 4;
    return true;
  };

  if (submitted) return <SubmissionSuccess form={form} items={items} />;

  const progressPct = Math.round((step / (steps.length - 1)) * 100);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Premium Top Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-blue-900 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-lg font-bold">Medical Consultation Intake</h1>
                <span className="text-[10px] font-bold bg-white/15 border border-white/20 px-2 py-0.5 rounded-full uppercase tracking-widest hidden sm:inline">
                  SAFE-T 4LIFE™ Protected
                </span>
              </div>
              <p className="text-white/60 text-xs mt-0.5">Morales Dental & Aesthetic Travel Concierge · Confidential & Secure</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xl font-bold">{step + 1}<span className="text-white/40 text-sm font-normal">/{steps.length}</span></p>
              <p className="text-white/50 text-[10px] uppercase tracking-wide">Step</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="h-1 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white/80 rounded-full"
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-white/40 text-[10px]">{steps[step].desc}</span>
              <span className="text-white/40 text-[10px]">{progressPct}% complete</span>
            </div>
          </div>
        </div>
      </div>

      {/* Step Pills - scrollable */}
      <div className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 overflow-x-auto">
          <div className="flex gap-1.5 min-w-max">
            {steps.map((s, i) => (
              <div
                key={i}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex-shrink-0 ${
                  i < step
                    ? 'bg-emerald-100 text-emerald-700'
                    : i === step
                    ? 'bg-gradient-to-r from-emerald-700 to-blue-800 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {i < step
                  ? <CheckCircle2 className="w-3 h-3" />
                  : <span className="text-[10px]">{s.emoji}</span>
                }
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">

        {/* Procedure Cart */}
        <ConsultationMedicalCart />

        {/* Step Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Step Header */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-700 to-blue-800 flex items-center justify-center text-lg flex-shrink-0">
              {steps[step].emoji}
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-base">{steps[step].label}</h2>
              <p className="text-xs text-slate-400">{steps[step].desc}</p>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
              >
                {step === 0 && <Section1PersonalInfo form={form} update={update} />}
                {step === 1 && <Section2Travel form={form} update={update} />}
                {step === 2 && <Section3Cultural form={form} update={update} />}
                {step === 3 && <Section4MedicalHistory form={form} update={update} />}
                {step === 4 && <Section5Anesthesia form={form} update={update} />}
                {step === 5 && <Section6Medications form={form} update={update} />}
                {step === 6 && <Section7Lifestyle form={form} update={update} />}
                {step === 7 && <Section8Emotional form={form} update={update} />}
                {step === 8 && <Section9Pregnancy form={form} update={update} />}
                {step === 9 && <Section10Documents form={form} update={update} />}
                {step === 10 && <SectionProcedure form={form} update={update} />}
                {step === 11 && <ClientAcknowledgement acknowledged={acknowledged} onChange={setAcknowledged} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className="flex items-center gap-2 text-slate-600 border-slate-200 hover:bg-slate-100"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>

            <div className="flex-1 text-center hidden sm:block">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                Step {step + 1} of {steps.length} · {steps[step].label}
              </p>
            </div>

            {step < steps.length - 1 ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext()}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-700 to-blue-800 hover:opacity-90 text-white font-bold shadow-sm disabled:opacity-40"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() => setShowPreview(true)}
                disabled={createMutation.isPending || !canNext()}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-700 to-blue-800 hover:opacity-90 text-white font-bold shadow-sm"
              >
                <Shield className="w-4 h-4" />
                Review & Submit
              </Button>
            )}
          </div>
        </div>

        {/* Security Notice */}
        <div className="flex items-center justify-center gap-2 pb-6">
          <Shield className="w-3.5 h-3.5 text-slate-300" />
          <p className="text-xs text-slate-400 text-center">
            Your information is encrypted, confidential, and reviewed only by your assigned medical team.
            <span className="font-semibold text-slate-500"> SAFE-T 4LIFE™ Protected.</span>
          </p>
        </div>
      </div>

      {/* Preview Summary Modal */}
      <PreviewSummary
        isOpen={showPreview}
        form={form}
        onEdit={() => setShowPreview(false)}
        onSubmit={() => { createMutation.mutate(form); setShowPreview(false); }}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
}