import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Loader2, CheckCircle2, AlertCircle, Clock, XCircle, FileText, Camera } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import LivenessOverlay from '@/components/trustscan/LivenessOverlay';

// TrustScan — the full-screen identity verification flow. Chat-driven: M-Care
// sends a {{trustscan:...}} chip that opens this page. Steps:
//   1. Consent + country-supported document type selection
//   2. createTrustScanInquiry (records consent, creates pending record,
//      creates a Persona Inquiry)
//   3. Persona embedded flow (document capture + active selfie liveness +
//      face match) wrapped in the neon LivenessOverlay
//   4. Result — only one of four statuses: Verified / Needs review / Unable
//      to verify / Expired document. Polls getMyIdentityStatus until the
//      webhook lands.
//
// Raw document images stay with Persona. M-Care stores only the result,
// vendor reference, consent, and retention schedule. Sandbox first.

const DOC_TYPES = [
  { key: 'passport', label: 'Passport' },
  { key: 'drivers_license', label: 'Driver License' },
  { key: 'national_id', label: 'National ID' },
  { key: 'residence_permit', label: 'Residence Permit' },
];

const STATUS_UI = {
  verified: { icon: CheckCircle2, color: '#10b981', title: 'Identity Verified', desc: 'Your identity has been verified from a trusted source.' },
  needs_review: { icon: Clock, color: '#D4AF37', title: 'Needs Review', desc: 'A human reviewer will look at your case. You have not been denied — a person will explain the next step.' },
  unable_to_verify: { icon: AlertCircle, color: '#f59e0b', title: 'Unable to Verify', desc: 'We could not complete verification automatically. You can request a manual review.' },
  expired_document: { icon: XCircle, color: '#ef4444', title: 'Expired Document', desc: 'The document you presented has expired. Please use a current document.' },
  failed: { icon: AlertCircle, color: '#ef4444', title: 'Verification Failed', desc: 'Something went wrong starting the check. Please try again.' },
};

export default function TrustScan() {
  const navigate = useNavigate();
  const [step, setStep] = useState('consent'); // consent | capturing | result
  const [docType, setDocType] = useState('passport');
  const [country, setCountry] = useState('');
  const [consented, setConsented] = useState(false);
  const [biometricConsented, setBiometricConsented] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inquiryId, setInquiryId] = useState(null);
  const [verificationId, setVerificationId] = useState(null);
  const [status, setStatus] = useState(null);
  const [summary, setSummary] = useState(null);
  const personaContainerRef = useRef(null);
  const personaClientRef = useRef(null);
  const pollRef = useRef(null);

  // Best-effort country detection from the existing IP-geo hook cache.
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('ip_geo_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.country_code) setCountry(parsed.country_code.toUpperCase());
      }
    } catch { /* non-critical */ }
    if (!country) setCountry('TT');
  }, []);

  // Cleanup Persona client + poller on unmount.
  useEffect(() => () => {
    try { personaClientRef.current?.cleanup?.(); } catch { /* noop */ }
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const startVerification = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('createTrustScanInquiry', {
        documentType: docType,
        country: country || 'TT',
        subjectType: 'user',
      });
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      if (!data?.inquiryId) throw new Error('No inquiry id returned.');
      setInquiryId(data.inquiryId);
      setVerificationId(data.verificationId);
      setStep('capturing');
      // Load + init Persona's embedded web SDK.
      initPersona(data.inquiryId);
    } catch (err) {
      setError(err?.message || 'Could not start verification. Please try again.');
      setStep('result');
      setStatus('failed');
    } finally {
      setLoading(false);
    }
  }, [docType, country]);

  const initPersona = useCallback((id) => {
    // Dynamically load Persona's v5 web SDK, then init the client with the
    // inquiry id. Persona renders its own document-capture + active-selfie-
    // liveness UI inside the container; the neon LivenessOverlay wraps it
    // as a branded alignment frame.
    const existing = document.getElementById('persona-sdk-script');
    const onLoad = () => {
      try {
        // eslint-disable-next-line no-undef
        personaClientRef.current = window.Persona.Client.init({
          inquiryId: id,
          embed: true,
          element: personaContainerRef.current,
          environment: 'sandbox',
          onComplete: ({ inquiryId, status }) => {
            // Persona flow finished — poll M-Care for the recorded result.
            startPolling();
          },
          onCancel: () => {
            setStep('consent');
          },
          onError: (err) => {
            console.warn('[TrustScan] Persona error', err);
            setError('The verification provider reported an error. Please try again.');
            setStep('result');
            setStatus('failed');
          },
          onEvent: (name, payload) => {
            // Persona emits step events we could map to the overlay status;
            // the overlay also cycles preview text as a fallback.
          },
        });
        personaClientRef.current?.open?.();
      } catch (err) {
        console.warn('[TrustScan] Persona init failed', err);
        // Fallback: open Persona's hosted flow in a new tab.
        window.open(`https://withpersona.com/flow/${id}?environment=sandbox`, '_blank');
        startPolling();
      }
    };
    if (existing) { onLoad(); return; }
    const script = document.createElement('script');
    script.id = 'persona-sdk-script';
    script.src = 'https://withpersona.com/static/v5/persona-v5.js';
    script.async = true;
    script.onload = onLoad;
    document.body.appendChild(script);
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await base44.functions.invoke('getMyIdentityStatus', { verificationId });
        const data = res?.data || res;
        if (data?.status && data.status !== 'in_progress' && data.status !== 'pending') {
          setStatus(data.status);
          setSummary(data.summary);
          setStep('result');
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch (err) {
        console.warn('[TrustScan] status poll failed', err);
      }
    }, 3000);
  }, [verificationId]);

  // ----- Consent step -----
  if (step === 'consent') {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <header className="flex items-center gap-3 px-4 py-4 border-b border-border">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-secondary"><ArrowLeft className="w-5 h-5" /></button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" style={{ color: '#D4AF37' }} />
            <h1 className="text-lg font-semibold">M-Care TrustScan</h1>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-6 max-w-md mx-auto w-full">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'rgba(212,175,55,0.12)' }}>
              <ShieldCheck className="w-8 h-8" style={{ color: '#D4AF37' }} />
            </div>
            <h2 className="text-2xl font-bold">Verify your identity</h2>
            <p className="mt-2 text-sm text-muted-foreground">Verified from trusted sources, with human review when anything is uncertain. Not a guarantee against all fraud.</p>
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-sm font-semibold">Document type</label>
            <div className="grid grid-cols-2 gap-2">
              {DOC_TYPES.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setDocType(d.key)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-medium transition ${docType === d.key ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-foreground' : 'border-border text-muted-foreground hover:bg-secondary'}`}
                >
                  <FileText className="w-4 h-4" />
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={consented} onChange={(e) => setConsented(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#D4AF37]" />
              <span className="text-sm text-muted-foreground">I consent to M-Care verifying my identity with a government document, an active selfie liveness challenge, and a face match through Persona. Raw document images stay with Persona; M-Care keeps only the result.</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={biometricConsented} onChange={(e) => setBiometricConsented(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#D4AF37]" />
              <span className="text-sm text-muted-foreground">I consent to biometric processing (an active liveness challenge: turn, blink, look at the dot) to prove I am physically present. Biometric data stays with Persona.</span>
            </label>
          </div>

          <div className="rounded-xl border border-border bg-secondary/40 p-4 text-xs text-muted-foreground space-y-2">
            <p className="flex items-center gap-2"><Camera className="w-3.5 h-3.5" /> You'll capture your document live and complete a short liveness challenge.</p>
            <p>Identity data is never used for marketing, AI training, or unrelated profiling.</p>
          </div>

          <button
            onClick={startVerification}
            disabled={!consented || !biometricConsented || loading}
            className="mt-6 w-full rounded-xl py-3.5 font-semibold text-primary-foreground disabled:opacity-40"
            style={{ background: '#D4AF37', color: '#060B16' }}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Start verification'}
          </button>
          {error && <p className="mt-3 text-center text-sm text-destructive">{error}</p>}
        </div>
      </div>
    );
  }

  // ----- Capturing step (Persona embedded + neon overlay) -----
  if (step === 'capturing') {
    return (
      <div className="fixed inset-0 bg-black overflow-hidden">
        {/* Persona renders here; neon overlay wraps it */}
        <div ref={personaContainerRef} className="absolute inset-0" />
        <LivenessOverlay active />
        <button
          onClick={() => { try { personaClientRef.current?.cancel?.(); } catch { /* noop */ } navigate(-1); }}
          className="absolute top-4 right-4 z-30 rounded-full bg-black/40 p-2 text-white"
          aria-label="Cancel"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white">
          M-Care TrustScan · sandbox
        </div>
      </div>
    );
  }

  // ----- Result step -----
  const cfg = STATUS_UI[status || 'failed'] || STATUS_UI.failed;
  const Icon = cfg.icon;
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-secondary"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-semibold">TrustScan result</h1>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full" style={{ background: `${cfg.color}18` }}>
          <Icon className="w-10 h-10" style={{ color: cfg.color }} />
        </div>
        <h2 className="text-2xl font-bold">{cfg.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{cfg.desc}</p>
        {summary && <p className="mt-4 rounded-xl border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">{summary}</p>}
        <div className="mt-6 flex w-full flex-col gap-2">
          {(status === 'needs_review' || status === 'unable_to_verify') && (
            <button
              onClick={async () => {
                try {
                  await base44.functions.invoke('requestManualReview', { verificationId, reviewType: status === 'unable_to_verify' ? 'manual_review' : 'appeal', userNote: '' });
                  navigate('/trust-profile');
                } catch (err) { setError(err?.message || 'Could not request review.'); }
              }}
              className="w-full rounded-xl py-3 font-semibold"
              style={{ background: '#D4AF37', color: '#060B16' }}
            >
              Request human review
            </button>
          )}
          <button onClick={() => navigate('/trust-profile')} className="w-full rounded-xl border border-border py-3 font-semibold">View trust profile</button>
          <button onClick={() => { setStep('consent'); setStatus(null); setError(null); }} className="w-full rounded-xl py-3 text-sm text-muted-foreground">Start over</button>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}