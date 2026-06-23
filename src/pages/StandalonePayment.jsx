import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Lock, Zap } from 'lucide-react';

export default function StandalonePayment() {
  const { case_id } = useParams();
  const [searchParams] = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  // Fetch CaseRecord directly
  const { data: caseRecord, isLoading } = useQuery({
    queryKey: ['case_record', case_id],
    queryFn: () => base44.entities.CaseRecord.get(case_id),
    staleTime: Infinity,
    enabled: !!case_id
  });

  const processPaymentMutation = useMutation({
    mutationFn: async ({ plan_type }) => {
      // Map plan_type to deposit_option for generateStripePaymentLink
      const depositOption = plan_type === 'full_payment' ? 'Full' :
                            plan_type === 'deposit_50' ? '50%' : '25%';
      const response = await base44.functions.invoke('generateStripePaymentLink', {
        case_id: caseRecord.id,
        deposit_option: depositOption,
      });
      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Failed to create payment session');
      }
      return response.data;
    }
  });

  const handlePayment = async () => {
    if (!selectedPlan) return;
    setIsProcessing(true);
    try {
      const result = await processPaymentMutation.mutateAsync({ plan_type: selectedPlan });
      if (result.payment_url) {
        window.location.href = result.payment_url;
      }
    } catch (error) {
      console.error('Payment processing failed:', error);
      alert('Payment processing failed. Please contact support.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!caseRecord) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <h2 className="font-display text-2xl text-foreground mb-4">Case Not Found</h2>
          <p className="text-muted-foreground">The payment link you accessed is invalid or has expired.</p>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-8">
        <Card className="p-8 max-w-lg w-full text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </motion.div>
          <h1 className="font-display text-3xl text-foreground mb-4">Redirecting to Checkout…</h1>
          <p className="text-muted-foreground mb-6">
            Thank you, {caseRecord.client_name}. You are being redirected to complete your payment securely with Stripe.
          </p>
          <Card className="p-4 bg-green-50 border-green-200 mb-6">
            <p className="text-sm text-green-800">
              <strong>Note:</strong> Your booking will be confirmed once Stripe verifies your payment.
            </p>
          </Card>
          <p className="text-sm text-muted-foreground">
            A confirmation email will be sent to <strong>{caseRecord.client_email}</strong>
          </p>
        </Card>
      </div>
    );
  }

  const plans = [
    {
      id: 'full_payment',
      title: 'Pay in Full',
      description: 'Complete your booking with full payment',
      amount: caseRecord.final_package_price * 0.95,
      originalAmount: caseRecord.final_package_price,
      discount: 5,
      highlight: true,
      icon: Zap
    },
    {
      id: 'deposit_50',
      title: '50% Deposit',
      description: 'Secure your date with 50% upfront',
      amount: caseRecord.final_package_price * 0.50,
      originalAmount: caseRecord.final_package_price,
      remaining: caseRecord.final_package_price * 0.50,
      highlight: false,
      icon: Lock
    },
    {
      id: 'deposit_25',
      title: '25% Deposit',
      description: 'Book with 25% deposit',
      amount: caseRecord.final_package_price * 0.25,
      originalAmount: caseRecord.final_package_price,
      remaining: caseRecord.final_package_price * 0.75,
      highlight: false,
      icon: Lock
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="font-display text-4xl text-foreground mb-2">
            Complete Your Medical Travel Booking
          </h1>
          <p className="text-muted-foreground">
            {caseRecord.client_name} • {caseRecord.procedures?.[0] || 'Procedure'}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Case ID: {caseRecord.id}
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cost Breakdown */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 space-y-4"
          >
            <Card className="p-6 bg-secondary/30">
              <h3 className="font-display text-lg text-foreground mb-4">Package Breakdown</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between pb-2 border-b border-border">
                  <span className="text-muted-foreground">Doctor Fee</span>
                  <span className="font-semibold">${caseRecord.treatment_cost?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-border">
                  <span className="text-muted-foreground">Flights</span>
                  <span className="font-semibold">${caseRecord.flight_cost?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-border">
                  <span className="text-muted-foreground">Hotel</span>
                  <span className="font-semibold">${caseRecord.hotel_cost?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-border">
                  <span className="text-muted-foreground">Transportation</span>
                  <span className="font-semibold">${(caseRecord.pickup_cost + caseRecord.dropoff_cost + caseRecord.local_transfer_cost)?.toLocaleString() || '0'}</span>
                </div>
                 <div className="flex justify-between pb-2 border-b border-border">
                   <span className="text-muted-foreground">Subtotal</span>
                   <span className="font-semibold">${caseRecord.base_cost?.toLocaleString() || '0'}</span>
                 </div>
                 <div className="flex justify-between pb-2 border-b border-border">
                   <span className="text-muted-foreground">Platform Fee ({(caseRecord.markup_percentage * 100 || 35).toFixed(0)}%)</span>
                   <span className="font-semibold">${caseRecord.profit?.toLocaleString() || '0'}</span>
                 </div>
                 <div className="flex justify-between text-base font-semibold text-foreground pt-2">
                   <span>Total Package</span>
                   <span>${caseRecord.final_package_price?.toLocaleString() || '0'}</span>
                 </div>
              </div>
            </Card>

            {/* Security Badge */}
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Lock className="w-4 h-4" />
                <span>Secure Payment Processing</span>
              </div>
            </Card>
          </motion.div>

          {/* Payment Plans */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-4"
          >
            {plans.map((plan, i) => {
              const Icon = plan.icon;
              const isSelected = selectedPlan === plan.id;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
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
                        <span className="text-3xl font-semibold text-foreground">
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
                </motion.div>
              );
            })}

            {/* Checkout Button */}
            <Button
              size="lg"
              className="w-full gap-2"
              disabled={!selectedPlan || isProcessing}
              onClick={handlePayment}
            >
              {isProcessing ? 'Processing...' : 'Select Payment Option'}
            </Button>

            {/* Trust Badges */}
            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground pt-4">
              <span>✓ SSL Encrypted</span>
              <span>✓ Stripe Verified</span>
              <span>✓ Audited Provider</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}