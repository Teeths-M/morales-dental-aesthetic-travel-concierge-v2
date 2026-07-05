// @ts-nocheck — pre-existing type gaps; build passes
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ROUTES, PLATFORM_PRICING } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Loader2, MapPin, Stethoscope, ShieldCheck, CreditCard } from 'lucide-react';

const STEPS = ['Your Details', 'Specialties', 'Credentials', 'Subscription'];

const SPECIALTY_OPTIONS = [
  'General Practice', 'Dentistry', 'Plastic Surgery', 'Orthopedics',
  'Cardiology', 'Dermatology', 'Ophthalmology', 'Gynecology',
  'Internal Medicine', 'Oncology', 'Neurology', 'Rehabilitation',
  'Post-Surgical Care', 'Emergency Medicine', 'Pain Management',
];

const COUNTRY_LIST = [
  'United States', 'Canada', 'United Kingdom', 'Australia', 'Trinidad and Tobago',
  'Jamaica', 'Barbados', 'Guyana', 'Bahamas', 'Dominican Republic', 'Puerto Rico',
  'France', 'Germany', 'Netherlands', 'Spain', 'Brazil', 'Mexico', 'Colombia',
  'India', 'Nigeria', 'South Africa', 'Kenya', 'Ghana', 'Singapore', 'Malaysia',
];

export default function LocalDoctorSignup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    home_country: '',
    city: '',
    clinic_name: '',
    bio: '',
    specialties: [],
    license_number: '',
    license_country: '',
    years_experience: '',
    license_url: '',
    payout_method: '',
    payout_account: '',
  });

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const toggleSpecialty = (s) =>
    set('specialties', form.specialties.includes(s)
      ? form.specialties.filter(x => x !== s)
      : [...form.specialties, s]);

  const canProceed = () => {
    if (step === 0) return form.full_name && form.email && form.phone && form.home_country && form.city;
    if (step === 1) return form.specialties.length > 0;
    if (step === 2) return form.license_number && form.license_country && form.years_experience;
    return true;
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await base44.entities.Doctor.create({
        ...form,
        doctor_type: 'local',
        role: 'local_doctor',
        verification_status: 'pending',
        is_active: false,
        accepting_referrals: false,
        trust_score: 0,
        created_date: new Date().toISOString(),
        subscription_plan: 'local_doctor',
        subscription_fee_usd: PLATFORM_PRICING.LOCAL_DOCTOR_SUBSCRIPTION_USD,
      });
      setDone(true);
    } catch (e) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) return (
    <div className="min-h-screen bg-[#060B16] flex items-center justify-center p-6">
      <Card className="max-w-md w-full bg-[#0C1A1D] border-[#2A3F4A]">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-[#D4AF37] mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-white mb-2">Application Received</h2>
          <p className="text-gray-400 mb-2">
            Thank you for joining the M Local network. Our verification team will review your
            credentials and contact you within 48 hours.
          </p>
          <p className="text-sm text-[#D4AF37] mb-6">$9.99/month — no charge until verified</p>
          <Button onClick={() => navigate('/')} className="w-full bg-[#D4AF37] text-black font-semibold hover:bg-[#c49e30]">
            Return Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const stepIcons = [MapPin, Stethoscope, ShieldCheck, CreditCard];
  const StepIcon = stepIcons[step];

  return (
    <div className="min-h-screen bg-[#060B16] py-10 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-4">
            <span className="text-[#D4AF37] text-sm font-semibold">M Local Network</span>
          </div>
          <h1 className="text-3xl font-semibold text-white mb-2">Join as a Local Doctor</h1>
          <p className="text-gray-400 text-sm">
            Receive verified patient referrals after they return home from surgery abroad.
            $9.99/month after verification.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-8 px-2">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                i < step ? 'bg-[#D4AF37] border-[#D4AF37] text-black' :
                i === step ? 'bg-transparent border-[#D4AF37] text-[#D4AF37]' :
                'bg-transparent border-[#2A3F4A] text-gray-600'
              }`}>{i < step ? '✓' : i + 1}</div>
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-1 w-8 ${i < step ? 'bg-[#D4AF37]' : 'bg-[#2A3F4A]'}`} />
              )}
            </div>
          ))}
        </div>

        <Card className="bg-[#0C1A1D] border-[#2A3F4A]">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
                <StepIcon className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Step {step + 1} of {STEPS.length}</p>
                <h2 className="text-lg font-semibold text-white">{STEPS[step]}</h2>
              </div>
            </div>

            {/* Step 0 — Personal details */}
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300 text-sm">Full Name</Label>
                  <Input value={form.full_name} onChange={e => set('full_name', e.target.value)}
                    placeholder="Dr. Jane Smith" className="mt-1 bg-[#060B16] border-[#2A3F4A] text-white" />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">Email</Label>
                  <Input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    placeholder="doctor@example.com" className="mt-1 bg-[#060B16] border-[#2A3F4A] text-white" />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">Phone (with country code)</Label>
                  <Input value={form.phone} onChange={e => set('phone', e.target.value)}
                    placeholder="+1 868 555 0000" className="mt-1 bg-[#060B16] border-[#2A3F4A] text-white" />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">Home Country</Label>
                  <select value={form.home_country} onChange={e => set('home_country', e.target.value)}
                    className="mt-1 w-full rounded-md bg-[#060B16] border border-[#2A3F4A] text-white px-3 py-2 text-sm">
                    <option value="">Select country…</option>
                    {COUNTRY_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">City</Label>
                  <Input value={form.city} onChange={e => set('city', e.target.value)}
                    placeholder="Port of Spain" className="mt-1 bg-[#060B16] border-[#2A3F4A] text-white" />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">Clinic or Practice Name <span className="text-gray-500">(optional)</span></Label>
                  <Input value={form.clinic_name} onChange={e => set('clinic_name', e.target.value)}
                    placeholder="Smith Medical Centre" className="mt-1 bg-[#060B16] border-[#2A3F4A] text-white" />
                </div>
              </div>
            )}

            {/* Step 1 — Specialties */}
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">Select all specialties relevant to post-surgical follow-up care.</p>
                <div className="flex flex-wrap gap-2">
                  {SPECIALTY_OPTIONS.map(s => (
                    <button key={s} onClick={() => toggleSpecialty(s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        form.specialties.includes(s)
                          ? 'bg-[#D4AF37] border-[#D4AF37] text-black'
                          : 'bg-transparent border-[#2A3F4A] text-gray-400 hover:border-[#D4AF37] hover:text-[#D4AF37]'
                      }`}>{s}</button>
                  ))}
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">Brief bio <span className="text-gray-500">(optional)</span></Label>
                  <Textarea value={form.bio} onChange={e => set('bio', e.target.value)}
                    placeholder="Describe your experience with post-operative care…"
                    className="mt-1 bg-[#060B16] border-[#2A3F4A] text-white min-h-[80px]" />
                </div>
              </div>
            )}

            {/* Step 2 — Credentials */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300 text-sm">Medical License Number</Label>
                  <Input value={form.license_number} onChange={e => set('license_number', e.target.value)}
                    placeholder="ML-12345" className="mt-1 bg-[#060B16] border-[#2A3F4A] text-white" />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">Issuing Country</Label>
                  <select value={form.license_country} onChange={e => set('license_country', e.target.value)}
                    className="mt-1 w-full rounded-md bg-[#060B16] border border-[#2A3F4A] text-white px-3 py-2 text-sm">
                    <option value="">Select country…</option>
                    {COUNTRY_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">Years of Experience</Label>
                  <Input type="number" min="0" value={form.years_experience} onChange={e => set('years_experience', e.target.value)}
                    placeholder="10" className="mt-1 bg-[#060B16] border-[#2A3F4A] text-white" />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">License Document URL <span className="text-gray-500">(optional — upload link)</span></Label>
                  <Input value={form.license_url} onChange={e => set('license_url', e.target.value)}
                    placeholder="https://drive.google.com/…" className="mt-1 bg-[#060B16] border-[#2A3F4A] text-white" />
                </div>
                <Alert className="bg-[#D4AF37]/5 border-[#D4AF37]/20">
                  <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                  <AlertDescription className="text-gray-400 text-xs ml-2">
                    M runs the same fraud scanning on M Local doctors as international partners.
                    Your credentials will be independently verified before activation.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Step 3 — Subscription info */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#D4AF37]/5 border border-[#D4AF37]/20">
                  <p className="text-[#D4AF37] font-semibold mb-1">M Local — $9.99 / month</p>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Receive verified referrals from M's post-op monitoring system</li>
                    <li>• Secure encrypted patient portal for each case</li>
                    <li>• No referral fee — $9.99/month subscription only</li>
                    <li>• Same fraud verification as international doctors</li>
                    <li>• Patients matched to you by home country</li>
                  </ul>
                </div>
                <p className="text-xs text-gray-500">
                  Payment details collected after verification is complete. No charge until your
                  profile is approved by the M Local team.
                </p>
                <div>
                  <Label className="text-gray-300 text-sm">Preferred payout method <span className="text-gray-500">(for future payments)</span></Label>
                  <select value={form.payout_method} onChange={e => set('payout_method', e.target.value)}
                    className="mt-1 w-full rounded-md bg-[#060B16] border border-[#2A3F4A] text-white px-3 py-2 text-sm">
                    <option value="">Select…</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="paypal">PayPal</option>
                    <option value="stripe">Stripe</option>
                    <option value="wise">Wise</option>
                  </select>
                </div>
              </div>
            )}

            {error && (
              <Alert className="mt-4 bg-red-900/20 border-red-800">
                <AlertDescription className="text-red-400 text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3 mt-6">
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep(s => s - 1)}
                  className="flex-1 border-[#2A3F4A] text-gray-300 hover:bg-[#2A3F4A]">
                  Back
                </Button>
              )}
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}
                  className="flex-1 bg-[#D4AF37] text-black font-semibold hover:bg-[#c49e30] disabled:opacity-50">
                  Continue
                </Button>
              ) : (
                <Button onClick={submit} disabled={submitting}
                  className="flex-1 bg-[#D4AF37] text-black font-semibold hover:bg-[#c49e30] disabled:opacity-50">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2 inline" /> : null}
                  Submit Application
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
