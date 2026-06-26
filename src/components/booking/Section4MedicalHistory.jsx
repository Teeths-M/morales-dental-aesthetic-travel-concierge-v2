import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import RadioGroup from './FormRadioGroup';
import MedicalHistoryPills, { DEFAULT_CONDITIONS, DEFAULT_SURGERIES, DEFAULT_COMPLICATIONS } from './MedicalHistoryPills';

export default function Section4MedicalHistory({ form, update }) {
  // Smart default for last surgery date: 2 years ago
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const defaultDate = twoYearsAgo.toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🩺</span>
        <h3 className="font-display text-lg text-foreground">Medical History</h3>
      </div>

      {/* ── Medical conditions — pill multi-select, zero typing ─────────────── */}
      <div>
        <Label className="text-sm font-medium mb-2 block">
          Do you have any medical conditions?
        </Label>
        <MedicalHistoryPills
          selected={form.medical_conditions || []}
          onChange={v => update('medical_conditions', v)}
          options={DEFAULT_CONDITIONS}
          exclusive={['None']}
          multiSelect
        />
        {/* "Other" still needs a short text field — unavoidable */}
        {(form.medical_conditions || []).includes('Other') && (
          <div className="mt-3">
            <Input
              value={form.medical_conditions_other}
              onChange={e => update('medical_conditions_other', e.target.value)}
              placeholder="Please describe your condition briefly…"
              className="mt-1"
            />
          </div>
        )}
      </div>

      {/* ── Previous surgery — Yes/No ─────────────────────────────────────── */}
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
        <div className="space-y-5 pl-4 border-l-2 border-primary/20">

          {/* Previous procedure type — pill select, no typing */}
          <div>
            <Label className="text-sm font-medium mb-2 block">What type of surgery?</Label>
            <MedicalHistoryPills
              selected={
                form.previous_procedures
                  ? [form.previous_procedures]
                  : []
              }
              onChange={v => update('previous_procedures', v[0] || '')}
              options={DEFAULT_SURGERIES}
              exclusive={[]}
              multiSelect={false}
              accent="#D4AF37"
              hint="Tap to select — no typing needed"
            />
            {/* Only show text if they pick "Other" */}
            {form.previous_procedures === 'Other' && (
              <Input
                value={form.previous_procedures_notes || ''}
                onChange={e => update('previous_procedures_notes', e.target.value)}
                placeholder="Briefly describe the surgery…"
                className="mt-3"
              />
            )}
          </div>

          {/* Last surgery date — date picker with smart default */}
          <div>
            <Label>When was your most recent surgery?</Label>
            <input
              type="date"
              value={form.last_surgery_date || defaultDate}
              onChange={e => update('last_surgery_date', e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="mt-1.5 w-full rounded-xl px-4 py-3 text-sm min-h-[48px]"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff',
                outline: 'none',
                colorScheme: 'dark',
              }}
            />
            <p className="text-[10px] text-white/35 mt-1">Pre-filled with 2 years ago as a common estimate — tap to change.</p>
          </div>

          {/* Complications — Yes/No */}
          <div>
            <Label className="text-sm font-medium">Did you experience any complications?</Label>
            <RadioGroup
              value={form.had_complications}
              onChange={v => update('had_complications', v)}
              options={[{ label: 'Yes', value: true }, { label: 'No', value: false }]}
              className="mt-2"
            />
          </div>

          {/* Complication type — pill select */}
          {form.had_complications === true && (
            <MedicalHistoryPills
              selected={form.surgery_complications || []}
              onChange={v => update('surgery_complications', v)}
              options={DEFAULT_COMPLICATIONS}
              exclusive={[]}
              multiSelect
              accent="#ef4444"
              hint="Tap all that apply"
            />
          )}
        </div>
      )}
    </div>
  );
}
