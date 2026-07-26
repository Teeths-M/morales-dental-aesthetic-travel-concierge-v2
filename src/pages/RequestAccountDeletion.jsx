import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * The web-accessible account-deletion request path (Google Play requires
 * this reachable without opening the app, alongside in-app deletion). Public,
 * no login required. Files a request into an admin-only queue for staff to
 * verify and action — see base44/functions/requestAccountDeletion/entry.ts.
 */
export default function RequestAccountDeletion() {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    setError('');
    try {
      const res = await base44.functions.invoke('requestAccountDeletion', {
        email: email.trim(),
        reason: reason.trim(),
      });
      if (!res.data?.received) {
        throw new Error(res.data?.error || 'Something went wrong.');
      }
      setStatus('sent');
    } catch (err) {
      setError(err?.response?.data?.error || 'We couldn’t submit that just now — please try again shortly, or email us directly.');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#060B16] via-[#0A101D] to-[#060B16]">
      <div className="max-w-xl mx-auto px-6 lg:px-8 py-16 lg:py-24">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] mb-4" style={{ color: '#D4AF37' }}>
          Privacy
        </p>
        <h1 className="font-display text-3xl lg:text-4xl text-white mb-3">Request Account Deletion</h1>
        <p className="text-sm text-white/60 leading-relaxed mb-10">
          Tell us the email your account uses, and we'll review and process the deletion of your personal
          data. You don't need the app installed or to sign in to submit this request.
        </p>

        {status === 'sent' ? (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 px-5 py-4">
            <p className="text-sm text-emerald-300 font-semibold mb-1">Request received.</p>
            <p className="text-sm text-white/60 leading-relaxed">
              Our team will review this request and process the deletion. If you'd rather delete your
              account instantly, you can also do this from Settings while signed in to the app.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-white/50 mb-1.5">
                Account email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>
            <div>
              <label htmlFor="reason" className="block text-xs font-semibold text-white/50 mb-1.5">
                Reason (optional)
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>

            {status === 'error' && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-lg px-5 py-3 text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ background: '#D4AF37', color: '#060B16' }}
            >
              {status === 'sending' ? 'Submitting…' : 'Submit request'}
            </button>
          </form>
        )}

        <p className="text-xs text-white/30 mt-10 pt-6 border-t border-white/10">
          Questions? Contact us at{' '}
          <a href="mailto:info@moralesconcierge.com" className="text-white/50 underline">info@moralesconcierge.com</a>.
        </p>
      </div>
    </div>
  );
}
