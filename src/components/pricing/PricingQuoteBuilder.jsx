import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, Zap, TrendingDown, AlertCircle, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { PricingEngine } from '@/lib/pricingEngine';
import { Button } from '@/components/ui/button';

export default function PricingQuoteBuilder({ initialProcedures = [] }) {
  const [engine, setEngine] = useState(null);
  const [selectedProcedures, setSelectedProcedures] = useState(
    initialProcedures.map(p => ({ procedure_name: p, quantity: 1, complexity: 'moderate', material: null }))
  );
  const [country, setCountry] = useState(null);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);

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

        const pricingEngine = new PricingEngine(procedures, countryPricing, doctorPricing, bundles, modifiers, rules);
        setEngine(pricingEngine);
      } catch (error) {
        console.error('Failed to initialize pricing engine:', error);
      } finally {
        setLoading(false);
      }
    };

    initEngine();
  }, []);

  // Recalculate quote when procedures or country changes
  useEffect(() => {
    if (engine && selectedProcedures.length > 0) {
      const newQuote = engine.calculateFullQuote(selectedProcedures, { country });
      setQuote(newQuote);
    }
  }, [engine, selectedProcedures, country]);

  const updateProcedure = (index, field, value) => {
    const updated = [...selectedProcedures];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedProcedures(updated);
  };

  const removeProcedure = (index) => {
    setSelectedProcedures(selectedProcedures.filter((_, i) => i !== index));
  };

  if (loading) {
    return <div className="text-center py-8">Loading pricing engine...</div>;
  }

  if (!quote) {
    return <div className="text-center py-8">Select procedures to see pricing</div>;
  }

  return (
    <div className="space-y-6">
      {/* Procedures List */}
      <div className="space-y-4">
        {selectedProcedures.map((item, idx) => (
          <motion.div
            key={idx}
            className="bg-white border border-slate-200 rounded-lg p-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-semibold text-slate-900">{item.procedure_name}</h4>
              </div>
              <button
                onClick={() => removeProcedure(idx)}
                className="text-red-500 hover:text-red-700 text-sm font-medium"
              >
                Remove
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Quantity */}
              <div>
                <label className="text-xs text-slate-600 font-medium">Quantity</label>
                <div className="flex items-center border border-slate-200 rounded mt-2">
                  <button
                    onClick={() => updateProcedure(idx, 'quantity', Math.max(1, item.quantity - 1))}
                    className="p-2 hover:bg-slate-100"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateProcedure(idx, 'quantity', parseInt(e.target.value) || 1)}
                    className="flex-1 text-center border-0 focus:outline-none"
                    min="1"
                  />
                  <button
                    onClick={() => updateProcedure(idx, 'quantity', item.quantity + 1)}
                    className="p-2 hover:bg-slate-100"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Complexity */}
              <div>
                <label className="text-xs text-slate-600 font-medium">Complexity</label>
                <select
                  value={item.complexity}
                  onChange={(e) => updateProcedure(idx, 'complexity', e.target.value)}
                  className="w-full border border-slate-200 rounded px-3 py-2 mt-2 text-sm"
                >
                  <option>simple</option>
                  <option>moderate</option>
                  <option>complex</option>
                  <option>advanced</option>
                </select>
              </div>

              {/* Price */}
              <div>
                <label className="text-xs text-slate-600 font-medium">Unit Price</label>
                <p className="text-lg font-semibold text-slate-900 mt-2">
                  ${quote.lineItems[idx]?.unitPrice.toLocaleString() || '0'}
                </p>
              </div>

              {/* Line Total */}
              <div>
                <label className="text-xs text-slate-600 font-medium">Line Total</label>
                <p className="text-lg font-semibold text-emerald-600 mt-2">
                  ${quote.lineItems[idx]?.finalPrice.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Country Selector */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <label className="text-sm font-medium text-slate-700">Destination Country</label>
        <select
          value={country || ''}
          onChange={(e) => setCountry(e.target.value || null)}
          className="w-full border border-slate-200 rounded px-4 py-3 mt-3 text-sm"
        >
          <option value="">International (Base Pricing)</option>
          <option value="Venezuela">Venezuela</option>
          <option value="Colombia">Colombia</option>
          <option value="Turkey">Turkey</option>
          <option value="Thailand">Thailand</option>
          <option value="Dominican Republic">Dominican Republic</option>
          <option value="Mexico">Mexico</option>
        </select>
      </div>

      {/* Quote Summary */}
      <motion.div
        className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h3 className="text-lg font-semibold text-slate-900 mb-6">Cost Breakdown</h3>

        <div className="space-y-4">
          {/* Subtotal */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600">Subtotal ({quote.lineItems.length} items)</span>
            <span className="font-semibold text-slate-900">${quote.subtotal.toLocaleString()}</span>
          </div>

          {/* Quantity Discount */}
          {quote.quantityDiscount > 0 && (
            <div className="flex justify-between items-center text-sm text-emerald-700 border-t border-emerald-200 pt-4">
              <span className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Quantity Discount
              </span>
              <span className="font-semibold">-${quote.quantityDiscount.toLocaleString()}</span>
            </div>
          )}

          {/* Bundle Discount */}
          {quote.bundleDiscount > 0 && (
            <div className="flex justify-between items-center text-sm text-blue-700">
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Bundle Savings: {quote.applicableBundle?.bundle_name}
              </span>
              <span className="font-semibold">-${quote.bundleDiscount.toLocaleString()}</span>
            </div>
          )}

          {/* Promotional Discount */}
          {quote.promotionalDiscount > 0 && (
            <div className="flex justify-between items-center text-sm text-purple-700">
              <span>Promotional Offer</span>
              <span className="font-semibold">-${quote.promotionalDiscount.toLocaleString()}</span>
            </div>
          )}

          {/* Final Totals */}
          <div className="border-t border-emerald-200 pt-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Estimated Low</span>
              <span className="text-xl font-semibold text-slate-900">${quote.estimatedTotalLow.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Estimated High (with seasonals)</span>
              <span className="text-xl font-semibold text-slate-900">${quote.estimatedTotalHigh.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">{quote.disclaimer}</p>
          </div>
        </div>

        {/* CTA */}
        <Button className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3">
          <Check className="w-4 h-4 mr-2" />
          Get Personalized Quote
        </Button>
      </motion.div>
    </div>
  );
}