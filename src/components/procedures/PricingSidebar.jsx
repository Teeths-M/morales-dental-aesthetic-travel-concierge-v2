import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingDown, AlertCircle, Globe, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { PricingEngine } from '@/lib/pricingEngine';

export default function PricingSidebar({ items, selectedCountry = null }) {
  const [pricingEngine, setPricingEngine] = useState(null);
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

        const engine = new PricingEngine(procedures, countryPricing, doctorPricing, bundles, modifiers, rules);
        setPricingEngine(engine);
        setLoading(false);
      } catch (error) {
        console.error('Failed to initialize pricing:', error);
        setLoading(false);
      }
    };

    initEngine();
  }, []);

  // Recalculate quote when items or country changes
  useEffect(() => {
    if (!pricingEngine || items.length === 0) {
      setQuote(null);
      return;
    }

    const procedures = items.map(item => ({
      procedure_name: item.title || item.name,
      quantity: item.quantity || 1,
      complexity: 'moderate',
    }));

    const newQuote = pricingEngine.calculateFullQuote(procedures, { country: selectedCountry });
    setQuote(newQuote);
  }, [pricingEngine, items, selectedCountry]);

  if (loading || !quote || items.length === 0) {
    return null;
  }

  return (
    <motion.div
      className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Estimated Cost
        </h3>
        <p className="text-white/70 text-xs mt-1">Real-time pricing</p>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Price Range */}
        <div>
          <p className="text-xs text-slate-600 font-medium mb-3">Your Estimate</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">From</span>
              <span className="text-lg font-semibold text-emerald-700">${quote.estimatedTotalLow.toLocaleString()}</span>
            </div>
            <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"></div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">To (seasonal)</span>
              <span className="text-lg font-semibold text-emerald-700">${quote.estimatedTotalHigh.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="bg-white/60 rounded-lg p-3 space-y-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal ({quote.lineItems.length} items)</span>
            <span>${quote.subtotal.toLocaleString()}</span>
          </div>

          {quote.quantityDiscount > 0 && (
            <div className="flex justify-between text-emerald-700 font-medium">
              <span className="flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                Quantity Discount
              </span>
              <span>-${quote.quantityDiscount.toLocaleString()}</span>
            </div>
          )}

          {quote.bundleDiscount > 0 && (
            <div className="flex justify-between text-blue-700 font-medium">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Bundle Savings
              </span>
              <span>-${quote.bundleDiscount.toLocaleString()}</span>
            </div>
          )}

          {quote.promotionalDiscount > 0 && (
            <div className="flex justify-between text-purple-700 font-medium">
              <span>Promotion</span>
              <span>-${quote.promotionalDiscount.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Recommended Add-ons */}
        {quote.lineItems.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-700 mb-2">💡 Recommended Add-ons</p>
            <p className="text-xs text-blue-600 leading-relaxed">
              Consider including complementary procedures for optimal results and savings.
            </p>
          </div>
        )}

        {/* Legal Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-700 leading-relaxed">
              Estimates vary by doctor, materials, and final assessment. Final pricing requires consultation.
            </p>
          </div>
        </div>

        {/* Country Tag */}
        {selectedCountry && (
          <div className="flex items-center gap-2 bg-white/60 rounded-lg px-3 py-2 text-xs">
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600">Pricing for <strong>{selectedCountry}</strong></span>
          </div>
        )}
      </div>
    </motion.div>
  );
}