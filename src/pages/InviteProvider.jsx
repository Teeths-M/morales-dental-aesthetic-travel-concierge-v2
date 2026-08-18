import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { friendlyError } from '@/lib/friendlyError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft, Stethoscope, Plane, Car, Shield, HeartHandshake,
  CheckCircle2, Loader2, Sparkles,
} from 'lucide-react';

const GOLD = '#D4AF37';

const PROVIDER_TYPES = [
  { key: 'doctor', label: 'Doctor', icon: Stethoscope, desc: 'Your personal physician, dentist, or surgeon' },
  { key: 'travel_agency', label: 'Travel Agency', icon: Plane, desc: 'A travel agent you trust for flights & hotels' },
  { key: 'taxi', label: 'Taxi / Driver', icon: Car, desc: 'A driver or transport service you use' },
  { key: 'security', label: 'Security', icon: Shield, desc: 'A security partner or agency you rely on' },
  { key: 'companion', label: 'Companion', icon: HeartHandshake, desc: 'A recovery companion or caregiver' },
];

const cardStyle = { background: '#0C1A1D', border: '1px solid #2A3F4A', borderRadius: 20 };
const labelCls = 'text-[13px] font-semibold text-white/90';
const inputCls = 'mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 focus:ring-1 focus:ring-white/20';

export default function InviteProvider() {
  const navigate = useNavigate();
  const [step, setStep] = useState('select'); // select | form | submitted
  const [providerType, setProviderType] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resultMessage, setResultMessage] = useState('');

  const [form, setForm] = useState({
    provider_name: '', provider_email: '', provider_phone: '',
    provider_country: '', provider_city: '', clinic_name: '',
    specialty: '', website_url: '', patient_relationship: '', patient_note: '',
  });

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const canSubmit = form.provider_name.trim() && form.provider_email.trim()
    && form.provider_country.trim() && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await base44.functions.invoke('invitePersonalProvider', {
        ...form,
        provider_type: providerType,
      });
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      setResultMessage(data?.message || "I'm verifying your provider now.");
      setStep('submitted');
    } catch (err) {
      setError(friendlyError(err, 'We could not submit your invite. Please try again.', 'InviteProvider'));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedType = PROVIDER_TYPES.find((t) => t.key === providerType);

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-1.5 text-xs mb-5"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
      </button>

      <div className="flex items-center gap-2.5 mb-1.5">
        <Sparkles className="w-5 h-5" style={{ color: GOLD }} />
        <h1 className="text-xl font-semibold text-white">Add your own provider to M-Care</h1>
      </div>
      <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.55)' }}>
        Bring your trusted doctor, travel agent, driver, or security partner into your M-Care ecosystem.
        I'll verify their credentials immediately and keep you updated — so your care network grows around
        the people you already trust, and you never hit a dead end.
      </p>

      {step === 'select' && (
        <div className="space-y-2.5">
          {PROVIDER_TYPES.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => { setProviderType(t.key); setStep('form'); }}
                className="w-full text-left p-4 transition-all hover:scale-[1.01]"
                style={cardStyle}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(212,175,55,0.1)', border: `1px solid ${GOLD}30` }}>
                    <Icon className="w-5 h-5" style={{ color: GOLD }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{t.label}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{t.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {step === 'form' && selectedType && (
        <div style={cardStyle} className="p-5 space-y-4">
          <button
            type="button"
            onClick={() => setStep('select')}
            className="flex items-center gap-1.5 text-xs"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Choose a different type
          </button>

          <div className="flex items-center gap-2.5 pb-3" style={{ borderBottom: '1px solid #1e2d35' }}>
            <selectedType.icon className="w-5 h-5" style={{ color: GOLD }} />
            <span className="text-sm font-semibold text-white">{selectedType.label}</span>
          </div>

          <div>
            <Label className={labelCls}>{selectedType.label} name *</Label>
            <Input value={form.provider_name} onChange={set('provider_name')} className={inputCls}
              placeholder={providerType === 'doctor' ? 'Dr. Jane Smith' : 'Acme Travel Co.'} />
          </div>
          <div>
            <Label className={labelCls}>Email *</Label>
            <Input type="email" value={form.provider_email} onChange={set('provider_email')} className={inputCls}
              placeholder="So M-Care can reach out and invite them" />
          </div>
          <div>
            <Label className={labelCls}>Phone (optional)</Label>
            <Input value={form.provider_phone} onChange={set('provider_phone')} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={labelCls}>Country *</Label>
              <Input value={form.provider_country} onChange={set('provider_country')} className={inputCls} />
            </div>
            <div>
              <Label className={labelCls}>City</Label>
              <Input value={form.provider_city} onChange={set('provider_city')} className={inputCls} />
            </div>
          </div>

          {providerType === 'doctor' && (
            <>
              <div>
                <Label className={labelCls}>Clinic / hospital (optional)</Label>
                <Input value={form.clinic_name} onChange={set('clinic_name')} className={inputCls} />
              </div>
              <div>
                <Label className={labelCls}>Specialty (optional)</Label>
                <Input value={form.specialty} onChange={set('specialty')} className={inputCls}
                  placeholder="e.g. Dental implants, plastic surgery" />
              </div>
            </>
          )}

          {providerType !== 'companion' && (
            <div>
              <Label className={labelCls}>Website (optional)</Label>
              <Input value={form.website_url} onChange={set('website_url')} className={inputCls}
                placeholder="https://" />
            </div>
          )}

          <div>
            <Label className={labelCls}>How do you know them? (optional)</Label>
            <Input value={form.patient_relationship} onChange={set('patient_relationship')} className={inputCls}
              placeholder="e.g. My family dentist for 10 years" />
          </div>
          <div>
            <Label className={labelCls}>Anything M-Care should know? (optional)</Label>
            <Textarea value={form.patient_note} onChange={set('patient_note')} rows={3} className={inputCls}
              placeholder="Why you trust them, or what you'd like M-Care to coordinate" />
          </div>

          {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}

          <Button className="w-full" disabled={!canSubmit} onClick={handleSubmit}>
            {submitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding to your ecosystem…</>
            ) : (
              `Add this ${selectedType.label.toLowerCase()} to my ecosystem`
            )}
          </Button>

          <p className="text-[11px] text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
            M-Care verifies every provider before they can be assigned to your care — no exceptions.
          </p>
        </div>
      )}

      {step === 'submitted' && (
        <div style={cardStyle} className="p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(212,175,55,0.1)', border: `1px solid ${GOLD}40` }}>
            <CheckCircle2 className="w-7 h-7" style={{ color: GOLD }} />
          </div>
          <p className="text-sm font-semibold text-white">Added to your ecosystem</p>
          <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {resultMessage}
          </p>
          <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.45)' }}>
            You'll see updates in your dashboard as M-Care verifies them.
          </p>
          <div className="flex gap-2 justify-center mt-5">
            <Button size="sm" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
            <Button size="sm" variant="outline" onClick={() => { setStep('select'); setForm({ provider_name: '', provider_email: '', provider_phone: '', provider_country: '', provider_city: '', clinic_name: '', specialty: '', website_url: '', patient_relationship: '', patient_note: '' }); }}>
              Add another
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}