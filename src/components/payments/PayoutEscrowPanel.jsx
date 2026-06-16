import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, Unlock, CheckCircle2, AlertTriangle, DollarSign,
  Shield, ChevronDown, ChevronUp, Loader2, Send, CornerDownRight
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

const PARTNER_TYPES = [
  { value: 'doctor', label: 'Doctor / Clinic' },
  { value: 'travel_agency', label: 'Travel Agency' },
  { value: 'taxi_service', label: 'Taxi / Transfer' },
  { value: 'companion', label: 'Companion' },
];

const MILESTONE_LABELS = {
  intake_handshake: 'Physical Intake Handshake (Stage 2)',
  doctor_confirmed: 'Doctor Confirmation (Stage 5)',
  travel_confirmed: 'Travel Confirmation (Stage 7)',
  client_arrived: 'Client Arrival Check-in (Stage 9)',
  procedure_complete: 'Procedure Complete (Stage 11)',
};

export default function PayoutEscrowPanel({ caseId, caseRecord }) {
  const [partnerType, setPartnerType] = useState('doctor');
  const [partnerId, setPartnerId] = useState('');
  const [stripeAccountId, setStripeAccountId] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [escrowData, setEscrowData] = useState(null);
  const [checking, setChecking] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const { toast } = useToast();

  const checkEscrow = async () => {
    setChecking(true);
    const res = await base44.functions.invoke('processPartnerPayout', {
      action: 'check_escrow',
      case_id: caseId,
      partner_type: partnerType,
      partner_id: partnerId || undefined,
    });
    setEscrowData(res.data);
    setChecking(false);
  };

  const releasePayout = async (isOverride = false) => {
    if (isOverride && !overrideReason.trim()) {
      toast({ title: 'Override reason required', variant: 'destructive' });
      return;
    }
    setReleasing(true);
    const res = await base44.functions.invoke('processPartnerPayout', {
      action: isOverride ? 'manual_override' : 'release_payout',
      case_id: caseId,
      partner_type: partnerType,
      partner_id: partnerId || undefined,
      stripe_connect_account_id: stripeAccountId || undefined,
      manual_override_reason: isOverride ? overrideReason : undefined,
    });
    setReleasing(false);
    if (res.data?.success) {
      toast({ title: `✅ Payout of $${res.data.payout_released} released${res.data.stripe_transfer_id ? ' via Stripe Connect' : ''}` });
      setEscrowData(null);
      setShowOverride(false);
    } else {
      toast({ title: res.data?.error || 'Payout failed', description: res.data?.message, variant: 'destructive' });
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Escrow & Partner Payout</p>
            <p className="text-xs text-slate-400">iQ200-gated release · Stripe Connect · Take-rate engine</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">

              {/* Config */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Partner Type</label>
                  <select value={partnerType} onChange={e => setPartnerType(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300">
                    {PARTNER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Partner ID (optional)</label>
                  <input value={partnerId} onChange={e => setPartnerId(e.target.value)} placeholder="partner record ID"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Stripe Connect Account ID (optional)</label>
                <input value={stripeAccountId} onChange={e => setStripeAccountId(e.target.value)} placeholder="acct_xxxxxxxxxxxxx"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-300" />
              </div>

              <button onClick={checkEscrow} disabled={checking}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-700 disabled:opacity-50 transition-all">
                {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                Check Escrow & Milestone Status
              </button>

              {/* Escrow result */}
              {escrowData && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">

                  {/* Milestone checklist */}
                  <div className={`rounded-xl border p-4 ${escrowData.escrow_cleared ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      {escrowData.escrow_cleared
                        ? <><Unlock className="w-4 h-4 text-emerald-600" /><p className="text-sm font-bold text-emerald-700">Escrow Cleared — All Milestones Complete</p></>
                        : <><Lock className="w-4 h-4 text-amber-600" /><p className="text-sm font-bold text-amber-700">Escrow HOLD — Pending Milestones</p></>
                      }
                    </div>
                    <div className="space-y-1.5">
                      {Object.entries(MILESTONE_LABELS).map(([key, label]) => {
                        const missing = escrowData.missing_milestones?.includes(key);
                        return (
                          <div key={key} className="flex items-center gap-2 text-xs">
                            {missing
                              ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                              : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            }
                            <span className={missing ? 'text-amber-700' : 'text-emerald-700'}>{label}</span>
                            {missing && <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">PENDING</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payout breakdown */}
                  {escrowData.breakdown && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Payout Breakdown</p>
                      <div className="space-y-1.5 text-sm">
                        {[
                          { label: 'Package Price', val: escrowData.breakdown.package_price, color: 'text-slate-700' },
                          { label: `Platform Commission (${(escrowData.breakdown.commission_rate * 100).toFixed(0)}%)`, val: -escrowData.breakdown.commission_amount, color: 'text-blue-700' },
                          { label: 'Escrow Fee (2.5%)', val: -escrowData.breakdown.escrow_fee, color: 'text-purple-700' },
                        ].map(r => (
                          <div key={r.label} className="flex justify-between">
                            <span className="text-slate-500">{r.label}</span>
                            <span className={`font-semibold ${r.color}`}>${Math.abs(r.val).toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold">
                          <span className="text-slate-700">Partner Net Payout</span>
                          <span className="text-emerald-700">${escrowData.breakdown.partner_payout?.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Release button */}
                  {escrowData.can_release && (
                    <button onClick={() => releasePayout(false)} disabled={releasing}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all">
                      {releasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Release Payout — ${escrowData.breakdown.partner_payout?.toFixed(2)}
                    </button>
                  )}

                  {/* Manual override */}
                  {!escrowData.escrow_cleared && (
                    <div>
                      <button onClick={() => setShowOverride(s => !s)}
                        className="text-xs text-red-600 hover:underline flex items-center gap-1">
                        <CornerDownRight className="w-3 h-3" /> Admin Override (bypasses milestone gate)
                      </button>
                      <AnimatePresence>
                        {showOverride && (
                          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                            <div className="mt-2 space-y-2">
                              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                                <p className="text-xs font-bold text-red-700 mb-1">⚠️ Override creates an immutable audit record. Use only with director approval.</p>
                                <textarea value={overrideReason} onChange={e => setOverrideReason(e.target.value)}
                                  placeholder="Required: State reason for override (e.g. 'Client confirmed procedure complete via phone — director approved')"
                                  className="w-full border border-red-200 rounded-lg px-3 py-2 text-xs resize-none h-16 focus:outline-none focus:ring-1 focus:ring-red-400" />
                              </div>
                              <button onClick={() => releasePayout(true)} disabled={releasing || !overrideReason.trim()}
                                className="w-full py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                                {releasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                                Force Release Override
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}