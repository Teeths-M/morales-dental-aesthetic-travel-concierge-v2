import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, DollarSign } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { PricingEngine } from '@/lib/pricingEngine';

export default function MobileQuoteCard({ items }) {
  const [pricingEngine, setPricingEngine] = useState(null);
  const [totalPrice, setTotalPrice] = useState(null);

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

  useEffect(() => {
    if (!pricingEngine || items.length === 0) {
      setTotalPrice(null);
      return;
    }

    const procedures = items.map(item => ({
      procedure_name: item.title || item.name,
      quantity: 1,
      complexity: 'moderate',
    }));

    const quote = pricingEngine.calculateFullQuote(procedures);
    setTotalPrice(quote.estimatedTotalLow);
  }, [pricingEngine, items]);

  return (
    <Link to="/booking">
      <motion.div
        className="bg-gradient-to-r from-emerald-700 to-blue-800 rounded-2xl px-5 py-4 shadow-2xl"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">{items.length} Treatment{items.length !== 1 ? 's' : ''} Selected</p>
            {totalPrice ? (
              <p className="text-emerald-200 text-xs mt-1 font-semibold flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                From ${totalPrice.toLocaleString()}
              </p>
            ) : (
              <p className="text-white/70 text-xs mt-1">Tap to continue</p>
            )}
          </div>
          <ArrowRight className="w-5 h-5 text-white" />
        </div>
      </motion.div>
    </Link>
  );
}