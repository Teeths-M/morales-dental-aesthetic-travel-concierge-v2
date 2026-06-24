import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingDown, Globe, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { PricingEngine } from '@/lib/pricingEngine';

export default function ProcedurePricingDisplay({ procedure, selectedCountry = null, selectedDoctor = null }) {
  const [pricingEngine, setPricingEngine] = useState(null);
  const [priceRange, setPriceRange] = useState(null);
  const [countryComparison, setCountryComparison] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPricingData = async () => {
      try {
        // Fetch all pricing data
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

        // Get price range
        const range = engine.getPriceRange(procedure.title, selectedCountry);
        setPriceRange(range);

        // Get country comparison if available
        if (selectedCountry) {
          const comparison = engine.compareCountryPrices(procedure.title);
          setCountryComparison(comparison);
        }
      } catch (error) {
        console.error('Failed to load pricing data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPricingData();
  }, [procedure.title, selectedCountry]);

  if (loading || !priceRange) {
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-100 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-slate-100 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <motion.div
      className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="p-6 border-b border-emerald-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Pricing & Cost Estimate
            </h3>
          </div>
          <span className="text-xs font-semibold bg-emerald-200 text-emerald-800 px-3 py-1 rounded-full">
            Estimated
          </span>
        </div>
      </div>

      {/* Price Range */}
      <div className="p-6 space-y-6">
        {/* Main Price Range */}
        <div className="bg-white rounded-lg p-6">
          <p className="text-sm text-slate-600 mb-4">Estimated Price Range</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">From</p>
              <p className="text-2xl font-semibold text-slate-900">${priceRange.minPrice.toLocaleString()}</p>
            </div>
            <div className="flex items-center justify-center">
              <div className="w-full h-1 bg-gradient-to-r from-emerald-400 to-blue-400 rounded"></div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 mb-1">To</p>
              <p className="text-2xl font-semibold text-slate-900">${priceRange.maxPrice.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Complexity Breakdown */}
        <div className="bg-white rounded-lg p-6">
          <p className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <TrendingDown className="w-4 h-4" />
            Price by Complexity Level
          </p>
          <div className="space-y-3">
            {Object.entries(priceRange.complexityFactors).map(([level, price]) => (
              <div key={level} className="flex items-center justify-between">
                <span className="text-sm capitalize text-slate-600">{level}</span>
                <span className="font-semibold text-slate-900">${price.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Country Comparison (if available) */}
        {countryComparison.length > 0 && (
          <div className="bg-white rounded-lg p-6">
            <p className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Pricing by Country
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {countryComparison.slice(0, 5).map((item) => (
                <div key={item.country} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                  <span className="text-sm text-slate-600">{item.country}</span>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">${item.price.toLocaleString()}</p>
                    {item.savings > 0 && (
                      <p className="text-xs text-emerald-600">Save ${item.savings}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legal Disclaimer */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              Prices shown are estimated and may vary depending on doctor assessment, medical complexity, 
              materials, diagnostics, and final treatment plan. Final pricing requires a consultation.
            </p>
          </div>
        </div>

        {/* CTA */}
        <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-all">
          Get Personalized Quote
        </button>
      </div>
    </motion.div>
  );
}