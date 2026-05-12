import React from 'react';

export default function RadioGroup({ value, onChange, options, className = '' }) {
  return (
    <div className={`flex gap-6 ${className}`}>
      {options.map(opt => (
        <label key={String(opt.value)} className="flex items-center gap-2 cursor-pointer group">
          <div
            onClick={() => onChange(opt.value)}
            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
              value === opt.value
                ? 'border-primary bg-primary'
                : 'border-border group-hover:border-primary/50'
            }`}
          >
            {value === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
          </div>
          <span className="text-sm text-foreground">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}