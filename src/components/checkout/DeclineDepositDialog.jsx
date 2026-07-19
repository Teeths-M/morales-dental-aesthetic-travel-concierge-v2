import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CreditCard, X, Loader2, ShieldCheck, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useModalA11y } from '@/hooks/useModalA11y';
import { friendlyError, safeError } from '@/lib/friendlyError';

export default function DeclineDepositDialog({ isOpen, onClose, caseRecord, originalAmount }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const dialogRef = useModalA11y({ isOpen, onClose });

  const handleAuthorizeDeposit = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('generateConsultationDepositLink', {
        case_id: caseRecord?.id || null,
        client_email: caseRecord?.client_email || '',
        client_name: caseRecord?.client_name || '',
        original_amount: originalAmount,
      });

      if (!res.data?.success || !res.data?.payment_url) {
        throw safeError(res.data?.error || 'Could not start the deposit.');
      }

      window.location.href = res.data.payment_url;
    } catch (err) {
      setError(friendlyError(err, 'We could not start your deposit. No money has been taken — please try again.', 'DeclineDepositDialog'));
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="decline-deposit-title"
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Header */}
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 id="decline-deposit-title" className="font-semibold text-amber-900 text-base leading-tight">
                    Your bank declined this transaction
                  </h2>
                  <p className="text-amber-700 text-sm mt-0.5">
                    High-value international charges are sometimes flagged automatically.
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-amber-500 hover:text-amber-700 flex-shrink-0 mt-0.5"
                disabled={isProcessing}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-sm text-slate-700 space-y-2">
                <p className="font-semibold text-slate-800">What happened?</p>
                <p>
                  Your bank's fraud prevention system halted the{' '}
                  <strong className="text-slate-900">${originalAmount?.toLocaleString()}</strong>{' '}
                  authorization. This is common for international medical travel payments. You can resolve this by calling your bank to whitelist the charge.
                </p>
              </div>

              {/* Consent-based alternative */}
              <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <p className="font-semibold text-emerald-800 text-sm">Alternative: Secure your slot today</p>
                </div>
                <p className="text-sm text-emerald-800">
                  You can place a <strong>$60.00 consultation deposit</strong> now to hold your consultation slot and logistics itinerary, then contact your bank to clear the remaining balance at your convenience.
                </p>
                <div className="flex items-start gap-2 bg-white/70 rounded-lg p-3 border border-emerald-200">
                  <Info className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    <strong>This will only charge $60.00.</strong> No other amount will be billed. Your coordinator will follow up with bank whitelist instructions to complete the remaining package payment.
                  </p>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex flex-col gap-3">
              <Button
                onClick={handleAuthorizeDeposit}
                disabled={isProcessing}
                className="w-full gap-2 bg-gradient-to-r from-emerald-700 to-blue-800 hover:opacity-90 text-white border-0 py-3 h-auto"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Preparing secure checkout…
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Authorize $60.00 Consultation Deposit
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-slate-500 leading-relaxed">
                By clicking above you authorize a single, separate charge of exactly <strong>$60.00 USD</strong>. No other amounts will be billed at this time.
              </p>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isProcessing}
                className="w-full text-sm"
              >
                I'll contact my bank first
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}