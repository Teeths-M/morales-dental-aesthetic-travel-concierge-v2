import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle, Clock, ShieldOff } from 'lucide-react';

// ── DoctorVerifiedBadge ───────────────────────────────────────────────────────
// Patient-facing badge shown on doctor profiles and search cards.
//
// SECURITY: Checks the Doctor entity's OWN verification_status field —
// not just DoctorVerification records. This prevents a scenario where
// the Doctor entity has status='active' but verification records don't
// exist or are in an inconsistent state.
//
// A badge is shown ONLY when BOTH conditions are true:
//   1. doctor.license_verified === true
//   2. doctor.verification_status ∈ VERIFIED_TERMINAL_STATES
//
// Any other state shows nothing (showDetail=false) or an explicit
// "Pending Review" label (showDetail=true). Never shows "Verified" for
// an unverified doctor under any circumstances.

// Terminal states that indicate a completed, human-approved verification.
// 'auto_verified' is excluded — the only auto-verified non-doctors (e.g.
// travel agencies) should not appear in doctor badge contexts.
const VERIFIED_TERMINAL = new Set(['verified', 'manually_approved']);

// Per-component cache to avoid redundant API calls on re-render
const doctorCache = {};

export default function DoctorVerifiedBadge({ doctorId, showDetail = false }) {
  const [doctorData, setDoctorData] = useState(doctorCache[doctorId] || null);

  useEffect(() => {
    if (!doctorId) return;
    if (doctorCache[doctorId]) { setDoctorData(doctorCache[doctorId]); return; }

    // Fetch the Doctor entity directly — source of truth for activation state
    base44.entities.Doctor.get(doctorId)
      .then(doc => {
        const result = doc || 'not_found';
        doctorCache[doctorId] = result;
        setDoctorData(result);
      })
      .catch(() => {
        doctorCache[doctorId] = 'error';
        setDoctorData('error');
      });
  }, [doctorId]);

  if (!doctorData || doctorData === 'error' || doctorData === 'not_found') {
    if (!showDetail) return null;
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-medium">
        <Clock className="w-3.5 h-3.5" /> Loading…
      </span>
    );
  }

  const isVerified =
    doctorData.license_verified === true &&
    VERIFIED_TERMINAL.has(doctorData.verification_status);

  const _isPending = !isVerified && doctorData.status !== 'inactive';
  const isRejected = doctorData.verification_status === 'rejected' ||
    doctorData.verification_status === 'failed' ||
    doctorData.status === 'inactive';

  // Verified state
  if (isVerified) {
    if (showDetail) {
      return (
        <div className="flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
            <CheckCircle className="w-3.5 h-3.5" /> Verified by Morales
          </span>
          {doctorData.verification_method && (
            <span className="text-[11px] text-slate-400">
              via {doctorData.verification_method === 'government_registry' ? 'Government Registry' :
                doctorData.verification_method === 'advisory_team' ? 'Advisory Team Review' :
                'Manual Document Review'}
            </span>
          )}
          {doctorData.verified_at && (
            <span className="text-[11px] text-slate-400">
              Verified {new Date(doctorData.verified_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          )}
        </div>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
        <CheckCircle className="w-3 h-3" /> Verified by Morales
      </span>
    );
  }

  // Rejected/failed — only show in detail mode, not silently
  if (isRejected && showDetail) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
        <ShieldOff className="w-3.5 h-3.5" /> Not Verified
      </span>
    );
  }

  // Pending or unknown — show detail if requested, otherwise return null
  if (!showDetail) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
      <Clock className="w-3.5 h-3.5" /> Verification Pending
    </span>
  );
}
