// @ts-nocheck — pre-existing type gaps; build passes
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, format } from 'date-fns';
import {
  ShieldAlert, Building2, Stethoscope, Plane, Scale,
  Clock, CheckCircle2, XCircle, RefreshCw, Eye,
} from 'lucide-react';

/**
 * AdminDataFreshness — the human review queue for every flagged change to
 * safety-critical, time-sensitive data. Nothing here auto-publishes: a person
 * reviews each flag and decides. Backed by the DataFreshnessReview entity, which
 * the freshness functions write to via _shared/freshness.ts:flagForReview.
 */
const SUBJECT = {
  doctor_license:  { label: 'Doctor licence',  icon: Stethoscope },
  clinic_status:   { label: 'Clinic status',   icon: Building2 },
  visa_rule:       { label: 'Visa rule',        icon: Plane },
  regulatory_rule: { label: 'Regulatory',       icon: Scale },
};

const CHANGE_LABEL = {
  suspected_revocation:   'Suspected revocation',
  status_changed:         'Status changed',
  closed:                 'Closed / suspended',
  source_unavailable:     'Could not confirm',
  source_changed:         'Source page changed',
  stale_no_reverification:'Stale — needs re-verification',
};

const SEV = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  warning:  'bg-amber-100 text-amber-800 border-amber-200',
  info:     'bg-slate-100 text-slate-600 border-slate-200',
};

function FlagCard({ flag, currentUser, onDone }) {
  const [acting, setActing] = useState('');
  const [resolution, setResolution] = useState('');
  const Sub = SUBJECT[flag.subject_type] || SUBJECT.regulatory_rule;
  const Icon = Sub.icon;

  const act = async (status) => {
    setActing(status);
    try {
      await base44.entities.DataFreshnessReview.update(flag.id, {
        status,
        reviewer_id: currentUser?.id || '',
        reviewer_name: currentUser?.email || '',
        reviewed_at: new Date().toISOString(),
        ...(resolution ? { resolution } : {}),
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
            <Icon className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <div className="font-semibold text-slate-900">{flag.subject_label || Sub.label}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {Sub.label} · detected {flag.detected_at ? formatDistanceToNow(new Date(flag.detected_at), { addSuffix: true }) : '—'} via {(flag.detected_via || '').replace(/_/g, ' ')}
            </div>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${SEV[flag.severity] || SEV.warning}`}>
          {(flag.severity || 'warning').toUpperCase()}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-900 text-white">
          {CHANGE_LABEL[flag.change_type] || flag.change_type}
        </span>
        {flag.previous_value && (
          <span className="text-xs text-slate-500">
            {flag.previous_value} <span className="text-slate-400">→</span> {flag.new_value || '—'}
          </span>
        )}
      </div>

      {flag.detail && <p className="mt-3 text-sm text-slate-600 leading-relaxed">{flag.detail}</p>}

      {flag.status === 'pending' || flag.status === 'reviewing' ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <input
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder="Resolution note (what you confirmed / did)…"
            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 mb-3"
          />
          <div className="flex flex-wrap gap-2">
            {flag.status === 'pending' && (
              <Button size="sm" variant="outline" disabled={!!acting} onClick={() => act('reviewing')}>
                <Eye className="w-4 h-4 mr-1" /> Start review
              </Button>
            )}
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={!!acting} onClick={() => act('actioned')}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Mark actioned
            </Button>
            <Button size="sm" variant="outline" disabled={!!acting} onClick={() => act('dismissed')}>
              <XCircle className="w-4 h-4 mr-1" /> Dismiss
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 text-xs text-slate-500">
          {flag.status === 'actioned' ? 'Actioned' : 'Dismissed'}
          {flag.reviewer_name ? ` by ${flag.reviewer_name}` : ''}
          {flag.reviewed_at ? ` · ${format(new Date(flag.reviewed_at), 'd MMM yyyy')}` : ''}
          {flag.resolution ? ` — ${flag.resolution}` : ''}
        </div>
      )}
    </div>
  );
}

export default function AdminDataFreshness() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('open'); // open | resolved

  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me().catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  const { data: flags = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['dataFreshnessReview'],
    queryFn: () => base44.entities.DataFreshnessReview.list('-detected_at', 200).catch(() => []),
    staleTime: 30 * 1000,
  });

  const open = flags.filter((f) => f.status === 'pending' || f.status === 'reviewing');
  const resolved = flags.filter((f) => f.status === 'actioned' || f.status === 'dismissed');
  const shown = tab === 'open' ? open : resolved;

  const criticalCount = open.filter((f) => f.severity === 'critical').length;

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-emerald-600" />
              <h1 className="text-2xl font-semibold text-slate-900">Data-freshness review</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Flagged changes to doctor licences, clinic status, visa rules, and regulatory sources.
              Nothing changes for users until you confirm it here.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        {criticalCount > 0 && (
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <ShieldAlert className="w-4 h-4" />
            {criticalCount} critical {criticalCount === 1 ? 'item needs' : 'items need'} review
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('open')}
            className={`text-sm font-semibold px-4 py-2 rounded-full ${tab === 'open' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            Open ({open.length})
          </button>
          <button
            onClick={() => setTab('resolved')}
            className={`text-sm font-semibold px-4 py-2 rounded-full ${tab === 'resolved' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            Resolved ({resolved.length})
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-slate-400"><Clock className="w-6 h-6 mx-auto mb-2 animate-pulse" />Loading…</div>
        ) : shown.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
            {tab === 'open' ? 'Nothing needs review — all current data is confirmed fresh.' : 'No resolved items yet.'}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {shown.map((f) => (
              <FlagCard key={f.id} flag={f} currentUser={currentUser} onDone={() => qc.invalidateQueries({ queryKey: ['dataFreshnessReview'] })} />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
