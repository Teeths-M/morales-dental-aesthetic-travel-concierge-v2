import React, { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Clock } from 'lucide-react';

const BASE_PRICES = {
  'Dental Implants': 2800,
  'All-on-4 / All-on-6': 9500,
  'Porcelain Veneers': 3200,
  'Smile Makeover': 4500,
  'Rhinoplasty': 5800,
  'Breast Surgery': 6200,
  'Facelift': 7400,
  'Liposuction': 4800,
  'Gastric Sleeve': 8500,
  'Joint Replacement': 12000,
  'IVF': 7200,
  'Oncology Surgery': 15000,
};
const CONSULTATION_CREDIT = 49;
const CONCIERGE_FEE = 399;

function useCountUp(target, duration = 1800, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start || target === 0) return;
    let startTime = null;
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, start, duration]);
  return value;
}

export default function ConversionEngine() {
  const { items } = useCart();
  const navigate = useNavigate();
  const [inView, setInView] = useState(false);

  const procedurePrice = items.length > 0
    ? (BASE_PRICES[items[0].name] || 3500)
    : 3500;
  const subtotal = procedurePrice + CONCIERGE_FEE;
  const total = subtotal - CONSULTATION_CREDIT;

  const animatedTotal = useCountUp(total, 1600, inView);

  const selectedPath = items[0]?.category || null;
  const selectedProcedure = items[0]?.name || null;

  const summaryItems = [
    { label: 'Care Path Selected', value: selectedPath ? `Path of ${selectedPath}` : 'Not yet selected', ok: !!selectedPath },
    { label: 'Primary Procedure', value: selectedProcedure || 'Browse catalogue to add', ok: !!selectedProcedure },
    { label: 'Concierge Coordination', value: 'Full-service itinerary management', ok: true },
    { label: 'VIP Airport Transfers', value: 'Origin & destination legs included', ok: true },
    { label: 'Signature Compliance', value: 'Informed consent & arbitration clause', ok: true },
    { label: 'Luxury Recovery Support', value: 'Post-op suite & wellness protocol', ok: true },
  ];

  return (
    <motion.section
      className="relative w-full py-24 px-4 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #050f09 0%, #040c07 100%)' }}
      onViewportEnter={() => setInView(true)}
      viewport={{ once: true, amount: 0.3 }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full opacity-10 blur-3xl"
          style={{ background: '#C5A059' }} />
      </div>

      {/* Section label */}
      <motion.div
        className="text-center mb-14 relative z-10"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
      >
        <p className="text-[10px] font-bold tracking-[0.4em] uppercase mb-3" style={{ color: '#C5A059' }}>
          Confirm & Proceed
        </p>
        <h2 className="font-display text-4xl sm:text-5xl text-white">
          Your Concierge Summary
        </h2>
      </motion.div>

      {/* Split panel */}
      <div className="relative z-10 max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

        {/* LEFT — Luxury summary list */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="rounded-2xl p-8"
          style={{
            background: 'linear-gradient(135deg, #0a2614 0%, #0F3A20 100%)',
            border: '1px solid rgba(197,160,89,0.3)',
            boxShadow: '0 8px 50px rgba(0,0,0,0.5)',
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheck className="w-5 h-5" style={{ color: '#C5A059' }} />
            <h3 className="font-display text-xl text-white">Journey Itinerary</h3>
          </div>

          <div className="space-y-4">
            {summaryItems.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="flex items-start gap-3"
              >
                <CheckCircle2
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                  style={{ color: item.ok ? '#C5A059' : '#64748b' }}
                />
                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500">{item.label}</p>
                  <p className="text-sm text-slate-300">{item.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Compliance badge */}
          <div
            className="mt-6 flex items-center gap-2 px-4 py-2.5 rounded-xl"
            style={{ background: 'rgba(197,160,89,0.08)', border: '1px solid rgba(197,160,89,0.2)' }}
          >
            <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#C5A059' }} />
            <p className="text-[10px] text-slate-400 leading-snug">
              Signature & arbitration agreement locked at submission. All data encrypted and HIPAA-compliant.
            </p>
          </div>
        </motion.div>

        {/* RIGHT — Financial tally card */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="rounded-2xl p-8 flex flex-col"
          style={{
            background: 'linear-gradient(160deg, #0d0a04 0%, #1a1205 100%)',
            border: '1px solid rgba(197,160,89,0.4)',
            boxShadow: '0 8px 50px rgba(197,160,89,0.12)',
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-5 h-5" style={{ color: '#C5A059' }} />
            <h3 className="font-display text-xl" style={{ color: '#C5A059' }}>Package Investment</h3>
          </div>

          {/* Line items */}
          <div className="space-y-3 mb-6">
            {[
              { label: selectedProcedure || 'Medical Procedure', amount: procedurePrice },
              { label: 'Concierge & Coordination Fee', amount: CONCIERGE_FEE },
            ].map((line, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="text-slate-400">{line.label}</span>
                <span className="text-slate-300 font-mono">${line.amount.toLocaleString()}</span>
              </div>
            ))}

            {/* Divider */}
            <div className="h-px" style={{ background: 'rgba(197,160,89,0.2)' }} />

            {/* Credit badge */}
            <div
              className="flex items-center justify-between px-3 py-2.5 rounded-xl"
              style={{ background: 'rgba(197,160,89,0.08)', border: '1px solid rgba(197,160,89,0.25)' }}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" style={{ color: '#C5A059' }} />
                <span className="text-xs font-semibold" style={{ color: '#C5A059' }}>
                  ✨ Morales Luxury Credit Applied
                </span>
              </div>
              <span className="text-xs font-bold font-mono" style={{ color: '#C5A059' }}>
                −${CONSULTATION_CREDIT.toFixed(2)} USD
              </span>
            </div>
          </div>

          {/* Animated total */}
          <div className="text-center py-5 rounded-xl mb-6"
            style={{ background: 'rgba(197,160,89,0.06)', border: '1px solid rgba(197,160,89,0.15)' }}>
            <p className="text-[10px] tracking-[0.3em] uppercase text-slate-500 mb-1">Estimated Total</p>
            <motion.p
              className="font-display text-5xl font-bold"
              style={{ color: '#C5A059' }}
            >
              ${animatedTotal.toLocaleString()}
            </motion.p>
            <p className="text-[10px] text-slate-600 mt-1">USD · Subject to final clinical review</p>
          </div>

          {/* CTA */}
          <button
            onClick={() => navigate('/booking')}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold tracking-widest uppercase text-sm transition-all duration-300 hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, #0F3A20 0%, #1a5c35 100%)',
              border: '1px solid #C5A059',
              color: '#C5A059',
              boxShadow: '0 0 30px rgba(197,160,89,0.2)',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 50px rgba(197,160,89,0.45)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 30px rgba(197,160,89,0.2)'}
          >
            Secure Your Concierge Itinerary
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-center text-[10px] text-slate-600 mt-3">
            No commitment until signature. Full refund policy applies.
          </p>
        </motion.div>
      </div>
    </motion.section>
  );
}