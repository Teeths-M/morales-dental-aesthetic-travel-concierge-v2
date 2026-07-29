// @ts-nocheck — pre-existing type gaps; build passes
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAdminCasesShared, ADMIN_CASES_QUERY_KEY, selectByStatus } from '@/hooks/useAdminCasesCache';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  HeartPulse, Sparkles, CheckCircle2, XCircle, Clock, RefreshCw, ShieldCheck,
} from 'lucide-react';

/**
 * ClinicalReviewerDashboard — Recovery Wellness Guidance review queue.
 *
 * Phase 1 only: general wellness guidance (hydration/rest/activity/wound-care),
 * never specific supplements/doses, and no automated interaction dataset — the
 * reviewer is professionally responsible for checking the patient's disclosed
 * medications/allergies/conditions themselves and must explicitly attest to it
 * before approval is even accepted server-side. Nothing here reaches a patient
 * until Approve is pressed. Card-list shape reused from AdminDataFreshness.jsx.
 */
const RECOVERY_STATUSES = ['Recovery', 'RECOVERY_PHASE_7_DAY'];

function GuidanceCard({ caseRecord, currentUser, onDone }) {
  const [draft, setDraft] = useState(null); // { draft_id, draft_text, guidance_status, fail_closed_reason }
  const [editedText, setEditedText] = useState('');
  const [credential, setCredential] = useState('');
  const [attested, setAttested] = useState(false);
  const [busy, setBusy] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const generateDraft = async () => {
    setBusy('drafting');
    try {
      const res = await base44.functions.invoke('draftRecoveryGuidance', { case_id: caseRecord.id });
      const data = res?.data || res;
      setDraft(data);
      setEditedText(data?.draft_text || '');
    } finally {
      setBusy('');
    }
  };

  const submit = async (action) => {
    setBusy(action);
    try {
      await base44.functions.invoke('reviewRecoveryGuidance', {
        draft_id: draft.draft_id,
        case_id: caseRecord.id,
        action,
        final_text: editedText,
        interaction_attestation: attested,
        reviewer_credential: credential,
        rejection_reason: rejectReason,
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
          <div className="font-semibold text-slate-900">{caseRecord.client_name || 'Patient'}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {(caseRecord.procedures || []).join(', ') || 'Procedure not specified'} · status {caseRecord.status}
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
          Pending guidance
        </span>
      </div>

      {!draft && (
        <div className="mt-4">
          <Button size="sm" disabled={!!busy} onClick={generateDraft}>
            <Sparkles className="w-4 h-4 mr-1" /> {busy === 'drafting' ? 'Generating…' : 'Generate draft'}
          </Button>
        </div>
      )}

      {draft && draft.guidance_status === 'insufficient_information' && (
        <div className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          Insufficient information to draft guidance ({draft.fail_closed_reason || 'unknown reason'}) — no active
          recovery timeline or procedure type found for this case.
        </div>
      )}

      {draft && draft.guidance_status === 'draft_ready' && (
        <div className="mt-4 border-t border-slate-100 pt-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">AI draft — edit before approving</p>
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={4}
            className="text-sm"
          />
          <Input
            value={credential}
            onChange={(e) => setCredential(e.target.value)}
            placeholder="Your credential (e.g. PharmD, License #12345 — shown to the patient)"
            className="text-sm"
          />
          <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={attested}
              onChange={(e) => setAttested(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I have reviewed this patient's disclosed medications, allergies, and conditions and confirm this
              guidance is appropriate. No automated interaction dataset is used in Phase 1 — this check is mine.
            </span>
          </label>
          <Input
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Rejection reason (only needed if rejecting)"
            className="text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!!busy || !attested || !editedText.trim()}
              onClick={() => submit('approve')}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" /> Approve & send to patient
            </Button>
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => submit('reject')}>
              <XCircle className="w-4 h-4 mr-1" /> Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClinicalReviewerDashboard() {
  const qc = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me().catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  // Shared across every admin-area page — see useAdminCasesCache.js (Base44's
  // 100-ops/min-per-user rate limit was being tripped by ~9 separate pages
  // each independently fetching CaseRecord). Derives the same 2-status view
  // client-side instead of its own 2 parallel calls.
  const { data: allCases = [], isLoading, refetch, isFetching } = useAdminCasesShared();
  const cases = selectByStatus(allCases, RECOVERY_STATUSES);

  const pending = cases.filter((c) => !c.recovery_guidance_text);
  const resolved = cases.filter((c) => !!c.recovery_guidance_text);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-emerald-600" />
            <h1 className="text-2xl font-semibold text-slate-900">Recovery wellness guidance review</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            General post-op wellness guidance only — no specific supplements or doses, no automated interaction
            dataset in this phase. Nothing reaches a patient until you approve it.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-400"><Clock className="w-6 h-6 mx-auto mb-2 animate-pulse" />Loading…</div>
      ) : pending.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
          Nothing needs review right now.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((c) => (
            <GuidanceCard
              key={c.id}
              caseRecord={c}
              currentUser={currentUser}
              onDone={() => qc.invalidateQueries({ queryKey: ADMIN_CASES_QUERY_KEY })}
            />
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Already sent ({resolved.length})
          </p>
          <div className="flex flex-col gap-2">
            {resolved.map((c) => (
              <div key={c.id} className="bg-white border border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-600 flex items-center justify-between">
                <span>{c.client_name || 'Patient'}</span>
                <span className="text-xs text-slate-400">
                  reviewed by {c.recovery_guidance_reviewer_name || '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
