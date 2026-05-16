import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { loadStripe } from '@stripe/stripe-js';
import { CardElement, Elements, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe('pk_test_placeholder'); // Will be set via env

function PaymentForm({ form, onSuccess, onCancel, isProcessing }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardElement);
    const { token } = await stripe.createToken(cardElement);

    if (token) {
      try {
        const response = await base44.functions.invoke('chargeConsultationFee', {
          consultation_id: form.consultation_id,
          email: form.email,
          procedure: form.procedure_interest,
          destination: form.preferred_date
        });
        
        if (response.data.success) {
          onSuccess(response.data);
        }
      } catch (err) {
        setError(err.message);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border border-slate-200 rounded-xl bg-white">
        <CardElement options={{ style: { base: { fontSize: '16px' } } }} />
      </div>
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} disabled={isProcessing} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || isProcessing} className="flex-1">
          {isProcessing ? 'Processing...' : 'Pay $49'}
        </Button>
      </div>
    </form>
  );
}

export default function ConsultationFeeModal({ form, isOpen, onSuccess, onCancel }) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl max-w-md w-full shadow-xl p-6 space-y-6"
      >
        {/* Header */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="font-display text-xl font-bold text-slate-800">Secure Your Consultation</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Pay the consultation fee to confirm your booking and prevent no-shows.
          </p>
        </div>

        {/* Fee Amount */}
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">Consultation Fee</p>
          <p className="font-display text-3xl font-bold text-slate-800">$49</p>
          <p className="text-xs text-slate-500 mt-2">
            Refundable when you book your procedure package
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-2 bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-2">Why This Fee?</p>
          <div className="space-y-2 text-xs text-emerald-700">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>Guarantees serious patient commitment</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>Protects doctor's time & availability</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>Fully refunded in your package price</span>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <Elements stripe={stripePromise}>
          <PaymentForm
            form={form}
            onSuccess={(data) => {
              setIsProcessing(false);
              onSuccess(data);
            }}
            onCancel={onCancel}
            isProcessing={isProcessing}
          />
        </Elements>

        {/* Security */}
        <div className="flex items-center justify-center gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
          <Lock className="w-3 h-3" />
          <span>Secure Stripe Payment</span>
        </div>
      </motion.div>
    </div>
  );
}