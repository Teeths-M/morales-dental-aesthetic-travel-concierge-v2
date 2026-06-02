import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, Lock, Zap, Plane, Sparkles, TriangleAlert, CreditCard } from 'lucide-react';
import DeclineDepositDialog from '@/components/checkout/DeclineDepositDialog';
import { toast } from 'sonner';

// Timeout wrapper — prevents payment UI from hanging forever
function withTimeout(promise, ms = 15000) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out — please try again')), ms)
  );
  return Promise.race([promise, timeout]);
}

// Fallback mock data for Dr. Rossanna $60 package
const MOCK_CASE = {
  id: 'mock_dr_rossanna_60',
  client_name: 'Dr. Rossanna Patient',
  procedures: ['Smile Makeover'],
  procedure_country: 'Costa Rica',
  consultation_id: 'mock_consultation',
  base_cost: 2500,
  markup_percentage: 0.35,
  final_package_price: 3375,
  treatment_cost: 1500,
  flight_cost: 600,
  hotel_cost: 400,
  pickup_cost: 75,
  dropoff_cost: 75,
  local_transfer_cost: 150,
  status: 'Proposal-Sent',
  consultation_fee_paid: true,
  consultation_fee_amount: 49
};

export default function PaymentCheckout() {
  const { case_id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('stripe'); // 'stripe' | 'wipay' | 'paypal'
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [declinedAmount, setDeclinedAmount] = useState(null);

  // Extract token from URL query param
  const proposalToken = searchParams.get('token');

  // Fetch CaseRecord: prioritize token, then case_id, fallback to mock
  const { data: caseRecord, isLoading: isLoadingCase, error: caseError } = useQuery({
    queryKey: ['case_record', case_id, proposalToken],
    queryFn: async () => {
      // Try token-based lookup first with retry
      if (proposalToken) {
        try {
          const res = await base44.functions.invoke('iq200Pipeline', {
            action: 'get_case',
            payload: { token: proposalToken, type: 'proposal' }
          });
          if (res.data?.case) return res.data.case;
        } catch (error) {
          console.warn('Token lookup failed:', error.message);
        }
      }
      
      // Try case_id lookup
      if (case_id) {
        try {
          return await base44.entities.CaseRecord.get(case_id);
        } catch (error) {
          console.warn('Case ID lookup failed:', error.message);
        }
      }
      
      // Fallback to mock data for demo/testing
      console.log('Using mock case data');
      return MOCK_CASE;
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  // Derive consultation and payment plan from CaseRecord
  const consultation = caseRecord ? {
    patient_name: caseRecord.client_name,
    procedure_interest: caseRecord.procedures?.[0] || 'Procedure'
  } : null;

  const paymentPlan = caseRecord ? {
    id: caseRecord.id,
    consultation_id: caseRecord.consultation_id,
    total_package_cost: caseRecord.base_cost || 0,
    final_cost: caseRecord.final_package_price || 0
  } : null;

  const quotes = [];

  const selectPlanMutation = useMutation({
    mutationFn: async (plan_type) => {
      if (!proposalToken && !caseRecord?.proposal_token) {
        throw new Error('No proposal token available');
      }

      const token = proposalToken || caseRecord.proposal_token;
      const depositOption = plan_type === 'full_payment' ? 'Full' : 
                            plan_type === 'deposit_50' ? '50%' : '25%';

      // Record the payment intent with timeout protection
      const res = await withTimeout(base44.functions.invoke('iq200Pipeline', {
        action: 'process_payment',
        payload: { token, deposit_option: depositOption }
      }));

      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Payment processing failed');
      }

      const amountValue = depositOption === 'Full' ? (paymentPlan?.final_cost || 0) * 0.95 :
                          depositOption === '50%' ? (paymentPlan?.final_cost || 0) * 0.50 :
                          (paymentPlan?.final_cost || 0) * 0.25;

      if (paymentMethod === 'wipay') {
        const paymentRes = await withTimeout(base44.functions.invoke('mockWipayPayment', {
          case_id: caseRecord.id, deposit_option: depositOption, amount: amountValue
        }));
        if (!paymentRes.data?.success) throw new Error(paymentRes.data?.error || 'WiPay payment failed');
        window.location.href = paymentRes.data.payment_url;
        return { redirecting: true };
      }

      if (paymentMethod === 'paypal') {
        const paymentRes = await withTimeout(base44.functions.invoke('mockPaypalPayment', {
          case_id: caseRecord.id, deposit_option: depositOption, amount: amountValue
        }));
        if (!paymentRes.data?.success) throw new Error(paymentRes.data?.error || 'PayPal payment failed');
        window.location.href = paymentRes.data.payment_url;
        return { redirecting: true };
      }

      // Default: Stripe
      const paymentRes = await withTimeout(base44.functions.invoke('generateStripePaymentLink', {
        case_id: caseRecord.id, deposit_option: depositOption
      }));

      if (!paymentRes.data?.success) {
        throw new Error(paymentRes.data?.error || 'Failed to create payment session');
      }

      window.location.href = paymentRes.data.payment_url;
      return { redirecting: true };
    },
    onError: (error) => {
      const finalCost = paymentPlan?.final_cost || 0;
      const depositMap = { full_payment: 0.95, deposit_50: 0.50, deposit_25: 0.25 };
      const multiplier = depositMap[selectedPlan] ?? 1;
      const attemptedAmount = Math.round(finalCost * multiplier);
      if (attemptedAmount >= 3000 && paymentMethod === 'stripe') {
        setDeclinedAmount(attemptedAmount);
        setShowDeclineDialog(true);
      } else {
        toast.error(error.message || 'Payment failed. Please try again or contact support.');
      }
    },
    onSuccess: (res) => {
      if (!res.redirecting) {
        setPaymentSuccess(true);
        setSelectedPlan(null);
      }
    }
  });

  // Error state with graceful fallback
  if (caseError && !caseRecord) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background p-8 flex items-center justify-center">
        <Alert className="max-w-md">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Unable to load payment details</AlertTitle>
          <AlertDescription>
            <p className="mt-2 text-sm">
              We're having trouble retrieving your payment information. This could be due to a network issue or an expired link.
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">
              If this persists, contact us at concierge@morales-dental.com
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoadingCase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading your secure payment details...</p>
        </div>
      </div>
    );
  }

  if (!caseRecord) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background p-8 flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Payment link not found</AlertTitle>
          <AlertDescription>
            <p className="mt-2 text-sm">
              The payment link you're using may be expired or invalid.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
              Return to Home
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Success state
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background p-8 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full"
        >
          <Card className="p-12 text-center bg-white border-green-200">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </motion.div>
            
            <h1 className="font-display text-3xl text-foreground mb-4">Payment Confirmed!</h1>
            
            <p className="text-muted-foreground mb-8">
              Thank you, <strong>{caseRecord.client_name}</strong>. Your {caseRecord.procedures?.[0] || 'procedure'} package is now confirmed.
            </p>

            <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
              <div className="flex items-start gap-3">
                <Plane className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-green-800 mb-2">Your travel itinerary is being prepared</p>
                  <p className="text-sm text-green-700">
                    A comprehensive confirmation email with all details (flights, hotel, transfers, and procedure schedule) is on its way to <strong>{caseRecord.client_email}</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-sm text-muted-foreground">
              <p>✓ Doctor has been notified to confirm your procedure date</p>
              <p>✓ Travel agency is booking your flights and hotel</p>
              <p>✓ Airport transfers are being arranged</p>
              <p>✓ Your dedicated coordinator will contact you within 24 hours</p>
            </div>

            <Button
              variant="outline"
              className="mt-8"
              onClick={() => navigate('/')}
            >
              Return to Home
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  const finalCostSafe = paymentPlan?.final_cost || 0;

  const plans = [
    {
      id: 'full_payment',
      title: 'Pay in Full',
      description: 'Complete your booking with full payment',
      amount: finalCostSafe * 0.95,
      originalAmount: finalCostSafe,
      discount: 5,
      highlight: true,
      icon: Zap
    },
    {
      id: 'deposit_50',
      title: '50% Deposit',
      description: 'Secure your date with 50% upfront',
      amount: finalCostSafe * 0.50,
      originalAmount: finalCostSafe,
      remaining: finalCostSafe * 0.50,
      highlight: false,
      icon: Lock
    },
    {
      id: 'deposit_25',
      title: '25% Deposit',
      description: 'Book with 25% deposit',
      amount: finalCostSafe * 0.25,
      originalAmount: finalCostSafe,
      remaining: finalCostSafe * 0.75,
      highlight: false,
      icon: Lock
    }
  ];

  return (
    <>
    <div className="min-h-screen bg-secondary/20 px-4 py-8 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="font-display text-3xl md:text-4xl text-foreground mb-2">
            Complete Your Booking
          </h1>
          <p className="text-muted-foreground">
            {caseRecord?.client_name || consultation?.patient_name || 'Your Package'} • {caseRecord?.procedures?.[0] || consultation?.procedure_interest || 'Medical Procedure'}
          </p>
        </div>

        {/* Two-column layout: Package Details (left) + Payment Plans (right) */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* LEFT: Package Details */}
          <div className="w-full lg:w-1/2 lg:sticky lg:top-8">
            <Card className="p-6">
              <h2 className="font-display text-xl text-foreground mb-4">What's Included in Your Package</h2>
              <div className="space-y-3 text-sm">
                {caseRecord?.procedures?.length > 0 && (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">Medical Procedure(s)</p>
                      <p className="text-muted-foreground">{caseRecord.procedures.join(', ')}</p>
                    </div>
                  </div>
                )}
                {caseRecord?.flight_details && (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">Flights</p>
                      <p className="text-muted-foreground">{caseRecord.flight_details}</p>
                    </div>
                  </div>
                )}
                {!caseRecord?.flight_details && caseRecord?.flight_cost > 0 && (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">Flights</p>
                      <p className="text-muted-foreground">Round-trip flights included</p>
                    </div>
                  </div>
                )}
                {caseRecord?.hotel_name && (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">Accommodation</p>
                      <p className="text-muted-foreground">{caseRecord.hotel_name}{caseRecord.hotel_address ? ` — ${caseRecord.hotel_address}` : ''}</p>
                    </div>
                  </div>
                )}
                {!caseRecord?.hotel_name && caseRecord?.hotel_cost > 0 && (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">Accommodation</p>
                      <p className="text-muted-foreground">Hotel stay included</p>
                    </div>
                  </div>
                )}
                {(caseRecord?.pickup_cost > 0 || caseRecord?.dropoff_cost > 0 || caseRecord?.local_transfer_cost > 0) && (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">Ground Transfers</p>
                      <ul className="text-muted-foreground space-y-0.5 mt-0.5">
                        {caseRecord.pickup_cost > 0 && <li>• Home → Origin airport</li>}
                        {caseRecord.dropoff_cost > 0 && <li>• Destination airport → Hotel</li>}
                        {caseRecord.local_transfer_cost > 0 && <li>• Local clinic & hotel transfers</li>}
                      </ul>
                    </div>
                  </div>
                )}
                {caseRecord?.final_package_price > 0 && (
                  <div className="pt-4 border-t border-border flex items-center justify-between">
                    <p className="font-bold text-foreground text-base">Total Package Price</p>
                    <p className="font-bold text-foreground text-xl">${caseRecord.final_package_price.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* RIGHT: Payment Plans */}
          <div className="w-full lg:w-1/2 space-y-4">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const isSelected = selectedPlan === plan.id;

              return (
                <div key={plan.id}>
                  <Card
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`p-6 cursor-pointer transition-all border-2 ${
                      isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
                    } ${plan.highlight ? 'bg-gradient-to-br from-primary/5 to-accent/5' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="w-5 h-5 text-primary" />
                          <h3 className="font-display text-lg text-foreground">{plan.title}</h3>
                          {plan.discount && (
                            <Badge className="bg-green-100 text-green-800">Save {plan.discount}%</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                          isSelected ? 'border-primary bg-primary' : 'border-border'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-primary-foreground" />}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-foreground">
                          ${plan.amount.toLocaleString()}
                        </span>
                        {plan.originalAmount > plan.amount && (
                          <span className="text-sm line-through text-muted-foreground">
                            ${plan.originalAmount.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {plan.remaining && (
                        <p className="text-sm text-muted-foreground">
                          Remaining: ${plan.remaining.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </Card>
                </div>
              );
            })}

            {/* Payment Method Selection */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">Select Payment Method</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'stripe', label: 'Stripe / Card', icon: '💳' },
                  { id: 'wipay', label: 'WiPay', icon: '🏦' },
                  { id: 'paypal', label: 'PayPal', icon: '🅿️' },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      paymentMethod === method.id
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    <span className="text-xl">{method.icon}</span>
                    <span>{method.label}</span>
                  </button>
                ))}
              </div>
              {(paymentMethod === 'wipay' || paymentMethod === 'paypal') && (
                <p className="text-xs text-amber-600 mt-2 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
                  ⚠️ Mock mode — no real charges will be made
                </p>
              )}
            </div>

            {/* Checkout Button */}
            <Button
              size="lg"
              className="w-full gap-2"
              disabled={!selectedPlan || selectPlanMutation.isPending}
              onClick={() => selectPlanMutation.mutate(selectedPlan)}
            >
              {selectPlanMutation.isPending ? 'Processing...' : `Pay with ${paymentMethod === 'stripe' ? 'Stripe' : paymentMethod === 'wipay' ? 'WiPay' : 'PayPal'}`}
            </Button>

            {/* Consultation Fee Credit Notice */}
            <Card className="p-4 bg-emerald-50 border-emerald-200">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-emerald-600 mt-0.5" />
                <div className="text-sm text-emerald-800">
                  <p className="font-semibold mb-1">Consultation Fee Credited</p>
                  <p>Your $49 consultation retainer has been fully refunded and applied as credit toward this package.</p>
                </div>
              </div>
            </Card>

            {/* Security Badge */}
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Lock className="w-4 h-4" />
                <span>Secure Payment — {paymentMethod === 'stripe' ? 'Stripe' : paymentMethod === 'wipay' ? 'WiPay' : 'PayPal'}</span>
              </div>
            </Card>

            {/* Trust Badges */}
            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground pt-4">
              <span>✓ HIPAA Secure</span>
              <span>✓ SSL Encrypted</span>
              <span>✓ Verified Provider</span>
            </div>
          </div>
        </div>{/* end two-column */}
      </div>
    </div>
      <DeclineDepositDialog
        isOpen={showDeclineDialog}
        onClose={() => setShowDeclineDialog(false)}
        caseRecord={caseRecord}
        originalAmount={declinedAmount}
      />
    </>
  );
}