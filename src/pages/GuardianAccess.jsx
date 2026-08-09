import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Eye, Mail, CheckCircle2, Loader2 } from 'lucide-react';

export default function GuardianAccess() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | sent | error

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setState('sending');
    try {
      await base44.functions.invoke('requestGuardianAccess', { email: email.trim() });
      setState('sent');
    } catch (_err) {
      // Same generic outcome either way — never reveal whether the email matched.
      setState('sent');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-900/50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-blue-700/50">
            <Eye className="w-7 h-7 text-blue-400" />
          </div>
          <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest">M-Care Family Portal</p>
          <h1 className="text-2xl font-semibold text-white mt-1">Get Your Link Back</h1>
        </div>

        <div className="bg-slate-800/70 border border-slate-700 rounded-3xl p-6 space-y-5">
          {state !== 'sent' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-slate-400 text-sm text-center">
                Enter the email a traveler shared their journey status with, and we'll send you a fresh link.
              </p>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-300 block">Your email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-slate-900/60 border border-slate-600 text-white rounded-xl pl-11 pr-4 py-3.5 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={state === 'sending' || !email.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-2xl py-3 flex items-center justify-center gap-2 transition-colors"
              >
                {state === 'sending'
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                  : 'Send My Link'}
              </button>
            </form>
          ) : (
            <div className="text-center py-4 space-y-3">
              <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
              <p className="text-white font-semibold text-lg">Check your email</p>
              <p className="text-slate-400 text-sm">
                If we found an active journey shared with this email, a link is on its way to <span className="text-white font-semibold">{email}</span>.
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          No password needed — this only works if a traveler already shared their status with your email. <Link to="/" className="text-blue-400 hover:underline">Back to Morales</Link>
        </p>
      </div>
    </div>
  );
}
