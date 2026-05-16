import React from 'react';
import { Check } from 'lucide-react';

const statements = [
  'I confirm that the information I have provided is accurate, truthful, and complete to the best of my knowledge.',
  'I understand that withholding medical information, medications, previous procedures, allergies, lifestyle factors, or health conditions may affect my safety, treatment recommendations, recovery, and travel coordination.',
  'I understand that Morales Dental & Aesthetic Travel Concierge and participating providers are not responsible for complications or outcomes resulting from inaccurate, incomplete, or misleading information submitted during the consultation process.',
  'I understand this platform is a healthcare coordination and educational support system and does not replace professional medical advice, diagnosis, or treatment from licensed healthcare providers.',
];

export default function ClientAcknowledgement({ acknowledged, onChange }) {
  const toggle = (i) => {
    const next = new Set(acknowledged);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    onChange(next);
  };

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
            className={`w-full text-left relative px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 border-2 flex items-start gap-3 ${
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
      </div>

      {acknowledged.size < statements.length && (
        <p className="text-xs text-destructive">All statements must be acknowledged before submitting.</p>
      )}
    </div>
  );
}