import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButtonLight } from '@/components/nav/BackButton';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Upload, CheckCircle, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import PhoneField from '@/components/ui-system/PhoneField';
import SearchSelect from '@/components/ui-system/SearchSelect';
import { COUNTRY_NAMES } from '@/lib/countryDialCodes';

const BACKGROUND_TYPES = ['Ex-Military', 'Ex-Police', 'Private Security', 'Tactical Response', 'K9 Unit', 'Cyber/Intel'];
const SERVICES = ['SOS Response', 'Close Protection', 'Airport Escort', 'Medical Escort', 'Armed Guard', 'Surveillance', 'Executive Protection'];
const REGIONS_LIST = ['Margarita Island', 'Caracas', 'Port of Spain', 'Miami', 'Bogotá', 'Medellín', 'Panama City', 'Mexico City', 'Santo Domingo', 'Kingston'];

const STEPS = ['Agency Info', 'Capabilities', 'Documents', 'Review'];

function Toggle({ label, selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
        selected ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
      }`}
    >
      {label}
    </button>
  );
}

function Field({ label, required = false, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass = "w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white";

export default function SecurityAgencySignup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    agency_name: '',
    contact_person: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    license_number: '',
    years_in_operation: '',
    personnel_count: '',
    background_types: [],
    services_offered: [],
    operational_regions: [],
    has_armored_vehicles: false,
    response_time_minutes: '',
    license_doc_url: '',
    insurance_doc_url: '',
  });

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const toggleArr = (key, val) =>
    setForm(p => ({
      ...p,
      [key]: p[key].includes(val) ? p[key].filter(x => x !== val) : [...p[key], val],
    }));

  const uploadFile = async (e, key) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set(key, file_url);
    } catch (_err) {
      setError('File upload failed. Please try again.');
    }
  };

  const validate = () => {
    if (step === 0 && (!form.agency_name || !form.contact_person || !form.email || !form.phone || !form.country)) {
      setError('Please fill in all required fields.'); return false;
    }
    if (step === 1 && form.services_offered.length === 0) {
      setError('Select at least one service.'); return false;
    }
    setError(''); return true;
  };

  const next = () => { if (validate()) setStep(s => s + 1); };
  const back = () => { setError(''); setStep(s => s - 1); };

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      const agency = await base44.entities.SecurityAgency.create({
        ...form,
        years_in_operation: Number(form.years_in_operation) || 0,
        response_time_minutes: Number(form.response_time_minutes) || 0,
        submitted_at: new Date().toISOString(),
        verification_status: 'pending_review',
      });
      try {
        await base44.functions.invoke('initiatePartnerVerification', {
          partner_id: agency.id,
          partner_type: 'security_agency',
          documents: [form.license_doc_url, form.insurance_doc_url].filter(Boolean),
        });
      } catch (_) { /* non-fatal — admin can trigger manually from PartnerVerificationHub */ }
      // Welcome email with dashboard link — non-blocking, a mail hiccup must
      // never fail the signup itself.
      base44.functions.invoke('sendPartnerWelcomeEmail', {
        partner_type: 'security_agency',
        partner_id: agency.id,
      }).catch(() => { /* non-fatal */ });
      setSubmitted(true);
    } catch (_err) {
      setError('Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center p-6">
        <motion.div
          className="bg-white rounded-3xl p-10 text-center max-w-md w-full shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-display font-semibold text-slate-900 mb-2">Application Submitted</h2>
          <p className="text-slate-500 text-sm mb-6">
            Your agency has been submitted for KYP verification. Our compliance team will review your credentials and reach out within 2–3 business days.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 text-left mb-6 text-sm space-y-1">
            <p><span className="font-semibold">Agency:</span> {form.agency_name}</p>
            <p><span className="font-semibold">Contact:</span> {form.contact_person}</p>
            <p><span className="font-semibold">Status:</span> <span className="text-amber-600 font-semibold">Pending Review</span></p>
          </div>
          <Button onClick={() => navigate('/')} className="w-full bg-slate-800 hover:bg-slate-900 text-white">
            Return Home
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <BackButtonLight fallback="/register-role" className="mb-4" />
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 border border-white/20 mb-4">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-display font-semibold text-white mb-1">Security Agency Partner</h1>
          <p className="text-slate-300 text-sm">SAFE-T 4LIFE™ Platform Registration</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6 px-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1.5 ${i <= step ? 'text-white' : 'text-slate-500'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all ${i < step ? 'bg-green-500 border-green-500' : i === step ? 'bg-white text-slate-900 border-white' : 'bg-transparent border-slate-600'}`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className="text-xs font-medium hidden sm:block">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-green-500' : 'bg-slate-600'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 0 — Agency Info */}
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Agency Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Field label="Agency Name" required>
                      <input className={inputClass} placeholder="Tactical Shield Solutions" value={form.agency_name} onChange={e => set('agency_name', e.target.value)} />
                    </Field>
                  </div>
                  <Field label="Contact Person" required>
                    <input className={inputClass} placeholder="Full name" value={form.contact_person} onChange={e => set('contact_person', e.target.value)} />
                  </Field>
                  <Field label="Email" required>
                    <input className={inputClass} type="email" placeholder="contact@agency.com" value={form.email} onChange={e => set('email', e.target.value)} />
                  </Field>
                  <Field label="Phone" required>
                    <PhoneField value={form.phone} onChange={v => set('phone', v)} defaultCountryName={form.country} placeholder="Phone number" />
                  </Field>
                  <Field label="Country" required>
                    <SearchSelect boxed value={form.country} onChange={v => set('country', v)} options={COUNTRY_NAMES} placeholder="Select or type your country" />
                  </Field>
                  <Field label="City">
                    <input className={inputClass} placeholder="Port of Spain" value={form.city} onChange={e => set('city', e.target.value)} />
                  </Field>
                  <Field label="License / Registration No.">
                    <input className={inputClass} placeholder="SEC-2024-XXXX" value={form.license_number} onChange={e => set('license_number', e.target.value)} />
                  </Field>
                  <Field label="Years in Operation">
                    <input className={inputClass} type="number" min="0" placeholder="5" value={form.years_in_operation} onChange={e => set('years_in_operation', e.target.value)} />
                  </Field>
                </div>
              </motion.div>
            )}

            {/* Step 1 — Capabilities */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <h2 className="text-lg font-semibold text-slate-800">Capabilities & Services</h2>

                <Field label="Personnel Count" required>
                  <div className="flex gap-2 flex-wrap">
                    {['1-5', '6-20', '21-50', '50+'].map(v => (
                      <Toggle key={v} label={v} selected={form.personnel_count === v} onToggle={() => set('personnel_count', v)} />
                    ))}
                  </div>
                </Field>

                <Field label="Personnel Background">
                  <div className="flex gap-2 flex-wrap">
                    {BACKGROUND_TYPES.map(b => (
                      <Toggle key={b} label={b} selected={form.background_types.includes(b)} onToggle={() => toggleArr('background_types', b)} />
                    ))}
                  </div>
                </Field>

                <Field label="Services Offered" required>
                  <div className="flex gap-2 flex-wrap">
                    {SERVICES.map(s => (
                      <Toggle key={s} label={s} selected={form.services_offered.includes(s)} onToggle={() => toggleArr('services_offered', s)} />
                    ))}
                  </div>
                </Field>

                <Field label="Operational Regions">
                  <div className="flex gap-2 flex-wrap">
                    {REGIONS_LIST.map(r => (
                      <Toggle key={r} label={r} selected={form.operational_regions.includes(r)} onToggle={() => toggleArr('operational_regions', r)} />
                    ))}
                  </div>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Avg. Response Time (min)">
                    <input className={inputClass} type="number" min="1" placeholder="15" value={form.response_time_minutes} onChange={e => set('response_time_minutes', e.target.value)} />
                  </Field>
                  <Field label="Armored Vehicles?">
                    <div className="flex gap-3 mt-1">
                      <Toggle label="Yes" selected={form.has_armored_vehicles === true} onToggle={() => set('has_armored_vehicles', true)} />
                      <Toggle label="No" selected={form.has_armored_vehicles === false} onToggle={() => set('has_armored_vehicles', false)} />
                    </div>
                  </Field>
                </div>
              </motion.div>
            )}

            {/* Step 2 — Documents */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <h2 className="text-lg font-semibold text-slate-800">Documents</h2>
                <p className="text-slate-500 text-sm">Upload your business license and insurance certificate for KYP compliance screening.</p>

                {[
                  { label: 'Business / Operating License', key: 'license_doc_url', hint: 'PDF or image' },
                  { label: 'Insurance Certificate', key: 'insurance_doc_url', hint: 'PDF or image' },
                ].map(({ label, key, hint }) => (
                  <div key={key} className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-slate-400 transition-all">
                    <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700 mb-1">{label}</p>
                    <p className="text-xs text-slate-400 mb-3">{hint}</p>
                    {form[key] ? (
                      <p className="text-xs text-green-600 font-semibold">✓ Uploaded</p>
                    ) : (
                      <label className="cursor-pointer inline-block px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-all">
                        Choose File
                        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => uploadFile(e, key)} />
                      </label>
                    )}
                  </div>
                ))}

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700">
                  <strong>Note:</strong> Documents are reviewed by our compliance team as part of KYP screening. Your application will not proceed without at least one document.
                </div>
              </motion.div>
            )}

            {/* Step 3 — Review */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-800">Review & Submit</h2>
                <div className="bg-slate-50 rounded-2xl p-5 space-y-3 text-sm">
                  <Row label="Agency" value={form.agency_name} />
                  <Row label="Contact" value={form.contact_person} />
                  <Row label="Email" value={form.email} />
                  <Row label="Phone" value={form.phone} />
                  <Row label="Country" value={form.country} />
                  <Row label="License No." value={form.license_number || '—'} />
                  <Row label="Personnel" value={form.personnel_count || '—'} />
                  <Row label="Services" value={form.services_offered.join(', ') || '—'} />
                  <Row label="Regions" value={form.operational_regions.join(', ') || '—'} />
                  <Row label="Response Time" value={form.response_time_minutes ? `${form.response_time_minutes} min` : '—'} />
                  <Row label="License Doc" value={form.license_doc_url ? '✓ Uploaded' : '—'} />
                  <Row label="Insurance Doc" value={form.insurance_doc_url ? '✓ Uploaded' : '—'} />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  By submitting, you agree to the SAFE-T 4LIFE™ Partner Terms and authorize KYP compliance screening including sanctions checks and document forensics.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            {step > 0 ? (
              <Button variant="outline" onClick={back} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
            ) : (
              <Button variant="outline" onClick={() => navigate('/partner-signup')} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> Partner Hub
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={next} className="bg-slate-800 hover:bg-slate-900 text-white gap-2">
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={loading} className="bg-green-700 hover:bg-green-800 text-white gap-2">
                {loading ? 'Submitting…' : 'Submit Application'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-slate-500 font-medium shrink-0">{label}</span>
      <span className="text-slate-800 text-right">{value}</span>
    </div>
  );
}