import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Clock, AlertCircle, Sparkles, Shield, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

function fmt(n) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0); }

const PIPELINE_STAGES = [
  { key: 'Submitted',             label: 'Submitted',            icon: '📋', desc: 'Your consultation has been received.' },
  { key: 'Safe-T-Reviewed',       label: 'Safety Screening',     icon: '🛡️', desc: 'Our SAFE-T4LIFE™ AI reviewed your health profile.' },
  { key: 'Doctor-Pending',        label: 'Doctor Review',        icon: '🩺', desc: 'Your assigned doctor is reviewing your case.' },
  { key: 'Vendor-Pending',        label: 'Logistics Coordination', icon: '🌍', desc: 'We\'re coordinating your travel and transfer.' },
  { key: 'Admin-Review',          label: 'Admin Verification',   icon: '🔍', desc: 'Your full package is being verified by our team.' },
  { key: 'Proposal-Sent',         label: 'Proposal Ready',       icon: '📨', desc: 'Your personalized proposal is waiting for you.' },
  { key: 'PMP-25',                label: '25% Deposit Received', icon: '💳', desc: 'Deposit received. Doctor slot reserved.' },
  { key: 'PMP-50',                label: '50% Deposit Received', icon: '💳', desc: 'Deposit received. Travel holds confirmed.' },
  { key: 'Deposit-Paid',          label: 'Deposit Confirmed',    icon: '✅', desc: 'Your deposit is confirmed.' },
  { key: 'Travel-Coordination',   label: 'Travel Coordination',  icon: '✈️', desc: 'Your travel itinerary is being finalized.' },
  { key: 'Ready-For-Travel',      label: 'Ready For Travel',     icon: '🧳', desc: 'Everything is confirmed. Safe travels!' },
  { key: 'Procedure-In-Progress', label: 'Procedure Day',        icon: '🏥', desc: 'Your procedure is underway. We\'re with you.' },
  { key: 'Recovery',              label: 'Recovery Phase',       icon: '💊', desc: 'You\'re in recovery. Rest and follow your plan.' },
  { key: 'Completed',             label: 'Journey Complete',     icon: '🌟', desc: 'Your transformation is complete. Congratulations!' },
];

const PAYMENT_LABELS = {
  'Pending':      { label: 'Awaiting Payment',  color: 'bg-amber-100 text-amber-800' },
  '25% Paid':     { label: '25% Deposit Paid',  color: 'bg-blue-100 text-blue-800' },
  '50% Paid':     { label: '50% Deposit Paid',  color: 'bg-indigo-100 text-indigo-800' },
  'Paid In Full': { label: 'Paid In Full ✅',    color: 'bg-emerald-100 text-emerald-800' },
  'Failed':       { label: 'Payment Failed',    color: 'bg-red-100 text-red-800' },
};

export default function CaseStatusModule({ userEmail }) {
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    fetchCase();
    const interval = setInterval(() => { fetchCase(); setLastRefresh(new Date()); }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchCase = async () => {
    try {
      const res = await base44.functions.invoke('iq200Pipeline', { action: 'get_my_case' });
      const cases = res.data?.cases || [];
      if (cases.length > 0) setCaseData(cases[0]);
    } catch (e) {
      console.error('Case fetch failed:', e);
      setLoadError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadError) return (
    <div className="text-center py-12 text-slate-500">
      <p className="text-sm">Unable to load your journey. Please refresh the page.</p>
      <button onClick={() => window.location.reload()} className="mt-3 text-xs underline">
        Refresh
      </button>
    </div>
  );

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!caseData) return (
    <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center shadow-sm">
      <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
      <p className="text-sm font-semibold text-slate-700 mb-1">No Active Case Found</p>
      <p className="text-xs text-slate-500">Once you submit a consultation and pay the retainer, your IQ200 case pipeline will appear here.</p>
    </div>
  );

  const pipelineIndex = PIPELINE_STAGES.findIndex(s => s.key === caseData.status);
  const currentStage = PIPELINE_STAGES[pipelineIndex];
  const isBlocked = caseData.safe_t_result === 'BLOCKED';

  const creditAmount = caseData.consultation_fee_paid ? (caseData.consultation_fee_amount || 49) : 0;
  const paymentBadge = PAYMENT_LABELS[caseData.payment_status] || PAYMENT_LABELS['Pending'];

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">IQ200 Case Pipeline</p>
          <h2 className="font-bold text-slate-900 text-lg">Your Journey Status</h2>
        </div>
        <button onClick={() => { fetchCase(); setLastRefresh(new Date()); }} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Active status hero */}
      <motion.div
        className="rounded-2xl p-5 overflow-hidden"
        style={{ background: isBlocked ? 'linear-gradient(135deg, #7f1d1d, #991b1b)' : 'linear-gradient(135deg, #0F3A20, #1a4f2e)' }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
            {isBlocked ? '🔴' : currentStage?.icon || '⏳'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-0.5">Current Stage</p>
            <p className="text-lg font-bold text-white leading-tight">{isBlocked ? 'Safety Review Required' : currentStage?.label || caseData.status}</p>
            <p className="text-xs text-white/60 mt-0.5 leading-relaxed">
              {isBlocked
                ? 'Our elite safety standards require manual administrative review of your medical profile. A coordinator will contact you within 24 hours.'
                : currentStage?.desc}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #C5A059, #f0d060)' }}
              animate={{ width: `${Math.max(4, ((pipelineIndex + 1) / PIPELINE_STAGES.length) * 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <p className="text-[9px] text-white/40">{pipelineIndex + 1} of {PIPELINE_STAGES.length} stages</p>
            <p className="text-[9px] text-white/40 flex items-center gap-1"><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse inline-block" /> Live · {lastRefresh.toLocaleTimeString()}</p>
          </div>
        </div>
      </motion.div>

      {/* $49 credit badge */}
      {creditAmount > 0 && (caseData.status === 'Proposal-Sent' || caseData.consultation_credit_applied) && (
        <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: 'linear-gradient(135deg, #0F3A20, #1a4f2e)', border: '1px solid rgba(197,160,89,0.3)' }}>
          <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#C5A059' }} />
          <div>
            <p className="text-sm font-bold" style={{ color: '#C5A059' }}>✨ Morales Luxury Credit Applied</p>
            <p className="text-xs text-white/70 mt-0.5">Your $49 USD consultation retainer has been fully refunded and credited back to your itinerary total.</p>
          </div>
        </div>
      )}

      {/* Payment status */}
      {caseData.payment_status && caseData.payment_status !== 'Pending' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Payment Summary</p>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${paymentBadge.color}`}>{paymentBadge.label}</span>
            <span className="text-sm font-bold text-slate-800">{fmt(caseData.final_package_price)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
              <p className="text-[9px] text-slate-400 uppercase font-bold">Paid</p>
              <p className="text-sm font-bold text-emerald-600">{fmt(caseData.amount_paid)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
              <p className="text-[9px] text-slate-400 uppercase font-bold">Remaining</p>
              <p className="text-sm font-bold text-slate-800">{fmt(caseData.amount_remaining)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Proposal CTA */}
      {caseData.status === 'Proposal-Sent' && caseData.proposal_token && (
        <a href={`/portal/proposal?token=${caseData.proposal_token}`} target="_blank" rel="noopener noreferrer">
          <Button className="w-full font-bold py-3 rounded-xl text-sm" style={{ background: 'linear-gradient(135deg, #C5A059, #a8863c)', color: '#022C22' }}>
            ✨ View & Pay Your Proposal
          </Button>
        </a>
      )}

      {/* Timeline checklist */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Journey Milestones</p>
        <div className="space-y-2">
          {PIPELINE_STAGES.map((stage, i) => {
            const isDone = i < pipelineIndex;
            const isActive = i === pipelineIndex;
            const isFuture = i > pipelineIndex;
            return (
              <div key={stage.key} className={`flex items-center gap-3 transition-all ${isFuture ? 'opacity-30' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${isDone ? 'bg-emerald-500' : isActive ? 'bg-yellow-400' : 'bg-slate-100'}`}>
                  {isDone ? <CheckCircle2 className="w-3 h-3 text-white" /> : <span>{stage.icon}</span>}
                </div>
                <p className={`text-xs ${isActive ? 'font-bold text-slate-900' : isDone ? 'text-slate-500 line-through' : 'text-slate-400'}`}>{stage.label}</p>
                {isActive && <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Active</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}