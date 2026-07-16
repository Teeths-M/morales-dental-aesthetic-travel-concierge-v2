import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User, Pill, AlertTriangle, Stethoscope, Activity,
  Wind, Brain, Baby, Cigarette, Wine, Dumbbell, ChevronRight, ChevronLeft, CheckCircle2, Shield
} from 'lucide-react';

const SECTIONS = [
  { id: 'demographics', label: 'Demographics', icon: User },
  { id: 'medical_history', label: 'Medical History', icon: Stethoscope },
  { id: 'medications', label: 'Medications & Allergies', icon: Pill },
  { id: 'surgical', label: 'Surgical History', icon: Activity },
  { id: 'lifestyle', label: 'Lifestyle', icon: Dumbbell },
  { id: 'mental', label: 'Mental Wellness', icon: Brain },
  { id: 'pregnancy', label: 'Reproductive Health', icon: Baby },
];

const MEDICAL_CONDITIONS = [
  'Diabetes', 'Hypertension', 'Heart Disease', 'Asthma / COPD', 'Thyroid Disorder',
  'Autoimmune Disorder', 'Kidney Disease', 'Liver Disease', 'Epilepsy / Seizures',
  'Sleep Apnea', 'Cancer (active or recent)', 'Stroke / TIA history',
  'Blood Clotting Disorder', 'HIV / Immunocompromised', 'Other',
];

const MEDICATION_TYPES = [
  'Blood thinners (Warfarin, Eliquis, Xarelto)', 'Aspirin / NSAIDs', 'Insulin / Diabetes meds',
  'Beta-blockers / Heart meds', 'Steroids / Immunosuppressants', 'Antidepressants / Antipsychotics',
  'Thyroid medications', 'Birth control / Hormones', 'Herbal supplements / Vitamins',
  'Other prescription medications',
];

const ALLERGY_TYPES = [
  'Penicillin / Antibiotics', 'Latex', 'Sulfa drugs', 'Ibuprofen / NSAIDs',
  'General Anesthesia', 'Iodine / Contrast dye', 'Food allergies (list below)', 'Other',
];

const COMPLICATION_TYPES = [
  'Excessive bleeding', 'Infection', 'Poor wound healing', 'Deep vein thrombosis (DVT)',
  'Anesthesia reaction', 'Prolonged recovery', 'Revision required', 'Other',
];

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
        checked ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
      }`}
    >
      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
        {checked && <div className="w-2 h-2 bg-white rounded-full" />}
      </div>
      {label}
    </button>
  );
}

function CheckGroup({ options, selected = [], onChange, columns = 2 }) {
  const toggle = (val) => onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  return (
    <div className={`grid gap-2 grid-cols-1 ${{ 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4' }[columns] || 'sm:grid-cols-2'}`}>
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => toggle(opt)}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
            selected.includes(opt) ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}>
          <div className={`w-3.5 h-3.5 rounded border-2 flex-shrink-0 ${selected.includes(opt) ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`}>
            {selected.includes(opt) && <CheckCircle2 className="w-3 h-3 text-white" />}
          </div>
          {opt}
        </button>
      ))}
    </div>
  );
}

export default function PatientIntakeTelemetry({ onComplete, initialData = {} }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    // Demographics
    age_years: initialData.age_years || '',
    height_cm: initialData.height_cm || '',
    weight_kg: initialData.weight_kg || '',
    // Medical history
    medical_conditions: initialData.medical_conditions || [],
    medical_conditions_notes: initialData.medical_conditions_notes || '',
    bleeding_disorder: initialData.bleeding_disorder || false,
    // Medications & allergies
    takes_medications: initialData.takes_medications || false,
    medication_types: initialData.medication_types || [],
    medication_free_text: initialData.medication_free_text || '',
    has_allergies: initialData.has_allergies || false,
    allergy_types: initialData.allergy_types || [],
    allergy_free_text: initialData.allergy_free_text || '',
    // Surgical history
    had_surgery: initialData.had_surgery || false,
    surgery_description: initialData.surgery_description || '',
    had_complications: initialData.had_complications || false,
    complication_types: initialData.complication_types || [],
    anesthesia_complications: initialData.anesthesia_complications || false,
    anesthesia_notes: initialData.anesthesia_notes || '',
    anesthesia_type: initialData.anesthesia_type || '',
    // Lifestyle
    smoking_status: initialData.smoking_status || 'None',
    alcohol_use: initialData.alcohol_use || 'None',
    exercise_level: initialData.exercise_level || 'Moderate',
    // Mental wellness
    has_mental_health_conditions: initialData.has_mental_health_conditions || false,
    mental_health_notes: initialData.mental_health_notes || '',
    emotional_readiness: initialData.emotional_readiness || 'Good',
    // Reproductive
    pregnancy_status: initialData.pregnancy_status || false,
    breastfeeding: initialData.breastfeeding || false,
    reproductive_notes: initialData.reproductive_notes || '',
    ...initialData,
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const _currentSection = SECTIONS[step];
  const bmi = form.height_cm && form.weight_kg
    ? (form.weight_kg / ((form.height_cm / 100) ** 2)).toFixed(1) : null;

  const handleSubmit = () => onComplete(form);

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {SECTIONS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <button key={s.id} onClick={() => i <= step && setStep(i)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                active ? 'bg-slate-800 text-white' : done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
              }`}>
              <Icon className="w-3 h-3" /> {s.label}
            </button>
          );
        })}
      </div>

      <motion.div key={step} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>

        {/* DEMOGRAPHICS */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Basic Information</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Age (years)', key: 'age_years', type: 'number', placeholder: 'e.g. 35' },
                  { label: 'Height (cm)', key: 'height_cm', type: 'number', placeholder: 'e.g. 168' },
                  { label: 'Weight (kg)', key: 'weight_kg', type: 'number', placeholder: 'e.g. 72' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-[11px] font-semibold text-slate-500 mb-1 block">{f.label}</label>
                    <input type={f.type} value={form[f.key]} onChange={e => set(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white" />
                  </div>
                ))}
              </div>
              {bmi && (
                <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold ${
                  parseFloat(bmi) >= 40 ? 'bg-red-50 text-red-700 border border-red-200' :
                  parseFloat(bmi) >= 35 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  <Activity className="w-3.5 h-3.5" /> BMI: {bmi} {parseFloat(bmi) >= 40 ? '— Severe Obesity' : parseFloat(bmi) >= 35 ? '— Elevated Risk' : parseFloat(bmi) >= 25 ? '— Overweight' : '— Normal'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MEDICAL HISTORY */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Known Medical Conditions</p>
            <CheckGroup options={MEDICAL_CONDITIONS} selected={form.medical_conditions} onChange={v => set('medical_conditions', v)} columns={2} />
            <div className="border-t border-slate-100 pt-4">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Blood & Clotting Disorders</p>
              <Toggle
                checked={form.bleeding_disorder}
                onChange={v => set('bleeding_disorder', v)}
                label="I have a bleeding or clotting disorder (e.g. Haemophilia, Von Willebrand disease, DVT history, Thrombophilia)"
              />
              {form.bleeding_disorder && (
                <div className="mt-2 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700 font-medium">Bleeding disorders are a critical contraindication for most invasive procedures. Your case will require haematology clearance.</p>
                </div>
              )}
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">Additional notes or unlisted conditions</label>
              <textarea value={form.medical_conditions_notes} onChange={e => set('medical_conditions_notes', e.target.value)}
                placeholder="Describe any other conditions your care team should know about…"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-emerald-300" />
            </div>
          </div>
        )}

        {/* MEDICATIONS & ALLERGIES */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Toggle checked={form.takes_medications} onChange={v => set('takes_medications', v)} label="I currently take medications" />
              </div>
              {form.takes_medications && (
                <div className="space-y-3 pl-1">
                  <CheckGroup options={MEDICATION_TYPES} selected={form.medication_types} onChange={v => set('medication_types', v)} />
                  <textarea value={form.medication_free_text} onChange={e => set('medication_free_text', e.target.value)}
                    placeholder="List specific medication names, dosages if known…"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center gap-3 mb-3">
                <Toggle checked={form.has_allergies} onChange={v => set('has_allergies', v)} label="I have known allergies" />
              </div>
              {form.has_allergies && (
                <div className="space-y-3 pl-1">
                  <CheckGroup options={ALLERGY_TYPES} selected={form.allergy_types} onChange={v => set('allergy_types', v)} />
                  <textarea value={form.allergy_free_text} onChange={e => set('allergy_free_text', e.target.value)}
                    placeholder="Describe allergic reactions experienced…"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* SURGICAL HISTORY */}
        {step === 3 && (
          <div className="space-y-4">
            <Toggle checked={form.had_surgery} onChange={v => set('had_surgery', v)} label="I have had previous surgeries" />
            {form.had_surgery && (
              <div className="space-y-3 pl-1">
                <textarea value={form.surgery_description} onChange={e => set('surgery_description', e.target.value)}
                  placeholder="Describe prior surgeries (type, year, clinic)…"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                <Toggle checked={form.had_complications} onChange={v => set('had_complications', v)} label="I experienced post-surgical complications" />
                {form.had_complications && (
                  <CheckGroup options={COMPLICATION_TYPES} selected={form.complication_types} onChange={v => set('complication_types', v)} />
                )}
              </div>
            )}
            <div className="border-t border-slate-100 pt-4">
              <Toggle checked={form.anesthesia_complications} onChange={v => set('anesthesia_complications', v)} label="I have had anesthesia complications in the past" />
              {form.anesthesia_complications && (
                <textarea value={form.anesthesia_notes} onChange={e => set('anesthesia_notes', e.target.value)}
                  placeholder="Describe what happened…"
                  className="mt-2 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-emerald-300" />
              )}
            </div>
            <div className="border-t border-slate-100 pt-4">
              <label className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-2 block">
                <Wind className="w-3.5 h-3.5" /> Expected anesthesia type for your planned procedure
              </label>
              <div className="flex gap-2 flex-wrap">
                {['None / Topical', 'Local injection', 'Sedation (twilight)', 'Regional (spinal/epidural)', 'General (full)'].map(opt => (
                  <button key={opt} type="button" onClick={() => set('anesthesia_type', opt)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      form.anesthesia_type === opt
                        ? opt === 'General (full)' ? 'bg-red-700 text-white border-red-700' : 'bg-slate-800 text-white border-slate-800'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}>{opt}</button>
                ))}
              </div>
              {form.anesthesia_type === 'General (full)' && (
                <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700 font-medium">General anesthesia carries higher risk for patients with certain conditions (heart disease, diabetes, hypertension). Your risk score will factor this in.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LIFESTYLE */}
        {step === 4 && (
          <div className="space-y-5">
            {[
              { label: 'Smoking status', key: 'smoking_status', icon: Cigarette, options: ['None', 'Light', 'Moderate', 'Heavy'] },
              { label: 'Alcohol use', key: 'alcohol_use', icon: Wine, options: ['None', 'Light', 'Moderate', 'Heavy'] },
              { label: 'Exercise level', key: 'exercise_level', icon: Dumbbell, options: ['Sedentary', 'Light', 'Moderate', 'Active', 'Athlete'] },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.key}>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2"><Icon className="w-3.5 h-3.5" /> {item.label}</label>
                  <div className="flex gap-2 flex-wrap">
                    {item.options.map(opt => (
                      <button key={opt} type="button" onClick={() => set(item.key, opt)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                          form[item.key] === opt ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}>{opt}</button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MENTAL WELLNESS */}
        {step === 5 && (
          <div className="space-y-4">
            <Toggle checked={form.has_mental_health_conditions} onChange={v => set('has_mental_health_conditions', v)} label="I have a diagnosed mental health condition" />
            {form.has_mental_health_conditions && (
              <textarea value={form.mental_health_notes} onChange={e => set('mental_health_notes', e.target.value)}
                placeholder="e.g. Anxiety, Depression, Bipolar — and current treatment/medications…"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-emerald-300" />
            )}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-2 block">How do you feel about your upcoming procedure?</label>
              <div className="flex gap-2 flex-wrap">
                {['Very anxious', 'Somewhat anxious', 'Neutral', 'Good', 'Very confident'].map(opt => (
                  <button key={opt} type="button" onClick={() => set('emotional_readiness', opt)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      form.emotional_readiness === opt ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}>{opt}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* REPRODUCTIVE HEALTH */}
        {step === 6 && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 font-medium">These questions are critical for surgical safety. All responses are strictly confidential.</p>
            </div>
            <Toggle checked={form.pregnancy_status} onChange={v => set('pregnancy_status', v)} label="I am currently pregnant or may be pregnant" />
            <Toggle checked={form.breastfeeding} onChange={v => set('breastfeeding', v)} label="I am currently breastfeeding" />
            <div>
              <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">Additional reproductive health notes</label>
              <textarea value={form.reproductive_notes} onChange={e => set('reproductive_notes', e.target.value)}
                placeholder="Optional: recent fertility treatments, hormonal therapies, etc."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-emerald-300" />
            </div>
          </div>
        )}
      </motion.div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
        <span className="text-[11px] text-slate-400">{step + 1} / {SECTIONS.length}</span>
        {step < SECTIONS.length - 1 ? (
          <button onClick={() => setStep(s => s + 1)}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 transition-all">
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button onClick={handleSubmit}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-700 to-blue-800 text-white text-xs font-semibold hover:opacity-90 transition-all">
            <Shield className="w-3.5 h-3.5" /> Run SAFE-T Scan
          </button>
        )}
      </div>
    </div>
  );
}