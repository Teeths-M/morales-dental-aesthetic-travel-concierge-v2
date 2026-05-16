import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { translations, countries } from '@/lib/translations';
import { ArrowRight } from 'lucide-react';

export default function DoctorSignupStep1({ formData, setFormData, language = 'en', onNext }) {
  const t = translations[language] || translations['en'];
  const countryList = countries[language] || countries['en'];

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    // Allow any phone format (digits, +, spaces, hyphens, parentheses)
    if (/^[\d+\s\-()]*$/.test(value)) {
      handleChange('phone', value);
    }
  };

  const canProceed = formData.full_name && formData.email && formData.phone && formData.clinic_country;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground mb-2">{t.step1Title}</h2>
        <p className="text-muted-foreground text-sm">{t.step1Subtitle}</p>
      </div>

      <div className="space-y-6">
        {/* Full Name */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">👤 {t.fullName}</label>
          <Input
            placeholder="Dr. Jane Smith"
            value={formData.full_name}
            onChange={(e) => handleChange('full_name', e.target.value)}
            className="h-12 text-base"
          />
        </div>

        {/* Email */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">📧 {t.email}</label>
          <Input
            type="email"
            placeholder="drjane@clinic.com"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="h-12 text-base"
          />
          <p className="text-xs text-muted-foreground mt-1">{t.emailHint}</p>
        </div>

        {/* Phone */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">📞 {t.phone}</label>
          <Input
            placeholder="+1 868 123 4567"
            value={formData.phone}
            onChange={handlePhoneChange}
            className="h-12 text-base"
          />
        </div>

        {/* Clinic Country */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">🌍 {t.clinicCountry}</label>
          <Select value={formData.clinic_country} onValueChange={(val) => handleChange('clinic_country', val)}>
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder="Select country..." />
            </SelectTrigger>
            <SelectContent>
              {countryList.map((country) => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clinic Name (Optional) */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">🏥 {t.clinicName}</label>
          <Input
            placeholder="Smile Care Clinic"
            value={formData.clinic_name}
            onChange={(e) => handleChange('clinic_name', e.target.value)}
            className="h-12 text-base"
          />
        </div>
      </div>

      <div className="bg-secondary/50 border border-secondary rounded-lg p-4">
        <p className="text-sm text-foreground">{t.agreeTerms}</p>
      </div>

      <Button
        onClick={onNext}
        disabled={!canProceed}
        className="w-full h-12 text-base bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white gap-2"
      >
        {t.next} <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}