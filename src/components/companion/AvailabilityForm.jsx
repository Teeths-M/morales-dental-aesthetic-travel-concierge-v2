import React from 'react';
import { Label } from '@/components/ui/label';

const AVAILABILITY_OPTIONS = [
  { value: 'full-time', label: 'Full-time', desc: 'Available any day, any time' },
  { value: 'part-time', label: 'Part-time', desc: 'Weekends or evenings' },
  { value: 'flexible', label: 'Flexible', desc: 'Can adjust my schedule' },
];

export function AvailabilityForm({ formData, onInputChange }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>What's your availability?</Label>
        <div className="grid gap-3">
          {AVAILABILITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onInputChange('availability', opt.value)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                formData.availability === opt.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <p className="font-semibold">{opt.label}</p>
              <p className="text-sm text-muted-foreground">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <h4 className="font-semibold text-green-800 mb-2">✨ What happens next?</h4>
        <ul className="space-y-2 text-sm text-green-700">
          <li>✓ We'll review your profile within 24 hours</li>
          <li>✓ You'll receive a welcome call from our team</li>
          <li>✓ Free training orientation scheduled</li>
          <li>✓ Start earning by helping families in need</li>
        </ul>
      </div>
    </div>
  );
}