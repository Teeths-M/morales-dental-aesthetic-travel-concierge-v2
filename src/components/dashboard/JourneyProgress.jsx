import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';

const stages = [
  'Consultation', 'Planning', 'Booking', 'Travel', 'Procedure', 'Recovery', 'Aftercare'
];

export default function JourneyProgress({ currentStage = 'consultation' }) {
  const currentIndex = stages.findIndex(s => s.toLowerCase() === currentStage);

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">Your Journey Progress</h3>
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {stages.map((stage, i) => {
          const isComplete = i < currentIndex;
          const isCurrent = i === currentIndex;

          return (
            <React.Fragment key={stage}>
              <div className="flex flex-col items-center min-w-[70px]">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                  isComplete ? 'bg-accent text-accent-foreground' :
                  isCurrent ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                  'bg-secondary text-muted-foreground'
                }`}>
                  {isComplete ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-[10px] mt-1.5 text-center ${isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                  {stage}
                </span>
              </div>
              {i < stages.length - 1 && (
                <div className={`flex-1 h-0.5 min-w-[12px] ${isComplete ? 'bg-accent' : 'bg-border'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}