// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

const GOLD = '#D4AF37';
const CARD = '#0C1A1D';
const BORDER = '#2A3F4A';
const DARK = '#060B16';

/**
 * /confirm-email?token=… — landing page for the "Confirm your email" button
 * in the consultation-received email. Public, token-gated, idempotent.
 * The act of arriving here IS the verification (proof the email landed).
 */
export default function ConfirmEmail() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState('checking'); // checking | ok | failed
  const [firstName, setFirstName] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setState('failed');
      setMessage('This link is missing its confirmation code.');
      return;
    }
    base44.functions.invoke('verifyEmailToken', { token })
      .then((res) => {
        if (res?.data?.verified) {
          setFirstName(res.data.first_name || '');
          setState('ok');
        } else {
          setState('failed');
          setMessage(res?.data?.error || 'This confirmation link is not valid.');
        }
      })
      .catch((e) => {
        setState('failed');
        setMessage(e?.response?.data?.error || 'This confirmation link is not valid.');
      });
  }, [searchParams]);

  return (
    <div style={{ minHeight: '100vh', background: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: '"SF Pro Display", system-ui, sans-serif' }}>
      <div style={{ maxWidth: 420, width: '100%', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: '40px 32px', textAlign: 'center' }}>
        <img src="/morales-m-mark.png" alt="Morales" style={{ width: 44, height: 44, margin: '0 auto 20px', display: 'block' }} />

        {state === 'checking' && (
          <>
            <h1 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 600, color: '#fff' }}>One moment…</h1>
            <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>Confirming your email.</p>
          </>
        )}

        {state === 'ok' && (
          <>
            <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: GOLD }}>Email Confirmed</p>
            <h1 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 600, color: '#fff', lineHeight: 1.35 }}>
              {firstName ? `Thank you, ${firstName}.` : 'Thank you.'}
            </h1>
            <p style={{ margin: '0 0 28px', fontSize: 14.5, lineHeight: 1.65, color: 'rgba(255,255,255,0.6)' }}>
              Your email is confirmed — every update about your journey will reach you here.
              Your coordinator will be in touch within 24 hours.
            </p>
            <Link to="/dashboard" style={{ display: 'inline-block', padding: '13px 28px', borderRadius: 999, background: GOLD, color: DARK, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
              View My Journey
            </Link>
          </>
        )}

        {state === 'failed' && (
          <>
            <h1 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 600, color: '#fff' }}>We couldn't confirm that link</h1>
            <p style={{ margin: '0 0 8px', fontSize: 14.5, lineHeight: 1.65, color: 'rgba(255,255,255,0.6)' }}>{message}</p>
            <p style={{ margin: '0 0 24px', fontSize: 13.5, lineHeight: 1.65, color: 'rgba(255,255,255,0.45)' }}>
              Nothing is lost — your consultation is safe, and your coordinator will verify your email with you directly.
            </p>
            <Link to="/" style={{ color: GOLD, fontSize: 14, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>
              Back to home
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
