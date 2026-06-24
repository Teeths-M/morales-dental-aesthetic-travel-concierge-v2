import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, AlertTriangle, DollarSign, Send,
  RefreshCw, ChevronDown, ChevronUp, Zap, TrendingUp,
  XCircle, BarChart2, FileText, Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import AdminLayout from '@/components/layout/AdminLayout';

const PIPELINE_STAGES = [
  'Submitted', 'Safe-T-Reviewed', 'Doctor-Pending', 'Vendor-Pending',
  'Admin-Review', 'Proposal-Sent', 'PMP-25', 'PMP-50', 'Deposit-Paid',
  'Travel-Coordination', 'Ready-For-Travel', 'Procedure-In-Progress',
  'Recovery', 'Completed'
];

const MARKUP_OPTIONS = [
  { label: 'Affordable', value: 0.30 },
  { label: 'Premium',    value: 0.32 },
  { label: 'Luxury',     value: 0.35 },
];

const STATUS_COLORS = {
  'Submitted':            'bg-slate-100 text-slate-700',
  'Safe-T-Reviewed':      'bg-blue-100 text-blue-800',
  'Doctor-Pending':       'bg-violet-100 text-violet-800',
  'Vendor-Pending':       'bg-amber-100 text-amber-800',
  'Admin-Review':         'bg-orange-100 text-orange-800',
  'Proposal-Sent':        'bg-cyan-100 text-cyan-800',
  'PMP-25':               'bg-indigo-100 text-indigo-800',
  'PMP-50':               'bg-teal-100 text-teal-800',
  'Deposit-Paid':         'bg-emerald-100 text-emerald-800',
  'Travel-Coordination':  'bg-green-100 text-green-800',
  'Ready-For-Travel':     'bg-lime-100 text-lime-800',
  'Procedure-In-Progress':'bg-yellow-100 text-yellow-800',
  'Recovery':             'bg-pink-100 text-pink-800',
  'Completed':            'bg-green-200 text-green-900',
};

const RISK_COLORS = {
  'Low':      'bg-emerald-100 text-emerald-800',
  'Moderate': 'bg-amber-100 text-amber-800',
  'High':     'bg-red-100 text-red-800',
};

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
}

function PricingWorkbench({ caseRecord, onApprove, isLoading }) {
  const [markup, setMarkup] = useState(caseRecord.markup_percentage || 0.30);

  const base = caseRecord.base_cost || 0;
  const finalPrice = parseFloat((base * (1 + markup)).toFixed(2));
  const profit = parseFloat((finalPrice - base).toFixed(2));
  const creditAmount = caseRecord.consultation_fee_paid ? (caseRecord.consultation_fee_amount || 49) : 0;
  const effectiveTotal = parseFloat((finalPrice - creditAmount).toFixed(2));

  return (
    <div className="rounded-2xl overflow-hidden mt-4" style={{ background: 'linear-gradient(135deg, #0F3A20 0%, #1a4f2e 100%)', border: '1px solid rgba(197,160,89,0.3)' }}>
      <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(197,160,89,0.2)' }}>
        <div className="flex items-center gap-3">
          <DollarSign className="w-5 h-5" style={{ color: '#C5A059' }} />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#C5A059' }}>Pricing Workbench</p>
            <p className="text-white font-semibold text-sm">IQ200 Financial Calculator</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Cost breakdown */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Treatment', value: caseRecord.treatment_cost },
            { label: 'Flights', value: caseRecord.flight_cost },
            { label: 'Hotel', value: caseRecord.hotel_cost },
            { label: 'Pickup', value: caseRecord.pickup_cost },
            { label: 'Dropoff', value: caseRecord.dropoff_cost },
            { label: 'Local Transfer', value: caseRecord.local_transfer_cost },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-white/40">{label}</p>
              <p className="text-sm font-semibold text-white">{fmt(value)}</p>
            </div>
          ))}
        </div>

        {/* Base cost */}
        <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(197,160,89,0.1)', border: '1px solid rgba(197,160,89,0.3)' }}>
          <p className="text-sm font-semibold text-white/80">Base Cost Total</p>
          <p className="text-lg font-semibold" style={{ color: '#C5A059' }}>{fmt(base)}</p>
        </div>

        {/* Markup selector */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50 mb-2">Select Markup Tier</p>
          <div className="grid grid-cols-3 gap-2">
            {MARKUP_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setMarkup(opt.value)}
                className="rounded-xl py-2.5 px-3 text-center transition-all border-2"
                style={{
                  background: markup === opt.value ? 'rgba(250,204,21,0.2)' : 'rgba(255,255,255,0.05)',
                  borderColor: markup === opt.value ? '#facc15' : 'transparent',
                }}
              >
                <p className="text-xs font-semibold text-white">{opt.label}</p>
                <p className="text-[10px] font-semibold" style={{ color: '#C5A059' }}>{(opt.value * 100).toFixed(0)}%</p>
              </button>
            ))}
          </div>
        </div>

        {/* Calculated values */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <p className="text-xs text-white/60">Final Package Price</p>
            <p className="text-sm font-semibold text-white">{fmt(finalPrice)}</p>
          </div>
          {creditAmount > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl" style={{ background: 'rgba(197,160,89,0.08)', border: '1px solid rgba(197,160,89,0.2)' }}>
              <p className="text-xs" style={{ color: '#C5A059' }}>✨ Consultation Credit (−$49)</p>
              <p className="text-sm font-semibold" style={{ color: '#C5A059' }}>−{fmt(creditAmount)}</p>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: 'rgba(197,160,89,0.15)', border: '1px solid rgba(197,160,89,0.4)' }}>
            <p className="text-sm font-semibold text-white">Client Pays</p>
            <p className="text-xl font-semibold" style={{ color: '#C5A059' }}>{fmt(effectiveTotal)}</p>
          </div>
          <div className="flex items-center justify-between px-4 py-2 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)' }}>
            <p className="text-xs text-emerald-400">Profit</p>
            <p className="text-sm font-semibold text-emerald-400">{fmt(profit)}</p>
          </div>
        </div>

        {/* Payment tiers preview */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50 mb-2">Payment Options Preview</p>
          <div className="space-y-1.5">
            {[
              { label: 'Full Payment (5% discount)', amount: parseFloat((effectiveTotal * 0.95).toFixed(2)) },
              { label: '50% Deposit now', amount: parseFloat((effectiveTotal * 0.50).toFixed(2)) },
              { label: '25% Deposit now', amount: parseFloat((effectiveTotal * 0.25).toFixed(2)) },
            ].map(({ label, amount }) => (
              <div key={label} className="flex justify-between items-center px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <p className="text-xs text-white/60">{label}</p>
                <p className="text-sm font-semibold text-white">{fmt(amount)}</p>
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={() => onApprove(caseRecord.id, markup)}
          disabled={isLoading}
          className="w-full font-semibold text-sm py-3 rounded-xl border-0"
          style={{ background: 'linear-gradient(135deg, #C5A059, #a8863c)', color: '#0F3A20' }}
        >
          <Send className="w-4 h-4 mr-2" />
          {isLoading ? 'Sending Proposal...' : 'Approve & Send Proposal to Client'}
        </Button>
      </div>
    </div>
  );
}

function CaseCard({ caseRecord, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [approvingProposal, setApprovingProposal] = useState(false);

  const isUrgent = caseRecord.case_priority === 'Urgent' || caseRecord.case_priority === 'Critical';
  const isAdminReview = caseRecord.status === 'Admin-Review';
  const isBlocked = caseRecord.safe_t_result === 'BLOCKED';
  const pipelineIndex = PIPELINE_STAGES.indexOf(caseRecord.status);

  const approveProposal = async (caseId, markup) => {
    setApprovingProposal(true);
    await base44.functions.invoke('iq200Pipeline', { action: 'admin_approve_proposal', case_id: caseId, payload: { markup_percentage: markup } });
    setApprovingProposal(false);
    onRefresh();
  };

  const escalate = async (caseId, newStatus) => {
    await base44.functions.invoke('iq200Pipeline', { action: 'admin_escalate', case_id: caseId, payload: { new_status: newStatus, notes: 'Manual escalation by admin' } });
    onRefresh();
  };

  return (
    <motion.div
      className={`rounded-2xl overflow-hidden shadow-sm border-l-4 bg-white ${isBlocked ? 'border-red-400' : isUrgent ? 'border-orange-400' : isAdminReview ? 'border-yellow-400' : 'border-emerald-600'}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Card header */}
      <div className="px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold ${isBlocked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'}`}>
              {caseRecord.client_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-slate-800">{caseRecord.client_name}</p>
                {isUrgent && <span className="text-[9px] font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full uppercase">⚠️ {caseRecord.case_priority}</span>}
                {isBlocked && <span className="text-[9px] font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase">🔴 BLOCKED</span>}
              </div>
              <p className="text-xs text-slate-500">{caseRecord.client_email} · {(caseRecord.procedures || []).join(', ')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {caseRecord.risk_score && (
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${RISK_COLORS[caseRecord.risk_score] || 'bg-slate-100 text-slate-700'}`}>
                {caseRecord.risk_score} Risk
              </span>
            )}
            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[caseRecord.status] || 'bg-slate-100 text-slate-700'}`}>
              {caseRecord.status}
            </span>
            {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>

        {/* Mini pipeline progress bar */}
        <div className="mt-3 flex gap-0.5 items-center">
          {PIPELINE_STAGES.map((stage, i) => (
            <div
              key={stage}
              title={stage}
              className={`h-1.5 flex-1 rounded-full transition-all ${i < pipelineIndex ? 'bg-emerald-500' : i === pipelineIndex ? 'bg-yellow-400' : 'bg-slate-200'}`}
            />
          ))}
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-100 overflow-hidden"
          >
            <div className="p-5 space-y-4">
              {/* SAFE-T flags */}
              {(caseRecord.safe_t_flags || []).length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">SAFE-T™ Flags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {caseRecord.safe_t_flags.map((flag, i) => (
                      <span key={i} className="text-[10px] bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded-full">{flag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Financial summary */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Base Cost',   value: caseRecord.base_cost },
                  { label: 'Final Price', value: caseRecord.final_package_price },
                  { label: 'Profit',      value: caseRecord.profit },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
                    <p className="text-sm font-semibold text-slate-800">{fmt(value)}</p>
                  </div>
                ))}
              </div>

              {/* Vendor status */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Doctor',   status: caseRecord.doctor_confirmation_status },
                  { label: 'Travel',   status: caseRecord.itinerary_status },
                  { label: 'Transfer', status: caseRecord.transfer_status },
                ].map(({ label, status }) => (
                  <div key={label} className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 text-center">
                    <p className="text-[9px] font-semibold text-slate-400 uppercase">{label}</p>
                    <p className={`text-[10px] font-semibold mt-0.5 ${status === 'CONFIRMED' || status === 'SUBMITTED' ? 'text-emerald-600' : 'text-amber-600'}`}>{status || 'PENDING'}</p>
                  </div>
                ))}
              </div>

              {/* Pricing workbench */}
              {isAdminReview && (
                <PricingWorkbench caseRecord={caseRecord} onApprove={approveProposal} isLoading={approvingProposal} />
              )}

              {/* Manual stage override */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Manual Stage Override</p>
                <div className="flex gap-2 flex-wrap">
                  {PIPELINE_STAGES.filter((_, i) => i !== pipelineIndex).map(stage => (
                    <button
                      key={stage}
                      onClick={() => escalate(caseRecord.id, stage)}
                      className="text-[9px] font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-slate-600"
                    >
                      → {stage}
                    </button>
                  ))}
                </div>
              </div>

              {/* Audit log */}
              {(caseRecord.timeline_log || []).length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Audit Log</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {[...(caseRecord.timeline_log || [])].reverse().map((log, i) => (
                      <div key={i} className="flex gap-2 text-[10px]">
                        <span className={`font-semibold flex-shrink-0 ${log.execution_status === 'SUCCESS' ? 'text-emerald-600' : log.execution_status === 'ESCALATED' ? 'text-orange-600' : 'text-red-600'}`}>{log.execution_status}</span>
                        <span className="text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                        <span className="text-slate-700 font-medium">{log.action_performed}</span>
                        {log.log_details && <span className="text-slate-400 truncate">{log.log_details}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function IQ200AdminCenter() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('all');
  const [creatingCase, setCreatingCase] = useState(null);
  const [populatingData, setPopulatingData] = useState(false);

  const { data: cases = [], isLoading, refetch } = useQuery({
    queryKey: ['iq200_cases'],
    queryFn: () => base44.asServiceRole.entities.CaseRecord.list('-created_date', 100),
    refetchInterval: 30000,
  });

  const { data: consultations = [] } = useQuery({
    queryKey: ['consultations_for_iq200'],
    queryFn: () => base44.asServiceRole.entities.Consultation.list('-created_date', 50),
  });

  const pendingConsultations = consultations.filter(c => !cases.some(r => r.consultation_id === c.id));

  const ingestConsultation = async (consultationId) => {
    setCreatingCase(consultationId);
    await base44.functions.invoke('iq200Pipeline', { action: 'create', consultation_id: consultationId });
    setCreatingCase(null);
    refetch();
    qc.invalidateQueries({ queryKey: ['iq200_cases'] });
  };

  const handlePopulateSampleData = async () => {
    setPopulatingData(true);
    try {
      await base44.functions.invoke('seedSampleData', {});
      refetch();
      qc.invalidateQueries({ queryKey: ['consultations_for_iq200'] });
    } catch (error) {
      console.error('Failed to populate sample data:', error);
    } finally {
      setPopulatingData(false);
    }
  };

  const filtered = filterStatus === 'all' ? cases : cases.filter(c => c.status === filterStatus);

  const stats = {
    total: cases.length,
    blocked: cases.filter(c => c.safe_t_result === 'BLOCKED').length,
    adminReview: cases.filter(c => c.status === 'Admin-Review').length,
    urgent: cases.filter(c => c.case_priority !== 'Normal').length,
    revenue: cases.reduce((sum, c) => sum + (c.amount_paid || 0), 0),
  };

  const statCards = [
    { label: 'Total Cases',  value: stats.total,           color: 'text-slate-700',   bg: 'bg-slate-50',   IconComp: BarChart2 },
    { label: 'Admin Review', value: stats.adminReview,     color: 'text-orange-700',  bg: 'bg-orange-50',  IconComp: FileText },
    { label: 'Blocked',      value: stats.blocked,         color: 'text-red-700',     bg: 'bg-red-50',     IconComp: XCircle },
    { label: 'Urgent Cases', value: stats.urgent,          color: 'text-amber-700',   bg: 'bg-amber-50',   IconComp: AlertTriangle },
    { label: 'Revenue',      value: fmt(stats.revenue),    color: 'text-emerald-700', bg: 'bg-emerald-50', IconComp: TrendingUp, isText: true },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold font-display">IQ-200 Intelligence Center</h1>
            <p className="text-muted-foreground mt-1">Executive operations and pipeline management</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePopulateSampleData}
              disabled={populatingData}
              className="gap-1.5"
            >
              <Database className="w-4 h-4" /> {populatingData ? 'Populating...' : 'Populate Sample Data'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
          </div>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-white border-0 shadow-md rounded-2xl">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <BarChart2 className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900">{stats.total}</p>
                  <p className="text-xs text-slate-500">Total Cases</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-md rounded-2xl">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-orange-600">{stats.adminReview}</p>
                  <p className="text-xs text-slate-500">Admin Review</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-md rounded-2xl">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-red-600">{stats.blocked}</p>
                  <p className="text-xs text-slate-500">Blocked</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-md rounded-2xl">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-amber-600">{stats.urgent}</p>
                  <p className="text-xs text-slate-500">Urgent Cases</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-md rounded-2xl">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-emerald-600">{fmt(stats.revenue)}</p>
                  <p className="text-xs text-slate-500">Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending ingestion */}
        {pendingConsultations.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-600" />
              <p className="text-sm font-semibold text-amber-800">Consultations Awaiting IQ200 Intake ({pendingConsultations.length})</p>
            </div>
            <div className="space-y-2">
              {pendingConsultations.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-amber-100">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{c.patient_name}</p>
                    <p className="text-xs text-slate-500">{c.email} · {c.procedure_interest?.replace(/_/g, ' ')}</p>
                  </div>
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                    disabled={creatingCase === c.id}
                    onClick={() => ingestConsultation(c.id)}
                  >
                    <Zap className="w-3 h-3" /> {creatingCase === c.id ? 'Running...' : 'Ingest → IQ200'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterStatus('all')} className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${filterStatus === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            All ({cases.length})
          </button>
          {['Admin-Review', 'Doctor-Pending', 'Vendor-Pending', 'Proposal-Sent', 'Travel-Coordination', 'Completed'].map(s => {
            const count = cases.filter(c => c.status === s).length;
            if (!count && filterStatus !== s) return null;
            return (
              <button key={s} onClick={() => setFilterStatus(s)} className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${filterStatus === s ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                {s} ({count})
              </button>
            );
          })}
        </div>

        {/* Cases */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No cases in this stage.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(c => (
              <CaseCard key={c.id} caseRecord={c} onRefresh={refetch} />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}