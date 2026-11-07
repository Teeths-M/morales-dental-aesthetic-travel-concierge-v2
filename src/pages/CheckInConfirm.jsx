import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, XCircle, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { checkInCodeError, isCheckInCode } from '@/lib/checkInCode';

// Public page — no login required. Validates one-time email token.
// Route: /check-in/:check_in_id?token=<raw_token>

export default function CheckInConfirm() {
  const { check_in_id } = useParams();
  const [status, setStatus] = useState('loading'); // loading | need_code | success | already_done | invalid | expired
  const [_message, setMessage] = useState('');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');

  // With a check-in code set, the link alone doesn't mark the traveler safe: the server asks for the code
  // (CODE_REQUIRED), and a wrong one can be retried (INVALID_CODE) without using up the link.
  const submitConfirmation = (withCode) => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token || !check_in_id) {
      setStatus('invalid');
      setMessage('This link is missing required information.');
      return;
    }

    base44.functions.invoke('confirmSoloCheckIn', withCode ? { check_in_id, token, code: withCode } : { check_in_id, token })
      .then(res => {
        const { code, message: msg } = res.data;
        if (code === 'SUCCESS') {
          setStatus('success');
        } else if (code === 'ALREADY_USED' || code === 'ALREADY_ACKNOWLEDGED') {
          setStatus('already_done');
        } else {
          setStatus('invalid');
        }
        setMessage(msg || '');
      })
      .catch(err => {
        const reason = checkInCodeError(err);
        if (reason) {
          setStatus('need_code');
          setCode('');
          setCodeError(reason === 'INVALID_CODE' ? "That code didn't match. Check it and try again." : '');
          return;
        }
        const errCode = err?.response?.data?.code;
        if (errCode === 'EXPIRED') {
          setStatus('expired');
          setMessage('This link has expired. Please log in to confirm you\'re safe.');
        } else {
          setStatus('invalid');
          setMessage(err?.response?.data?.error || 'Something went wrong.');
        }
      });
  };

  useEffect(() => { submitConfirmation(null); }, [check_in_id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-emerald-950 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-10 text-center">
        {/* Branding */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-emerald-800 rounded-xl flex items-center justify-center">
            <span className="text-white font-serif font-semibold text-lg">M</span>
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-800 leading-tight">M-Care</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Solo Traveler Safety</p>
          </div>
        </div>

        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-emerald-600 animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-semibold text-slate-800 mb-2">Confirming Your Safety…</h1>
            <p className="text-slate-500 text-sm">Verifying your secure link. Just a moment.</p>
          </>
        )}

        {status === 'need_code' && (
          <form
            onSubmit={(e) => { e.preventDefault(); if (isCheckInCode(code)) { setStatus('loading'); submitConfirmation(code); } }}
            className="flex flex-col gap-3"
          >
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Shield className="w-11 h-11 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-800">Enter your check-in code</h1>
            <p className="text-slate-600 text-sm mb-2">Your 4-digit code confirms it is really you.</p>
            <label htmlFor="checkin-confirm-code" className="sr-only">Check-in code</label>
            <input
              id="checkin-confirm-code"
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="h-14 w-full rounded-xl border border-slate-300 px-3 text-center text-3xl tracking-[0.6em] text-slate-900"
              autoFocus
            />
            {codeError && <p role="alert" className="text-sm text-red-600">{codeError}</p>}
            <Button type="submit" disabled={!isCheckInCode(code)} className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-white text-base font-semibold rounded-xl">
              Confirm I&apos;m safe
            </Button>
          </form>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-semibold text-emerald-700 mb-3">You're Marked Safe!</h1>
            <p className="text-slate-600 text-base mb-6">
              ✅ You have been marked as safe. Thank you for confirming. Your emergency contacts will not be notified.
            </p>
            <Link to="/dashboard">
              <Button className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-white text-base font-semibold rounded-xl">
                Go to My Dashboard
              </Button>
            </Link>
          </>
        )}

        {status === 'already_done' && (
          <>
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-blue-500" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-800 mb-3">Already Confirmed</h1>
            <p className="text-slate-600 text-base mb-6">
              ✅ You have already confirmed you're safe for this check-in. No further action needed.
            </p>
            <Link to="/dashboard">
              <Button className="w-full h-12 bg-slate-700 hover:bg-slate-800 text-white text-base font-semibold rounded-xl">
                Go to My Dashboard
              </Button>
            </Link>
          </>
        )}

        {status === 'expired' && (
          <>
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-12 h-12 text-amber-500" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-800 mb-3">Link Expired</h1>
            <p className="text-slate-600 text-base mb-6">
              ❌ This link has expired (valid for 24 hours). Please log in to your dashboard to confirm you're safe.
            </p>
            <Link to="/dashboard/solo-checkin">
              <Button className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white text-base font-semibold rounded-xl">
                Log In & Confirm Safety
              </Button>
            </Link>
          </>
        )}

        {status === 'invalid' && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-800 mb-3">Invalid Link</h1>
            <p className="text-slate-600 text-base mb-6">
              ❌ This link is invalid or has already been used. Please log in to your dashboard to confirm you're safe.
            </p>
            <Link to="/dashboard/solo-checkin">
              <Button className="w-full h-12 bg-red-600 hover:bg-red-700 text-white text-base font-semibold rounded-xl">
                Log In & Confirm Safety
              </Button>
            </Link>
          </>
        )}

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Shield className="w-3.5 h-3.5" />
          <span>M-Care Solo Traveler Protection · One-time secure link</span>
        </div>
      </div>
    </div>
  );
}