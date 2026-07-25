import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

const GOLD = '#D4AF37';

/**
 * DoctorOutreachOptOut — public, token-gated. The only way a doctor with no
 * M account can opt out of nomination-outreach email. No login, no PHI shown.
 */
export default function DoctorOutreachOptOut() {
  const { token } = useParams();
  const [state, setState] = useState('loading'); // loading | done | error

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke('optOutDoctorOutreach', { token });
        const data = res?.data || res;
        if (cancelled) return;
        setState(data?.status === 'opted_out' ? 'done' : 'error');
      } catch (_) {
        if (!cancelled) setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#060B16' }}>
      <div
        className="max-w-sm w-full text-center rounded-2xl p-8"
        style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}
      >
        <div className="text-2xl font-bold mb-4" style={{ color: GOLD }}>M</div>

        {state === 'loading' && (
          <>
            <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: 'rgba(255,255,255,0.5)' }} />
            <p className="text-sm text-white/70">One moment…</p>
          </>
        )}

        {state === 'done' && (
          <>
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: '#34d399' }} />
            <p className="text-sm font-semibold text-white">You're opted out</p>
            <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
              We won't contact you about this again.
            </p>
          </>
        )}

        {state === 'error' && (
          <>
            <AlertTriangle className="w-10 h-10 mx-auto mb-3" style={{ color: '#f87171' }} />
            <p className="text-sm font-semibold text-white">This link is invalid or has expired</p>
            <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
              If you believe you're receiving unwanted messages, please contact us directly.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
