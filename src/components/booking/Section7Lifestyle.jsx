import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RadioGroup from './FormRadioGroup';

const habits = ['Smoking','Vaping','Alcohol','Recreational Substances','None'];

export default function Section7Lifestyle({ form, update }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🚬</span>
        <h3 className="font-display text-lg text-foreground">Lifestyle & Wellness</h3>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Do you smoke, vape, drink alcohol, or use recreational substances?</Label>
        <RadioGroup
          value={form.lifestyle_habits?.[0] || ''}
          onChange={v => update('lifestyle_habits', v ? [v] : [])}
          options={habits.map(h => ({ label: h, value: h }))}
        />
      </div>

      <div className="bg-primary/5 border border-primary/15 rounded-lg p-4 text-sm">
        <p className="font-semibold text-primary text-xs uppercase tracking-wider mb-1">SAFE-T Educational Prompt</p>
        <p className="text-muted-foreground italic">"Lifestyle habits may impact healing, anesthesia response, and recovery timelines."</p>
      </div>

      <div>
        <Label className="text-sm font-medium">Do you exercise regularly?</Label>
        <RadioGroup
          value={form.exercises_regularly}
          onChange={v => update('exercises_regularly', v)}
          options={[{ label: 'Yes', value: true }, { label: 'No', value: false }]}
          className="mt-2"
        />
      </div>

      {form.exercises_regularly === true && (
        <div className="pl-4 border-l-2 border-primary/20">
          <Label>Activity Level</Label>
          <Select value={form.activity_level} onValueChange={v => update('activity_level', v)}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select activity level" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light Activity</SelectItem>
              <SelectItem value="moderate">Moderate Activity</SelectItem>
              <SelectItem value="high">High Activity</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}