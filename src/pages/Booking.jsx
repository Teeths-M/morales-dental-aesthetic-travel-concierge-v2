import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle, CalendarDays } from 'lucide-react';
import BookingSteps from '../components/booking/BookingSteps';

const procedures = [
  { value: 'dental_implants', label: 'Dental Implants' },
  { value: 'smile_makeover', label: 'Smile Makeover' },
  { value: 'all_on_4', label: 'All-on-4 / All-on-6' },
  { value: 'porcelain_veneers', label: 'Porcelain Veneers' },
  { value: 'bone_regeneration', label: 'Bone Regeneration' },
  { value: 'cosmetic_dentistry', label: 'Cosmetic Dentistry' },
  { value: 'other', label: 'Other / Not Sure' },
];

export default function Booking() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    patient_name: '',
    email: '',
    phone: '',
    procedure_interest: '',
    preferred_date: '',
    notes: '',
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Consultation.create(data),
    onSuccess: () => setSubmitted(true),
  });

  const canNext = () => {
    if (step === 0) return form.patient_name && form.email;
    if (step === 1) return form.procedure_interest;
    if (step === 2) return form.preferred_date;
    return true;
  };

  const handleSubmit = () => {
    createMutation.mutate(form);
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
      <div className="max-w-xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8">
          <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-2">Book Your Visit</p>
          <h1 className="font-display text-2xl lg:text-3xl text-foreground">Start Your Consultation</h1>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 lg:p-8">
          <BookingSteps currentStep={step} />

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && (
                <div className="space-y-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input value={form.patient_name} onChange={e => update('patient_name', e.target.value)} placeholder="Your full name" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="your@email.com" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Phone (optional)</Label>
                    <Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+1 (555) 000-0000" className="mt-1.5" />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label>Procedure of Interest</Label>
                    <Select value={form.procedure_interest} onValueChange={v => update('procedure_interest', v)}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select a procedure" />
                      </SelectTrigger>
                      <SelectContent>
                        {procedures.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Additional Notes (optional)</Label>
                    <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Tell us about your goals..." className="mt-1.5 h-24" />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <Label>Preferred Consultation Date</Label>
                    <div className="relative mt-1.5">
                      <Input type="date" value={form.preferred_date} onChange={e => update('preferred_date', e.target.value)} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Our team will confirm availability and may suggest alternative dates if needed.
                  </p>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">Review Your Details</h3>
                  <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{form.patient_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium">{form.email}</span>
                    </div>
                    {form.phone && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Phone</span>
                        <span className="font-medium">{form.phone}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Procedure</span>
                      <span className="font-medium">{procedures.find(p => p.value === form.procedure_interest)?.label}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Preferred Date</span>
                      <span className="font-medium">{form.preferred_date}</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            {step < 3 ? (
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
                disabled={createMutation.isPending}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {createMutation.isPending ? 'Submitting...' : 'Confirm Booking'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}