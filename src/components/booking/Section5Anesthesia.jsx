import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import RadioGroup from './FormRadioGroup';

const anesthesiaTypes = ['Allergic reactions','Breathing difficulties','Nausea/Vomiting','Excessive bleeding','Other'];
const allergyTypes = ['Medications','Latex','Food Allergies','Anesthesia Reactions','None','Other'];

export default function Section5Anesthesia({ form, update }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">💉</span>
        <h3 className="font-display text-lg text-foreground">Anesthesia & Allergies</h3>
      </div>

      <div>
        <Label className="text-sm font-medium">Have you ever experienced complications from anesthesia?</Label>
        <RadioGroup
          value={form.anesthesia_complications}
          onChange={v => update('anesthesia_complications', v)}
          options={[{ label: 'Yes', value: true }, { label: 'No', value: false }]}
          className="mt-2"
        />
      </div>

      {form.anesthesia_complications === true && (
        <div className="pl-4 border-l-2 border-primary/20">
          <RadioGroup
            value={form.anesthesia_complication_types?.[0] || ''}
            onChange={v => update('anesthesia_complication_types', v ? [v] : [])}
            options={anesthesiaTypes.map(a => ({ label: a, value: a }))}
          />
        </div>
      )}

      <div>
        <Label className="text-sm font-medium mb-2 block">Do you have any allergies?</Label>
        <RadioGroup
          value={form.allergies?.[0] || ''}
          onChange={v => update('allergies', v ? [v] : [])}
          options={allergyTypes.map(a => ({ label: a, value: a }))}
        />
      </div>

      <div>
        <Label>Optional Details</Label>
        <Textarea
          value={form.allergy_details}
          onChange={e => update('allergy_details', e.target.value)}
          placeholder="Describe any allergies in detail..."
          className="mt-1.5 h-20"
        />
      </div>
    </div>
  );
}