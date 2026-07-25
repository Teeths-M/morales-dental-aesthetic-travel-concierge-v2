import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fuzzyMatches } from '@/lib/fuzzyMatch';
import { friendlyError } from '@/lib/friendlyError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  UserPlus, Search, ArrowLeft, CheckCircle2, Upload, X, HeartHandshake,
} from 'lucide-react';

const GOLD = '#D4AF37';
const CONSENT_VERSION = '1.0';
const MAX_PHOTOS = 6;

const cardStyle = { background: '#0C1A1D', border: '1px solid #2A3F4A', borderRadius: 20 };
const labelCls = 'text-[13px] font-semibold text-white/90';
const inputCls = 'mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 focus:ring-1 focus:ring-white/20';

function useDoctorRoster() {
  return useQuery({
    queryKey: ['searchDoctorNames'],
    queryFn: async () => {
      const res = await base44.functions.invoke('searchDoctorNames', {});
      const data = res?.data || res;
      return data?.doctors || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export default function NominateDoctor() {
  const navigate = useNavigate();
  const { data: roster = [] } = useDoctorRoster();

  const [step, setStep] = useState('search'); // search | form | submitted | already_nominated
  const [query, setQuery] = useState('');
  const [dismissedMatch, setDismissedMatch] = useState(false);

  const [form, setForm] = useState({
    doctor_name: '', doctor_email: '', clinic_name: '', country: '', city: '', specialty: '', review_text: '',
  });
  const [consent, setConsent] = useState(false);
  const [photos, setPhotos] = useState([]); // [{name, file_uri}]
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const closeMatch = useMemo(() => {
    if (!query.trim() || dismissedMatch) return null;
    return roster.find((d) => fuzzyMatches(query, d.name, 70)) || null;
  }, [query, roster, dismissedMatch]);

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const goToForm = () => {
    setForm((p) => ({ ...p, doctor_name: query.trim() }));
    setStep('form');
  };

  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, MAX_PHOTOS - photos.length);
    if (!files.length) return;
    setUploading(true);
    setError('');
    try {
      for (const file of files) {
        const result = await base44.integrations.Core.UploadPrivateFile({ file });
        if (result?.file_uri) {
          setPhotos((p) => [...p, { name: file.name, file_uri: result.file_uri }]);
        }
      }
    } catch (err) {
      setError(friendlyError(err, 'We could not upload one of those photos. Please try again.', 'NominateDoctor'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removePhoto = (file_uri) => setPhotos((p) => p.filter((ph) => ph.file_uri !== file_uri));

  const canSubmit = form.doctor_name.trim() && form.doctor_email.trim() && form.country.trim()
    && form.review_text.trim() && consent && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await base44.functions.invoke('submitDoctorNomination', {
        ...form,
        photo_refs: photos.map((p) => p.file_uri),
        photo_review_consent: true,
      });
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      setStep(data?.status === 'already_nominated' ? 'already_nominated' : 'submitted');
    } catch (err) {
      setError(friendlyError(err, 'We could not submit your nomination. Please try again.', 'NominateDoctor'));
    } finally {
      setSubmitting(false);
    }
  };

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
        <UserPlus className="w-5 h-5" style={{ color: GOLD }} />
        <h1 className="text-xl font-semibold text-white">Recommend a doctor to M</h1>
      </div>
      <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.55)' }}>
        Had a great experience with a doctor who isn't on M yet? Tell us — we'll review it and, if it checks out,
        invite them to join. This never books or verifies them automatically; every doctor still goes through M's
        full verification process.
      </p>

      {step === 'search' && (
        <div style={cardStyle} className="p-5">
          <Label className={labelCls}>Doctor's name</Label>
          <div className="relative mt-1.5">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.35)' }} />
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setDismissedMatch(false); }}
              placeholder="e.g. Dr. Pauline Herrera"
              className={`${inputCls} pl-9`}
            />
          </div>

          {closeMatch ? (
            <div className="mt-4 rounded-xl px-4 py-3" style={{ background: 'rgba(212,175,55,0.08)', border: `1px solid ${GOLD}40` }}>
              <p className="text-sm text-white">
                Looks like <strong>{closeMatch.name}</strong> ({closeMatch.clinic_name || closeMatch.country || 'M network'}) might already be on M.
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={() => navigate('/dashboard')}>Great, that's them</Button>
                <Button size="sm" variant="outline" onClick={() => setDismissedMatch(true)}>
                  No, someone else — continue
                </Button>
              </div>
            </div>
          ) : (
            <Button className="mt-4 w-full" disabled={!query.trim()} onClick={goToForm}>
              Continue
            </Button>
          )}
        </div>
      )}

      {step === 'form' && (
        <div style={cardStyle} className="p-5 space-y-4">
          <div>
            <Label className={labelCls}>Doctor's name</Label>
            <Input value={form.doctor_name} onChange={set('doctor_name')} className={inputCls} />
          </div>
          <div>
            <Label className={labelCls}>Doctor's email</Label>
            <Input type="email" value={form.doctor_email} onChange={set('doctor_email')} placeholder="So we can invite them" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={labelCls}>Country</Label>
              <Input value={form.country} onChange={set('country')} className={inputCls} />
            </div>
            <div>
              <Label className={labelCls}>City</Label>
              <Input value={form.city} onChange={set('city')} className={inputCls} />
            </div>
          </div>
          <div>
            <Label className={labelCls}>Clinic name (optional)</Label>
            <Input value={form.clinic_name} onChange={set('clinic_name')} className={inputCls} />
          </div>
          <div>
            <Label className={labelCls}>Specialty / procedure (optional)</Label>
            <Input value={form.specialty} onChange={set('specialty')} placeholder="e.g. Dental implants" className={inputCls} />
          </div>
          <div>
            <Label className={labelCls}>Your honest review</Label>
            <Textarea
              value={form.review_text}
              onChange={set('review_text')}
              rows={4}
              placeholder="What made your experience with this doctor great?"
              className={inputCls}
            />
          </div>

          <div>
            <Label className={labelCls}>Before/after photos (optional)</Label>
            <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Stored privately for our team to review — never shown publicly.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {photos.map((p) => (
                <div key={p.file_uri} className="flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }}>
                  {p.name}
                  <button type="button" onClick={() => removePhoto(p.file_uri)}><X className="w-3 h-3" /></button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <label className="flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 cursor-pointer" style={{ border: '1px dashed rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.6)' }}>
                  <Upload className="w-3 h-3" /> {uploading ? 'Uploading…' : 'Add photo'}
                  <input type="file" accept="image/*" multiple hidden disabled={uploading} onChange={handlePhotoSelect} />
                </label>
              )}
            </div>
          </div>

          <label className="flex items-start gap-2.5 text-xs cursor-pointer pt-2" style={{ borderTop: '1px solid #1e2d35', color: 'rgba(255,255,255,0.6)' }}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
              style={{ accentColor: GOLD }}
            />
            <span>
              I'd like M to reach out and invite this doctor to join, and I consent to my review and any photos
              being used only to help M evaluate them — not published without my further consent. I have a
              good-faith basis for the contact information I've provided.
            </span>
          </label>

          {error && (
            <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>
          )}

          <Button className="w-full" disabled={!canSubmit} onClick={handleSubmit}>
            {submitting ? 'Submitting…' : 'Submit nomination'}
          </Button>
        </div>
      )}

      {(step === 'submitted' || step === 'already_nominated') && (
        <div style={cardStyle} className="p-8 text-center">
          {step === 'submitted' ? (
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: '#34d399' }} />
          ) : (
            <HeartHandshake className="w-10 h-10 mx-auto mb-3" style={{ color: GOLD }} />
          )}
          <p className="text-sm font-semibold text-white">
            {step === 'submitted' ? 'Thank you — we\'ve got it' : 'Someone already recommended this doctor'}
          </p>
          <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {step === 'submitted'
              ? 'Our team will review your nomination before reaching out to the doctor.'
              : 'Thanks for confirming — no need to submit again.'}
          </p>
          <Button size="sm" className="mt-4" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </div>
      )}
    </div>
  );
}

export const NOMINATION_CONSENT_VERSION = CONSENT_VERSION;
