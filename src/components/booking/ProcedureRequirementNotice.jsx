import React from 'react';
import { useCart } from '@/context/CartContext';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

export default function ProcedureRequirementNotice() {
  const { items } = useCart();
  const hasSelectedProcedure = items.length > 0;

  return (
    <div className={`rounded-xl p-4 border ${hasSelectedProcedure ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className="flex items-start gap-3">
        {hasSelectedProcedure ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        )}
        <div>
          <h3 className={`font-semibold text-sm mb-1 ${hasSelectedProcedure ? 'text-emerald-900' : 'text-amber-900'}`}>
            {hasSelectedProcedure ? '✓ Procedures Selected' : 'Procedure Selection Required'}
          </h3>
          <p className={`text-xs leading-relaxed ${hasSelectedProcedure ? 'text-emerald-800' : 'text-amber-800'}`}>
            {hasSelectedProcedure 
              ? `You have ${items.length} procedure${items.length > 1 ? 's' : ''} selected. You can proceed with the consultation.`
              : 'You must select at least one medical procedure before starting a consultation. This ensures our doctors can prepare a personalized assessment for you.'}
          </p>
          {!hasSelectedProcedure && (
            <div className="mt-3 flex items-center gap-2 text-[10px] text-amber-700">
              <Info className="w-3 h-3" />
              <span className="font-medium">Navigate to Procedures page to select your treatments</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}