import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Lock, Zap } from 'lucide-react';

export default function PaymentCheckout() {
  const { consultation_id } = useParams();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPayment, setShowPayment] = useState(false);

  const { data: consultation } = useQuery({
    queryKey: ['consultation', consultation_id],
    queryFn: () => base44.entities.Consultation.get(consultation_id)
  });

  const { data: paymentPlan } = useQuery({
    queryKey: ['payment_plan', consultation_id],
    queryFn: async () => {
      const plans = await base44.entities.PaymentPlan.filter({ consultation_id });
      return plans[0];
    }
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes', consultation_id],
    queryFn: async () => {
      const qr = await base44.entities.QuoteRequest.filter({ consultation_id });
      const quoteIds = qr.map(q => q.id);
      const allQuotes = await base44.entities.Quote.list();
      return allQuotes.filter(q => quoteIds.includes(q.quote_request_id) && q.is_selected);
    }
  });

  const selectPlanMutation = useMutation({
    mutationFn: (plan_type) => 
      base44.functions.invoke('portalHubWorkflowEngine', {
        action: 'client_selects_payment_option',
        consultation_id,
        data: { plan_type }
      }),
    onSuccess: (res) => {
      if (res.data.plan_type === 'full_payment') {
        setShowPayment(true);
      } else {
        // Navigate to payment screen
        setShowPayment(true);
      }
    }
  });

  if (!paymentPlan || !consultation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  const plans = [
    {
      id: 'full_payment',
      title: 'Pay in Full',
      description: 'Complete your booking with full payment',
      amount: paymentPlan.final_cost * 0.95,
      originalAmount: paymentPlan.final_cost,
      discount: 5,
      highlight: true,
      icon: Zap
    },
    {
      id: 'deposit_50',
      title: '50% Deposit',
      description: 'Secure your date with 50% upfront',
      amount: paymentPlan.final_cost * 0.50,
      originalAmount: paymentPlan.final_cost,
      remaining: paymentPlan.final_cost * 0.50,
      highlight: false,
      icon: Lock
    },
    {
      id: 'deposit_25',
      title: '25% Deposit',
      description: 'Book with 25% deposit',
      amount: paymentPlan.final_cost * 0.25,
      originalAmount: paymentPlan.final_cost,
      remaining: paymentPlan.final_cost * 0.75,
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
            Complete Your Booking
          </h1>
          <p className="text-muted-foreground">
            {consultation.patient_name} • {consultation.procedure_interest}
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
                  <span className="font-semibold">$5,200</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-border">
                  <span className="text-muted-foreground">Flights</span>
                  <span className="font-semibold">$1,200</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-border">
                  <span className="text-muted-foreground">Hotel (5 nights)</span>
                  <span className="font-semibold">$800</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-border">
                  <span className="text-muted-foreground">Transportation</span>
                  <span className="font-semibold">$400</span>
                </div>
                <div className="flex justify-between pb-4 border-b border-border">
                   <span className="text-muted-foreground">Recovery Services</span>
                   <span className="font-semibold">$300</span>
                 </div>
                 <div className="flex justify-between pb-2 border-b border-border">
                   <span className="text-muted-foreground">Subtotal</span>
                   <span className="font-semibold">${(paymentPlan.total_package_cost).toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between pb-2 border-b border-border">
                   <span className="text-muted-foreground">Platform Fee (35%)</span>
                   <span className="font-semibold">${(paymentPlan.final_cost - paymentPlan.total_package_cost).toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between pb-2 border-b border-border">
                   <span className="text-green-600 font-medium">Consultation Fee Credit</span>
                   <span className="font-semibold text-green-600">-$49</span>
                 </div>
                 <div className="flex justify-between text-base font-bold text-foreground pt-2">
                   <span>Total Package</span>
                   <span>${(paymentPlan.final_cost - 49).toLocaleString()}</span>
                 </div>
              </div>
            </Card>

            {/* Security Badge */}
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Lock className="w-4 h-4" />
                <span>Secure Stripe Payment</span>
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
                </motion.div>
              );
            })}

            {/* Checkout Button */}
            <Button
              size="lg"
              className="w-full gap-2"
              disabled={!selectedPlan}
              onClick={() => selectPlanMutation.mutate(selectedPlan)}
            >
              {selectPlanMutation.isPending ? 'Processing...' : 'Proceed to Payment'}
            </Button>

            {/* Trust Badges */}
            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground pt-4">
              <span>✓ HIPAA Secure</span>
              <span>✓ SSL Encrypted</span>
              <span>✓ Verified Provider</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}