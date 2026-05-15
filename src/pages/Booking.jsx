import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import PreviewSummary from '@/components/booking/PreviewSummary';
import ConsultationMedicalCart from '@/components/cart/ConsultationMedicalCart';

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
  { label: 'Personal Info', emoji: '👤' },
  { label: 'Travel', emoji: '✈️' },
  { label: 'Cultural', emoji: '🕌' },
  { label: 'Medical History', emoji: '🩺' },
  { label: 'Anesthesia', emoji: '💉' },
  { label: 'Medications', emoji: '💊' },
  { label: 'Lifestyle', emoji: '🚬' },
  { label: 'Emotional', emoji: '🧠' },
  { label: 'Pregnancy', emoji: '🤰' },
  { label: 'Documents', emoji: '📎' },
  { label: 'Procedure', emoji: '🏥' },
  { label: 'Acknowledgement', emoji: '📋' },
];

export default function Booking() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [acknowledged, setAcknowledged] = useState(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const { items, clearCart } = useCart();
  const [form, setForm] = useState({
    patient_name: '',
    email: '',
    phone: '',
    age: '',
    gender: '',
    height: '',
    weight: '',
    nationality: '',
    occupation: '',
    emergency_contact_name: '',
    emergency_contact_number: '',
    has_companion: null,
    companion_relationship: '',
    travel_buddy_services: [],
    has_cultural_preferences: null,
    cultural_preferences: [],
    cultural_notes: '',
    medical_conditions: [],
    medical_conditions_other: '',
    had_surgery: null,
    previous_procedures: '',
    last_surgery_date: '',
    had_complications: null,
    surgery_complications: [],
    anesthesia_complications: null,
    anesthesia_complication_types: [],
    allergies: [],
    allergy_details: '',
    takes_medications: null,
    medication_types: [],
    medication_notes: '',
    lifestyle_habits: [],
    exercises_regularly: null,
    activity_level: '',
    emotional_concerns: null,
    emotional_concern_types: [],
    emotional_notes: '',
    pregnancy_status: '',
    document_types: [],
    uploaded_files: [],
    procedure_interest: '',
    preferred_date: '',
    notes: '',
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const createMutation = useMutation({
    mutationFn: (data) => {
      const procedureNames = items.map(item => item.name).join(', ') || 'other';
      return base44.entities.Consultation.create({
        ...data,
        procedure_interest: procedureNames,
      });
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

  const handleSubmit = () => {
    setShowPreview(true);
  };

  const handleConfirmSubmit = () => {
    createMutation.mutate(form);
    setShowPreview(false);
  };

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <motion.div
          className="text-center max-w-md"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-display text-2xl text-foreground mb-3">Consultation Request Received</h2>
          <p className="text-muted-foreground mb-6">
            Thank you, {form.patient_name}! Our concierge team will reach out within 24 hours to discuss your personalized treatment plan.
          </p>
          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => window.location.href = '/'}>
            Return Home
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="py-12 lg:py-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8">
          <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-2">Book Your Visit</p>
          <h1 className="font-display text-2xl lg:text-3xl text-foreground">Your Consultation</h1>
          <p className="text-sm text-muted-foreground mt-2">Step {step + 1} of {steps.length}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-1 flex-shrink-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step
                    ? 'bg-primary text-primary-foreground'
                    : i === step
                    ? 'bg-accent text-accent-foreground ring-2 ring-accent/30'
                    : 'bg-secondary text-muted-foreground'
                }`}
                title={s.label}
              >
                {i < step ? '✓' : s.emoji}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-4 h-0.5 flex-shrink-0 ${i < step ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Consultation Medical Cart */}
        <div className="mb-6">
          <ConsultationMedicalCart />
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
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

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            {step < steps.length - 1 ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext()}
                className="bg-primary hover:bg-primary/90"
              >
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || !canNext()}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {createMutation.isPending ? 'Submitting...' : 'Submit Consultation'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Preview Summary Modal */}
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