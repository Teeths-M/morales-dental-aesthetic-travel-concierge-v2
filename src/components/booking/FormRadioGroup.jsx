import React from 'react';
import { Check } from 'lucide-react';

export default function RadioGroup({ value, onChange, options, className = '' }) {
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {options.map(opt => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`relative px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-200 border-2 flex items-center gap-2 ${
            value === opt.value
              ? 'border-primary bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 scale-105'
              : 'border-border bg-white text-foreground hover:border-primary/50 hover:bg-primary/5'
          }`}
        >
          {value === opt.value && <Check className="w-4 h-4 flex-shrink-0" />}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}