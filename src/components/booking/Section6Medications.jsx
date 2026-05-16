import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import RadioGroup from './FormRadioGroup';

const medicationTypes = ['Blood Thinners','Hormones','Diabetes Medication','Vitamins','Herbal Supplements','Other'];

export default function Section6Medications({ form, update }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">💊</span>
        <h3 className="font-display text-lg text-foreground">Medications & Supplements</h3>
      </div>

      <div>
        <Label className="text-sm font-medium">Are you currently taking any medications or supplements?</Label>
        <RadioGroup
          value={form.takes_medications}
          onChange={v => update('takes_medications', v)}
          options={[{ label: 'Yes', value: true }, { label: 'No', value: false }]}
          className="mt-2"
        />
      </div>

      {form.takes_medications === true && (
        <div className="space-y-4 pl-4 border-l-2 border-primary/20">
          <RadioGroup
            value={form.medication_types?.[0] || ''}
            onChange={v => update('medication_types', v ? [v] : [])}
            options={medicationTypes.map(m => ({ label: m, value: m }))}
          />
          <div>
            <Label>Optional Medication Notes</Label>
            <Textarea
              value={form.medication_notes}
              onChange={e => update('medication_notes', e.target.value)}
              placeholder="List medications, dosages, or supplements..."
              className="mt-1.5 h-24"
            />
          </div>
        </div>
      )}

      <div className="bg-primary/5 border border-primary/15 rounded-lg p-4 text-sm">
        <p className="font-semibold text-primary text-xs uppercase tracking-wider mb-1">SAFE-T 4LIFE™ Reminder</p>
        <p className="text-muted-foreground italic">"Certain medications and supplements may affect surgery safety, anesthesia, and recovery."</p>
      </div>
    </div>
  );
}