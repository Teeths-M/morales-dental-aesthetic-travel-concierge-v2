import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function ProcedureSelectionGate({ children }) {
  const { items } = useCart();
  const navigate = useNavigate();
  
  const hasSelectedProcedure = items.length > 0;

  // If no procedure selected, show gate screen
  if (!hasSelectedProcedure) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-700 to-blue-800 px-8 py-12 text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="font-display text-3xl text-white mb-2">
              Procedure Selection Required
            </h1>
            <p className="text-white/90 text-sm">
              Every consultation begins with choosing your treatment
            </p>
          </div>

          {/* Content */}
          <div className="px-8 py-10">
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-900 text-sm mb-1">
                    No Procedure Selected
                  </h3>
                  <p className="text-amber-800 text-sm leading-relaxed">
                    You haven't selected any medical procedures yet. To ensure your consultation is productive and tailored to your needs, please choose at least one procedure from our catalog before continuing.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-slate-800 text-sm">Why This Matters:</h3>
                <div className="space-y-2">
                  {[
                    'Enables our doctors to prepare a personalized assessment',
                    'Ensures accurate pricing and timeline estimates',
                    'Allows coordination of travel and accommodation needs',
                    'Guarantees availability for your preferred procedure date'
                  ].map((reason, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-600 text-sm">{reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <Button
                  onClick={() => navigate('/procedures')}
                  className="w-full bg-gradient-to-r from-emerald-700 to-blue-800 hover:opacity-90 text-white font-semibold py-6 text-base shadow-lg"
                >
                  Browse Procedures <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <p className="text-center text-xs text-slate-400 mt-4">
                  You'll be able to select one or more procedures from our comprehensive catalog
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // If procedures selected, render children (the actual booking form)
  return children;
}