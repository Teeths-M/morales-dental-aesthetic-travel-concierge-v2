import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/context/CartContext';
function StripePaymentForm({ form, onSuccess, onCancel, isProcessing, setIsProcessing }) {
  const [error, setError] = useState(null);

  const handleStripePayment = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const response = await base44.functions.invoke('chargeConsultationFee', {
        consultation_id: form.consultation_id,
        email: form.email,
        procedure: form.procedure_interest,
        destination: form.preferred_date,
        method: 'stripe'
      });
      
      if (response.data.success) {
        onSuccess(response.data);
      }
    } catch (err) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleStripePayment} className="space-y-4">
      <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
        <p className="text-sm text-slate-600">Redirecting to secure Stripe payment...</p>
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
        <Button type="submit" disabled={isProcessing} className="flex-1">
          {isProcessing ? 'Processing...' : 'Pay $49'}
        </Button>
      </div>
    </form>
  );
}

function PayPalPaymentForm({ form, onSuccess, onCancel, isProcessing, setIsProcessing }) {
  const [error, setError] = useState(null);

  const handlePayPalPayment = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const response = await base44.functions.invoke('chargeConsultationFee', {
        consultation_id: form.consultation_id,
        email: form.email,
        procedure: form.procedure_interest,
        destination: form.preferred_date,
        method: 'paypal'
      });
      
      if (response.data.success) {
        onSuccess(response.data);
      }
    } catch (err) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handlePayPalPayment} className="space-y-4">
      <div className="p-4 border border-blue-200 rounded-xl bg-blue-50 flex items-center justify-center">
        <span className="text-3xl font-bold text-blue-600">P</span>
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
        <Button type="submit" disabled={isProcessing} className="flex-1 bg-blue-600 hover:bg-blue-700">
          {isProcessing ? 'Processing...' : 'Pay with PayPal'}
        </Button>
      </div>
    </form>
  );
}

function WipayPaymentForm({ form, onSuccess, onCancel, isProcessing, setIsProcessing }) {
  const [error, setError] = useState(null);

  const handleWipayPayment = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const response = await base44.functions.invoke('chargeConsultationFee', {
        consultation_id: form.consultation_id,
        email: form.email,
        procedure: form.procedure_interest,
        destination: form.preferred_date,
        method: 'wipay'
      });
      
      if (response.data.success) {
        onSuccess(response.data);
      }
    } catch (err) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleWipayPayment} className="space-y-4">
      <div className="p-4 border border-orange-200 rounded-xl bg-orange-50 flex items-center justify-center">
        <span className="text-2xl font-bold text-orange-600">WIPAY</span>
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
        <Button type="submit" disabled={isProcessing} className="flex-1 bg-orange-600 hover:bg-orange-700">
          {isProcessing ? 'Processing...' : 'Pay with Wipay'}
        </Button>
      </div>
    </form>
  );
}

export default function ConsultationFeeModal({ form, isOpen, onSuccess, onCancel }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const { clearCart } = useCart();

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

        {/* Payment Method Selection */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Choose Payment Method</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'stripe', label: 'Card', icon: '💳' },
              { id: 'paypal', label: 'PayPal', icon: '🅿️' },
              { id: 'wipay', label: 'Wipay', icon: '💰' }
            ].map(method => (
              <button
                key={method.id}
                type="button"
                onClick={() => setPaymentMethod(method.id)}
                className={`p-3 rounded-lg border-2 transition-all text-center ${
                  paymentMethod === method.id
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="text-xl mb-1">{method.icon}</div>
                <p className="text-xs font-medium">{method.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Payment Forms */}
        {paymentMethod === 'stripe' && (
          <StripePaymentForm
            form={form}
            onSuccess={onSuccess}
            onCancel={onCancel}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
          />
        )}

        {paymentMethod === 'paypal' && (
          <PayPalPaymentForm
            form={form}
            onSuccess={onSuccess}
            onCancel={onCancel}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
          />
        )}

        {paymentMethod === 'wipay' && (
          <WipayPaymentForm
            form={form}
            onSuccess={onSuccess}
            onCancel={onCancel}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
          />
        )}

        {/* Security */}
        <div className="flex items-center justify-center gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
          <Lock className="w-3 h-3" />
          <span>Secure Payment Processing</span>
        </div>
      </motion.div>
    </div>
  );
}