import React from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const LANGUAGES = ['English', 'Spanish', 'French', 'Hindi', 'Urdu', 'Mandarin', 'Arabic'];
const EXPERIENCE_OPTIONS = ['Just starting out', '1-2 years', '3-5 years', '5-10 years', '10+ years'];

export function ExperienceForm({ formData, onInputChange, onLanguageToggle }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Languages You Speak *</Label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map(lang => (
            <Badge
              key={lang}
              className={`cursor-pointer transition-all text-sm py-2 px-4 ${
                formData.languages.includes(lang)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-secondary/80'
              }`}
              onClick={() => onLanguageToggle(lang)}
            >
              {formData.languages.includes(lang) && '✓ '}
              {lang}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="years_experience">How many years of caregiving experience?</Label>
        <Select value={formData.years_experience} onValueChange={(val) => onInputChange('years_experience', val)}>
          <SelectTrigger className="py-6">
            <SelectValue placeholder="Select your experience level" />
          </SelectTrigger>
          <SelectContent>
            {EXPERIENCE_OPTIONS.map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Do you have medical training?</Label>
        <div className="flex gap-4">
          <ToggleButton
            isSelected={formData.has_medical_training === 'yes'}
            onClick={() => onInputChange('has_medical_training', 'yes')}
            label="Yes, I have training"
          />
          <ToggleButton
            isSelected={formData.has_medical_training === 'no'}
            onClick={() => onInputChange('has_medical_training', 'no')}
            label="No, but I'm willing to learn"
          />
        </div>
      </div>
    </div>
  );
}

function ToggleButton({ isSelected, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-4 rounded-lg border-2 transition-all ${
        isSelected
          ? 'border-primary bg-primary/5 text-primary'
          : 'border-border hover:border-primary/50'
      }`}
    >
      {label}
    </button>
  );
}