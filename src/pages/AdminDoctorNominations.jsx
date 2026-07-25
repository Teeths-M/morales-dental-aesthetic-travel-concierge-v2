import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  UserPlus, CheckCircle2, XCircle, RefreshCw, Image as ImageIcon, ShieldCheck, Clock,
} from 'lucide-react';

/**
 * AdminDoctorNominations — review queue for patient-submitted doctor
 * nominations. Approve triggers reviewDoctorNomination, which is the only
 * place outreach email actually gets sent — nothing here calls SendEmail
 * directly. Card-list shape reused from ClinicalReviewerDashboard.jsx.
 */
function NominationCard({ nomination, onDone }) {
  const [busy, setBusy] = useState('');
  const [reason, setReason] = useState('');

  const act = async (decision) => {
    setBusy(decision);
    try {
      await base44.functions.invoke('reviewDoctorNomination', {
        nomination_id: nomination.id,
        decision,
        rejection_reason: reason,
      });
      onDone();
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-slate-900">{nomination.doctor_name}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {nomination.doctor_email} · {[nomination.clinic_name, nomination.city, nomination.country].filter(Boolean).join(', ') || 'Location not given'}
          </div>
          {nomination.specialty && (
            <div className="text-xs text-slate-400 mt-0.5">{nomination.specialty}</div>
          )}
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex-shrink-0">
          Pending review
        </span>
      </div>

      <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap">{nomination.review_text}</p>

      {Array.isArray(nomination.photo_refs) && nomination.photo_refs.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {nomination.photo_refs.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1"
            >
              <ImageIcon className="w-3 h-3" /> Photo
            </a>
          ))}
        </div>
      )}

      <div className="mt-4 border-t border-slate-100 pt-4 space-y-2.5">
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Rejection reason (only needed if rejecting)"
          className="text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={!!busy}
            onClick={() => act('approve')}
          >
            <CheckCircle2 className="w-4 h-4 mr-1" /> {busy === 'approve' ? 'Approving…' : 'Approve & invite doctor'}
          </Button>
          <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act('reject')}>
            <XCircle className="w-4 h-4 mr-1" /> {busy === 'reject' ? 'Rejecting…' : 'Reject'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDoctorNominations() {
  const qc = useQueryClient();

  const { data: nominations = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['doctorNominationQueue'],
    queryFn: () => base44.entities.DoctorNomination.filter({ status: 'pending_review' }, '-created_date', 100).catch(() => []),
    staleTime: 30 * 1000,
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-emerald-600" />
            <h1 className="text-2xl font-semibold text-slate-900">Doctor nominations</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Patient-submitted doctors not yet on M. Approving sends a generic invite email — no patient name,
            review text, or photos are ever included.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-400"><Clock className="w-6 h-6 mx-auto mb-2 animate-pulse" />Loading…</div>
      ) : nominations.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
          Nothing needs review right now.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {nominations.map((n) => (
            <NominationCard
              key={n.id}
              nomination={n}
              onDone={() => qc.invalidateQueries({ queryKey: ['doctorNominationQueue'] })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
