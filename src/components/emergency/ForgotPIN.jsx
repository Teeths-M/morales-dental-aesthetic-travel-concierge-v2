import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Mail, ArrowLeft, CheckCircle2, WifiOff, AlertTriangle, Loader2 } from 'lucide-react';

export default function ForgotPIN({ userEmail = '', onBack, pinType = 'emergency' }) {
  const [email, setEmail] = useState(userEmail);
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState('');

  const isOnline = navigator.onLine;

  if (!isOnline) {
    return (
      <div className="space-y-4 text-center py-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mx-auto">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <WifiOff className="w-10 h-10 text-amber-400 mx-auto" />
        <p className="text-slate-200 font-semibold">You are offline.</p>
        <p className="text-slate-400 text-sm">Please connect to the internet to reset your PIN.</p>
      </div>
    );
  }

  if (state === 'sent') {
    return (
      <div className="space-y-4 text-center py-4">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
        <p className="text-slate-100 font-semibold text-lg">Check your email</p>
        <p className="text-slate-400 text-sm">
          We sent a PIN reset link to{' '}
          <span className="text-white font-semibold">{email}</span>.
          <br />The link expires in 15 minutes.
        </p>
        <p className="text-slate-500 text-xs">Didn't get it? Check your spam folder.</p>
        <button onClick={onBack} className="text-blue-400 text-xs hover:underline mt-2">
          Back to PIN entry
        </button>
      </div>
    );
  }

  const handleSend = async () => {
    if (!email || !email.includes('@')) return;
    setState('sending');
    setErrorMsg('');
    try {
      await base44.functions.invoke('requestPINReset', { user_email: email.toLowerCase().trim(), pin_type: pinType });
      setState('sent');
    } catch {
      setState('error');
      setErrorMsg("We couldn't send the reset email. Please try again.");
    }
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      <div className="text-center">
        <div className="w-12 h-12 bg-blue-900/40 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-blue-700/40">
          <Mail className="w-6 h-6 text-blue-400" />
        </div>
        <h3 className="font-semibold text-slate-100 text-lg">Reset your PIN</h3>
        <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
          Enter your account email. We'll send a secure link to set a new PIN.
        </p>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-300 block">Your email address</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && state !== 'sending' && handleSend()}
          placeholder="you@email.com"
          className="w-full bg-slate-900/60 border border-slate-600 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        {state === 'error' && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {errorMsg}
          </div>
        )}
        <button
          onClick={handleSend}
          disabled={state === 'sending' || !email.includes('@')}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-2xl py-3 flex items-center justify-center gap-2 transition-colors"
        >
          {state === 'sending'
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
            : 'Send Reset Link'}
        </button>
      </div>

      <p className="text-center text-xs text-slate-500">
        🔒 Reset link expires in 15 minutes and can only be used once.
      </p>
    </div>
  );
}
