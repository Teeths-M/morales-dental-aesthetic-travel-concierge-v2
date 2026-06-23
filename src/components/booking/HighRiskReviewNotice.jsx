import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, HeartPulse, Lock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Shown when a patient selects a high-risk medical condition.
 * Frames the mandatory review as a premium care benefit, not a block.
 * The patient must acknowledge and pay the consultation fee to proceed.
 */
export default function HighRiskReviewNotice({ isOpen, flaggedCondition, onProceed, onCancel }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 relative">
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-white/80 text-xs font-semibold uppercase tracking-widest">Senior Medical Review</p>
                <h3 className="text-white font-semibold text-lg leading-tight">Enhanced Care Assurance</h3>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <HeartPulse className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 leading-relaxed">
                Because you've indicated <strong>{flaggedCondition}</strong>, your case will be personally reviewed by our <strong>Senior Surgical Team</strong> before planning begins — ensuring your procedure is 100% tailored to your health profile.
              </p>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              This is not a restriction — it's a higher standard of care. Patients with complex health histories receive a dedicated pre-consultation review so your doctors have everything they need to design a safe, personalised plan.
            </p>

            <div className="space-y-2">
              {[
                'Your case is assigned to a Senior Clinical Coordinator',
                'A specialist reviews your full health profile before contact',
                'You receive a personalised safety brief within 24–48 hours',
              ].map((point, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">{i + 1}</span>
                  {point}
                </div>
              ))}
            </div>

            {/* Payment notice */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <p className="text-xs text-slate-500">
                A <strong className="text-slate-700">$49 refundable consultation retainer</strong> is required to initiate your Senior Review — applied as a credit toward your package.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1 text-sm"
            >
              Go Back
            </Button>
            <Button
              onClick={onProceed}
              className="flex-1 text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white border-0"
            >
              Proceed to Payment
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}