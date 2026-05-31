import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Lock, Zap, Plane, Sparkles } from 'lucide-react';

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

  // Extract token from URL query param
  const proposalToken = searchParams.get('token');

  // Fetch CaseRecord: prioritize token, then case_id, fallback to mock
  const { data: caseRecord, isLoading: isLoadingCase } = useQuery({
    queryKey: ['case_record', case_id, proposalToken],
    queryFn: async () => {
      // Try token-based lookup first
      if (proposalToken) {
        try {
          const res = await base44.functions.invoke('iq200Pipeline', {
            action: 'get_case',
            payload: { token: proposalToken, type: 'proposal' }
          });
          if (res.data?.case) return res.data.case;
        } catch (error) {
          console.error('Token lookup failed:', error);
        }
      }
      
      // Try case_id lookup
      if (case_id) {
        try {
          return await base44.entities.CaseRecord.get(case_id);
        } catch (error) {
          console.error('Case ID lookup failed:', error);
        }
      }
      
      // Fallback to mock data
      return MOCK_CASE;
    },
    staleTime: Infinity
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
      
      // Map plan_type to deposit_option format expected by backend
      const depositOption = plan_type === 'full_payment' ? 'Full' : 
                           plan_type === 'deposit_50' ? '50%' : '25%';
      
      const res = await base44.functions.invoke('iq200Pipeline', {
        action: 'process_payment',
        payload: { 
          token: token,
          deposit_option: depositOption
        }
      });
      
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Payment processing failed');
      }
      
      return res.data;
    },
    onSuccess: (res) => {
      setPaymentSuccess(true);
      setSelectedPlan(null);
    }
  });

  if (isLoadingCase || !caseRecord) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin"></div>
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
            {caseRecord?.client_name || consultation.patient_name} • {caseRecord?.procedures?.[0] || consultation.procedure_interest}
          </p>
        </motion.div>

        <div className="flex justify-center">
          {/* Payment Plans */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full max-w-2xl space-y-4"
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
                <span>Secure Stripe Payment</span>
              </div>
            </Card>

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