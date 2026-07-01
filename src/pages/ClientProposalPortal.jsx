import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Shield, Sparkles, Lock, AlertCircle, Plane } from 'lucide-react';
import PortalQRCode from '@/components/portal/PortalQRCode';
import { Button } from '@/components/ui/button';

function fmt(n) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0); }

const PIPELINE_STAGES = [
  { key: 'Submitted',             label: 'Submitted',           icon: '📋' },
  { key: 'Safe-T-Reviewed',       label: 'Safety Review',       icon: '🛡️' },
  { key: 'Doctor-Pending',        label: 'Doctor Confirmation', icon: '🩺' },
  { key: 'Vendor-Pending',        label: 'Vendor Coordination', icon: '🌍' },
  { key: 'Admin-Review',          label: 'Admin Review',        icon: '🔍' },
  { key: 'Proposal-Sent',         label: 'Proposal Ready',      icon: '📨' },
  { key: 'Deposit-Paid',          label: 'Deposit Confirmed',   icon: '💳' },
  { key: 'Travel-Coordination',   label: 'Travel Planning',     icon: '✈️' },
  { key: 'Ready-For-Travel',      label: 'Ready For Travel',    icon: '🧳' },
  { key: 'Procedure-In-Progress', label: 'Procedure Day',       icon: '🏥' },
  { key: 'Recovery',              label: 'Recovery',            icon: '💊' },
  { key: 'Completed',             label: 'Completed',           icon: '🌟' },
];

export default function ClientProposalPortal() {
  const { token } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [depositChoice, setDepositChoice] = useState(null);
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);

  // CLEAN TOKEN: Remove any trailing hashes/timestamps (e.g., prop_123_1234567890_abc → prop_123)
  const cleanToken = token ? token.split('_').slice(0, 2).join('_') : null;

  useEffect(() => {
    if (!cleanToken) { setError('No proposal token found.'); setLoading(false); return; }
    loadCase();
    const interval = setInterval(loadCase, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [cleanToken]);

  const loadCase = async () => {
    try {
      const res = await base44.functions.invoke('iq200Pipeline', { action: 'get_case', payload: { token: cleanToken, type: 'proposal' } });
      if (res.data?.case) setCaseData(res.data.case);
      else setError('Proposal not found. Please contact your coordinator.');
    } catch (e) {
      setError('Unable to load proposal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!depositChoice) return;
    setPaying(true);
    const res = await base44.functions.invoke('iq200Pipeline', {
      action: 'process_payment',
      payload: { token: cleanToken, deposit_option: depositChoice }
    });
    if (res.data?.success) {
      setPaySuccess(true);
      await loadCase();
    }
    setPaying(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #022C22, #0F3A20)' }}>
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-white/60 text-sm">Loading your proposal...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #022C22, #0F3A20)' }}>
      <div className="text-center max-w-sm p-6">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-white font-semibold mb-2">Proposal Unavailable</p>
        <p className="text-white/60 text-sm">{error}</p>
      </div>
    </div>
  );

  const finalPrice = caseData.final_package_price || 0;
  const creditAmount = caseData.consultation_fee_paid ? (caseData.consultation_fee_amount || 49) : 0;
  const effectiveTotal = parseFloat((finalPrice - creditAmount).toFixed(2));
  const full5pct = parseFloat((effectiveTotal * 0.95).toFixed(2));
  const deposit50 = parseFloat((effectiveTotal * 0.50).toFixed(2));
  const deposit25 = parseFloat((effectiveTotal * 0.25).toFixed(2));

  const pipelineIndex = PIPELINE_STAGES.findIndex(s => s.key === caseData.status);
  const alreadyPaid = ['Deposit-Paid', 'PMP-25', 'PMP-50', 'Travel-Coordination', 'Ready-For-Travel', 'Procedure-In-Progress', 'Recovery', 'Completed'].includes(caseData.status);

  const paymentOptions = [
    { key: 'Full',  label: 'Full Payment',   sublabel: '5% loyalty discount applied', amount: full5pct,   badge: '💎 Best Value' },
    { key: '50%',   label: '50% Deposit',    sublabel: 'Balance due before travel',   amount: deposit50,  badge: null },
    { key: '25%',   label: '25% Deposit',    sublabel: 'Balance due in installments', amount: deposit25,  badge: null },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #022C22 0%, #0F3A20 60%, #0c2e19 100%)' }}>
      {/* Header */}
      <div className="px-4 py-6 border-b" style={{ borderColor: 'rgba(197,160,89,0.2)' }}>
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(197,160,89,0.15)', border: '1px solid rgba(197,160,89,0.3)' }}>
            <Plane className="w-4 h-4" style={{ color: '#C5A059' }} />
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: '#C5A059' }}>MORALES MEDICAL TRAVEL SAFETY</p>
            <p className="text-white font-semibold text-sm">Your Medical Travel Proposal</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <PortalQRCode label="Scan to open payment portal on another device" />
            <div className="flex items-center gap-1.5 text-[10px] text-white/40">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        {/* Patient greeting */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Welcome,</p>
          <h1 className="font-semibold text-white text-2xl">{caseData.client_name}</h1>
          <p className="text-white/60 text-sm mt-1">{(caseData.procedures || []).join(' · ')}</p>
        </motion.div>

        {/* Journey tracker */}
        <div className="rounded-2xl p-5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: '#C5A059' }}>Your Journey Status</p>
          <div className="space-y-2">
            {PIPELINE_STAGES.map((stage, i) => {
              const isDone = i < pipelineIndex;
              const isActive = i === pipelineIndex;
              const isFuture = i > pipelineIndex;
              return (
                <div key={stage.key} className={`flex items-center gap-3 transition-all ${isFuture ? 'opacity-25' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${isDone ? 'bg-emerald-500' : isActive ? 'bg-yellow-400' : 'bg-white/10'}`}>
                    {isDone ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <span>{stage.icon}</span>}
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs font-semibold ${isActive ? 'text-white' : isDone ? 'text-white/70' : 'text-white/30'}`}>{stage.label}</p>
                  </div>
                  {isActive && (
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(250,204,21,0.2)', color: '#facc15', border: '1px solid rgba(250,204,21,0.3)' }}>
                      Current
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Proposal pricing card */}
        {finalPrice > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(197,160,89,0.12), rgba(197,160,89,0.06))', border: '1px solid rgba(197,160,89,0.35)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(197,160,89,0.2)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#C5A059' }}>Package Investment</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-white">{fmt(effectiveTotal)}</span>
                {finalPrice !== effectiveTotal && <span className="text-white/40 line-through text-sm">{fmt(finalPrice)}</span>}
              </div>
            </div>

            {/* $49 Credit badge */}
            {creditAmount > 0 && (
              <div className="px-5 py-3 flex items-center gap-3" style={{ background: 'rgba(197,160,89,0.08)', borderBottom: '1px solid rgba(197,160,89,0.15)' }}>
                <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: '#C5A059' }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: '#C5A059' }}>✨ Morales Luxury Credit Applied</p>
                  <p className="text-[10px] text-white/60">Your $49 USD consultation retainer has been fully refunded and credited back to your itinerary total.</p>
                </div>
              </div>
            )}

            {/* Cost breakdown */}
            <div className="px-5 py-4 space-y-2">
              {[
                { label: 'Medical Treatment', value: caseData.treatment_cost },
                { label: 'Flights',           value: caseData.flight_cost, sub: caseData.flight_details },
                { label: 'Hotel',             value: caseData.hotel_cost, sub: caseData.hotel_name },
                { label: 'Airport Transfer',  value: (caseData.pickup_cost || 0) + (caseData.dropoff_cost || 0) + (caseData.local_transfer_cost || 0) },
              ].filter(r => r.value > 0).map(({ label, value, sub }) => (
                <div key={label} className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-white/70">{label}</p>
                    {sub && <p className="text-[10px] text-white/40">{sub}</p>}
                  </div>
                  <p className="text-xs font-semibold text-white">{fmt(value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment options */}
        {!alreadyPaid && caseData.status === 'Proposal-Sent' && (
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Choose Your Payment Plan</p>
            {paymentOptions.map(opt => (
              <button
                key={opt.key}
                onClick={() => setDepositChoice(opt.key)}
                className="w-full rounded-2xl p-4 text-left transition-all"
                style={{
                  background: depositChoice === opt.key ? 'rgba(197,160,89,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${depositChoice === opt.key ? 'rgba(197,160,89,0.6)' : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${depositChoice === opt.key ? 'border-yellow-400' : 'border-white/30'}`}>
                      {depositChoice === opt.key && <div className="w-2 h-2 rounded-full bg-yellow-400" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{opt.label}</p>
                      <p className="text-[10px] text-white/50">{opt.sublabel}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold" style={{ color: '#C5A059' }}>{fmt(opt.amount)}</p>
                    {opt.badge && <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(197,160,89,0.2)', color: '#C5A059' }}>{opt.badge}</span>}
                  </div>
                </div>
              </button>
            ))}

            <Button
              onClick={handlePayment}
              disabled={!depositChoice || paying}
              className="w-full py-3 font-semibold rounded-xl text-sm"
              style={{ background: depositChoice ? 'linear-gradient(135deg, #C5A059, #a8863c)' : undefined, color: depositChoice ? '#022C22' : undefined }}
            >
              <Lock className="w-4 h-4 mr-2" />
              {paying ? 'Processing...' : depositChoice ? `Confirm Payment — ${fmt(paymentOptions.find(o => o.key === depositChoice)?.amount)}` : 'Select a Payment Plan'}
            </Button>

            <p className="text-center text-[10px] text-white/30 flex items-center justify-center gap-1">
              <Shield className="w-3 h-3" /> Secured by Stripe · HIPAA Compliant
            </p>
          </div>
        )}

        {/* Already paid confirmation */}
        {(alreadyPaid || paySuccess) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-6 text-center"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}
          >
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-white font-semibold text-lg mb-1">Payment Confirmed</p>
            <p className="text-white/60 text-sm">Your travel coordination is now underway. Your coordinator will be in touch shortly.</p>
            {creditAmount > 0 && (
              <div className="mt-4 rounded-xl px-4 py-3 text-left" style={{ background: 'rgba(197,160,89,0.1)', border: '1px solid rgba(197,160,89,0.25)' }}>
                <p className="text-xs font-semibold flex items-center gap-2" style={{ color: '#C5A059' }}>
                  <Sparkles className="w-3.5 h-3.5" /> ✨ Morales Luxury Credit Applied
                </p>
                <p className="text-[10px] text-white/60 mt-1">Your $49 USD consultation retainer has been fully refunded and credited back to your itinerary total.</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}