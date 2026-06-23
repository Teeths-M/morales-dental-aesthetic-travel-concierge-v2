import React from 'react';
import { CheckCircle2 } from 'lucide-react';

const stages = [
  { key: 'consultation', label: 'Consultation' },
  { key: 'planning', label: 'Doctor Review' },
  { key: 'booking', label: 'Booking' },
  { key: 'travel', label: 'Travel' },
  { key: 'procedure', label: 'Procedure' },
  { key: 'recovery', label: 'Recovery' },
  { key: 'aftercare', label: 'Aftercare' },
];

export default function JourneyProgress({ currentStage = 'consultation' }) {
  const currentIndex = stages.findIndex(s => s.key === currentStage);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800">Healthcare Journey</h3>
        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full capitalize">
          {stages[currentIndex]?.label || 'Consultation'}
        </span>
      </div>
      <div className="flex items-center overflow-x-auto pb-1 gap-0">
        {stages.map((stage, i) => {
          const isComplete = i < currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <React.Fragment key={stage.key}>
              <div className="flex flex-col items-center min-w-[64px]">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all
                  ${isComplete ? 'bg-emerald-600 border-emerald-600 text-white' :
                    isCurrent ? 'bg-white border-blue-600 text-blue-700 ring-4 ring-blue-50' :
                    'bg-slate-50 border-slate-200 text-slate-400'}`}>
                  {isComplete ? <CheckCircle2 className="w-4 h-4" /> : <span>{i + 1}</span>}
                </div>
                <span className={`text-[10px] mt-1.5 text-center font-medium leading-tight
                  ${isCurrent ? 'text-blue-700' : isComplete ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {stage.label}
                </span>
              </div>
              {i < stages.length - 1 && (
                <div className={`flex-1 h-0.5 min-w-[8px] mb-4 mx-0.5 rounded-full
                  ${isComplete ? 'bg-emerald-500' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}