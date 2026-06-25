import React from 'react';
import { motion } from 'framer-motion';

const GOLD = '#D4AF37';

// ── Status dot ────────────────────────────────────────────────────────────────
function StatusDot({ state }) {
  if (state === 'done') return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid #22c55e' }}>
      <span style={{ color: '#22c55e', fontSize: 14, fontWeight: 700 }}>✓</span>
    </div>
  );
  if (state === 'pending') return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ background: 'rgba(212,175,55,0.12)', border: `2px solid ${GOLD}` }}>
      <div className="w-2 h-2 rounded-full" style={{ background: GOLD, animation: 'pulse 1.5s ease-in-out infinite' }} />
    </div>
  );
  if (state === 'error') return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ background: 'rgba(239,68,68,0.12)', border: '2px solid #ef4444' }}>
      <span style={{ color: '#ef4444', fontSize: 14, fontWeight: 700 }}>!</span>
    </div>
  );
  return (
    <div className="w-8 h-8 rounded-full flex-shrink-0"
      style={{ background: '#1e2d35', border: '2px solid #2A3F4A' }} />
  );
}

// ── Quota progress bar (Uber model) ──────────────────────────────────────────
function QuotaProgressBar({ caseRecord }) {
  const quotas = [
    { label: 'Travel Agency', done: ['CONFIRMED', 'SUBMITTED'].includes(caseRecord.itinerary_status) },
    { label: 'Driver',        done: ['CONFIRMED', 'SUBMITTED'].includes(caseRecord.transfer_status) },
    { label: 'Companion',     done: caseRecord.companion_quote_status === 'CONFIRMED' },
    { label: 'Clinic',        done: caseRecord.clinic_quote_status === 'CONFIRMED' },
  ];
  const confirmed = quotas.filter(q => q.done).length;
  if (confirmed === 4) return null; // Hide when all done

  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: '#0C1A1D', border: `1px solid ${GOLD}30` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold tracking-wide" style={{ color: GOLD }}>PARTNER CONFIRMATIONS</span>
        <span className="text-xs font-bold" style={{ color: confirmed === 4 ? '#22c55e' : GOLD }}>{confirmed} / 4</span>
      </div>
      <div className="flex gap-1 mb-3">
        {quotas.map((q, i) => (
          <div key={i} className="flex-1 h-1.5 rounded-full transition-all"
            style={{ background: q.done ? '#22c55e' : '#1e2d35' }} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {quotas.map((q, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span style={{ color: q.done ? '#22c55e' : '#475569', fontSize: 11 }}>{q.done ? '✓' : '⏳'}</span>
            <span className="text-[11px]" style={{ color: q.done ? '#22c55e' : '#64748b' }}>{q.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * JourneyStatusTimeline — Stripe/Apple order-status model
 *
 * Shows the patient exactly where their money is, what's confirmed,
 * and what's next — eliminating post-payment anxiety.
 *
 * Props: caseRecord — CaseRecord object
 */
export default function JourneyStatusTimeline({ caseRecord }) {
  if (!caseRecord) return null;

  const c = caseRecord;

  // Determine state for each timeline item
  const paymentDone   = ['50% Paid', 'Paid In Full'].includes(c.payment_status);
  const paymentState  = paymentDone ? 'done' : c.pay_now_email_sent_at ? 'pending' : 'locked';
  const flightDone    = ['CONFIRMED', 'SUBMITTED'].includes(c.itinerary_status) && c.flight_cost > 0;
  const hotelDone     = c.hotel_name || c.hotel_cost > 0;
  const transferDone  = ['CONFIRMED', 'SUBMITTED'].includes(c.transfer_status);
  const doctorDone    = c.doctor_confirmation_status === 'CONFIRMED';
  const companionDone = !!c.companion_assignment_id;
  const journeyDone   = c.status === 'Completed';
  const isMedical     = c.booking_type !== 'travel_only';

  const payLabel = c.payment_status === 'Paid In Full'
    ? 'Paid in Full'
    : c.payment_status === '50% Paid'
    ? `50% Deposit Paid — Balance: $${Number(c.amount_remaining || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    : 'Payment Pending';

  const steps = [
    {
      icon: '💳', label: payLabel,
      state: paymentState,
      detail: c.stripe_payment_method_last4 ? `Charged to card ending ${c.stripe_payment_method_last4}` : null,
    },
    {
      icon: '✈️', label: flightDone ? `Flight Booked${c.flight_details ? ` · ${c.flight_details.slice(0, 40)}` : ''}` : 'Flight — Awaiting Travel Agency',
      state: flightDone ? 'done' : paymentDone ? 'pending' : 'locked',
      detail: null,
    },
    {
      icon: '🏨', label: hotelDone ? `Hotel Confirmed${c.hotel_name ? ` — ${c.hotel_name}` : ''}` : 'Hotel — Awaiting Confirmation',
      state: hotelDone ? 'done' : paymentDone ? 'pending' : 'locked',
      detail: c.hotel_address || null,
    },
    {
      icon: '🚗', label: transferDone ? 'All Transfers Confirmed' : 'Transfers — Awaiting Driver',
      state: transferDone ? 'done' : paymentDone ? 'pending' : 'locked',
      detail: null,
    },
    ...(isMedical ? [
      {
        icon: '🏥', label: doctorDone ? 'Doctor Confirmed' : 'Doctor Review — Awaiting Clinic Date',
        state: doctorDone ? 'done' : paymentDone ? 'pending' : 'locked',
        detail: null,
      },
      {
        icon: '🍽️', label: companionDone ? 'Recovery Companion Assigned' : 'Companion — Awaiting Assignment',
        state: companionDone ? 'done' : paymentDone ? 'pending' : 'locked',
        detail: null,
      },
    ] : []),
    {
      icon: '⭐', label: journeyDone ? 'Journey Complete — Golden M Achieved' : 'Journey Complete',
      state: journeyDone ? 'done' : 'locked',
      detail: null,
    },
  ];

  const doneCount   = steps.filter(s => s.state === 'done').length;
  const totalSteps  = steps.length;
  const progressPct = Math.round((doneCount / totalSteps) * 100);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden mb-6"
      style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>

      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #2A3F4A' }}>
        <div>
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: GOLD }}>Journey Status</span>
          <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>
            {doneCount} of {totalSteps} confirmed
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 rounded-full" style={{ background: '#1e2d35' }}>
            <div className="h-1.5 rounded-full transition-all" style={{ width: `${progressPct}%`, background: progressPct === 100 ? '#22c55e' : GOLD }} />
          </div>
          <span className="text-xs font-semibold" style={{ color: progressPct === 100 ? '#22c55e' : GOLD }}>{progressPct}%</span>
        </div>
      </div>

      {/* Quota bar — visible during vendor-pending */}
      {c.status === 'Vendor-Pending' && (
        <div className="px-5 pt-4">
          <QuotaProgressBar caseRecord={c} />
        </div>
      )}

      {/* Timeline steps */}
      <div className="px-5 py-4 space-y-0">
        {steps.map((step, idx) => (
          <div key={idx} className="flex gap-3">
            <div className="flex flex-col items-center">
              <StatusDot state={step.state} />
              {idx < steps.length - 1 && (
                <div className="w-0.5 flex-1 my-1" style={{ background: step.state === 'done' ? 'rgba(34,197,94,0.3)' : '#1e2d35', minHeight: 16 }} />
              )}
            </div>
            <div className="pb-4 flex-1 min-w-0">
              <div className="flex items-center gap-2 pt-1">
                <span style={{ fontSize: 16 }}>{step.icon}</span>
                <p className="text-sm font-semibold truncate"
                  style={{ color: step.state === 'done' ? '#fff' : step.state === 'pending' ? GOLD : '#475569' }}>
                  {step.label}
                </p>
              </div>
              {step.detail && (
                <p className="text-xs mt-0.5 ml-6" style={{ color: '#64748b' }}>{step.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Escrow trust message */}
      {paymentDone && (
        <div className="px-5 pb-4">
          <div className="rounded-xl px-4 py-3 flex items-start gap-2.5" style={{ background: 'rgba(212,175,55,0.08)', border: `1px solid ${GOLD}25` }}>
            <span style={{ color: GOLD, fontSize: 16, flexShrink: 0 }}>🔒</span>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
              Your funds are held securely by Morales. Partner payments are released only after each physical checkpoint is confirmed via handshake — protecting your investment at every step.
            </p>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </motion.div>
  );
}
