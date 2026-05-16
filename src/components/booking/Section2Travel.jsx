import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RadioGroup from './FormRadioGroup';

const travelServices = [
  'Airport assistance',
  'Companion accommodations',
  'Transportation coordination',
  'Recovery support arrangements',
  'Guided concierge assistance',
];

export default function Section2Travel({ form, update }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">✈️</span>
        <h3 className="font-display text-lg text-foreground">Travel & Companion Support</h3>
      </div>

      <div>
        <Label className="text-sm font-medium">Will someone accompany you during your healthcare journey?</Label>
        <RadioGroup
          value={form.has_companion}
          onChange={v => update('has_companion', v)}
          options={[{ label: 'Yes', value: true }, { label: 'No', value: false }]}
          className="mt-2"
        />
      </div>

      {form.has_companion === true && (
        <div className="space-y-4 pl-4 border-l-2 border-primary/20">
          <div>
            <Label>Relationship to Companion</Label>
            <Select value={form.companion_relationship} onValueChange={v => update('companion_relationship', v)}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select relationship" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="spouse">Spouse/Partner</SelectItem>
                <SelectItem value="family">Family Member</SelectItem>
                <SelectItem value="friend">Friend</SelectItem>
                <SelectItem value="caregiver">Caregiver</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Would you like assistance arranging a Travel Buddy Support Package?</Label>
            <RadioGroup
              value={form.travel_buddy_services?.[0] || ''}
              onChange={v => update('travel_buddy_services', v ? [v] : [])}
              options={travelServices.map(s => ({ label: s, value: s }))}
            />
          </div>
        </div>
      )}

      <div className="bg-primary/5 border border-primary/15 rounded-lg p-4 text-sm">
        <p className="font-semibold text-primary text-xs uppercase tracking-wider mb-1">SAFE-T 4LIFE™ Note</p>
        <p className="text-muted-foreground italic">"Having support during recovery may improve comfort, emotional reassurance, and post-procedure assistance."</p>
      </div>
    </div>
  );
}