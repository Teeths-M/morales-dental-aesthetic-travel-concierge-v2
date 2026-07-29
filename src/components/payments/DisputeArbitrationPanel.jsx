import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Scale, Search, ChevronDown, ChevronUp, CheckCircle2,
  AlertTriangle, Clock, FileText, Shield, Filter
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAdminCasesShared } from '@/hooks/useAdminCasesCache';

const STATUS_COLORS = {
  succeeded:          'bg-emerald-100 text-emerald-700',
  failed:             'bg-red-100 text-red-700',
  refunded:           'bg-purple-100 text-purple-700',
  failed_validation:  'bg-amber-100 text-amber-700',
  'succeeded_skipped_demo': 'bg-slate-100 text-slate-500',
  session_created:    'bg-blue-100 text-blue-700',
};

function TimelineEntry({ entry }) {
  const isPayment = entry.action?.includes('payment') || entry.action?.includes('payout');
  const isOverride = entry.action?.includes('override');
  const isHandshake = entry.action?.includes('handshake') || entry.action?.includes('stage_');
  return (
    <div className={`flex gap-3 text-xs ${isOverride ? 'bg-red-50 border border-red-200 rounded-xl px-3 py-2' : ''}`}>
      <div className="flex-shrink-0 mt-0.5">
        {isOverride ? <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          : isPayment ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          : isHandshake ? <Shield className="w-3.5 h-3.5 text-blue-500" />
          : <Clock className="w-3.5 h-3.5 text-slate-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-mono text-[10px] text-slate-400">{new Date(entry.timestamp).toLocaleString()}</span>
          {entry.non_repudiable && <span className="bg-blue-100 text-blue-700 text-[9px] font-semibold px-1.5 py-0.5 rounded-full">NON-REPUDIABLE</span>}
        </div>
        <p className="font-semibold text-slate-700">{entry.action?.replace(/_/g, ' ').toUpperCase()}</p>
        <p className="text-slate-500 leading-relaxed">{entry.details}</p>
        {entry.performed_by && <p className="text-slate-400 mt-0.5">By: {entry.performed_by}</p>}
      </div>
    </div>
  );
}

function DisputeCard({ txn, caseRecord }) {
  const [expanded, setExpanded] = useState(false);
  const statusColor = STATUS_COLORS[txn.status] || 'bg-slate-100 text-slate-600';
  const timeline = caseRecord?.timeline_log || [];

  // Filter timeline to entries relevant to this transaction
  const relevantTimeline = timeline.filter(e =>
    e.timestamp >= (txn.created_at || txn.processed_at || '') ||
    e.action?.includes('payment') || e.action?.includes('payout') || e.action?.includes('handshake') || e.action?.includes('stage_')
  ).slice(0, 20);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${statusColor}`}>{txn.status}</span>
            <span className="text-xs text-slate-500 font-mono">{txn.event_type}</span>
            {txn.case_id && <span className="text-[10px] text-slate-400">Case: {txn.case_id?.slice(0, 8)}…</span>}
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold text-slate-800">${txn.raw_amount?.toFixed(2)} {txn.currency?.toUpperCase()}</p>
            {txn.client_email && <p className="text-xs text-slate-500 truncate">{txn.client_email}</p>}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{new Date(txn.processed_at).toLocaleString()}</p>
        </div>
        <div className="flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-4">

              {/* Transaction IDs */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'Event ID', val: txn.event_id },
                  { label: 'Payment Intent', val: txn.stripe_payment_intent_id },
                  { label: 'Session ID', val: txn.stripe_session_id },
                  { label: 'Deposit Option', val: txn.deposit_option },
                ].filter(r => r.val).map(r => (
                  <div key={r.label} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">{r.label}</p>
                    <p className="font-mono text-slate-700 break-all text-[10px] mt-0.5">{r.val}</p>
                  </div>
                ))}
              </div>

              {/* iQ200 Audit Timeline */}
              {relevantTimeline.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-3.5 h-3.5 text-blue-500" />
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">iQ200 Handshake Audit Log</p>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">IMMUTABLE</span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {relevantTimeline.map((entry, i) => (
                      <TimelineEntry key={i} entry={entry} />
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              {txn.metadata && Object.keys(txn.metadata).length > 0 && (
                <div className="bg-slate-900 text-white rounded-xl px-4 py-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase mb-2">Metadata</p>
                  <pre className="text-[10px] text-slate-300 overflow-x-auto">{JSON.stringify(txn.metadata, null, 2)}</pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DisputeArbitrationPanel() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: transactions = [], isLoading: txnLoading } = useQuery({
    queryKey: ['payment_transactions'],
    queryFn: () => base44.entities.PaymentTransaction.list('-processed_at', 200),
    staleTime: 30000,
  });

  // Shared across every admin-area page — see useAdminCasesCache.js (Base44's
  // 100-ops/min-per-user rate limit was being tripped by ~9 separate pages
  // each independently fetching CaseRecord).
  const { data: cases = [] } = useAdminCasesShared();

  const caseMap = {};
  cases.forEach(c => { caseMap[c.id] = c; });

  const filtered = transactions.filter(t => {
    const matchSearch = !search || [t.client_email, t.case_id, t.stripe_payment_intent_id, t.event_id]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: transactions.length,
    succeeded: transactions.filter(t => t.status === 'succeeded').length,
    failed: transactions.filter(t => t.status === 'failed' || t.status === 'failed_validation').length,
    refunded: transactions.filter(t => t.status === 'refunded').length,
    volume: transactions.filter(t => t.status === 'succeeded').reduce((s, t) => s + (t.raw_amount || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center">
          <Scale className="w-5 h-5 text-blue-700" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Dispute Arbitration Center</h2>
          <p className="text-xs text-slate-400">Resolve transactional anomalies via immutable iQ200 handshake validation logs</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Volume', val: `$${stats.volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Succeeded', val: stats.succeeded, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Failed / Invalid', val: stats.failed, color: 'text-amber-700', bg: 'bg-amber-50' },
          { label: 'Refunded', val: stats.refunded, color: 'text-purple-700', bg: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl px-4 py-3`}>
            <p className={`text-xl font-semibold ${s.color}`}>{s.val}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 flex-1 min-w-48">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by email, case ID, Stripe ID…"
            className="text-sm flex-1 focus:outline-none" />
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm focus:outline-none">
            <option value="all">All Statuses</option>
            <option value="succeeded">Succeeded</option>
            <option value="failed">Failed</option>
            <option value="failed_validation">Validation Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Transaction list */}
      {txnLoading ? (
        <div className="flex items-center justify-center py-12 text-slate-400 text-sm gap-2">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          Loading transactions…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No transactions match your filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(txn => (
            <DisputeCard key={txn.id} txn={txn} caseRecord={caseMap[txn.case_id]} />
          ))}
        </div>
      )}
    </div>
  );
}