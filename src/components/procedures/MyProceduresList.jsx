import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Clock, Sparkles, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { PricingEngine } from '@/lib/pricingEngine';
import CompatibilityFirewall from '@/components/procedures/CompatibilityFirewall';

export default function MyProceduresList({ items, onRemove, onClear }) {
  const [pricingEngine, setPricingEngine] = useState(null);
  const [totalPrice, setTotalPrice] = useState(null);

  // Initialize pricing engine
  useEffect(() => {
    const initEngine = async () => {
      try {
        const [procedures, countryPricing, doctorPricing, bundles, modifiers, rules] = await Promise.all([
          base44.entities.ProcedurePricing.list(),
          base44.entities.CountryPricing.list(),
          base44.entities.DoctorPricing.list(),
          base44.entities.ProcedureBundle.list(),
          base44.entities.ComplexityModifier.list(),
          base44.entities.PricingRule.list(),
        ]);

        const engine = new PricingEngine(procedures, countryPricing, doctorPricing, bundles, modifiers, rules);
        setPricingEngine(engine);
      } catch (error) {
        console.error('Failed to initialize pricing:', error);
      }
    };

    initEngine();
  }, []);

  // Calculate total price
  useEffect(() => {
    if (items.length === 0) {
      setTotalPrice(null);
      return;
    }

    // Use doctor prices if available, otherwise calculate from pricing engine
    const totalFromDoctor = items.reduce((sum, item) => {
      if (item.doctor_price_usd) {
        return sum + item.doctor_price_usd;
      }
      return sum;
    }, 0);

    if (totalFromDoctor > 0) {
      setTotalPrice(totalFromDoctor);
    } else if (pricingEngine) {
      const procedures = items.map(item => ({
        procedure_name: item.title || item.name,
        quantity: 1,
        complexity: 'moderate',
      }));
      const quote = pricingEngine.calculateFullQuote(procedures);
      setTotalPrice(quote.estimatedTotalLow);
    }
  }, [pricingEngine, items]);

  if (items.length === 0) return null;

  const totalDays = items.reduce((acc, p) => {
    const n = parseInt(p.downtime) || 0;
    return acc + n;
  }, 0);

  return (
    <motion.div
      className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-blue-900 px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-white font-bold text-sm">My Procedures</p>
          <p className="text-white/70 text-xs mt-0.5">{items.length} treatment{items.length !== 1 ? 's' : ''} selected</p>
          {totalPrice && (
            <p className="text-emerald-200 text-xs mt-1.5 font-semibold flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              From ${totalPrice.toLocaleString()}
            </p>
          )}
        </div>
        <button onClick={onClear} className="text-white/60 hover:text-white text-xs underline">Clear all</button>
      </div>

      {/* Items */}
      <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
        <AnimatePresence>
          {items.map((p, i) => (
            <motion.div
              key={p.title + i}
              className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
            >
              <div className={`w-8 h-8 rounded-lg ${p.categoryColor?.bg || 'bg-slate-100'} flex items-center justify-center flex-shrink-0`}>
                <span className="text-sm">{p.categoryId?.includes('dental') ? '🦷' : p.categoryId?.includes('breast') ? '🌸' : p.categoryId?.includes('body') ? '💪' : p.categoryId?.includes('face') ? '💆' : '✨'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800">{p.title}</p>
                <p className="text-[10px] text-slate-400">{p.category} · {p.duration}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Clock className="w-3 h-3" />{p.downtime}
                </div>
                <button onClick={() => onRemove(p)} className="w-6 h-6 rounded-full bg-slate-200 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* SAFE-T4LIFE™ Compatibility Firewall */}
      {items.length >= 2 && (
        <div className="px-4 pb-3">
          <CompatibilityFirewall items={items} compact={false} />
        </div>
      )}

      {/* Footer CTA */}
      <div className="px-4 pb-4">
        <Link to="/booking">
          <button className="w-full py-3 bg-gradient-to-r from-emerald-700 to-blue-800 hover:opacity-95 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-md">
            <Sparkles className="w-4 h-4" />
            Continue to Consultation
            <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
      </div>
    </motion.div>
  );
}