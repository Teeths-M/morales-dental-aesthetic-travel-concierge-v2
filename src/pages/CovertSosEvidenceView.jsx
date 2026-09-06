import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Camera, Loader2, AlertTriangle } from 'lucide-react';

// CovertSosEvidenceView — public, token-gated page (/sos-evidence/:token).
// Whoever received a covert-SOS follow-up alert (guardian, admin, security
// agency) opens this link directly, no login required, and sees the one
// rear-camera photo captured following the trigger. A fresh, short-lived
// signed URL is minted server-side each time this loads (see
// getCovertSosEvidence) — the link itself never carries anything more than
// an opaque token.

export default function CovertSosEvidenceView() {
  const { token } = useParams();
  const [state, setState] = useState('loading'); // loading | ready | error
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMsg('No token provided.');
      return;
    }
    (async () => {
      try {
        const res = await base44.functions.invoke('getCovertSosEvidence', { token });
        // base44.functions.invoke resolves to the raw axios response, not the
        // JSON body — read res?.data, matching every other correct call site
        // in this app (see ShareLiveLocation.jsx's own comment on this).
        const body = res?.data;
        if (!body?.signed_url) throw new Error('No photo available.');
        setData(body);
        setState('ready');
      } catch (e) {
        setErrorMsg(e?.response?.data?.error || e?.message || 'This link could not be loaded.');
        setState('error');
      }
    })();
  }, [token]);

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="w-7 h-7 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading photo…</p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="text-xl font-display font-semibold text-foreground mb-2">Link unavailable</h1>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
        </div>
      </div>
    );
  }

  const firstName = (data?.patient_name || '').split(' ')[0] || '';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-10">
      <div className="max-w-md w-full">
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: '#D4AF37', color: '#060B16' }}>
            <Camera className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-display font-semibold text-foreground">
            {firstName ? `Covert SOS — ${firstName}` : 'Covert SOS Evidence'}
          </h1>
          {data?.captured_at && (
            <p className="text-sm text-muted-foreground mt-1">
              Captured {new Date(data.captured_at).toLocaleString()}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <img src={data.signed_url} alt="Covert SOS evidence" className="w-full h-auto block" />
        </div>

        {typeof data?.accesses_remaining === 'number' && (
          <p className="text-[11px] text-muted-foreground/80 text-center mt-4">
            This link may be opened {data.accesses_remaining} more time{data.accesses_remaining === 1 ? '' : 's'}.
          </p>
        )}
      </div>
    </div>
  );
}
