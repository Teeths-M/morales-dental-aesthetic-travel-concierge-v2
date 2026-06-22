import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import RadioGroup from './FormRadioGroup';

const conditions = ['Diabetes','Hypertension','Asthma','Heart Disease','Thyroid Conditions','Autoimmune Disorders','Epilepsy','Blood Disorders','None','Other'];
const complications = ['Infection','Excessive bleeding','Poor healing','Anesthesia complications','Other'];

export default function Section4MedicalHistory({ form, update }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🩺</span>
        <h3 className="font-display text-lg text-foreground">Medical History</h3>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Do you currently have any medical conditions?</Label>
        <RadioGroup
          value={form.medical_conditions?.[0] || ''}
          onChange={v => update('medical_conditions', v ? [v] : [])}
          options={conditions.map(c => ({ label: c, value: c }))}
        />
        {(form.medical_conditions || []).includes('Other') && (
          <Input
            value={form.medical_conditions_other}
            onChange={e => update('medical_conditions_other', e.target.value)}
            placeholder="Please describe..."
            className="mt-3"
          />
        )}
      </div>

      <div>
        <Label className="text-sm font-medium">Have you had surgery before?</Label>
        <RadioGroup
          value={form.had_surgery}
          onChange={v => update('had_surgery', v)}
          options={[{ label: 'Yes', value: true }, { label: 'No', value: false }]}
          className="mt-2"
        />
      </div>

      {form.had_surgery === true && (
        <div className="space-y-4 pl-4 border-l-2 border-primary/20">
          <div>
            <Label>What procedure(s)?</Label>
            <Input value={form.previous_procedures} onChange={e => update('previous_procedures', e.target.value)} placeholder="Describe previous surgeries" className="mt-1.5" />
          </div>
          <div>
            <Label>When was your most recent surgery?</Label>
            <Input type="date" value={form.last_surgery_date} onChange={e => update('last_surgery_date', e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label className="text-sm font-medium">Did you experience any complications?</Label>
            <RadioGroup
              value={form.had_complications}
              onChange={v => update('had_complications', v)}
              options={[{ label: 'Yes', value: true }, { label: 'No', value: false }]}
              className="mt-2"
            />
          </div>
          {form.had_complications === true && (
            <RadioGroup
              value={form.surgery_complications?.[0] || ''}
              onChange={v => update('surgery_complications', v ? [v] : [])}
              options={complications.map(c => ({ label: c, value: c }))}
            />
          )}
        </div>
      )}
    </div>
  );
}