// @ts-nocheck — pre-existing type gaps; build passes
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, format } from 'date-fns';
import {
  ShieldAlert, ScrollText, Users, Newspaper, ExternalLink,
  CheckCircle2, XCircle, Clock, RefreshCw, Eye, AlertTriangle,
} from 'lucide-react';

/**
 * AdminIncidentEvidence — the human review queue for the Evidence Monitoring
 * pipeline (scanIncidentEvidence -> analyzeIncidentEvidence ->
 * evaluateIncidentEvidence -> proposeSafetyLearning, run monthly). Mirrors
 * AdminDataFreshness.jsx's structure directly.
 *
 * Nothing here is ever already-active: a ProposedSafetyRule is a plain-
 * language clinician-review prompt with no path anywhere in this app that
 * consumes an 'approved' row automatically, and a ProviderSafetyReviewTask
 * is a private task, never a public warning. This page is where a human
 * approves/rejects/actions those — the ONLY place either ever changes state.
 */

const RULE_STATUS = {
  pending_review:     { label: 'Pending review',     cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  approved:           { label: 'Approved',            cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  rejected:           { label: 'Rejected',             cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  needs_more_evidence:{ label: 'Needs more evidence',  cls: 'bg-blue-100 text-blue-800 border-blue-200' },
};

const TASK_STATUS = {
  open:                 { label: 'Open',                  cls: 'bg-red-100 text-red-800 border-red-200' },
  in_review:            { label: 'In review',              cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  resolved_no_action:   { label: 'Resolved — no action',   cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  resolved_action_taken:{ label: 'Resolved — action taken',cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  dismissed:            { label: 'Dismissed',              cls: 'bg-slate-100 text-slate-500 border-slate-200' },
};

const TIER_LABEL = {
  authoritative_primary: 'Regulator / court / official',
  established_reporting: 'Established reporting',
  professional_publication: 'Professional publication',
  user_generated: 'Social / user-generated',
  unknown: 'Unclassified source',
};

function RuleCard({ rule, currentUser, onDone }) {
  const [notes, setNotes] = useState('');
  const [acting, setActing] = useState('');
  const st = RULE_STATUS[rule.review_status] || RULE_STATUS.pending_review;

  const act = async (review_status) => {
    setActing(review_status);
    try {
      await base44.entities.ProposedSafetyRule.update(rule.id, {
        review_status,
        reviewer_id: currentUser?.id || '',
        reviewer_name: currentUser?.email || '',
        reviewed_at: new Date().toISOString(),
        ...(notes ? { reviewer_notes: notes } : {}),
      });
      onDone();
    } finally {
      setActing('');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <ScrollText className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-sm text-slate-900 leading-relaxed">{rule.rule_text}</p>
            <div className="text-xs text-slate-500 mt-1">
              {(rule.rule_category || '').replace(/_/g, ' ')} · {rule.source_count || (rule.evidence_incident_ids || []).length} source(s) · {rule.confidence ?? '—'}% confidence · {rule.created_at ? formatDistanceToNow(new Date(rule.created_at), { addSuffix: true }) : '—'}
            </div>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${st.cls}`}>{st.label}</span>
      </div>

      {rule.review_status === 'pending_review' || rule.review_status === 'needs_more_evidence' ? (
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
          </div>
        </div>
      ) : (
        <div className="mt-3 text-xs text-slate-500">
          {st.label}{rule.reviewer_name ? ` by ${rule.reviewer_name}` : ''}
          {rule.reviewed_at ? ` · ${format(new Date(rule.reviewed_at), 'd MMM yyyy')}` : ''}
          {rule.reviewer_notes ? ` — ${rule.reviewer_notes}` : ''}
        </div>
      )}
    </div>
  );
}

function ReviewTaskCard({ task, currentUser, onDone }) {
  const [notes, setNotes] = useState('');
  const [acting, setActing] = useState('');
  const st = TASK_STATUS[task.status] || TASK_STATUS.open;

  const act = async (status) => {
    setActing(status);
    try {
      await base44.entities.ProviderSafetyReviewTask.update(task.id, {
        status,
        updated_at: new Date().toISOString(),
        ...(notes ? { admin_notes: notes } : {}),
      });
      onDone();
    } finally {
      setActing('');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <div className="font-semibold text-slate-900">{task.matched_partner_name_as_reported || 'Unnamed provider'}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {(task.matched_partner_type || '').replace(/_/g, ' ')} · {(task.incident_ids || []).length} corroborated incident(s) · match confidence {task.match_confidence ?? '—'}%
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${st.cls}`}>{st.label}</span>
          {task.priority === 'high' && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">HIGH PRIORITY</span>
          )}
        </div>
      </div>

      {task.evidence_summary && (
        <p className="mt-3 text-xs text-slate-500">
          Incident types: {(task.evidence_summary.incident_types || []).join(', ') || '—'} · Sources: {(task.evidence_summary.source_reliability_tiers || []).map((t) => TIER_LABEL[t] || t).join(', ') || '—'}
        </p>
      )}

      {(task.status === 'open' || task.status === 'in_review') ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Admin notes (what you found / did)…"
            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 mb-3"
          />
          <div className="flex flex-wrap gap-2">
            {task.status === 'open' && (
              <Button size="sm" variant="outline" disabled={!!acting} onClick={() => act('in_review')}>
                <Eye className="w-4 h-4 mr-1" /> Start review
              </Button>
            )}
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={!!acting} onClick={() => act('resolved_action_taken')}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Resolved — action taken
            </Button>
            <Button size="sm" variant="outline" disabled={!!acting} onClick={() => act('resolved_no_action')}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Resolved — no action
            </Button>
            <Button size="sm" variant="outline" disabled={!!acting} onClick={() => act('dismissed')}>
              <XCircle className="w-4 h-4 mr-1" /> Dismiss
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 text-xs text-slate-500">
          {st.label}{task.admin_notes ? ` — ${task.admin_notes}` : ''}
        </div>
      )}
    </div>
  );
}

function CandidateRow({ candidate }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <a href={candidate.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-900 hover:underline flex items-center gap-1 truncate">
          <span className="truncate">{candidate.title || candidate.url}</span>
          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
        </a>
        <div className="text-xs text-slate-500 mt-1">
          {candidate.publisher_domain || 'unknown domain'} · {TIER_LABEL[candidate.source_reliability_tier] || 'Unclassified source'} · {(candidate.corroboration_status || 'single_source_unverified').replace(/_/g, ' ')}
        </div>
      </div>
      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600 whitespace-nowrap">
        {(candidate.status || 'new').replace(/_/g, ' ')}
      </span>
    </div>
  );
}

const TABS = [
  { key: 'rules', label: 'Proposed rules', icon: ScrollText },
  { key: 'reviews', label: 'Provider safety reviews', icon: Users },
  { key: 'candidates', label: 'Discovered evidence', icon: Newspaper },
];

export default function AdminIncidentEvidence() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('rules');

  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me().catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  const { data: rules = [], isLoading: rulesLoading, refetch: refetchRules, isFetching: rulesFetching } = useQuery({
    queryKey: ['proposedSafetyRules'],
    queryFn: () => base44.entities.ProposedSafetyRule.list('-created_at', 200).catch(() => []),
    staleTime: 30 * 1000,
  });

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks, isFetching: tasksFetching } = useQuery({
    queryKey: ['providerSafetyReviewTasks'],
    queryFn: () => base44.entities.ProviderSafetyReviewTask.list('-created_at', 200).catch(() => []),
    staleTime: 30 * 1000,
  });

  const { data: candidates = [], isLoading: candidatesLoading, refetch: refetchCandidates, isFetching: candidatesFetching } = useQuery({
    queryKey: ['incidentCandidates'],
    queryFn: () => base44.entities.IncidentCandidate.list('-created_at', 100).catch(() => []),
    staleTime: 30 * 1000,
    enabled: tab === 'candidates',
  });

  const pendingRules = rules.filter((r) => r.review_status === 'pending_review' || r.review_status === 'needs_more_evidence');
  const decidedRules = rules.filter((r) => r.review_status === 'approved' || r.review_status === 'rejected');
  const openTasks = tasks.filter((t) => t.status === 'open' || t.status === 'in_review');
  const resolvedTasks = tasks.filter((t) => t.status !== 'open' && t.status !== 'in_review');

  const isLoading = tab === 'rules' ? rulesLoading : tab === 'reviews' ? tasksLoading : candidatesLoading;
  const isFetching = tab === 'rules' ? rulesFetching : tab === 'reviews' ? tasksFetching : candidatesFetching;
  const refetch = tab === 'rules' ? refetchRules : tab === 'reviews' ? refetchTasks : refetchCandidates;

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-emerald-600" />
              <h1 className="text-2xl font-semibold text-slate-900">Evidence monitoring</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Public medical-tourism safety reports discovered on the open web, scored, and proposed for
              your review. Nothing here is ever a diagnosis, a public statement, or an active rule until you approve it.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        {openTasks.some((t) => t.priority === 'high') && (
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4" />
            {openTasks.filter((t) => t.priority === 'high').length} high-priority provider review{openTasks.filter((t) => t.priority === 'high').length === 1 ? '' : 's'} need attention
          </div>
        )}

        <div className="flex gap-2 mb-4 flex-wrap">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 ${tab === key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
              {key === 'rules' && pendingRules.length > 0 && ` (${pendingRules.length})`}
              {key === 'reviews' && openTasks.length > 0 && ` (${openTasks.length})`}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-slate-400"><Clock className="w-6 h-6 mx-auto mb-2 animate-pulse" />Loading…</div>
        ) : tab === 'rules' ? (
          pendingRules.length === 0 && decidedRules.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
              No proposed rules yet — the monthly scan hasn't found anything corroborated to review.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {[...pendingRules, ...decidedRules].map((r) => (
                <RuleCard key={r.id} rule={r} currentUser={currentUser} onDone={() => qc.invalidateQueries({ queryKey: ['proposedSafetyRules'] })} />
              ))}
            </div>
          )
        ) : tab === 'reviews' ? (
          openTasks.length === 0 && resolvedTasks.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
              No provider safety reviews yet.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {[...openTasks, ...resolvedTasks].map((t) => (
                <ReviewTaskCard key={t.id} task={t} currentUser={currentUser} onDone={() => qc.invalidateQueries({ queryKey: ['providerSafetyReviewTasks'] })} />
              ))}
            </div>
          )
        ) : (
          candidates.length === 0 ? (
            <div className="text-center py-16 text-slate-400">Nothing discovered yet.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {candidates.map((c) => <CandidateRow key={c.id} candidate={c} />)}
            </div>
          )
        )}
      </div>
    </AdminLayout>
  );
}
