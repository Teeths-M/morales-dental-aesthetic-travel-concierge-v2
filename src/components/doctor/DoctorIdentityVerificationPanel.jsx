import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { friendlyError } from '@/lib/friendlyError';

const PASSED = new Set(['passed', 'manual_override']);

/**
 * DoctorIdentityVerificationPanel — self-contained, no props (mirrors
 * DoctorVerificationPanel.jsx's sibling license-check panel exactly).
 * Backed by startDoctorIdentityVerification, which derives the doctor from
 * the caller's own session — never a client-supplied ID.
 */
export default function DoctorIdentityVerificationPanel() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('startDoctorIdentityVerification', { action: 'get_status' });
      setStatus(res?.data || null);
    } catch (_) { /* leave status null — treated the same as "not yet started" */ }
    setLoading(false);
  };

  const handleVerify = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('startDoctorIdentityVerification', { action: 'start' });
      const url = res?.data?.url;
      if (!url) throw new Error('No verification link returned');
      window.location.href = url;
    } catch (err) {
      setError(friendlyError(err, 'We could not start identity verification. Nothing was submitted — please try again.', 'DoctorIdentityVerificationPanel'));
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="h-20 flex items-center justify-center text-slate-400 text-sm">Checking identity verification status…</div>;
  }

  const verificationStatus = status?.identity_verification_status || 'pending';
  const isVerified = PASSED.has(verificationStatus);
  const hasPendingSession = !!status?.has_pending_session;

  if (isVerified) {
    return (
      <div className="border rounded-xl px-4 py-4 flex items-center gap-4 bg-emerald-50 border-emerald-200">
        <CheckCircle className="w-6 h-6 flex-shrink-0 text-emerald-600" />
        <div className="flex-1">
          <p className="font-semibold text-sm text-emerald-600">Identity Verified</p>
          <p className="text-xs text-slate-600 mt-0.5">Your identity has been confirmed via Stripe Identity.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800">Identity Verification Required</p>
          <p className="text-xs text-amber-700 mt-0.5">
            {verificationStatus === 'failed'
              ? "Your last attempt didn't go through — please try again."
              : 'A quick photo ID + selfie check, handled securely by Stripe. Required before you can be activated on the Morales Platform.'}
          </p>
          {hasPendingSession && (
            <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> You have a verification in progress.
            </p>
          )}
        </div>
        <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white flex-shrink-0"
          onClick={handleVerify} disabled={submitting}>
          {submitting ? '…' : hasPendingSession ? 'Continue Verification' : 'Verify Now'}
        </Button>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
