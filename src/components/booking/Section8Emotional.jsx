import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import RadioGroup from './FormRadioGroup';
import CheckboxGroup from './FormCheckboxGroup';

const concerns = ['Anxiety','Depression','Body Image Concerns','Fear of Surgery','Emotional Stress','Other'];

export default function Section8Emotional({ form, update }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🧠</span>
        <h3 className="font-display text-lg text-foreground">Emotional Wellness & Expectations</h3>
      </div>

      <div>
        <Label className="text-sm font-medium">Do you experience high stress, anxiety, or emotional concerns related to treatment?</Label>
        <RadioGroup
          value={form.emotional_concerns}
          onChange={v => update('emotional_concerns', v)}
          options={[{ label: 'Yes', value: true }, { label: 'No', value: false }]}
          className="mt-2"
        />
      </div>

      {form.emotional_concerns === true && (
        <div className="space-y-4 pl-4 border-l-2 border-primary/20">
          <CheckboxGroup
            options={concerns}
            selected={form.emotional_concern_types || []}
            onChange={v => update('emotional_concern_types', v)}
          />
          <div>
            <Label>Optional Notes</Label>
            <Textarea
              value={form.emotional_notes}
              onChange={e => update('emotional_notes', e.target.value)}
              placeholder="Share any concerns you'd like us to know..."
              className="mt-1.5 h-20"
            />
          </div>
        </div>
      )}

      <div className="bg-primary/5 border border-primary/15 rounded-lg p-4 text-sm">
        <p className="font-semibold text-primary text-xs uppercase tracking-wider mb-1">SAFE-T 4LIFE™ Support Note</p>
        <p className="text-muted-foreground italic">"Your emotional wellbeing is an important part of your healthcare journey and recovery experience."</p>
      </div>
    </div>
  );
}