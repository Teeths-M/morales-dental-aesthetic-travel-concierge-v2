import React from 'react';
import { Label } from '@/components/ui/label';

export default function Section9Pregnancy({ form, update }) {
  const options = [
    { label: 'Yes', value: 'yes' },
    { label: 'No', value: 'no' },
    { label: 'Prefer not to say', value: 'prefer_not' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🤰</span>
        <h3 className="font-display text-lg text-foreground">Pregnancy & Hormonal Health</h3>
      </div>

      <div>
        <Label className="text-sm font-medium mb-3 block">Are you currently pregnant or trying to become pregnant?</Label>
        <div className="space-y-2">
          {options.map(opt => (
            <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() => update('pregnancy_status', opt.value)}
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
                  form.pregnancy_status === opt.value
                    ? 'border-primary bg-primary'
                    : 'border-border group-hover:border-primary/50'
                }`}
              >
                {form.pregnancy_status === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <span className="text-sm text-foreground">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/15 rounded-lg p-4 text-sm">
        <p className="font-semibold text-primary text-xs uppercase tracking-wider mb-1">SAFE-T Educational Prompt</p>
        <p className="text-muted-foreground italic">"Some procedures, medications, imaging, and anesthesia may not be recommended during pregnancy."</p>
      </div>
    </div>
  );
}