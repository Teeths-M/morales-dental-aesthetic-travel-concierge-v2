import React from 'react';
import { Check, AlertTriangle } from 'lucide-react';

const statements = [
  'I confirm that the information I have provided is accurate, truthful, and complete to the best of my knowledge.',
  'I understand that withholding medical information, medications, previous procedures, allergies, lifestyle factors, or health conditions may affect my safety, treatment recommendations, recovery, and travel coordination.',
  'I understand that Morales Medical Travel Safety and participating providers are not responsible for complications or outcomes resulting from inaccurate, incomplete, or misleading information submitted during the consultation process.',
  'I understand this platform is a healthcare coordination and educational support system and does not replace professional medical advice, diagnosis, or treatment from licensed healthcare providers.',
];

const VISA_STATEMENT_INDEX = 4; // Index beyond the base statements

export default function ClientAcknowledgement({ acknowledged, onChange, visaStatus }) {
  const requiresVisaAck = visaStatus === 'evisa' || visaStatus === 'embassy';

  const toggle = (i) => {
    const next = new Set(acknowledged);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    onChange(next);
  };

  const totalRequired = requiresVisaAck ? statements.length + 1 : statements.length;
  const allAcknowledged = acknowledged.size >= totalRequired &&
    statements.every((_, i) => acknowledged.has(i)) &&
    (!requiresVisaAck || acknowledged.has(VISA_STATEMENT_INDEX));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">📋</span>
        <h3 className="font-display text-lg text-foreground">Client Acknowledgement</h3>
      </div>
      <p className="text-xs text-muted-foreground -mt-3">Please read and confirm each statement before submitting.</p>

      <div className="space-y-3">
        {statements.map((text, i) => (
          <button
            key={i}
            type="button"
            onClick={() => toggle(i)}
            className={`w-full text-left relative px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 border-2 flex items-start gap-3 ${
              acknowledged.has(i)
                ? 'border-primary bg-gradient-to-r from-primary/10 to-primary/5 text-foreground'
                : 'border-border bg-white hover:border-primary/50 hover:bg-primary/5'
            }`}
          >
            <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              acknowledged.has(i)
                ? 'border-primary bg-gradient-to-r from-primary to-primary/80'
                : 'border-border'
            }`}>
              {acknowledged.has(i) && <Check className="w-3.5 h-3.5 text-white" />}
            </div>
            <span className="text-sm leading-relaxed">{text}</span>
          </button>
        ))}

        {/* ── Visa Compliance Hard-Lock (conditionally rendered) ── */}
        {requiresVisaAck && (
          <div className="rounded-xl border-2 border-amber-400 bg-amber-50 overflow-hidden">
            {/* Header banner */}
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-100 border-b border-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                International Visa Compliance — Required
              </p>
              {visaStatus === 'embassy' && (
                <span className="ml-auto text-[10px] font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  Embassy Visa
                </span>
              )}
              {visaStatus === 'evisa' && (
                <span className="ml-auto text-[10px] font-semibold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                  e-Visa Required
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => toggle(VISA_STATEMENT_INDEX)}
              className={`w-full text-left px-4 py-4 flex items-start gap-3 transition-all duration-200 ${
                acknowledged.has(VISA_STATEMENT_INDEX)
                  ? 'bg-amber-100/60'
                  : 'bg-amber-50 hover:bg-amber-100/40'
              }`}
            >
              <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                acknowledged.has(VISA_STATEMENT_INDEX)
                  ? 'border-amber-600 bg-amber-500'
                  : 'border-amber-400'
              }`}>
                {acknowledged.has(VISA_STATEMENT_INDEX) && <Check className="w-3.5 h-3.5 text-white" />}
              </div>
              <span className="text-sm leading-relaxed text-amber-900 font-medium">
                I acknowledge that I am solely responsible for securing the necessary international travel visas for this itinerary.
                I understand that Morales Medical Travel Safety does not apply for, guarantee, or assume liability for
                any visa requirements, denials, or travel disruptions.
              </span>
            </button>

            {!acknowledged.has(VISA_STATEMENT_INDEX) && (
              <div className="px-4 py-2 bg-amber-100/50 border-t border-amber-200">
                <p className="text-[11px] text-amber-700 font-semibold">
                  ⚠️ This acknowledgement is required to unlock final submission.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {!allAcknowledged && (
        <p className="text-xs text-destructive">All statements must be acknowledged before submitting.</p>
      )}
    </div>
  );
}

// Export helper so Booking.jsx canNext() can compute required count
export function getRequiredAckCount(visaStatus) {
  return (visaStatus === 'evisa' || visaStatus === 'embassy') ? statements.length + 1 : statements.length;
}