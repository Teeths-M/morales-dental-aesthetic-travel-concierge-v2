import React from 'react';

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

      <div className="space-y-4">
        {statements.map((text, i) => (
          <label key={i} className="flex items-start gap-3 cursor-pointer group">
            <div
              onClick={() => toggle(i)}
              className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                acknowledged.has(i)
                  ? 'border-primary bg-primary'
                  : 'border-border group-hover:border-primary/50'
              }`}
            >
              {acknowledged.has(i) && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-sm text-muted-foreground leading-relaxed">{text}</span>
          </label>
        ))}
      </div>

      {acknowledged.size < statements.length && (
        <p className="text-xs text-destructive">All statements must be acknowledged before submitting.</p>
      )}
    </div>
  );
}