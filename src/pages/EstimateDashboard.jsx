import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, DollarSign, Calendar, Heart } from 'lucide-react';

export default function EstimateDashboard() {
  const { estimate_id } = useParams();
  const navigate = useNavigate();
  const [showConsultationModal, setShowConsultationModal] = useState(false);

  const { data: estimate, isLoading } = useQuery({
    queryKey: ['estimate', estimate_id],
    queryFn: () => base44.entities.PriceEstimate.get(estimate_id)
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Estimate not found.</p>
        </Card>
      </div>
    );
  }

  const inclusions = [
    { label: 'Surgery', cost: estimate.estimated_surgery_cost },
    { label: 'Hospital Stay', cost: estimate.estimated_hospital_stay_cost },
    { label: 'Hotel', cost: estimate.estimated_hotel_cost },
    { label: 'Flights', cost: estimate.estimated_flight_cost },
    { label: 'Transfers', cost: estimate.estimated_transfer_cost },
    { label: 'Recovery Care', cost: estimate.estimated_recovery_cost }
  ];

  const totalBase = inclusions.reduce((sum, item) => sum + item.cost, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="font-display text-4xl text-foreground">Your Package Estimate</h1>
              <p className="text-muted-foreground">
                {estimate.user_name && `Hi ${estimate.user_name}! `}Here's your personalized quote for {estimate.procedure} in {estimate.destination}
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Estimate */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Price Range */}
            <Card className="p-8 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/30">
              <div className="mb-6">
                <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">
                  Estimated Package Cost
                </p>
                <div className="flex items-baseline gap-4">
                  <div>
                    <p className="text-4xl font-bold text-foreground">
                      ${estimate.estimated_total_low.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Low estimate</p>
                  </div>
                  <div className="text-muted-foreground">–</div>
                  <div>
                    <p className="text-4xl font-bold text-foreground">
                      ${estimate.estimated_total_high.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">High estimate (seasonal)</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/50 rounded-lg p-3 text-sm text-foreground">
                <p>
                  <strong>Why the range?</strong> Peak travel seasons (summer, holidays) cost more. Off-season rates are lower. Your final price depends on your exact travel dates.
                </p>
              </div>
            </Card>

            {/* Breakdown */}
            <Card className="p-6">
              <h2 className="font-display text-xl text-foreground mb-4">What's Included</h2>
              <div className="space-y-3">
                {inclusions.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                  >
                    <span className="text-foreground">{item.label}</span>
                    <span className="font-semibold text-foreground">
                      ${item.cost.toLocaleString()}
                    </span>
                  </motion.div>
                ))}
                <div className="flex items-center justify-between p-3 border-t-2 border-border pt-4 mt-4">
                  <span className="font-bold text-foreground">Subtotal</span>
                  <span className="text-xl font-bold text-foreground">
                    ${totalBase.toLocaleString()}
                  </span>
                </div>
              </div>
            </Card>

            {/* Recovery Timeline */}
            <Card className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <Calendar className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground">Suggested Recovery Timeline</h3>
                  <p className="text-sm text-muted-foreground">
                    Based on typical {estimate.procedure} recovery
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Days in Hospital</p>
                    <p className="text-xs text-muted-foreground">Immediate post-op care</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                    {estimate.recovery_days}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Days Total Recovery</p>
                    <p className="text-xs text-muted-foreground">Including hotel recovery stay</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  💡 You can extend your recovery stay for just <strong>+$400–600</strong> if you'd like extra rest time.
                </p>
              </div>
            </Card>

            {/* What's Not Included */}
            <Card className="p-6 bg-orange-50 border-orange-200">
              <h3 className="font-semibold text-orange-900 mb-3">What's Not Included</h3>
              <ul className="text-sm text-orange-800 space-y-1">
                <li>✗ Flights home (already factored)</li>
                <li>✗ Travel insurance (recommended, ~$200–500)</li>
                <li>✗ Post-return USA doctor visits</li>
                <li>✗ Any additional procedures beyond the primary procedure</li>
              </ul>
            </Card>
          </motion.div>

          {/* Sidebar: CTA & Trust */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 space-y-4 h-fit"
          >
            {/* Book Consultation CTA */}
            <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                    Next Step
                  </p>
                  <h3 className="font-display text-lg text-foreground">
                    Book a Consultation
                  </h3>
                </div>

                <p className="text-sm text-foreground">
                  Talk to a real doctor and get verified quotes from travel & hotel partners.
                </p>

                <div className="space-y-2">
                  <p className="text-3xl font-bold text-foreground">$49</p>
                  <p className="text-xs text-muted-foreground">
                    🔄 <strong>100% refundable</strong> – deducted from your final package if you book
                  </p>
                </div>

                <Button
                  onClick={() => navigate(`/portal-hub/checkout/${estimate_id}`)}
                  className="w-full gap-2"
                  size="lg"
                >
                  <DollarSign className="w-4 h-4" />
                  Book Consultation Now
                </Button>

                <Button variant="outline" className="w-full" onClick={() => {
                  // Save for later
                  console.log('Saved estimate');
                }}>
                  Save & Continue Later
                </Button>
              </div>
            </Card>

            {/* Trust Badges */}
            <Card className="p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Why You Can Trust Us
              </p>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">Transparent pricing – no hidden fees</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">Real verified doctors & clinics</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">HIPAA-compliant data protection</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">Based on 400+ patient estimates</span>
                </div>
              </div>
            </Card>

            {/* Explore More */}
            <Card className="p-4">
              <Button variant="ghost" className="w-full justify-center text-primary">
                ← See other procedures
              </Button>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}