// @ts-nocheck — pre-existing type gaps; build passes
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Newspaper, ExternalLink, CheckCircle2, XCircle, Clock, RefreshCw, Eye,
} from 'lucide-react';

/**
 * AdminEvidenceWatch — the human review queue for the Medical Evidence
 * Watch pipeline (scanEvidenceWatch -> analyzeEvidenceWatch ->
 * evaluateEvidenceWatch, run monthly, plus a narrower weekly recall/
 * safety-alert check). Mirrors AdminIncidentEvidence.jsx's own structure,
 * which itself mirrors AdminDataFreshness.jsx.
 *
 * Unlike the sibling Incident Evidence pipeline's direct entities.update()
 * pattern, every action here calls reviewMedicalDiscovery — a
 * MedicalDiscovery approval is immediately shown to real patients
 * (getEvidenceWatchFeed), so this needs the same server-side actor
 * derivation + hash-chained AuditLog entry that function provides.
 */

const STATUS = {
  queued_for_review:  { label: 'Needs review',    cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  needs_more_evidence:{ label: 'Needs more evidence', cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  approved:           { label: 'Approved',        cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  rejected:           { label: 'Rejected',        cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  dismissed:          { label: 'Dismissed',       cls: 'bg-slate-100 text-slate-500 border-slate-200' },
};

const CONFIDENCE_LABEL = {
  verified: 'Verified',
  promising_but_early: 'Promising — early',
  under_review: 'Under review',
  unverified: 'Unverified',
};

function DiscoveryReviewCard({ item, onDone }) {
  const [notes, setNotes] = useState('');
  const [acting, setActing] = useState('');
  const st = STATUS[item.status] || STATUS.queued_for_review;

  const act = async (decision) => {
    setActing(decision);
    try {
      await base44.functions.invoke('reviewMedicalDiscovery', {
        discovery_id: item.id,
        decision,
        reviewer_notes: notes || undefined,
      });
      onDone();
    } finally {
      setActing('');
    }
  };

  const actionable = item.status === 'queued_for_review' || item.status === 'needs_more_evidence';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <a href={item.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-slate-900 hover:underline flex items-center gap-1">
            <span className="truncate">{item.title}</span>
            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
          </a>
          <div className="text-xs text-slate-500 mt-1">
            {(item.condition_or_procedure && item.condition_or_procedure !== 'unknown') ? item.condition_or_procedure : 'Condition/procedure unknown'} ·{' '}
            {(item.evidence_stage || '').replace(/_/g, ' ')} · {CONFIDENCE_LABEL[item.confidence] || item.confidence} ·{' '}
            {(item.sources || []).length} source(s) ·{' '}
            {item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) : '—'}
          </div>
          {item.plain_language_summary && (
            <p className="text-sm text-slate-700 mt-2 leading-relaxed">{item.plain_language_summary}</p>
          )}
          {item.analysis_method === 'fallback' && (
            <p className="text-xs text-amber-700 mt-1">Automatic extraction failed for this item — needs manual review.</p>
          )}
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${st.cls}`}>{st.label}</span>
      </div>

      {actionable ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reviewer notes (optional)…"
            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 mb-3"
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={!!acting} onClick={() => act('approved')}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="outline" disabled={!!acting} onClick={() => act('rejected')}>
              <XCircle className="w-4 h-4 mr-1" /> Reject
            </Button>
            <Button size="sm" variant="outline" disabled={!!acting} onClick={() => act('needs_more_evidence')}>
              <Eye className="w-4 h-4 mr-1" /> Needs more evidence
            </Button>
            <Button size="sm" variant="outline" disabled={!!acting} onClick={() => act('dismissed')}>
              <XCircle className="w-4 h-4 mr-1" /> Dismiss
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 text-xs text-slate-500">
          {st.label}{item.reviewer_name ? ` by ${item.reviewer_name}` : ''}
          {item.reviewed_at ? ` · ${format(new Date(item.reviewed_at), 'd MMM yyyy')}` : ''}
          {item.reviewer_notes ? ` — ${item.reviewer_notes}` : ''}
        </div>
      )}
    </div>
  );
}

const TABS = [
  { key: 'needs_review', label: 'Needs review' },
  { key: 'approved',     label: 'Approved' },
];

export default function AdminEvidenceWatch() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('needs_review');

  const { data: discoveries = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['medicalDiscoveries'],
    queryFn: () => base44.entities.MedicalDiscovery.list('-created_at', 200).catch(() => []),
    staleTime: 30 * 1000,
  });

  const needsReview = discoveries.filter((d) => d.status === 'queued_for_review' || d.status === 'needs_more_evidence');
  const approved = discoveries.filter((d) => d.status === 'approved');
  const decided = discoveries.filter((d) => d.status === 'rejected' || d.status === 'dismissed');

  const shown = tab === 'needs_review' ? [...needsReview, ...decided] : approved;

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Newspaper className="w-6 h-6 text-emerald-600" />
              <h1 className="text-2xl font-semibold text-slate-900">Medical Evidence Watch</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              New treatments, trials, device approvals, and safety alerts discovered from PubMed,
              ClinicalTrials.gov, openFDA, and reputable reporting — scored, and proposed for your
              review. Nothing here reaches a patient until you approve it.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`text-sm font-semibold px-4 py-2 rounded-full ${tab === key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {label}
              {key === 'needs_review' && needsReview.length > 0 && ` (${needsReview.length})`}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-slate-400"><Clock className="w-6 h-6 mx-auto mb-2 animate-pulse" />Loading…</div>
        ) : shown.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
            {tab === 'needs_review' ? "Nothing to review yet — the scan hasn't found anything ready to review." : 'Nothing approved yet.'}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {shown.map((item) => (
              <DiscoveryReviewCard
                key={item.id}
                item={item}
                onDone={() => qc.invalidateQueries({ queryKey: ['medicalDiscoveries'] })}
              />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
