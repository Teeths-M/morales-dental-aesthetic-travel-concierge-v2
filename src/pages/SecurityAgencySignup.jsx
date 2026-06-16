import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Shield, CheckCircle, MapPin, Phone, User, Building, FileText, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const COVERAGE_OPTIONS = [
  'Airport Pickup Security', 'Medical Facility Escort', 'Hotel Protection Detail',
  'Emergency SOS Response', 'Tactical Extraction', 'VIP Close Protection',
  'Armed Security', 'Unarmed Security', '24/7 On-Call Response'
];

const REGION_OPTIONS = [
  'Margarita Island, Venezuela', 'Caracas, Venezuela', 'Trinidad & Tobago',
  'Barbados', 'Jamaica', 'Dominican Republic', 'Mexico', 'Colombia',
  'Panama', 'Costa Rica', 'Other Caribbean', 'Other Latin America'
];

export default function SecurityAgencySignup() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    agency_name: '',
    contact_name: '',
    email: '',
    phone: '',
    whatsapp: '',
    country: '',
    city: '',
    license_number: '',
    years_operating: '',
    coverage_services: [],
    regions_covered: [],
    team_size: '',
    response_time_minutes: '',
    emergency_line: '',
    insurance_provider: '',
    additional_info: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggle = (field, val) => {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(val)
        ? f[field].filter(x => x !== val)
        : [...f[field], val]
    }));
  };

  const canSubmit = form.agency_name && form.contact_name && form.email
    && form.phone && form.country && form.license_number
    && form.coverage_services.length > 0 && form.regions_covered.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await base44.entities.KYPVerification.create({
        partner_type: 'other',
        partner_name: form.agency_name,
        partner_email: form.email,
        business_registration_number: form.license_number,
        business_registration_country: form.country,
        overall_status: 'pending',
        sanctions_check_status: 'pending',
        document_forensics_status: 'pending',
        submitted_at: new Date().toISOString(),
        audit_trail: [{
          timestamp: new Date().toISOString(),
          action: 'SECURITY_AGENCY_SIGNUP',
          actor: form.contact_name,
          notes: JSON.stringify({
            contact_name: form.contact_name,
            phone: form.phone,
            whatsapp: form.whatsapp,
            city: form.city,
            years_operating: form.years_operating,
            coverage_services: form.coverage_services,
            regions_covered: form.regions_covered,
            team_size: form.team_size,
            response_time_minutes: form.response_time_minutes,
            emergency_line: form.emergency_line,
            insurance_provider: form.insurance_provider,
            additional_info: form.additional_info,
          })
        }]
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
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <Shield className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white mb-2">Application Submitted</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            Thank you for applying as a security partner. Our compliance team will review your credentials and KYP screening within 48–72 hours. You will receive an email confirmation shortly.
          </p>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 mb-6">
            <p className="text-xs font-bold text-amber-400 mb-1">🔒 KYP Verification Initiated</p>
            <p className="text-xs text-amber-300/70">Your agency will undergo sanctions screening and document forensics before activation.</p>
          </div>
          <button onClick={() => navigate('/')}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all">
            Back to Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white">Private Security Agency</h1>
          <p className="text-slate-400 mt-1 text-sm leading-relaxed max-w-sm mx-auto">
            Join our SOS Emergency Dispatch Network — protect medical travel patients with verified tactical and close-protection services.
          </p>
          <div className="flex justify-center gap-4 mt-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> KYP Screened</span>
            <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> SOS Dispatch Ready</span>
            <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Verified & Insured</span>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl p-7 space-y-7">

          {/* Agency Name */}
          <Field icon={Building} label="1. Agency / Company Name" required dark>
            <input value={form.agency_name} onChange={e => set('agency_name', e.target.value)}
              placeholder="e.g. Tactical Shield Security Group"
              className="w-full bg-slate-700 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </Field>

          {/* Contact Name */}
          <Field icon={User} label="2. Primary Contact Name" required dark>
            <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
              placeholder="Director / Operations Manager"
              className="w-full bg-slate-700 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </Field>

          {/* Contact Info */}
          <Field icon={Phone} label="3. Contact Details" required dark>
            <div className="space-y-2">
              <input value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="Official email address *"
                type="email"
                className="w-full bg-slate-700 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <div className="grid grid-cols-2 gap-2">
                <input value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="Office phone *"
                  className="bg-slate-700 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)}
                  placeholder="WhatsApp (ops line)"
                  className="bg-slate-700 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
          </Field>

          {/* Location */}
          <Field icon={MapPin} label="4. Headquarters Location" required dark>
            <div className="grid grid-cols-2 gap-2">
              <input value={form.country} onChange={e => set('country', e.target.value)}
                placeholder="Country *"
                className="bg-slate-700 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <input value={form.city} onChange={e => set('city', e.target.value)}
                placeholder="City"
                className="bg-slate-700 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </Field>

          {/* License */}
          <Field icon={FileText} label="5. Business License / Registration Number" required dark>
            <div className="grid grid-cols-2 gap-2">
              <input value={form.license_number} onChange={e => set('license_number', e.target.value)}
                placeholder="License number *"
                className="bg-slate-700 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <input value={form.years_operating} onChange={e => set('years_operating', e.target.value)}
                placeholder="Years in operation"
                type="number"
                className="bg-slate-700 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </Field>

          {/* Services */}
          <Field icon={Shield} label="6. Services Offered" required dark>
            <div className="flex flex-wrap gap-2">
              {COVERAGE_OPTIONS.map(opt => (
                <button key={opt} type="button" onClick={() => toggle('coverage_services', opt)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    form.coverage_services.includes(opt)
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-700 text-slate-400 border-slate-600 hover:border-emerald-600'
                  }`}>
                  {form.coverage_services.includes(opt) && <CheckCircle className="w-3 h-3 inline mr-1" />}
                  {opt}
                </button>
              ))}
            </div>
          </Field>

          {/* Regions */}
          <Field icon={MapPin} label="7. Regions of Operation" required dark>
            <div className="flex flex-wrap gap-2">
              {REGION_OPTIONS.map(opt => (
                <button key={opt} type="button" onClick={() => toggle('regions_covered', opt)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    form.regions_covered.includes(opt)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-700 text-slate-400 border-slate-600 hover:border-blue-500'
                  }`}>
                  {opt}
                </button>
              ))}
            </div>
          </Field>

          {/* Ops Details */}
          <Field icon={AlertTriangle} label="8. Operational Details" dark>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input value={form.team_size} onChange={e => set('team_size', e.target.value)}
                placeholder="Team size (agents)"
                type="number"
                className="bg-slate-700 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <input value={form.response_time_minutes} onChange={e => set('response_time_minutes', e.target.value)}
                placeholder="Avg response time (min)"
                type="number"
                className="bg-slate-700 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={form.emergency_line} onChange={e => set('emergency_line', e.target.value)}
                placeholder="24/7 Emergency line"
                className="bg-slate-700 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <input value={form.insurance_provider} onChange={e => set('insurance_provider', e.target.value)}
                placeholder="Insurance / liability provider"
                className="bg-slate-700 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </Field>

          {/* Additional Info */}
          <Field icon={FileText} label="9. Additional Information (optional)" dark>
            <textarea value={form.additional_info} onChange={e => set('additional_info', e.target.value)}
              placeholder="Certifications, accreditations, previous medical escort experience, references…"
              rows={3}
              className="w-full bg-slate-700 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </Field>

          {/* KYP Notice */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3">
            <p className="text-xs font-bold text-amber-400 mb-0.5">🔒 Know Your Partner (KYP) Compliance</p>
            <p className="text-xs text-amber-300/70">Your agency will undergo automated sanctions screening, document forensics, and AI risk scoring before activation on the SOS dispatch network. This process takes 48–72 hours.</p>
          </div>

          <button onClick={handleSubmit} disabled={!canSubmit || submitting}
            className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
              canSubmit ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}>
            {submitting ? 'Submitting Application…' : 'Apply as Security Partner 🛡️'}
          </button>

          <p className="text-center text-xs text-slate-500">Our compliance team reviews all applications within 48–72 hours. You will receive email confirmation once your KYP screening is initiated.</p>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, required, children, dark }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        <p className={`text-sm font-semibold ${dark ? 'text-slate-200' : 'text-slate-700'}`}>
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </p>
      </div>
      {children}
    </div>
  );
}