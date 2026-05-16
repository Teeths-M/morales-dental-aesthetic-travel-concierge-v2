import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import RadioGroup from './FormRadioGroup';

const preferences = [
  'Female healthcare provider preference',
  'Male healthcare provider preference',
  'Dietary accommodations',
  'Prayer accommodations',
  'Private recovery preferences',
  'Cultural care preferences',
];

export default function Section3Cultural({ form, update }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🕌</span>
        <h3 className="font-display text-lg text-foreground">Cultural & Personal Comfort Preferences</h3>
      </div>

      <div>
        <Label className="text-sm font-medium">Do you have any religious, cultural, or personal care preferences we should respectfully accommodate?</Label>
        <RadioGroup
          value={form.has_cultural_preferences}
          onChange={v => update('has_cultural_preferences', v)}
          options={[{ label: 'Yes', value: true }, { label: 'No', value: false }]}
          className="mt-2"
        />
      </div>

      {form.has_cultural_preferences === true && (
        <div className="space-y-4 pl-4 border-l-2 border-primary/20">
          <RadioGroup
            value={form.cultural_preferences?.[0] || ''}
            onChange={v => update('cultural_preferences', v ? [v] : [])}
            options={preferences.map(p => ({ label: p, value: p }))}
          />
          <div>
            <Label>Optional Notes</Label>
            <Textarea
              value={form.cultural_notes}
              onChange={e => update('cultural_notes', e.target.value)}
              placeholder="Any additional cultural or personal preferences..."
              className="mt-1.5 h-20"
            />
          </div>
        </div>
      )}
    </div>
  );
}