import React from 'react';
import { Label } from '@/components/ui/label';
import RadioGroup from './FormRadioGroup';
import MedicalHistoryPills from './MedicalHistoryPills';
import SmartAllergyInput from './SmartAllergyInput';

const ANESTHESIA_TYPES = [
  { label: 'Allergic reactions',        icon: '⚠️' },
  { label: 'Breathing difficulties',    icon: '🫁' },
  { label: 'Nausea / Vomiting',         icon: '🤢' },
  { label: 'Excessive bleeding',        icon: '🩸' },
  { label: 'Other',                     icon: '📝' },
];

export default function Section5Anesthesia({ form, update }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">💉</span>
        <h3 className="font-display text-lg text-foreground">Anesthesia &amp; Allergies</h3>
      </div>

      {/* ── Anesthesia complications — Yes/No ──────────────────────────────── */}
      <div>
        <Label className="text-sm font-medium">
          Have you ever experienced complications from anesthesia?
        </Label>
        <RadioGroup
          value={form.anesthesia_complications}
          onChange={v => update('anesthesia_complications', v)}
          options={[{ label: 'Yes', value: true }, { label: 'No', value: false }]}
          className="mt-2"
        />
      </div>

      {/* Complication type pills — only if Yes */}
      {form.anesthesia_complications === true && (
        <div className="pl-4 border-l-2 border-primary/20">
          <Label className="text-sm font-medium mb-2 block">What type of reaction?</Label>
          <MedicalHistoryPills
            selected={form.anesthesia_complication_types || []}
            onChange={v => update('anesthesia_complication_types', v)}
            options={ANESTHESIA_TYPES}
            exclusive={[]}
            multiSelect
            accent="#ef4444"
            hint="Tap all that apply"
          />
        </div>
      )}

      {/* ── Allergies — SmartAllergyInput (the crown jewel) ──────────────── */}
      <div>
        <Label className="text-sm font-medium mb-2 block">
          Do you have any known allergies?
        </Label>
        <SmartAllergyInput
          selected={form.allergies || []}
          onChange={v => update('allergies', v)}
        />
      </div>
    </div>
  );
}
