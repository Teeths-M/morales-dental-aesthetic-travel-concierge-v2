import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle, Shield, Lock } from 'lucide-react';
import { MedicalSlideshowBackground } from '@/components/booking/MedicalSlideshow';
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

const SLIDE_FACTS = [
  'Every great transformation starts with a single step.',
  'We coordinate every detail of your medical journey.',
  'Personalized care that honours your values and traditions.',
  'Every detail you share helps our doctors prepare the safest plan.',
  'Our anesthesiologists review every patient profile personally.',
  'We cross-check all medications for potential interactions.',
  'Honest answers lead to better outcomes and faster healing.',
  'Emotional wellbeing is a core part of surgical success.',
  "We take a holistic approach to women's care and safety.",
  'Your documents are encrypted and HIPAA-compliant at all times.',
  'Our surgeons are internationally trained with thousands of successful procedures.',
  'Your commitment to your health is an act of courage.',
];

const steps = [
   { label: 'Personal Info',    emoji: '👤', short: 'Personal'  },
   { label: 'Travel',           emoji: '✈️', short: 'Travel'    },
   { label: 'Cultural',         emoji: '🕌', short: 'Cultural'  },
   { label: 'Medical History',  emoji: '🩺', short: 'Medical'   },
   { label: 'Anesthesia',       emoji: '💉', short: 'Anesthesia'},
   { label: 'Medications',      emoji: '💊', short: 'Meds'      },
   { label: 'Lifestyle',        emoji: '🚬', short: 'Lifestyle' },
   { label: 'Emotional',        emoji: '🧠', short: 'Emotional' },
   { label: 'Pregnancy',        emoji: '🤰', short: 'Health'    },
   { label: 'Documents',        emoji: '📎', short: 'Docs'      },
   { label: 'Procedure & Date', emoji: '🏥', short: 'Procedure' },
];

export default function Booking() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [consultationId, setConsultationId] = useState(null);
  const { items, clearCart } = useCart();

  const [form, setForm] = useState({
    patient_name: '', email: '', phone: '', age: '', gender: '', height: '', weight: '',
    nationality: '', occupation: '', emergency_contact_name: '', emergency_contact_number: '',
    has_companion: null, companion_relationship: '', travel_buddy_services: [],
    has_cultural_preferences: null, cultural_preferences: [], cultural_notes: '',
    medical_conditions: [], medical_conditions_other: '',
    had_surgery: null, previous_procedures: '', last_surgery_date: '', had_complications: null,
    surgery_complications: [], anesthesia_complications: null, anesthesia_complication_types: [],
    allergies: [], allergy_details: '', takes_medications: null, medication_types: [],
    medication_notes: '', lifestyle_habits: [], exercises_regularly: null, activity_level: '',
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
    onSuccess: () => {
      clearCart();
      setSubmitted(true);
    },
  });

  const canNext = () => {
     if (step === 0) return form.patient_name && form.email && form.phone && form.emergency_contact_name && form.emergency_contact_number;
     if (step === 10) return items.length > 0 && form.preferred_date;
     return true;
   };

  const handleConfirmSubmit = () => {
    createMutation.mutate(form);
    setShowPreview(false);
  };

  if (submitted) return <SubmissionSuccess form={form} items={items} />;

  const progressPct = Math.round((step / (steps.length - 1)) * 100);

  return (
    <div className="min-h-screen bg-transparent">
      <MedicalSlideshowBackground step={step} />
      {/* Premium Header — full glass over the background */}
      <div className="bg-black/10 backdrop-blur-md border-b border-white/5 sticky top-16 lg:top-20 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest mb-0.5">Medical Consultation</p>
              <h1 className="font-display text-lg lg:text-xl text-white leading-tight drop-shadow-lg">{steps[step].label}</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5">
                <Shield className="w-3 h-3 text-emerald-300" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wide">SAFE-T 4LIFE™</span>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-white">{step + 1} <span className="text-white/60 font-normal">of {steps.length}</span></p>
                <p className="text-[10px] text-emerald-300">{progressPct}% complete</p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>

          {/* Step pills — scrollable */}
          <div className="flex gap-1 mt-3 overflow-x-auto pb-0.5 scrollbar-hide">
            {steps.map((s, i) => (
              <div
                key={i}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap flex-shrink-0 transition-all ${
                  i < step
                    ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30'
                    : i === step
                    ? 'bg-white/25 text-white border border-white/30 shadow-sm'
                    : 'bg-white/5 text-white/30 border border-white/10'
                }`}
              >
                <span>{i < step ? '✓' : s.emoji}</span>
                <span className="hidden sm:inline">{s.short}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content Layout - Form Left, Sidebar Right */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Form Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Form Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center flex-shrink-0 text-lg shadow-lg">
              {steps[step].emoji}
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Step {step + 1} of {steps.length}</p>
              <h2 className="font-bold text-slate-800 text-base">{steps[step].label}</h2>
            </div>
          </div>

          {/* Form content */}
          <div className="p-6 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
              >
                {step === 0  && <Section1PersonalInfo form={form} update={update} />}
                 {step === 1  && <Section2Travel form={form} update={update} />}
                 {step === 2  && <Section3Cultural form={form} update={update} />}
                 {step === 3  && <Section4MedicalHistory form={form} update={update} />}
                 {step === 4  && <Section5Anesthesia form={form} update={update} />}
                 {step === 5  && <Section6Medications form={form} update={update} />}
                 {step === 6  && <Section7Lifestyle form={form} update={update} />}
                 {step === 7  && <Section8Emotional form={form} update={update} />}
                 {step === 8  && <Section9Pregnancy form={form} update={update} />}
                 {step === 9  && <Section10Documents form={form} update={update} />}
                 {step === 10 && <SectionProcedure form={form} update={update} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
            <Button
              variant="outline"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className="gap-2 text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>

            {step < steps.length - 1 ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext()}
                className="gap-2 text-sm bg-gradient-to-r from-emerald-700 to-blue-800 hover:opacity-90 text-white border-0"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() => setShowPreview(true)}
                disabled={createMutation.isPending || !canNext()}
                className="gap-2 text-sm bg-gradient-to-r from-emerald-700 to-blue-800 hover:opacity-90 text-white border-0"
              >
                <CheckCircle className="w-4 h-4" /> Review & Submit
              </Button>
            )}
          </div>
          </div>
          </div>

          {/* Right Sidebar - Step Info + Cart */}
          <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-24 lg:h-fit">
          {/* Step Info Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-2xl p-3 sticky top-16">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center flex-shrink-0 text-sm shadow-lg">
              {steps[step].emoji}
            </div>
            <div>
              <p className="text-[9px] font-bold text-emerald-300 uppercase tracking-widest">Step {step + 1}</p>
              <h3 className="font-bold text-white text-xs drop-shadow">{steps[step].label}</h3>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div>
              <p className="text-[9px] font-bold text-emerald-300 uppercase tracking-widest mb-1">Progress</p>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-400 to-blue-400"
                  initial={{ width: '0%' }}
                  animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
              <p className="text-emerald-300 text-[8px] mt-1 font-medium">{Math.round(((step + 1) / steps.length) * 100)}%</p>
            </div>

            {/* Step pills */}
            <div className="flex flex-wrap gap-0.5">
              {steps.map((s, i) => (
                <div
                  key={i}
                  className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap transition-all ${
                    i < step
                      ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30'
                      : i === step
                      ? 'bg-white/25 text-white border border-white/30'
                      : 'bg-white/5 text-white/30 border border-white/10'
                  }`}
                >
                  {i < step ? '✓' : i === step ? '●' : i + 1}
                </div>
              ))}
            </div>
          </div>
          </div>

          {/* Selected Procedures Card */}
          <div>
          <ConsultationMedicalCart />
          </div>
          </div>
          </div>
          </div>

      <PreviewSummary
        isOpen={showPreview}
        form={form}
        onEdit={() => setShowPreview(false)}
        onSubmit={handleConfirmSubmit}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
}