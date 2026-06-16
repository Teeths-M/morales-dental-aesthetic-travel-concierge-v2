import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Heart, CheckCircle, ChefHat, MapPin, Phone, User } from 'lucide-react';
import { toast } from 'sonner';

const CULINARY_OPTIONS = [
  'Soups & Broths', 'Soft Foods', 'Diabetic-friendly', 'Allergy-safe', 'Traditional Local', 'Blended/Purée', 'Light Salads'
];

const AGE_TIERS = [
  { value: '40-45', label: '40 – 45' },
  { value: '46-50', label: '46 – 50' },
  { value: '51-55', label: '51 – 55' },
  { value: '55+',   label: '55 +' },
];

const MOBILITY_OPTIONS = [
  { value: 'neighborhood_only', label: 'My neighborhood only', sub: 'Within walking / short ride distance' },
  { value: 'city_wide',         label: 'City-wide',            sub: 'I can travel across the city' },
  { value: 'cook_only',         label: 'Cook-only (no travel)', sub: 'I prepare meals for delivery, no in-person care' },
];

export default function CompanionSignup() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    full_legal_name: '',
    age_tier: '',
    neighborhood: '',
    culinary_specialties: [],
    transit_mobility: '',
    care_comfort_affirmation: '',
    whatsapp_number: '',
    reference_1_name: '',
    reference_1_phone: '',
    reference_2_name: '',
    reference_2_phone: '',
    medical_nurse_history: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleCulinary = (val) => {
    setForm(f => ({
      ...f,
      culinary_specialties: f.culinary_specialties.includes(val)
        ? f.culinary_specialties.filter(x => x !== val)
        : [...f.culinary_specialties, val]
    }));
  };

  const canSubmit = form.full_legal_name && form.age_tier && form.neighborhood
    && form.culinary_specialties.length > 0 && form.transit_mobility
    && form.care_comfort_affirmation && form.whatsapp_number
    && form.reference_1_name && form.reference_1_phone;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await base44.entities.Companion.create({
        ...form,
        sign_up_completed_at: new Date().toISOString(),
        verification_status: 'pending_interview',
        status: 'pending_verification',
        care_baseline_fee_usd: 40,
        is_available: true,
      });
      setDone(true);
    } catch (e) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50 px-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Heart className="w-10 h-10 text-rose-500" />
          </div>
          <h2 className="text-2xl font-display font-bold text-slate-800 mb-2">You're registered! 🌸</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Thank you for joining the Mother's Touch family. Our team will reach out via WhatsApp within 24 hours to schedule your 5-minute welcome call.
          </p>
          <p className="text-xs text-slate-400 mb-6">No exams. No paperwork. Just a friendly chat to get you started.</p>
          <button onClick={() => navigate('/')}
            className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl transition-all">
            Back to Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-amber-50 to-orange-50 py-12 px-4">
      <div className="max-w-xl mx-auto">

        {/* Hero header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-rose-500" />
          </div>
          <h1 className="text-3xl font-display font-bold text-slate-800">Mother's Touch</h1>
          <p className="text-slate-500 mt-1 text-sm leading-relaxed max-w-sm mx-auto">
            Join our network of warm caregivers — home-cooked meals & genuine human connection for recovering patients.
          </p>
          <div className="flex justify-center gap-4 mt-4 text-xs text-slate-400">
            <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> No tech exams</span>
            <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Zero upfront cost</span>
            <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> 5-min WhatsApp call</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-7 space-y-7">

          {/* 1. Full Legal Name */}
          <Field icon={User} label="1. Full Legal Name" required>
            <input value={form.full_legal_name} onChange={e => set('full_legal_name', e.target.value)}
              placeholder="e.g. María Elena Rodríguez"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
          </Field>

          {/* 2. Age Tier */}
          <Field icon={User} label="2. Age Range" required>
            <div className="grid grid-cols-4 gap-2">
              {AGE_TIERS.map(t => (
                <button key={t.value} type="button" onClick={() => set('age_tier', t.value)}
                  className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                    form.age_tier === t.value
                      ? 'bg-rose-500 text-white border-rose-500'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-rose-300'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </Field>

          {/* 3. Location */}
          <Field icon={MapPin} label="3. Neighborhood / City" required>
            <input value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)}
              placeholder="e.g. Pampatar, Margarita Island"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
          </Field>

          {/* 4. Culinary Specialties */}
          <Field icon={ChefHat} label="4. What do you cook best?" required>
            <div className="flex flex-wrap gap-2">
              {CULINARY_OPTIONS.map(opt => (
                <button key={opt} type="button" onClick={() => toggleCulinary(opt)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    form.culinary_specialties.includes(opt)
                      ? 'bg-amber-400 text-white border-amber-400'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-amber-300'
                  }`}>
                  {form.culinary_specialties.includes(opt) && <CheckCircle className="w-3 h-3 inline mr-1" />}
                  {opt}
                </button>
              ))}
            </div>
          </Field>

          {/* 5. Transit Mobility */}
          <Field icon={MapPin} label="5. How far can you travel?" required>
            <div className="space-y-2">
              {MOBILITY_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => set('transit_mobility', opt.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                    form.transit_mobility === opt.value
                      ? 'bg-rose-50 border-rose-400 text-rose-800'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-rose-200'
                  }`}>
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-xs text-slate-400">{opt.sub}</p>
                </button>
              ))}
            </div>
          </Field>

          {/* 6. Care Comfort Affirmation */}
          <Field icon={Heart} label="6. Are you comfortable providing gentle in-person care & companionship to a patient recovering from surgery?" required>
            <div className="grid grid-cols-2 gap-3">
              {[{ v: 'yes', l: '✅ Yes, absolutely' }, { v: 'not_sure', l: '🤔 I\'m not sure yet' }].map(opt => (
                <button key={opt.v} type="button" onClick={() => set('care_comfort_affirmation', opt.v)}
                  className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                    form.care_comfort_affirmation === opt.v
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-emerald-300'
                  }`}>
                  {opt.l}
                </button>
              ))}
            </div>
          </Field>

          {/* 7. WhatsApp + 2 References */}
          <Field icon={Phone} label="7. Your WhatsApp Number + 2 References" required>
            <input value={form.whatsapp_number} onChange={e => set('whatsapp_number', e.target.value)}
              placeholder="Your WhatsApp (e.g. +58 414 1234567)"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-rose-300" />
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input value={form.reference_1_name} onChange={e => set('reference_1_name', e.target.value)}
                placeholder="Reference 1 — Name *"
                className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200" />
              <input value={form.reference_1_phone} onChange={e => set('reference_1_phone', e.target.value)}
                placeholder="Phone / WhatsApp *"
                className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={form.reference_2_name} onChange={e => set('reference_2_name', e.target.value)}
                placeholder="Reference 2 — Name"
                className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200" />
              <input value={form.reference_2_phone} onChange={e => set('reference_2_phone', e.target.value)}
                placeholder="Phone / WhatsApp"
                className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200" />
            </div>
          </Field>

          {/* 8. Optional Medical Background */}
          <Field icon={CheckCircle} label="8. Medical / Nurse Background (optional)">
            <textarea value={form.medical_nurse_history} onChange={e => set('medical_nurse_history', e.target.value)}
              placeholder="e.g. Retired nurse (15 yrs), Home-care aide, First aid certified — leave blank if none"
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-200" />
          </Field>

          {/* Zero Out-of-Pocket notice */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
            <p className="text-xs font-bold text-emerald-700 mb-0.5">💚 Zero Out-of-Pocket Guarantee</p>
            <p className="text-xs text-emerald-600">You will NEVER spend your own money on groceries or transport. All costs are pre-approved or reimbursed same-day before you leave the patient's accommodation.</p>
          </div>

          <button onClick={handleSubmit} disabled={!canSubmit || submitting}
            className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
              canSubmit ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-md' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}>
            {submitting ? 'Submitting…' : 'Join the Mother\'s Touch Family 💛'}
          </button>

          <p className="text-center text-xs text-slate-400">Our team will WhatsApp you within 24 hours for a friendly 5-minute welcome call. No technical questions. No exams.</p>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, required, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-rose-400 flex-shrink-0" />
        <p className="text-sm font-semibold text-slate-700">{label}{required && <span className="text-rose-400 ml-0.5">*</span>}</p>
      </div>
      {children}
    </div>
  );
}