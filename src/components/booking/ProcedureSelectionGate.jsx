import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { AlertCircle, CheckCircle2, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProcedureSelectionGate({ children }) {
  const { items } = useCart();
  const navigate = useNavigate();
  
  const hasSelectedProcedure = items && items.length > 0;

  return (
    <>
      {/* Booking Form Content */}
      {children}

      {/* Blocking Modal Popup - shown when no procedures selected */}
      <AnimatePresence>
        {!hasSelectedProcedure {false && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="max-w-lg w-full bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-700 to-blue-800 px-6 py-8 text-center relative">
                <button
                  onClick={() => navigate('/procedures')}
                  className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-white" />
                </div>
                <h1 className="font-display text-2xl text-white mb-2">
                  No Procedure Selected
                </h1>
                <p className="text-white/90 text-sm">
                  Please add a procedure to continue your consultation
                </p>
              </div>

              {/* Content */}
              <div className="px-6 py-8">
                <div className="space-y-6">
                  <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-800 text-sm leading-relaxed">
                      We don't see any procedure in your cart. Please go back and add a procedure to continue your consultation.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {[
                      'Enables personalized doctor assessment',
                      'Ensures accurate pricing estimates',
                      'Allows travel coordination',
                      'Guarantees procedure date availability'
                    ].map((reason, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="text-slate-600 text-sm">{reason}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <Button
                      onClick={() => navigate('/procedures')}
                      className="w-full bg-gradient-to-r from-emerald-700 to-blue-800 hover:opacity-90 text-white font-semibold py-5 text-base shadow-lg"
                    >
                      Browse Procedures <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                    <p className="text-center text-xs text-slate-400 mt-3">
                      Select one or more procedures to begin
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}