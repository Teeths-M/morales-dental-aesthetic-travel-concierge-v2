import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ChevronRight, ArrowRight } from 'lucide-react';

export default function ClickToConsultModal({ card, isOpen, onClose, onProceed }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    procedure: card?.procedure || '',
    destination: card?.destination || '',
    preferred_month: '',
    health_conditions: ''
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.email) {
      alert('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      await onProceed(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        {step === 1 ? (
          // Step 1: Introduction
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl text-foreground mb-2">
                See Your Exact Package Cost
              </h2>
              <p className="text-muted-foreground">
                Real patient paid <span className="font-semibold text-accent">${card?.cost.toLocaleString()}</span> for{' '}
                <span className="font-semibold">{card?.procedure}</span> in{' '}
                <span className="font-semibold">{card?.destination}</span>
              </p>
            </div>

            <Card className="p-4 bg-blue-50 border-blue-200">
              <p className="text-sm text-blue-900">
                ✓ See what <strong>you'd</strong> pay for the same experience
                <br />✓ Get a personalized estimate in 2 minutes
                <br />✓ No spam, no obligation – just honest pricing
              </p>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Not now, just browsing
              </Button>
              <Button
                onClick={() => setStep(2)}
                className="flex-1 gap-2"
              >
                Yes, show me my estimate <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          // Step 2: Pre-qualification form
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div>
              <h2 className="font-display text-2xl text-foreground mb-2">
                Quick Estimate Form
              </h2>
              <p className="text-sm text-muted-foreground">
                Help us personalize your estimate. Takes 2 minutes.
              </p>
            </div>

            {/* Step 1: Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground text-sm">Step 1: Your Details</h3>
              <Input
                placeholder="First name (optional)"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
              <Input
                placeholder="Email address (required)"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
              <Input
                placeholder="Phone number (optional, helps get travel quotes)"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>

            {/* Step 2: Medical Context */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground text-sm">Step 2: Procedure Details</h3>
              
              <select
                value={formData.procedure}
                onChange={(e) => handleInputChange('procedure', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="">Select procedure</option>
                <option value="dental_implants">Dental Implants</option>
                <option value="knee_replacement">Knee Replacement</option>
                <option value="hip_replacement">Hip Replacement</option>
                <option value="rhinoplasty">Rhinoplasty</option>
                <option value="breast_surgery">Breast Surgery</option>
              </select>

              <select
                value={formData.destination}
                onChange={(e) => handleInputChange('destination', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="">Select destination</option>
                <option value="Cancun, Mexico">Cancun, Mexico</option>
                <option value="Costa Rica">Costa Rica</option>
                <option value="Istanbul, Turkey">Istanbul, Turkey</option>
                <option value="Bangkok, Thailand">Bangkok, Thailand</option>
              </select>

              <select
                value={formData.preferred_month}
                onChange={(e) => handleInputChange('preferred_month', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="">Preferred month (optional)</option>
                <option value="2025-06">June 2025</option>
                <option value="2025-07">July 2025</option>
                <option value="2025-08">August 2025</option>
                <option value="2025-09">September 2025</option>
                <option value="2025-10">October 2025</option>
                <option value="2025-11">November 2025</option>
              </select>

              <textarea
                placeholder="Any major health conditions? (optional, free text)"
                value={formData.health_conditions}
                onChange={(e) => handleInputChange('health_conditions', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 h-20"
              />
            </div>

            {/* Consent */}
            <Card className="p-3 bg-secondary/30">
              <p className="text-xs text-muted-foreground">
                ✓ <strong>No doctor or travel agent will be contacted</strong> unless you book a consultation.
                <br />✓ We protect your privacy and their time.
              </p>
            </Card>

            {/* Submit */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 gap-2"
              >
                {loading ? 'Generating estimate...' : 'Show my price estimate'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}