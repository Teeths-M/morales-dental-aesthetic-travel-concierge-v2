import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckSquare, Square, Utensils } from 'lucide-react';

const DIETARY_OPTIONS = [
  { value: 'none', label: '✅ No Dietary Restrictions' },
  { value: 'vegetarian', label: '🥗 Vegetarian' },
  { value: 'vegan', label: '🌱 Vegan' },
  { value: 'gluten_free', label: '🌾 Gluten Free' },
  { value: 'halal', label: '☪️ Halal' },
  { value: 'kosher', label: '✡️ Kosher' },
  { value: 'diabetic_low_sugar', label: '🩸 Diabetic / Low Sugar' },
  { value: 'low_sodium', label: '🧂 Low Sodium' },
  { value: 'other', label: '📝 Other (describe below)' },
];

function YesNoToggle({ label, value, onChange }) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <div className="grid grid-cols-2 gap-3">
        {[true, false].map(v => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${value === v ? (v ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-400 bg-slate-50 text-slate-700') : 'border-border hover:border-primary/40'}`}
          >
            {v === value ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {v ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SectionDietaryAllergy({ form, update, showValidation = false }) {
  const needsDietaryDetails = form.dietary_restrictions === 'other';
  const isMissingFoodAllergyDetail = showValidation && form.has_food_allergies && !form.food_allergies_details;
  const isMissingMedAllergyDetail = showValidation && form.has_medication_allergies && !form.medication_allergies_details;
  const isMissingDietDetails = showValidation && needsDietaryDetails && !form.dietary_restrictions_details;
  const isMissingAck = showValidation && !form.dietary_accuracy_acknowledged;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-1">
        <Utensils className="w-5 h-5 text-primary" />
        <h3 className="font-display text-lg text-foreground">Dietary & Allergy Information</h3>
      </div>
      <p className="text-xs text-muted-foreground -mt-3">
        This information helps your care team and travel companion provide safe, comfortable support during your journey.
      </p>

      {/* Food Allergies */}
      <YesNoToggle
        label="Do you have any food allergies? *"
        value={form.has_food_allergies}
        onChange={v => update('has_food_allergies', v)}
      />
      {form.has_food_allergies && (
        <div>
          <Label>Please describe your food allergies <span className="text-destructive">*</span></Label>
          <Textarea
            value={form.food_allergies_details || ''}
            onChange={e => update('food_allergies_details', e.target.value)}
            placeholder="e.g. Severe peanut allergy, shellfish intolerance..."
            className={`mt-1.5 h-20 ${isMissingFoodAllergyDetail ? 'border-red-400' : ''}`}
          />
          {isMissingFoodAllergyDetail && <p className="text-xs text-red-500 mt-1">Please describe your food allergies.</p>}
        </div>
      )}

      {/* Medication Allergies */}
      <YesNoToggle
        label="Do you have any medication allergies? *"
        value={form.has_medication_allergies}
        onChange={v => update('has_medication_allergies', v)}
      />
      {form.has_medication_allergies && (
        <div>
          <Label>Please describe your medication allergies <span className="text-destructive">*</span></Label>
          <Textarea
            value={form.medication_allergies_details || ''}
            onChange={e => update('medication_allergies_details', e.target.value)}
            placeholder="e.g. Penicillin, aspirin, codeine..."
            className={`mt-1.5 h-20 ${isMissingMedAllergyDetail ? 'border-red-400' : ''}`}
          />
          {isMissingMedAllergyDetail && <p className="text-xs text-red-500 mt-1">Please describe your medication allergies.</p>}
        </div>
      )}

      {/* Dietary Restrictions */}
      <div>
        <Label>Dietary Restrictions <span className="text-destructive">*</span></Label>
        <Select value={form.dietary_restrictions || 'none'} onValueChange={v => update('dietary_restrictions', v)}>
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Select dietary restrictions..." />
          </SelectTrigger>
          <SelectContent>
            {DIETARY_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {needsDietaryDetails && (
        <div>
          <Label>Please describe your dietary needs <span className="text-destructive">*</span></Label>
          <Textarea
            value={form.dietary_restrictions_details || ''}
            onChange={e => update('dietary_restrictions_details', e.target.value)}
            placeholder="Describe your specific dietary requirements..."
            className={`mt-1.5 h-20 ${isMissingDietDetails ? 'border-red-400' : ''}`}
          />
          {isMissingDietDetails && <p className="text-xs text-red-500 mt-1">Please describe your dietary requirements.</p>}
        </div>
      )}

      {/* Emergency Food Reaction Plan */}
      <div>
        <Label>Emergency Food Reaction Plan <span className="text-muted-foreground text-xs">(optional)</span></Label>
        <Textarea
          value={form.emergency_food_reaction_plan || ''}
          onChange={e => update('emergency_food_reaction_plan', e.target.value)}
          placeholder="e.g. I carry an EpiPen. In case of reaction, call 911 and administer epinephrine..."
          className="mt-1.5 h-20"
        />
      </div>

      {/* Accuracy Acknowledgement */}
      <div className={`rounded-xl border p-4 ${isMissingAck ? 'border-red-400 bg-red-50' : 'border-primary/20 bg-primary/5'}`}>
        <button
          type="button"
          onClick={() => update('dietary_accuracy_acknowledged', !form.dietary_accuracy_acknowledged)}
          className="flex items-start gap-3 w-full text-left"
        >
          {form.dietary_accuracy_acknowledged
            ? <CheckSquare className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            : <Square className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />}
          <span className="text-sm text-foreground leading-relaxed">
            <strong>I confirm</strong> that the dietary and allergy information provided above is accurate and complete to the best of my knowledge. I understand this information will be shared with my assigned care companion and coordinator to ensure my safety during the journey. <span className="text-destructive">*</span>
          </span>
        </button>
        {isMissingAck && (
          <div className="flex items-center gap-1.5 mt-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            <p className="text-xs text-red-600">You must confirm the accuracy of your dietary information.</p>
          </div>
        )}
      </div>
    </div>
  );
}