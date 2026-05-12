import React from 'react';

export default function CheckboxGroup({ options, selected, onChange }) {
  const toggle = (item) => {
    if (selected.includes(item)) {
      onChange(selected.filter(s => s !== item));
    } else {
      onChange([...selected, item]);
    }
  };

  return (
    <div className="space-y-2">
      {options.map(opt => (
        <label key={opt} className="flex items-center gap-3 cursor-pointer group">
          <div
            onClick={() => toggle(opt)}
            className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
              selected.includes(opt)
                ? 'border-primary bg-primary'
                : 'border-border group-hover:border-primary/50'
            }`}
          >
            {selected.includes(opt) && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className="text-sm text-foreground">{opt}</span>
        </label>
      ))}
    </div>
  );
}