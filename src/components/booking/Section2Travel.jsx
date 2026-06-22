import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RadioGroup from './FormRadioGroup';

const travelServices = [
  'Airport assistance',
  'Companion accommodations',
  'Transportation coordination',
  'Recovery support arrangements',
  'Guided concierge assistance',
];

function CompanionCard({ index, companion, onChange }) {
  const update = (field, value) => {
    onChange({ ...companion, [field]: value });
  };

  return (
    <div className="border border-border rounded-xl p-4 space-y-3 bg-secondary/30">
      <p className="text-xs font-semibold text-primary uppercase tracking-wider">Companion {index + 1}</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <Label className="text-xs">Full Name</Label>
          <Input
            value={companion.name || ''}
            onChange={e => update('name', e.target.value)}
            placeholder="As on passport"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Relationship</Label>
          <Select value={companion.relationship || ''} onValueChange={v => update('relationship', v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="spouse">Spouse/Partner</SelectItem>
              <SelectItem value="family">Family Member</SelectItem>
              <SelectItem value="friend">Friend</SelectItem>
              <SelectItem value="caregiver">Caregiver</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Passport Number</Label>
          <Input
            value={companion.passport_number || ''}
            onChange={e => update('passport_number', e.target.value)}
            placeholder="e.g. A12345678"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Passport Issue Date</Label>
          <Input
            type="date"
            value={companion.passport_issue_date || ''}
            onChange={e => update('passport_issue_date', e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Passport Expiry Date</Label>
          <Input
            type="date"
            value={companion.passport_expiry_date || ''}
            onChange={e => update('passport_expiry_date', e.target.value)}
            className="mt-1"
          />
        </div>
      </div>
    </div>
  );
}

export default function Section2Travel({ form, update }) {
  const companions = form.companions_details || [];

  const handleCompanionCountChange = (v) => {
    const num = parseInt(v);
    update('number_of_companions', num);
    update('has_companion', num > 0);
    // Resize companions_details array
    const current = form.companions_details || [];
    if (num > current.length) {
      update('companions_details', [...current, ...Array(num - current.length).fill({})]);
    } else {
      update('companions_details', current.slice(0, num));
    }
  };

  const updateCompanion = (index, data) => {
    const updated = [...companions];
    updated[index] = data;
    update('companions_details', updated);
  };

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
          onChange={v => {
            update('has_companion', v);
            if (!v) {
              update('number_of_companions', 0);
              update('companions_details', []);
            }
          }}
          options={[{ label: 'Yes', value: true }, { label: 'No', value: false }]}
          className="mt-2"
        />
      </div>

      {form.has_companion === true && (
        <div className="space-y-5 pl-4 border-l-2 border-primary/20">
          {/* Number of companions */}
          <div>
            <Label className="text-sm font-medium">Number of Companions <span className="text-destructive">*</span></Label>
            <Select
              value={String(form.number_of_companions ?? '')}
              onValueChange={handleCompanionCountChange}
            >
              <SelectTrigger className="mt-1.5 w-48"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 companion</SelectItem>
                <SelectItem value="2">2 companions</SelectItem>
                <SelectItem value="3">3 companions</SelectItem>
                <SelectItem value="4">4 companions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Per-companion passport details */}
          {companions.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">Please provide passport details for each companion travelling with you.</p>
              {companions.map((c, i) => (
                <CompanionCard
                  key={i}
                  index={i}
                  companion={c}
                  onChange={data => updateCompanion(i, data)}
                />
              ))}
            </div>
          )}

          {/* Travel buddy support services */}
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