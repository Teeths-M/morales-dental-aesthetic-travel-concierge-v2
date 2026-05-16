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
import ClientAcknowledgement from '../components/booking/ClientAcknowledgement';

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
  { label: 'Procedure',        emoji: '🏥', short: 'Procedure' },
  { label: 'Acknowledgement',  emoji: '📋', short: 'Confirm'   },
];

export default function Booking() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [acknowledged, setAcknowledged] = useState(new Set());
  const [showPreview, setShowPreview] = useState(false);
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
    if (step === 0) return form.patient_name && form.email;
    if (step === 10) return form.preferred_date && items.length > 0;
    if (step === 11) return acknowledged.size === 4;
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

      {/* Cinematic Headline + Cart + Step Indicator */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white/15 backdrop-blur-xl border border-white/25 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Headline Section */}
            <div className="text-center py-8 px-6 border-b border-white/20">
              <p className="text-5xl mb-3">{steps[step].emoji}</p>
              <h2 className="font-display text-3xl lg:text-4xl text-white drop-shadow-lg mb-2">{steps[step].label}</h2>
              <p className="text-white/80 text-sm max-w-md mx-auto font-medium">{SLIDE_FACTS[step]}</p>
            </div>

            {/* Cart + Step Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-5">
              {/* Selected Procedures (takes 2 cols) */}
              <div className="lg:col-span-2">
                <ConsultationMedicalCart />
              </div>

              {/* Step Progress Card */}
              <div className="bg-white/10 border border-white/20 rounded-2xl p-5 flex flex-col justify-center backdrop-blur">
                <p className="text-xs font-bold text-emerald-300 uppercase tracking-widest mb-1">Progress</p>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="font-display text-4xl text-white drop-shadow">{step + 1}</span>
                  <span className="text-white/70 text-sm">of {steps.length}</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-400 to-blue-400"
                    initial={{ width: '0%' }}
                    animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                <p className="text-emerald-300 text-xs mt-2 font-medium">{Math.round(((step + 1) / steps.length) * 100)}% complete</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-12">
       <div className="space-y-5">
       {/* Step Card */}
       <div className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-2xl shadow-xl overflow-hidden">
          {/* Step header bar */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center flex-shrink-0 text-lg shadow-lg">
            {steps[step].emoji}
          </div>
          <div>
            <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">Step {step + 1} of {steps.length}</p>
            <h2 className="font-bold text-white text-base drop-shadow">{steps[step].label}</h2>
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
                {step === 11 && <ClientAcknowledgement acknowledged={acknowledged} onChange={setAcknowledged} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-white/5">
            <Button
              variant="outline"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className="gap-2 text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>

            <div className="flex items-center gap-1">
              {steps.map((_, i) => (
                <div key={i} className={`rounded-full transition-all ${i === step ? 'w-4 h-1.5 bg-emerald-400' : i < step ? 'w-1.5 h-1.5 bg-emerald-300/60' : 'w-1.5 h-1.5 bg-white/20'}`} />
              ))}
            </div>

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

        {/* Trust bar */}
        <div className="flex flex-wrap items-center justify-center gap-4 py-2 px-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
          {[
            { icon: '🔒', text: 'Encrypted & Private' },
            { icon: '🩺', text: 'Doctor-Reviewed' },
            { icon: '🛡️', text: 'SAFE-T 4LIFE™ Protected' },
            { icon: '🌍', text: 'International Standards' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-1.5 text-[11px] text-white font-medium">
              <span>{icon}</span> {text}
            </div>
          ))}
        </div>

        </div>{/* end space-y-5 */}
      </div>{/* end content */}

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