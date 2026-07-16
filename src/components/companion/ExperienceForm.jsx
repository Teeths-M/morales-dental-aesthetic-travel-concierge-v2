import React from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

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
              data-testid={`companion-language-${lang.toLowerCase()}`}
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
        <Label>How many years of caregiving experience?</Label>
        <div className="flex flex-wrap gap-2">
          {EXPERIENCE_OPTIONS.map(opt => (
            <button
              key={opt}
              type="button"
              data-testid={`companion-experience-${opt.replace(/\s+/g, '-').toLowerCase()}`}
              onClick={() => onInputChange('years_experience', opt)}
              className={`px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                formData.years_experience === opt
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Do you have medical training?</Label>
        <div className="flex gap-4">
          <ToggleButton
            isSelected={formData.has_medical_training === 'yes'}
            onClick={() => onInputChange('has_medical_training', 'yes')}
            label="Yes, I have training"
            testId="companion-medical-yes"
          />
          <ToggleButton
            isSelected={formData.has_medical_training === 'no'}
            onClick={() => onInputChange('has_medical_training', 'no')}
            label="No, but I'm willing to learn"
            testId="companion-medical-no"
          />
        </div>
      </div>
    </div>
  );
}

function ToggleButton({ isSelected, onClick, label, testId }) {
  return (
    <button
      type="button"
      data-testid={testId}
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