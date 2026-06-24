import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckSquare, Square, Globe } from 'lucide-react';

const LANGUAGES = [
  { value: 'en', label: '🇺🇸 English' },
  { value: 'es', label: '🇪🇸 Spanish / Español' },
  { value: 'fr', label: '🇫🇷 French / Français' },
  { value: 'pt', label: '🇧🇷 Portuguese / Português' },
  { value: 'de', label: '🇩🇪 German / Deutsch' },
  { value: 'it', label: '🇮🇹 Italian / Italiano' },
  { value: 'ar', label: '🇸🇦 Arabic / العربية' },
  { value: 'zh', label: '🇨🇳 Mandarin Chinese / 普通话' },
  { value: 'ko', label: '🇰🇷 Korean / 한국어' },
  { value: 'tr', label: '🇹🇷 Turkish / Türkçe' },
];

const TRANSLATION_CONTEXTS = [
  { value: 'airport', label: '✈️ Airport & Transportation' },
  { value: 'clinic', label: '🏥 Clinic & Waiting Rooms' },
  { value: 'doctor_consultation', label: '👨‍⚕️ Doctor Consultations' },
  { value: 'hotel_recovery', label: '🏨 Hotel & Recovery' },
  { value: 'emergency', label: '🚨 Emergency Situations' },
];

const COMM_STYLES = [
  { value: 'gentle', label: '🤝 Gentle & Supportive' },
  { value: 'direct', label: '📋 Direct & Straightforward' },
  { value: 'detailed', label: '📖 Detailed & Thorough' },
  { value: 'family_included', label: '👨‍👩‍👧 Include Family in Decisions' },
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
            className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${value === v ? (v ? 'border-primary bg-primary/10 text-primary' : 'border-slate-400 bg-slate-50 text-slate-700') : 'border-border hover:border-primary/40'}`}
          >
            {v === value ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {v ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
    </div>
  );
}

function MultiSelect({ label, options, selected = [], onChange }) {
  const toggle = (val) => {
    if (selected.includes(val)) onChange(selected.filter(v => v !== val));
    else onChange([...selected, val]);
  };
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <div className="grid sm:grid-cols-2 gap-2">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-all ${selected.includes(opt.value) ? 'border-primary bg-primary/8 text-primary font-medium' : 'border-border hover:border-primary/40 text-foreground'}`}
          >
            {selected.includes(opt.value) ? <CheckSquare className="w-4 h-4 shrink-0 text-primary" /> : <Square className="w-4 h-4 shrink-0 text-muted-foreground" />}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SectionLinguisticCultural({ form, update }) {
  const needsTranslation = form.needs_translator === true;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-1">
        <Globe className="w-5 h-5 text-primary" />
        <h3 className="font-display text-lg text-foreground">Language & Cultural Preferences</h3>
      </div>
      <p className="text-xs text-muted-foreground -mt-3">
        We personalize your care experience to honor your language, culture, and communication preferences.
      </p>

      {/* Preferred Language */}
      <div>
        <Label>Preferred Language <span className="text-destructive">*</span></Label>
        <Select value={form.preferred_language || 'en'} onValueChange={v => update('preferred_language', v)}>
          <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
          <SelectContent>
            {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Secondary Language */}
      <div>
        <Label>Secondary Language <span className="text-muted-foreground text-xs">(optional)</span></Label>
        <Select
          value={form.secondary_language || '__none__'}
          onValueChange={v => update('secondary_language', v === '__none__' ? '' : v)}
        >
          <SelectTrigger className="mt-1.5"><SelectValue placeholder="None" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Translation Need */}
      <YesNoToggle
        label="Will you need translation assistance during your trip?"
        value={form.needs_translator}
        onChange={v => update('needs_translator', v)}
      />

      {needsTranslation && (
        <>
          <MultiSelect
            label="Where will you need translation support?"
            options={TRANSLATION_CONTEXTS}
            selected={form.translation_contexts_needed || []}
            onChange={v => update('translation_contexts_needed', v)}
          />

          <YesNoToggle
            label="Can your travel companion provide translation?"
            value={form.companion_can_translate}
            onChange={v => update('companion_can_translate', v)}
          />

          {form.companion_can_translate === false && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <p className="font-semibold mb-1">Translation Support Needed</p>
              <p className="text-xs">Our coordinator will arrange translation support across your required contexts. No action is needed from you at this time.</p>
            </div>
          )}

          {form.companion_can_translate === true && (
            <div>
              <Label>Any translation limitations your companion should know about? <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                value={form.companion_translation_limitations || ''}
                onChange={e => update('companion_translation_limitations', e.target.value)}
                placeholder="e.g. My companion speaks conversational Spanish but is not fluent in medical terminology..."
                className="mt-1.5 h-20"
              />
            </div>
          )}
        </>
      )}

      {/* Communication Style */}
      <div>
        <Label>Preferred Communication Style</Label>
        <div className="grid sm:grid-cols-2 gap-2 mt-2">
          {COMM_STYLES.map(style => (
            <button
              key={style.value}
              type="button"
              onClick={() => update('communication_style_preference', style.value)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-all ${form.communication_style_preference === style.value ? 'border-primary bg-primary/8 text-primary font-medium' : 'border-border hover:border-primary/40'}`}
            >
              {form.communication_style_preference === style.value ? <CheckSquare className="w-4 h-4 shrink-0" /> : <Square className="w-4 h-4 shrink-0 text-muted-foreground" />}
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cultural / Religious Considerations */}
      <div>
        <Label>Cultural or Religious Considerations <span className="text-muted-foreground text-xs">(optional)</span></Label>
        <Textarea
          value={form.religious_or_modesty_considerations || ''}
          onChange={e => update('religious_or_modesty_considerations', e.target.value)}
          placeholder="e.g. Prefer female doctors only. Prayer breaks needed during the day. Halal meals required..."
          className="mt-1.5 h-20"
        />
        <p className="text-xs text-muted-foreground mt-1">Your care team will honor these preferences throughout your journey.</p>
      </div>
    </div>
  );
}