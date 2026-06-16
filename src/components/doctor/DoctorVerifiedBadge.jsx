import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle, Clock } from 'lucide-react';

// Lightweight badge component for patient-facing doctor profiles
// Fetches verification status for a given doctor_id and renders the appropriate badge

const badgeCache = {};

export default function DoctorVerifiedBadge({ doctorId, showDetail = false }) {
  const [status, setStatus] = useState(badgeCache[doctorId] || null);

  useEffect(() => {
    if (!doctorId || badgeCache[doctorId]) return;
    base44.entities.DoctorVerification.filter({ doctor_id: doctorId, verification_status: 'verified' }, '-verified_at', 1)
      .then(records => {
        const rec = records[0] || null;
        badgeCache[doctorId] = rec || 'none';
        setStatus(rec || 'none');
      })
      .catch(() => setStatus('none'));
  }, [doctorId]);

  // Also accept auto_verified
  useEffect(() => {
    if (status !== null && status !== 'none') return;
    if (!doctorId) return;
    base44.entities.DoctorVerification.filter({ doctor_id: doctorId, verification_status: 'auto_verified' }, '-verified_at', 1)
      .then(records => {
        if (records[0]) {
          badgeCache[doctorId] = records[0];
          setStatus(records[0]);
        }
      })
      .catch(() => {});
  }, [status, doctorId]);

  if (!status || status === 'none') {
    if (!showDetail) return null;
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
        <Clock className="w-3.5 h-3.5" /> Verification Pending
      </span>
    );
  }

  const rec = typeof status === 'object' ? status : null;

  if (showDetail && rec) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
          <CheckCircle className="w-3.5 h-3.5" /> Verified by Morales
        </span>
        {rec.registry_name && (
          <span className="text-[11px] text-slate-400">via {rec.registry_name}</span>
        )}
        {rec.verified_at && rec.expires_at && (
          <span className="text-[11px] text-slate-400">
            {new Date(rec.verified_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} — Expires {new Date(rec.expires_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
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