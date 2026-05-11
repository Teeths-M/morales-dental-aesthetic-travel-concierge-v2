import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Shield, Activity, Pill, ClipboardCheck, HeartPulse, CheckCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const tabs = [
  { value: 'overview', label: 'Overview', icon: Shield },
  { value: 'risk', label: 'Risk Assessment', icon: Activity },
  { value: 'procedure', label: 'Procedure Safety', icon: ClipboardCheck },
  { value: 'preparation', label: 'Preparation', icon: Pill },
  { value: 'recovery', label: 'Recovery', icon: HeartPulse },
];

const features = [
  'Cumulative procedure risk analysis',
  'Drug & procedure interaction check',
  'Personalized preparation plan',
  'Recovery & aftercare guidance',
  'Real-time safety monitoring',
  'AI-powered risk scoring',
];

export default function SafeT() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="py-12 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            <Shield className="w-4 h-4" />
            SAFE-T 4LIFE™
          </div>
          <h1 className="font-display text-3xl lg:text-5xl text-foreground mb-4">
            AI-Powered Safety. Better Decisions. Better Outcomes.
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Our AI system analyzes your health profile, procedures, and medical history to help you make safer choices.
          </p>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-12">
          <TabsList className="w-full flex-wrap h-auto gap-1 bg-secondary/50 p-1.5 rounded-xl">
            {tabs.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex-1 min-w-fit gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm py-2.5"
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-display text-2xl lg:text-3xl text-foreground mb-4">
                  Comprehensive Safety Analysis
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Our AI system analyzes your health profile, procedures, and medical history to help you make safer choices. Every patient receives a personalized risk assessment before any procedure.
                </p>

                <div className="space-y-3 mb-8">
                  {features.map(f => (
                    <div key={f} className="flex items-center gap-3">
                      <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                      <span className="text-sm text-foreground">{f}</span>
                    </div>
                  ))}
                </div>

                <Link to="/booking">
                  <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    Learn More <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>

              {/* Risk Display */}
              <div className="bg-card border border-border rounded-2xl p-8">
                <div className="text-center">
                  <p className="text-sm font-semibold text-muted-foreground mb-4">Overall Risk Level</p>
                  <div className="relative w-40 h-40 mx-auto mb-6">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                      <circle
                        cx="50" cy="50" r="42"
                        fill="none"
                        stroke="hsl(var(--chart-1))"
                        strokeWidth="8"
                        strokeDasharray={`${0.85 * 2 * Math.PI * 42} ${2 * Math.PI * 42}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs text-primary font-semibold uppercase">Low Risk</span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">All systems look good</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">View Full Report</Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {['risk', 'procedure', 'preparation', 'recovery'].map(tab => (
            <TabsContent key={tab} value={tab} className="mt-8">
              <div className="bg-card border border-border rounded-2xl p-8 lg:p-12 text-center">
                <div className="max-w-md mx-auto">
                  <Shield className="w-12 h-12 text-primary/30 mx-auto mb-4" />
                  <h3 className="font-display text-xl text-foreground mb-2">
                    {tab === 'risk' && 'Risk Assessment Module'}
                    {tab === 'procedure' && 'Procedure Safety Protocols'}
                    {tab === 'preparation' && 'Pre-Procedure Preparation'}
                    {tab === 'recovery' && 'Recovery & Aftercare'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Book a consultation to receive your personalized {tab} analysis powered by our SAFE-T 4LIFE™ system.
                  </p>
                  <Link to="/booking">
                    <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                      Get Your Assessment
                    </Button>
                  </Link>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}