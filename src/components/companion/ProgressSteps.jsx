// components/companion/ProgressSteps.jsx
import React from 'react';
import { CheckCircle } from 'lucide-react';
import { STEPS } from '@/lib/companion/constants';

const STEP_LABELS = {
  [STEPS.ABOUT_YOU]: 'About You',
  [STEPS.EXPERIENCE]: 'Experience',
  [STEPS.AVAILABILITY]: 'Availability',
};

/**
 * Progress steps indicator
 */
export function ProgressSteps({ currentStep }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-center gap-4">
        {[STEPS.ABOUT_YOU, STEPS.EXPERIENCE, STEPS.AVAILABILITY].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-semibold transition-all ${
              step <= currentStep 
                ? 'bg-emerald-600 text-white shadow-lg' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {step < currentStep ? <CheckCircle className="w-6 h-6" /> : step}
            </div>
            {step < STEPS.AVAILABILITY && (
              <div className={`w-16 h-1 mx-2 transition-all ${
                step < currentStep ? 'bg-emerald-600' : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-8 mt-3 text-sm font-medium">
        {Object.entries(STEP_LABELS).map(([step, label]) => (
          <span 
            key={step} 
            className={currentStep >= parseInt(step) ? 'text-emerald-600' : 'text-muted-foreground'}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}