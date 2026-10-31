import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/context/CartContext';
import { friendlyError } from '@/lib/friendlyError';

function StripePaymentForm({ form, onSuccess, onCancel, isProcessing, setIsProcessing, clearCart, handlePaymentSuccess }) {
  const [error, setError] = useState(null);

  const handleStripePayment = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('chargeConsultationFee', {
        consultation_id: form.consultation_id,
        email: form.email,
        procedure: form.procedure_interest,
        destination: form.preferred_date,
      });

      const data = response.data;

      // Already paid — skip Stripe and proceed. The consent archive + client
      // email are now handled reliably server-side (pipelineOnConsultationFeePaid
      // fires createCaseFromConsultation when ConsultationFee.fee_paid flips
      // true, which already happened for this consultation) — calling
      // processInformedConsentAndEmail here as well would double-send the email.
      if (data.already_paid) {
        clearCart();
        if (handlePaymentSuccess) {
          await handlePaymentSuccess(data);
        } else {
          onSuccess(data);
        }
        return;
      }

      // Redirect to Stripe hosted checkout page
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }

      throw new Error('No checkout URL returned from payment service.');
    } catch (err) {
      setError(friendlyError(err, 'We could not open the payment page. No money has been taken — please try again.', 'ConsultationFeeModal'));
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
          {isProcessing ? 'Redirecting...' : 'Pay $49 — Secure Checkout →'}
        </Button>
      </div>
    </form>
  );
}

// PayPal and Wipay forms were removed: nothing in the backend charged either
// one. chargeConsultationFee always created a Stripe card session, and those
// two forms treated its reply as a finished payment. Add them back only with a
// real PayPal or Wipay integration behind them.

export default function ConsultationFeeModal({ form, isOpen, onSuccess, onCancel }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { clearCart } = useCart();

  // Generate proposal redirect URL after successful payment
  const handlePaymentSuccess = async (responseData) => {
    try {
      // Create CaseRecord and generate proposal token
      const pipelineResponse = await base44.functions.invoke('iq200Pipeline', {
        action: 'create',
        consultation_id: form.consultation_id
      });

      if (pipelineResponse.data?.proposal_url) {
        // Redirect to proposal portal immediately
        window.location.href = pipelineResponse.data.proposal_url;
        return;
      }
    } catch (error) {
      console.error('Proposal generation failed:', error);
    }
    
    // Fallback: call original onSuccess and go to dashboard
    onSuccess(responseData);
  };

  if (!isOpen) return null;

  const GOLD   = '#D4AF37';
  const _DARK   = '#060B16';
  const CARD   = '#0C1A1D';
  const BORDER = '#2A3F4A';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', padding: 16 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, maxWidth: 420, width: '100%', padding: 28, fontFamily: '"SF Pro Display", system-ui, sans-serif' }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: `rgba(212,175,55,0.12)`, border: `1px solid rgba(212,175,55,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Lock style={{ width: 22, height: 22, color: GOLD }} />
          </div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>One last step</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
            A $49 consultation fee secures your booking and is <strong style={{ color: '#fff' }}>fully credited</strong> to your package.
          </p>
        </div>

        {/* Fee badge */}
        <div style={{ background: `linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.06))`, border: `1px solid rgba(212,175,55,0.3)`, borderRadius: 16, padding: '16px 20px', textAlign: 'center', marginBottom: 20 }}>
          <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Consultation Fee</p>
          <p style={{ margin: '0 0 4px', fontSize: 38, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>$49</p>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>100% credited when you book your procedure</p>
        </div>

        {/* 3 reasons */}
        <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
          <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#34d399', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Why we ask for this</p>
          {[
            'Reserves your spot with a verified doctor',
            'Protects the specialist\'s time from no-shows',
            'Fully credited — you pay $0 more when you commit',
          ].map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: i < 2 ? 8 : 0 }}>
              <CheckCircle2 style={{ width: 14, height: 14, color: '#34d399', marginTop: 1, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{t}</span>
            </div>
          ))}
        </div>

        {/* Card only. PayPal and Wipay buttons used to sit here, but no
            backend charged either one (see the note above this component). */}
        <StripePaymentForm form={form} onSuccess={onSuccess} onCancel={onCancel} isProcessing={isProcessing} setIsProcessing={setIsProcessing} clearCart={clearCart} handlePaymentSuccess={handlePaymentSuccess} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
          <Lock style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.25)' }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Secured by Stripe · HIPAA Compliant · SSL Encrypted</span>
        </div>
      </motion.div>
    </div>
  );
}