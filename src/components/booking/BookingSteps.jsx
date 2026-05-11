import React from 'react';
import { CheckCircle } from 'lucide-react';

const steps = ['Your Info', 'Procedure', 'Preferred Date', 'Confirm'];

export default function BookingSteps({ currentStep }) {
  return (
    <div className="flex items-center justify-between mb-10">
      {steps.map((label, i) => {
        const isComplete = i < currentStep;
        const isCurrent = i === currentStep;

        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center relative">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                isComplete ? 'bg-accent text-accent-foreground' :
                isCurrent ? 'bg-primary text-primary-foreground' :
                'bg-secondary text-muted-foreground'
              }`}>
                {isComplete ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-[11px] mt-1.5 ${isCurrent ? 'text-foreground font-semibold' : 'text-muted-foreground'} hidden sm:block`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mx-2 ${isComplete ? 'bg-accent' : 'bg-border'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}